import "server-only";

import { getAdminClient, type ShopRow } from "@/lib/supabase/admin";
import {
  shopifyGraphQL,
  shopContextFromRow,
  type ShopApiContext,
} from "@/lib/shopify/graphql";
import { ensureWebhooksRegistered } from "@/lib/shopify/register";
import {
  ORDERS_SINCE_QUERY,
  ORDER_BY_ID_QUERY,
  type OrderNode,
  type OrdersSinceResponse,
  type OrderByIdResponse,
} from "@/lib/shopify/queries";

/**
 * Idempotent synchronization of Shopify refunds + returns into our sync tables.
 *
 * All Shopify traffic goes through `lib/shopify/graphql.ts` (the single client).
 * This module owns: cursoring, pagination, normalization, and idempotent upsert.
 *
 * IDEMPOTENCY: every write keys on a Shopify ID with a UNIQUE constraint and uses
 * upsert, so re-running a sync — or the webhook path racing the hourly cron —
 * converges to the same rows instead of duplicating. Refund facts are immutable
 * once created; returns are re-upserted because their status/quantities change
 * over a return's lifecycle.
 */

// ── Pure normalization (no I/O → unit-tested) ─────────────────────────────────

export interface NormalizedRefund {
  shopifyRefundId: string;
  refundedAt: string;
  amount: string;
  currency: string;
  lineItems: Array<{
    shopifyLineItemId: string | null;
    name: string | null;
    quantity: number;
    subtotal: string;
    restockType: string;
  }>;
}

export interface NormalizedReturn {
  shopifyReturnId: string;
  name: string;
  status: string;
  totalQuantity: number;
  createdAt: string;
  lineItems: Array<{
    shopifyLineItemId: string | null;
    name: string | null;
    quantity: number;
    processedQuantity: number;
    refundedQuantity: number;
  }>;
}

export interface NormalizedOrder {
  shopifyOrderId: string;
  orderName: string;
  updatedAt: string;
  refunds: NormalizedRefund[];
  returns: NormalizedReturn[];
}

/**
 * Convert a raw Shopify `OrderNode` into our flat, storage-ready shape.
 * Pure: no network, no DB — so the mapping logic is fully unit-testable.
 */
export function normalizeOrder(order: OrderNode): NormalizedOrder {
  return {
    shopifyOrderId: order.id,
    orderName: order.name,
    updatedAt: order.updatedAt,
    refunds: order.refunds.map((r) => ({
      shopifyRefundId: r.id,
      refundedAt: r.createdAt,
      amount: r.totalRefundedSet.shopMoney.amount,
      currency: r.totalRefundedSet.shopMoney.currencyCode,
      lineItems: r.refundLineItems.nodes.map((li) => ({
        shopifyLineItemId: li.lineItem?.id ?? null,
        name: li.lineItem?.name ?? null,
        quantity: li.quantity,
        subtotal: li.subtotalSet.shopMoney.amount,
        restockType: li.restockType,
      })),
    })),
    returns: order.returns.nodes.map((ret) => ({
      shopifyReturnId: ret.id,
      name: ret.name,
      status: ret.status,
      totalQuantity: ret.totalQuantity,
      createdAt: ret.createdAt,
      // Keep only ReturnLineItem nodes (skip ExchangeLineItem — not a leak signal).
      lineItems: ret.returnLineItems.nodes
        .filter((li) => li.__typename === "ReturnLineItem")
        .map((li) => ({
          shopifyLineItemId: li.fulfillmentLineItem?.lineItem?.id ?? null,
          name: li.fulfillmentLineItem?.lineItem?.name ?? null,
          quantity: li.quantity ?? 0,
          processedQuantity: li.processedQuantity ?? 0,
          refundedQuantity: li.refundedQuantity ?? 0,
        })),
    })),
  };
}

/**
 * Check if a normalized order contains at least one refund line item.
 * Used for billing metrics: protected orders count.
 */
export function isProtectedOrder(order: NormalizedOrder): boolean {
  return order.refunds.some(refund => refund.lineItems.length > 0);
}

// ── Persistence (idempotent) ──────────────────────────────────────────────────

/**
 * Persist one normalized order's refunds and returns. Every upsert is keyed on a
 * Shopify ID (unique), and line items are replaced wholesale per parent so a
 * changed return converges rather than accumulating stale children.
 */
