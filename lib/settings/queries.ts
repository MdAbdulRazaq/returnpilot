import { getAdminClient } from "@/lib/supabase/admin";
import type { SettingsOutput } from "./types";

export async function getSettings(shopId: string): Promise<SettingsOutput> {
  const db = getAdminClient();

  const { data, error } = await db
    .from('settings')
    .select('notification_email, alerts_enabled')
    .eq('shop_id', shopId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      throw new Error(`Settings not found for shop ${shopId}`);
    }
    throw error;
  }

  if (!data) {
    throw new Error(`Settings not found for shop ${shopId}`);
  }

  return {
    notification_email: data.notification_email,
    alerts_enabled: data.alerts_enabled,
  };
}

export async function updateSettings(
  shopId: string,
  input: { notification_email: string; alerts_enabled: boolean }
): Promise<SettingsOutput> {
  const db = getAdminClient();

  const { data, error } = await db
    .from('settings')
    .update({
      notification_email: input.notification_email,
      alerts_enabled: input.alerts_enabled,
    })
    .eq('shop_id', shopId)
    .select('notification_email, alerts_enabled')
    .single();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error(`Failed to update settings for shop ${shopId}`);
  }

  return {
    notification_email: data.notification_email,
    alerts_enabled: data.alerts_enabled,
  };
}