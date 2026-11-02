// TypeScript interfaces for email digest milestone
export interface Shop {
  id: string;
  email: string; // guaranteed non-null from query (notification_email not null)
  uninstalled_at: string | null;
  encrypted_access_token: string | null;
  alerts_enabled: boolean; // whether this shop should receive email digests
}

export interface AlertRow {
  id: string;
  shop_id: string;
  shopify_refund_id: string;
  shopify_order_id: string;
  order_name: string | null;
  refund_amount: number;
  currency: string;
  money_at_risk: number;
  reason: 'NO_RETURN' | 'RETURN_NOT_RECEIVED' | 'QUANTITY_SHORTFALL';
  status: 'open' | 'reviewed' | 'dismissed';
  refunded_at: string | null;
  detected_at: string; // ISO timestamp
}

export interface DeliveryRecord {
  id: string;
  shop_id: string;
  notification_type: string;
  window_start: string; // ISO timestamp
  window_end: string; // ISO timestamp
  sent_at: string | null; // ISO timestamp
  status: 'sent' | 'failed';
  provider_message_id: string | null;
  alert_count: number;
  duration_ms: number;
  created_at: string; // ISO timestamp
}

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text: string;
}