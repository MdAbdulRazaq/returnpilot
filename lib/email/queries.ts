// Data access layer for email digest functionality
import "server-only";

import { getAdminClient } from "@/lib/supabase/admin";
import type { Shop, AlertRow, DeliveryRecord } from './types';

/**
 * Get list of shops that should receive email digests
 * Only active shops with email, not uninstalled, and with valid access tokens
 */
export async function getShopList(): Promise<Shop[]> {
  const db = getAdminClient();

  const { data, error } = await db
    .from('shops')
    .select('id, uninstalled_at, access_token_ciphertext, settings!inner(notification_email, alerts_enabled)')
    .not('settings.notification_email', 'is', null)
    .is('uninstalled_at', null)
    .not('access_token_ciphertext', 'is', null)
    .order('id');

  if (error) throw error;
  // Map to flat Shop objects (notification_email is guaranteed not null by filter)
  return (data ?? []).map(row => {
    const settings = row.settings?.[0];
    const notificationEmail = settings?.notification_email;
    return {
      id: row.id,
      email: notificationEmail as string, // non-null after filter, but keep as string (could be undefined? filtered)
      uninstalled_at: row.uninstalled_at,
      encrypted_access_token: row.access_token_ciphertext,
      alerts_enabled: settings?.alerts_enabled ?? true // default to true if not present (shouldn't happen with inner join)
    };
  });
}

/**
 * Get the most recent successful delivery for a shop and notification type
 * Uses window_end as the authoritative timestamp for window chaining
 */
export async function getLastSuccessfulDelivery(
  shopId: string,
  notificationType: string
): Promise<DeliveryRecord | null> {
  const db = getAdminClient();

  const { data, error } = await db
    .from('notification_deliveries')
    .select('*')
    .eq('shop_id', shopId)
    .eq('notification_type', notificationType)
    .eq('status', 'sent')
    .order('window_end', { ascending: false })
    .limit(1)
    .single();

  // Handle case where no rows found (returns null for data, error with code PGRST116)
  if (error && error.code === 'PGRST116') return null;
  if (error) throw error;
  return data;
}

/**
 * Get refund alerts for a shop within a specific time window
 * Returns alerts sorted deterministically for consistent email rendering
 */
export async function getAlertsSince(
  shopId: string,
  windowStart: string,
  windowEnd: string
): Promise<AlertRow[]> {
  const db = getAdminClient();

  const { data, error } = await db
    .from('refund_alerts')
    .select(
      'id, shop_id, shopify_refund_id, shopify_order_id, order_name, refund_amount, currency, money_at_risk, reason, status, refunded_at, detected_at'
    )
    .eq('shop_id', shopId)
    .gte('detected_at', windowStart)
    .lt('detected_at', windowEnd)
    .in('status', ['open', 'reviewed'])
    .order('detected_at', { ascending: true })
    .order('shopify_refund_id', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw error;
  return data ?? [];
}

/**
 * Record an email delivery attempt (success or failure)
 */
export async function recordDeliveryAttempt(
  delivery: Omit<DeliveryRecord, 'id' | 'created_at'>
): Promise<DeliveryRecord> {
  const db = getAdminClient();

  const { data, error } = await db
    .from('notification_deliveries')
    .insert([delivery])
    .select()
    .single();

  if (error) throw error;
  return data;
}