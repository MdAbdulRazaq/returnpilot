import { NextResponse, type NextRequest } from "next/server";
import { getShopIdFromSession } from "@/lib/auth/session";
import { getAdminClient, type RefundAlertRow } from "@/lib/supabase/admin";
import { ExplanationGenerator } from "@/lib/detection/explanation/generator";
import { type Finding, AlertReason } from "@/lib/detection/types";
import { type NormalizedOrderData } from "@/lib/detection/normalize";
import { type Explanation } from "@/lib/detection/explanation/types";
import { type ExplanationEvidence } from "@/lib/detection/types";
import { ShopId } from "@/lib/detection/types";

// Helper function to construct normalized order data from synced tables
async function constructNormalizedOrderData(
  shopId: string,
  shopifyOrderId: string,
  shopifyRefundId: string
): Promise<NormalizedOrderData> {
  const db = getAdminClient();

  // Fetch synced refund data
  const refundsResult = await db
    .from("synced_refunds")
    .select(`
      id,
      shopify_refund_id,
      shopify_order_id,
      order_name,
      refund_amount,
      currency,
      refunded_at,
      synced_at,
      synced_refund_line_items (
        id,
        shopify_line_item_id,
        name,
        quantity,
        subtotal,
        restock_type
      )
    `)
    .eq("shop_id", shopId)
    .eq("shopify_order_id", shopifyOrderId)
    .eq("shopify_refund_id", shopifyRefundId);

  if (refundsResult.error) {
    throw new Error(`Failed to fetch refund data: ${refundsResult.error.message}`);
  }

  const syncedRefunds = refundsResult.data || [];

  // Fetch synced return data
  const returnsResult = await db
    .from("synced_returns")
    .select(`
      id,
      shopify_return_id,
      shopify_order_id,
      order_name,
      status,
      total_quantity,
      synced_at,
      synced_return_line_items (
        id,
        shopify_line_item_id,
        name,
        quantity,
        processed_quantity,
        refunded_quantity
      )
    `)
    .eq("shop_id", shopId)
    .eq("shopify_order_id", shopifyOrderId);

  if (returnsResult.error) {
    throw new Error(`Failed to fetch return data: ${returnsResult.error.message}`);
  }

  const syncedReturns = returnsResult.data || [];

  // Construct normalized order data
  // This is a simplified version - in reality, the normalization logic is more complex
  // but for explanation purposes, we need reasonable approximations

  const refunds = syncedRefunds.map(refund => ({
    id: refund.id,
    shopifyRefundId: refund.shopify_refund_id,
    shopifyOrderId: refund.shopify_order_id,
    createdAt: new Date(refund.synced_at),
    totalRefundedAmount: parseFloat(refund.refund_amount || "0"),
    currency: refund.currency || "USD",
    lineItems: (refund.synced_refund_line_items || []).map(lineItem => ({
      id: lineItem.id,
      shopifyLineItemId: lineItem.shopify_line_item_id || null,
      name: lineItem.name || null,
      quantity: lineItem.quantity || 0,
      subtotal: parseFloat(lineItem.subtotal || "0"),
      restockType: lineItem.restock_type || null
    }))
  }));

  const returns = syncedReturns.map(returnOrder => ({
    id: returnOrder.id,
    shopifyReturnId: returnOrder.shopify_return_id,
    shopifyOrderId: returnOrder.shopify_order_id,
    createdAt: new Date(returnOrder.synced_at),
    status: returnOrder.status || "",
    totalQuantity: returnOrder.total_quantity || 0,
    lineItems: (returnOrder.synced_return_line_items || []).map(lineItem => ({
      id: lineItem.id,
      shopifyLineItemId: lineItem.shopify_line_item_id || null,
      name: lineItem.name || null,
      quantity: lineItem.quantity || 0,
      processedQuantity: lineItem.processed_quantity || 0,
      refundedQuantity: lineItem.refunded_quantity || 0
    }))
  }));

  // Calculate updatedAt as the most recent date among refunds and returns
  const allDates = [
    ...refunds.map(r => r.createdAt),
    ...returns.map(r => r.createdAt)
  ];
  const updatedAt = allDates.length > 0 ? new Date(Math.max(...allDates.map(d => d.getTime()))) : new Date();

  // Create a local interface that extends NormalizedOrderData with an id for internal use
  interface NormalizedOrderDataWithId extends NormalizedOrderData {
    id: string;
  }

  return {
    id: `${shopifyOrderId}-${shopifyRefundId}`,
    shopifyOrderId,
    shopId: shopId as ShopId,
    shopifyOrderName: syncedRefunds[0]?.order_name || null,
    updatedAt,
    refunds,
    returns
  } as NormalizedOrderDataWithId;
}

