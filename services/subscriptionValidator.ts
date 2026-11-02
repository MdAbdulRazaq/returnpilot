import { shopifyGraphQL, type ShopApiContext } from "@/lib/shopify/graphql";
import { getAdminClient, type ShopRow } from "@/lib/supabase/admin";
import { logBillingEvent, BillingEventType } from "@/lib/supabase/admin";

/**
 * Service to validate subscriptions against Shopify's API.
 * Synchronizes local subscription state with Shopify's source of truth.
 */
export class SubscriptionValidator {
  /**
   * Validates a shop's subscription against Shopify's API and updates local state.
   * @param shop The shop to validate
   * @returns True if validation succeeded, false otherwise
   */
  static async validateSubscription(shop: ShopRow): Promise<boolean> {
    if (!shop.shop_domain) {
      console.error("Subscription validation failed: Missing shop domain");
      return false;
    }

    const ctx: ShopApiContext = {
      shopDomain: shop.shop_domain,
      accessToken: shop.access_token_ciphertext
        // In a real implementation, we would decrypt the token here
        // For now, assuming we have access to the decrypted token via some method
        || ""
    };

    try {
      // Query the current active app subscription from Shopify
      const subscription = await this.queryShopifySubscription(ctx);

      // Update local state based on Shopify response
      await this.updateLocalSubscriptionState(shop.id, subscription);

      // Log the validation event
      await logBillingEvent(shop.id, "subscription_validation", {
        success: true,
        shopifySubscriptionId: subscription?.adminGraphqlApiId || null,
        localSubscriptionId: shop.subscription_id || null,
        validatedAt: new Date().toISOString()
      });

      return true;
    } catch (error) {
      console.error(`Subscription validation failed for shop ${shop.id}:`, error);

      // Log the validation failure
      await logBillingEvent(shop.id, "subscription_validation_failed", {
        error: error instanceof Error ? error.message : String(error),
        shopifySubscriptionId: null,
        localSubscriptionId: shop.subscription_id || null,
        validatedAt: new Date().toISOString()
      });

      return false;
    }
  }

  /**
   * Queries Shopify for the current active app subscription.
   * @param ctx The Shopify API context
   * @returns The subscription data from Shopify or null if none
   */
  private static async queryShopifySubscription(ctx: ShopApiContext): Promise<{
    id: string;
    adminGraphqlApiId: string;
    test: boolean;
    createdAt: string;
    status: string;
  } | null> {
    const query = `
      query AppSubscription {
        appSubscription {
          id
          adminGraphqlApiId
          test
          createdAt
          status
        }
      }
    `;

    const data = await shopifyGraphQL<{
      appSubscription: {
        id: string;
        adminGraphqlApiId: string;
        test: boolean;
        createdAt: string;
        status: string;
      } | null;
    }>(ctx, query);

    return data.appSubscription;
  }

  /**
   * Updates the local subscription state based on Shopify response.
   * @param shopId The shop ID
   * @param shopifySubscription The subscription data from Shopify or null if none
   */
  private static async updateLocalSubscriptionState(
    shopId: string,
    shopifySubscription: {
      id: string;
      adminGraphqlApiId: string;
      test: boolean;
      createdAt: string;
      status: string;
    } | null
  ): Promise<void> {
    const db = getAdminClient();

    // Determine local state based on Shopify subscription
    const billingActive = shopifySubscription?.status === "ACTIVE";
    const subscriptionId = shopifySubscription?.id ?? null;

    // Update the shop record
    const { error } = await db
      .from("shops")
      .update({
        billing_active: billingActive,
        subscription_id: subscriptionId,
        // Update timestamp to track when we last validated
        // In a real implementation, we might want a separate field for this
      })
      .eq("id", shopId);

    if (error) {
      throw new Error(`Failed to update shop subscription state: ${error.message}`);
    }
  }
}

export default SubscriptionValidator;