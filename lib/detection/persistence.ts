// lib/detection/persistence.ts

import "server-only";

import { Finding, AlertReason, ShopId } from "./types";
import { getAdminClient, RefundAlertRow, RefundReason } from "@/lib/supabase/admin";
import { logInfo, logError } from "@/lib/log";

/**
 * Persists findings to the database using UPSERT.
 *
 * This function handles upserting `Finding` objects into the `refund_alerts` table.
 * It maps `Finding` properties to `RefundAlertRow` columns, preserving existing
 * `reviewedAt` and `dismissedAt` statuses, and updating `money_at_risk`.
 *
 * @param findings An array of `Finding` objects to persist.
 * @param shopId The ID of the shop to which these findings belong.
 */
export async function saveFindings(findings: Finding[], shopId: ShopId) {
  const client = getAdminClient();

  for (const finding of findings) {
    const { shopifyRefundId, shopifyOrderId, shopifyLineItemId, reason, moneyAtRisk } = finding;

    // Map `AlertReason` enum to the `reason` column type in the database.
    const refundReason = mapAlertReasonToDb(reason);

    // Fetch the existing alert if it exists, to preserve reviewedAt and dismissedAt.
    // We query by shop_id, shopify_refund_id, and reason.
    const { data: existingAlerts, error: fetchError } = await client
      .from("refund_alerts")
      .select("id, reviewed_at, dismissed_at")
      .eq("shop_id", shopId)
      .eq("shopify_refund_id", shopifyRefundId)
      .eq("reason", refundReason)
      .limit(1);

    if (fetchError) {
      logError(`Error fetching existing alert for refund ${shopifyRefundId}, reason ${reason}`, fetchError);
      continue;
    }

    const existingAlert = existingAlerts?.[0];
    const now = new Date().toISOString();

    const baseData: Partial<RefundAlertRow> = {
      shop_id: shopId,
      shopify_refund_id: shopifyRefundId,
      shopify_order_id: shopifyOrderId || "",
      order_name: null,
      refund_amount: "0.00",
      currency: "USD",
      money_at_risk: moneyAtRisk.toFixed(2),
      reason: refundReason,
      status: "open",
      detected_at: now,
      refunded_at: null,
    };

    // Preserve reviewedAt and dismissedAt if an existing alert was found.
    if (existingAlert) {
      baseData.reviewed_at = existingAlert.reviewed_at;
      baseData.dismissed_at = existingAlert.dismissed_at;
    } else {
      baseData.reviewed_at = null;
      baseData.dismissed_at = null;
    }

    const { error: upsertError } = await client
      .from("refund_alerts")
      .upsert(
        {
          ...baseData,
          shopify_line_item_id: shopifyLineItemId === null ? null : shopifyLineItemId,
        },
        {
          onConflict: `shop_id, shopify_refund_id, reason`,
        },
      );

    if (upsertError) {
      logError(`Error UPSERTing alert for refund ${shopifyRefundId}, reason ${reason}`, upsertError);
    } else {
      logInfo(`Saved finding`, {
        shopId,
        shopifyRefundId,
        reason,
        moneyAtRisk,
      });
    }
  }
}

/**
 * Maps the internal AlertReason enum to the database's RefundReason enum.
 *
 * @param reason The AlertReason enum value.
 * @returns The corresponding RefundReason enum value for the database.
 */
function mapAlertReasonToDb(reason: AlertReason): RefundReason {
  switch (reason) {
    case AlertReason.NO_RETURN:
      return "NO_RETURN";
    case AlertReason.RETURN_NOT_RECEIVED:
      return "RETURN_NOT_RECEIVED";
    case AlertReason.QUANTITY_SHORTFALL:
      return "QUANTITY_SHORTFALL";
    default:
      // Exhaustiveness check - TS will error if a new AlertReason is added without handling
      const _exhaustive: never = reason;
      throw new Error(`Unknown alert reason: ${String(_exhaustive)}`);
  }
}