// Helper function to determine triggeredBy array based on alert reason and data
function determineTriggeredBy(
  reason: AlertReason,
  data: NormalizedOrderData
): string[] {
  const triggered: string[] = [];

  switch (reason) {
    case AlertReason.NO_RETURN:
      // Check if grace period has passed (simplified - 7 days)
      triggered.push("Grace period exceeded for refund");

      // Check if there are no returns at all
      if (data.returns.length === 0) {
        triggered.push("No returns found for order");
      }

      // Check specific refunds past grace period
      const now = new Date();
      const gracePeriodMs = 7 * 24 * 60 * 60 * 1000; // 7 days
      const refundsPastGrace = data.refunds.filter(
        refund => now.getTime() - refund.createdAt.getTime() > gracePeriodMs
      );
      if (refundsPastGrace.length > 0) {
        triggered.push(`${refundsPastGrace.length} refund(s) past grace period`);
      }
      break;

    case AlertReason.RETURN_NOT_RECEIVED:
      triggered.push("Return exists but no goods processed");
      triggered.push("Processed quantity is zero for refunded line item");
      break;

    case AlertReason.QUANTITY_SHORTFALL:
      triggered.push("Refunded quantity exceeds processed quantity");
      triggered.push("Partial return detected - some goods processed but not all");
      break;
  }

  return triggered;
}

// Helper function to construct evidence object
function constructEvidence(
  alert: RefundAlertRow,
  data: NormalizedOrderData
): ExplanationEvidence {
  // Find the specific refund related to this alert
  const refund = data.refunds.find(r => r.shopifyRefundId === alert.shopify_refund_id);

  // Find the specific line item if we have alert line item info
  // For now, we'll use the first line item of the first refund as approximation
  const lineItem = refund?.lineItems[0] || null;

  const evidence: ExplanationEvidence = {
    // Basic order information
    orderId: data.shopifyOrderId,
    refundCount: data.refunds.length,
    returnCount: data.returns.length,

    // Timing information
    orderDate: data.updatedAt.toISOString(),

    // Financial information
    totalRefundAmount: data.refunds.reduce((sum, r) => sum + r.totalRefundedAmount, 0),
    currency: data.refunds[0]?.currency || "USD",

    // Line item information specific to the finding
    lineItemId: lineItem?.shopifyLineItemId ?? undefined,
    moneyAtRisk: parseFloat(alert.money_at_risk)
  };

  // Add specific evidence based on alert reason
  if (alert.reason === "NO_RETURN" || alert.reason === "RETURN_NOT_RECEIVED" || alert.reason === "QUANTITY_SHORTFALL") {
    // Find the specific refund line item related to this finding
    const refundLineItem = data.refunds
      .flatMap(refund => refund.lineItems)
      .find(item => item.shopifyLineItemId === evidence.lineItemId);

    if (refundLineItem) {
      evidence.refundLineItemQuantity = refundLineItem.quantity;
      evidence.refundLineItemSubtotal = refundLineItem.subtotal;
    }

    // Find return line items for comparison
    const returnLineItems = data.returns
      .flatMap(returnOrder => returnOrder.lineItems)
      .filter(item => item.shopifyLineItemId === evidence.lineItemId);

    if (returnLineItems.length > 0) {
      const totalProcessed = returnLineItems.reduce((sum, item) => sum + item.processedQuantity, 0);
      evidence.totalProcessedQuantity = totalProcessed;

      if (alert.reason === "QUANTITY_SHORTFALL") {
        const refundedQty = data.refunds
          .flatMap(refund => refund.lineItems)
          .find(item => item.shopifyLineItemId === evidence.lineItemId)?.quantity ?? 0;
        evidence.quantityDifference = refundedQty - totalProcessed;
      }
    }
  }

  return evidence;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/alerts/[id]/explanation — get explanation data for an alert.
 *
 * Verifies the alert belongs to the authenticated shop before generating explanation.
 * Caller must be authenticated via the session cookie.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id: alertId } = await params;

  const shopId = await getShopIdFromSession(req.cookies);
  if (!shopId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const db = getAdminClient();

    // Fetch the alert
    const { data: alertData, error: alertError } = await db
      .from("refund_alerts")
      .select("*")
      .eq("id", alertId)
      .eq("shop_id", shopId)
      .single();

    if (alertError) {
      throw new Error(`Failed to fetch alert: ${alertError.message}`);
    }

    if (!alertData) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    // Construct normalized order data from synced tables
    const normalizedData = await constructNormalizedOrderData(
      shopId,
      alertData.shopify_order_id,
      alertData.shopify_refund_id
    );

    // Create a mock finding from the alert data
    const finding: Finding = {
      shopId: alertData.shop_id,
      shopifyRefundId: alertData.shopify_refund_id,
      shopifyOrderId: alertData.shopify_order_id,
      shopifyLineItemId: alertData.shopify_line_item_id || null,
      reason: alertData.reason as AlertReason,
      moneyAtRisk: parseFloat(alertData.money_at_risk),
      createdAt: new Date(alertData.detected_at),
      updatedAt: new Date(alertData.detected_at),
      reviewedAt: alertData.reviewed_at ? new Date(alertData.reviewed_at) : null,
      dismissedAt: alertData.dismissed_at ? new Date(alertData.dismissed_at) : null,
      strategyIdentifier: undefined // We don't have this persisted, so leave undefined
    };

    // Generate explanation using the shop's explanation configuration
    const explanation = await ExplanationGenerator.generate(
      finding,
      normalizedData,
      shopId
    );

    return NextResponse.json({ explanation, strategyIdentifier: finding.strategyIdentifier });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to generate explanation";
    // Distinguish authorization (not found/access denied) from server errors
    const status =
      message.includes("access denied") ||
      message.includes("not found") ||
      message.includes("Failed to fetch") ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}