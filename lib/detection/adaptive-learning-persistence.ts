// lib/detection/adaptive-learning-persistence.ts
import "server-only";

import { ShopId } from "./types";
import { getAdminClient } from "@/lib/supabase/admin";
import { logInfo, logError } from "@/lib/log";

/**
 * Interface representing the adaptive learning parameters to store in the database.
 * Only stores aggregated, anonymized statistics - no raw order data or PII.
 */
export interface AdaptiveLearningParameters {
  shop_id: ShopId;
  refund_amount_mean: number | null;
  refund_amount_m2: number | null;
  refund_amount_count: number | null;
  refund_count_mean: number | null;
  refund_count_m2: number | null;
  refund_count_count: number | null;
  line_item_count_mean: number | null;
  line_item_count_m2: number | null;
  line_item_count_count: number | null;
  seasonal_pattern_monday: number | null;
  seasonal_pattern_tuesday: number | null;
  seasonal_pattern_wednesday: number | null;
  seasonal_pattern_thursday: number | null;
  seasonal_pattern_friday: number | null;
  seasonal_pattern_saturday: number | null;
  seasonal_pattern_sunday: number | null;
  global_refund_average: number | null;
  updated_at: string;
}

/**
 * Persists adaptive learning parameters to the database using UPSERT.
 * This function handles upserting adaptive learning parameters into the `adaptive_learning_parameters` table.
 * It stores only aggregated statistics (mean, M2, count) for privacy preservation.
 *
 * @param shopId The ID of the shop to which these parameters belong.
 * @param parameters The adaptive learning parameters to persist.
 */
export async function saveAdaptiveLearningParameters(
  shopId: ShopId,
  parameters: Partial<AdaptiveLearningParameters>
): Promise<void> {
  const client = getAdminClient();

  // Ensure required fields are present
  const completeParameters: AdaptiveLearningParameters = {
    shop_id: shopId,
    refund_amount_mean: parameters.refund_amount_mean ?? null,
    refund_amount_m2: parameters.refund_amount_m2 ?? null,
    refund_amount_count: parameters.refund_amount_count ?? null,
    refund_count_mean: parameters.refund_count_mean ?? null,
    refund_count_m2: parameters.refund_count_m2 ?? null,
    refund_count_count: parameters.refund_count_count ?? null,
    line_item_count_mean: parameters.line_item_count_mean ?? null,
    line_item_count_m2: parameters.line_item_count_m2 ?? null,
    line_item_count_count: parameters.line_item_count_count ?? null,
    seasonal_pattern_monday: parameters.seasonal_pattern_monday ?? null,
    seasonal_pattern_tuesday: parameters.seasonal_pattern_tuesday ?? null,
    seasonal_pattern_wednesday: parameters.seasonal_pattern_wednesday ?? null,
    seasonal_pattern_thursday: parameters.seasonal_pattern_thursday ?? null,
    seasonal_pattern_friday: parameters.seasonal_pattern_friday ?? null,
    seasonal_pattern_saturday: parameters.seasonal_pattern_saturday ?? null,
    seasonal_pattern_sunday: parameters.seasonal_pattern_sunday ?? null,
    global_refund_average: parameters.global_refund_average ?? null,
    updated_at: new Date().toISOString(),
  };

  try {
    const { error: upsertError } = await client
      .from("adaptive_learning_parameters")
      .upsert(
        {
          ...completeParameters,
        },
        {
          onConflict: `shop_id`,
        },
      );

    if (upsertError) {
      logError(`Error UPSERTing adaptive learning parameters for shop ${shopId}`, upsertError);
      throw upsertError;
    } else {
      logInfo(`Saved adaptive learning parameters for shop ${shopId}`);
    }
  } catch (error) {
    logError(`Failed to save adaptive learning parameters for shop ${shopId}`, error);
    throw error;
  }
}

/**
 * Retrieves adaptive learning parameters from the database for a given shop.
 * Returns null if no parameters exist for the shop.
 *
 * @param shopId The ID of the shop to retrieve parameters for.
 * @returns The adaptive learning parameters or null if not found.
 */
export async function getAdaptiveLearningParameters(
  shopId: ShopId
): Promise<AdaptiveLearningParameters | null> {
  const client = getAdminClient();

  try {
    const { data, error } = await client
      .from("adaptive_learning_parameters")
      .select("*")
      .eq("shop_id", shopId)
      .single();

    if (error) {
      // If no data found, return null (not an error)
      if (error.code === "PGRST116") {
        return null;
      }
      logError(`Error fetching adaptive learning parameters for shop ${shopId}`, error);
      throw error;
    }

    if (!data) {
      return null;
    }

    return data as AdaptiveLearningParameters;
  } catch (error) {
    logError(`Failed to get adaptive learning parameters for shop ${shopId}`, error);
    throw error;
  }
}