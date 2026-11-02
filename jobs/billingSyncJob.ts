import { getAdminClient, type ShopRow } from "@/lib/supabase/admin";
import { shopifyGraphQL, type ShopApiContext } from "@/lib/shopify/graphql";
import { logBillingEvent, BillingEventType } from "@/lib/supabase/admin";
import { SubscriptionValidator } from "@/services/subscriptionValidator";

/**
 * Background job to synchronize billing state with Shopify.
 * This job should be scheduled to run periodically (e.g., daily) and
 * will synchronize subscription state for all shops.
 */
export async function billingSyncJob(): Promise<void> {
  const db = getAdminClient();
  const now = new Date();

  try {
    // Get all shops that have a Shopify domain (excluding uninstalled)
    const { data: shops, error } = await db
      .from("shops")
      .select("id, shop_domain, subscription_id, billing_active")
      .not("shop_domain", "is", null)
      .is("uninstalled_at", null)
      .returns<ShopRow[]>();

    if (error) {
      throw new Error(`Failed to fetch shops for billing sync: ${error.message}`);
    }

    let syncSuccessCount = 0;
    let syncFailureCount = 0;

    for (const shop of shops) {
      try {
        // Validate and synchronize this shop's subscription with Shopify
        const isValid = await SubscriptionValidator.validateSubscription(shop);

        if (isValid) {
          syncSuccessCount++;
        } else {
          syncFailureCount++;
        }
      } catch (error) {
        console.error(`Failed to sync billing for shop ${shop.id}:`, error);
        syncFailureCount++;
      }
    }

    console.log(`Billing sync job completed. Success: ${syncSuccessCount}, Failed: ${syncFailureCount}.`);

    // Log overall job status
    await logBillingEvent("system", "billing_sync_job_completed", {
      successCount: syncSuccessCount,
      failureCount: syncFailureCount,
      totalShops: shops.length,
      completedAt: now.toISOString()
    });
  } catch (error) {
    console.error("Billing sync job failed:", error);
    throw error;
  }
}

export default billingSyncJob;