async function persistOrder(
  shopId: string,
  order: NormalizedOrder,
): Promise<void> {
  const db = getAdminClient();
  const now = new Date().toISOString();

  for (const refund of order.refunds) {
    const { data: refundRow, error } = await db
      .from("synced_refunds")
      .upsert(
        {
          shop_id: shopId,
          shopify_refund_id: refund.shopifyRefundId,
          shopify_order_id: order.shopifyOrderId,
          order_name: order.orderName,
          refund_amount: refund.amount,
          currency: refund.currency,
          refunded_at: refund.refundedAt,
          synced_at: now,
        },
        { onConflict: "shop_id,shopify_refund_id" },
      )
      .select("id")
      .single();
    if (error) throw new Error(`persist refund failed: ${error.message}`);

    // Replace this refund's line items (delete-then-insert scoped to the parent).
    await db.from("synced_refund_line_items").delete().eq("refund_id", refundRow.id);
    if (refund.lineItems.length > 0) {
      const { error: liErr } = await db.from("synced_refund_line_items").insert(
        refund.lineItems.map((li) => ({
          refund_id: refundRow.id,
          shopify_line_item_id: li.shopifyLineItemId,
          name: li.name,
          quantity: li.quantity,
          subtotal: li.subtotal,
          restock_type: li.restockType,
        })),
      );
      if (liErr) throw new Error(`persist refund items failed: ${liErr.message}`);
    }
  }

  for (const ret of order.returns) {
    const { data: returnRow, error } = await db
      .from("synced_returns")
      .upsert(
        {
          shop_id: shopId,
          shopify_return_id: ret.shopifyReturnId,
          shopify_order_id: order.shopifyOrderId,
          name: ret.name,
          status: ret.status,
          totalQuantity: ret.totalQuantity,
          synced_at: now,
        },
        { onConflict: "shop_id,shopify_return_id" },
      )
      .select("id")
      .single();
    if (error) throw new Error(`persist return failed: ${error.message}`);

    await db.from("synced_return_line_items").delete().eq("return_id", returnRow.id);
    if (ret.lineItems.length > 0) {
      const { error: liErr } = await db.from("synced_return_line_items").insert(
        ret.lineItems.map((li) => ({
          return_id: returnRow.id,
          shopify_line_item_id: li.shopifyLineItemId,
          name: li.name,
          quantity: li.quantity,
          processed_quantity: li.processedQuantity,
          refunded_quantity: li.refundedQuantity,
        })),
      );
      if (liErr) throw new Error(`persist return items failed: ${liErr.message}`);
    }
  }
}

/**
 * Full sync for one shop: ensure webhooks, then page every order updated since
 * the stored cursor, persisting refunds + returns. Advances `sync_cursor` to the
 * newest `updatedAt` observed only after the whole run succeeds, so a mid-run
 * failure safely re-processes from the old cursor next time (idempotent).
 *
 * Also counts protected orders for billing metrics (read-only, no enforcement).
 */
export async function syncShop(row: ShopRow): Promise<{ orders: number }> {
  const ctx = shopContextFromRow(row);
  await ensureWebhooksRegistered(ctx);

  // Default to the last 60 days on first sync (Shopify's default order window
  // without `read_all_orders`). ISO timestamp; safe inside the query string.
  const since =
    row.sync_cursor ??
    new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
  const queryFilter = `updated_at:>='${since}'`;

  let cursor: string | null = null;
  let hasNext = true;
  let count = 0;
  let newestUpdatedAt = since;
  let protectedOrdersCount = 0; // Count of orders with at least one refund line item

  while (hasNext) {
    const data: OrdersSinceResponse = await shopifyGraphQL<OrdersSinceResponse>(
      ctx,
      ORDERS_SINCE_QUERY,
      { query: queryFilter, cursor },
    );

    for (const orderNode of data.orders.nodes) {
      const normalized = normalizeOrder(orderNode);
      await persistOrder(row.id, normalized);
      if (normalized.updatedAt > newestUpdatedAt) {
        newestUpdatedAt = normalized.updatedAt;
      }
      count++;

      // Count protected orders for billing (read-only, no enforcement in Package 2)
      if (isProtectedOrder(normalized)) {
        protectedOrdersCount++;
      }
    }

    hasNext = data.orders.pageInfo.hasNextPage;
    cursor = data.orders.pageInfo.endCursor;
  }

  // Advance the cursor only on full success.
  if (newestUpdatedAt !== row.sync_cursor) {
    const { error } = await getAdminClient()
      .from("shops")
      .update({ sync_cursor: newestUpdatedAt })
      .eq("id", row.id);
    if (error) throw new Error(`cursor advance failed: ${error.message}`);
  }

  // Update protected orders count for billing (read-only, no enforcement)
  if (protectedOrdersCount > 0) {
    const { error } = await getAdminClient()
      .from("shops")
      .update({
        usage_current_period: (db: number) => db + protectedOrdersCount,
      })
      .eq("id", row.id);
    if (error) throw new Error(`failed to update usage_current_period: ${error.message}`);
  }

  return { orders: count };
}

/**
 * Near-real-time sync of a single order (the `refunds/create` webhook path).
 * Reuses the same normalize + persist, so it is idempotent with the hourly cron.
 * Does NOT move the shop cursor — the hourly job owns cursor progression.
 */
export async function syncOrder(
  row: ShopRow,
  shopifyOrderId: string,
): Promise<{ found: boolean }> {
  const ctx: ShopApiContext = shopContextFromRow(row);
  const data = await shopifyGraphQL<OrderByIdResponse>(ctx, ORDER_BY_ID_QUERY, {
    id: shopifyOrderId,
  });
  if (!data.order) return { found: false };

  await persistOrder(row.id, normalizeOrder(data.order));
  return { found: true };
}
