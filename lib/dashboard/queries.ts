import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { RefundReason, AlertStatus, RefundAlertRow } from "@/lib/supabase/admin";

export interface AlertFilterParams {
  status: "all" | "open" | "reviewed" | "dismissed";
  reason: "all" | "NO_RETURN" | "RETURN_NOT_RECEIVED" | "QUANTITY_SHORTFALL";
  search: string;
  page: number;
  pageSize: number;
  sort: "detected_at" | "money_at_risk" | "refunded_at";
  order: "asc" | "desc";
}

export interface AlertRow {
  id: string;
  shopify_order_id: string;
  order_name: string | null;
  shopify_refund_id: string;
  reason: RefundReason;
  money_at_risk: string;
  detected_at: string;
  status: AlertStatus;
  reviewed_at: string | null;
  dismissed_at: string | null;
  refunded_at: string | null;
}

export interface AlertCounts {
  open: number;
  reviewed: number;
  dismissed: number;
  moneyAtRisk: number;
}

function toAlertRow(row: RefundAlertRow): AlertRow {
  return {
    id: row.id,
    shopify_order_id: row.shopify_order_id,
    order_name: row.order_name,
    shopify_refund_id: row.shopify_refund_id,
    reason: row.reason,
    money_at_risk: row.money_at_risk,
    detected_at: row.detected_at,
    status: row.status,
    reviewed_at: row.reviewed_at,
    dismissed_at: row.dismissed_at,
    refunded_at: row.refunded_at,
  };
}

export async function getAlertCounts(shopId: string): Promise<AlertCounts> {
  const db = getAdminClient();

  const [{ count: open }, { count: reviewed }, { count: dismissed }, { data: riskData }] = await Promise.all([
    db.from("refund_alerts").select("*", { count: "exact", head: true }).eq("shop_id", shopId).eq("status", "open"),
    db.from("refund_alerts").select("*", { count: "exact", head: true }).eq("shop_id", shopId).eq("status", "reviewed"),
    db.from("refund_alerts").select("*", { count: "exact", head: true }).eq("shop_id", shopId).eq("status", "dismissed"),
    db.from("refund_alerts").select("money_at_risk").eq("shop_id", shopId).eq("status", "open"),
  ]);

  const moneyAtRisk = (riskData ?? []).reduce((sum, row) => sum + parseFloat(row.money_at_risk), 0);

  return {
    open: open ?? 0,
    reviewed: reviewed ?? 0,
    dismissed: dismissed ?? 0,
    moneyAtRisk,
  };
}

export async function getAlerts(shopId: string, params: AlertFilterParams): Promise<AlertRow[]> {
  const db = getAdminClient();

  let query = db.from("refund_alerts").select("*").eq("shop_id", shopId);

  if (params.status !== "all") {
    query = query.eq("status", params.status);
  }
  if (params.reason !== "all") {
    query = query.eq("reason", params.reason);
  }
  if (params.search.trim()) {
    const term = `%${params.search.trim()}%`;
    query = query.or(`order_name.ilike.${term},shopify_order_id.ilike.${term},shopify_refund_id.ilike.${term}`);
  }

  const sortCol = params.sort === "money_at_risk" ? "money_at_risk" : params.sort;
  query = query.order(sortCol, { ascending: params.order === "asc" });

  const from = (params.page - 1) * params.pageSize;
  const to = from + params.pageSize - 1;
  query = query.range(from, to);

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch alerts: ${error.message}`);

  return (data ?? []).map(toAlertRow);
}

export async function getTotalCount(shopId: string, params: AlertFilterParams): Promise<number> {
  const db = getAdminClient();

  let query = db.from("refund_alerts").select("*", { count: "exact", head: true }).eq("shop_id", shopId);

  if (params.status !== "all") {
    query = query.eq("status", params.status);
  }
  if (params.reason !== "all") {
    query = query.eq("reason", params.reason);
  }
  if (params.search.trim()) {
    const term = `%${params.search.trim()}%`;
    query = query.or(`order_name.ilike.${term},shopify_order_id.ilike.${term},shopify_refund_id.ilike.${term}`);
  }

  const { count, error } = await query;
  if (error) throw new Error(`Failed to count alerts: ${error.message}`);

  return count ?? 0;
}

export async function reviewAlert(shopId: string, alertId: string): Promise<void> {
  const db = getAdminClient();
  const { data, error } = await db
    .from("refund_alerts")
    .update({ status: "reviewed", reviewed_at: new Date().toISOString() })
    .eq("id", alertId)
    .eq("shop_id", shopId)
    .select("id");
  if (error) throw new Error(`Failed to review alert: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error("Alert not found or access denied");
  }
}

export async function dismissAlert(shopId: string, alertId: string): Promise<void> {
  const db = getAdminClient();
  const { data, error } = await db
    .from("refund_alerts")
    .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
    .eq("id", alertId)
    .eq("shop_id", shopId)
    .select("id");
  if (error) throw new Error(`Failed to dismiss alert: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error("Alert not found or access denied");
  }
}

// NEW FUNCTIONS FOR PACKAGE 4
export async function createFeedback(
  shopId: string,
  alertId: string,
  feedbackType: "confirmed" | "false_positive" | "comment",
  comment: string | null
): Promise<void> {
  const db = getAdminClient();
  const { data, error } = await db
    .from("alert_feedback")
    .insert({
      shop_id: shopId,
      alert_id: alertId,
      feedback_type: feedbackType,
      comment: comment,
    })
    .select("id");
  if (error) throw new Error(`Failed to create feedback: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error("Failed to create feedback");
  }
}

export async function confirmAlert(shopId: string, alertId: string): Promise<void> {
  const db = getAdminClient();
  const { data, error } = await db
    .from("alert_feedback")
    .insert({
      shop_id: shopId,
      alert_id: alertId,
      feedback_type: "confirmed",
      comment: null,
    })
    .select("id");
  if (error) throw new Error(`Failed to confirm alert: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error("Failed to confirm alert");
  }
}