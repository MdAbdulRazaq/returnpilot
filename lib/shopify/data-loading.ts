// lib/shopify/data-loading.ts
import "server-only";

import { shopifyGraphQL, ShopifyApiError, ShopApiContext } from "./graphql";
import {
  ORDERS_SINCE_QUERY,
  ORDER_BY_ID_QUERY,
  OrdersSinceResponse,
  OrderByIdResponse,
  OrderNode,
  RefundNode,
  ReturnNode,
  RefundLineItemNode,
  ReturnLineItemNode,
} from "./queries";

/**
 * Loads orders, refunds, and returns from Shopify, paginating as needed.
 *
 * This function handles the complexities of the Shopify Admin API:
 *   - Paging orders by `updatedAt` (Shopify doesn't offer `refundsSince`).
 *   - Extracting nested refunds and returns from each order.
 *   - Retrying transient network/API errors.
 *
 * It is read-only and never modifies Shopify data. Batching is handled by
 * fetching multiple refunds/returns/line items per order.
 *
 * @param ctx The authenticated Shopify API context for a shop.
 * @param lastSyncedAt The timestamp of the last successful sync. Orders updated
 *   at or after this time will be fetched.
 * @returns A generator that yields `OrderNode` objects.
 */
export async function* loadOrdersSince(
  ctx: ShopApiContext,
  lastSyncedAt: Date,
): AsyncGenerator<OrderNode> {
  const query = `updated_at:>=${lastSyncedAt.toISOString()}`;
  let hasNextPage = true;
  let cursor: string | null = null;

  while (hasNextPage) {
    let response: OrdersSinceResponse;
    try {
      response = await shopifyGraphQL<OrdersSinceResponse>(
        ctx,
        ORDERS_SINCE_QUERY,
        { query, cursor },
      );
    } catch (error) {
      if (error instanceof ShopifyApiError && error.retryable) {
        // If it's a retryable error, the shopifyGraphQL function itself
        // handles retries. If it still fails after max attempts, it throws
        // the error. We re-throw here.
        throw error;
      }
      // Non-retryable errors are re-thrown immediately.
      throw error;
    }

    if (!response.orders || !response.orders.nodes) {
      console.warn("Shopify returned no orders data.", response);
      return;
    }

    for (const order of response.orders.nodes) {
      yield order;
    }

    hasNextPage = response.orders.pageInfo.hasNextPage;
    cursor = response.orders.pageInfo.endCursor;
  }
}

/**
 * Loads a single order, including its refunds and returns, from Shopify by ID.
 * This is used for near-real-time updates via webhooks.
 *
 * @param ctx The authenticated Shopify API context for a shop.
 * @param orderId The Shopify GID of the order to fetch.
 * @returns The `OrderNode` if found, otherwise `null`.
 */
export async function loadOrderById(
  ctx: ShopApiContext,
  orderId: string,
): Promise<OrderNode | null> {
  try {
    const response = await shopifyGraphQL<OrderByIdResponse>(
      ctx,
      ORDER_BY_ID_QUERY,
      { id: orderId },
    );
    return response.order;
  } catch (error) {
    if (error instanceof ShopifyApiError && error.retryable) {
      throw error; // Let the caller handle retry for this specific error type
    }
    // For non-retryable errors or other types of errors, log and return null
    console.error(`Failed to load order ${orderId} by ID:`, error);
    return null;
  }
}

// Re-export types for convenience when consuming this module
export type { OrderNode, RefundNode, ReturnNode, RefundLineItemNode, ReturnLineItemNode };
