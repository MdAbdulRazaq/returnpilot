import "server-only";

import { shopifyGraphQL, type ShopApiContext, ShopifyApiError } from "@/lib/shopify/graphql";

/**
 * Shopify Billing API wrapper for app subscription management.
 *
 * All Shopify traffic goes through `lib/shopify/graphql.ts` (the single client).
 * This module owns: authentication, retries, throttling, error handling (via graphql.ts).
 */

/**
 * Input for creating an app subscription.
 */
export interface AppSubscriptionInput {
  /** Name of the plan as it will appear to the merchant. */
  name: string;
  /** Whether this is a test subscription. */
  test?: boolean;
  /** Return URL for the merchant to confirm the charge. */
  returnUrl: string;
}

/**
 * Response from creating an app subscription.
 */
export interface AppSubscriptionResponse {
  id: string;
  adminGraphqlApiId: string;
  test: boolean;
  createdAt: string;
}

/**
 * Create an app subscription for a shop.
 *
 * @param ctx Authenticated context for the shop
 * @param input Subscription details
 * @returns Created subscription data
 */
export async function createAppSubscription(
  ctx: ShopApiContext,
  input: AppSubscriptionInput,
): Promise<AppSubscriptionResponse> {
  const mutation = `
    mutation AppSubscriptionCreate($input: AppSubscriptionInput!) {
      appSubscriptionCreate(input: $input) {
        userErrors { field message }
        appSubscription {
          id
          adminGraphqlApiId
          test
          createdAt
        }
      }
    }
  `;

  const variables = {
    input: {
      name: input.name,
      test: input.test ?? false,
      returnUrl: input.returnUrl,
    },
  };

  // Use the existing shopifyGraphQL which handles retries, throttling, etc.
  const data = await shopifyGraphQL<{
    appSubscriptionCreate: {
      userErrors: { field: string[] | null; message: string }[];
      appSubscription: {
        id: string;
        adminGraphqlApiId: string;
        test: boolean;
        createdAt: string;
      } | null;
    };
  }>(ctx, mutation, variables);

  const { appSubscriptionCreate } = data;
  if (appSubscriptionCreate.userErrors.length > 0) {
    const message = appSubscriptionCreate.userErrors
      .map(e => e.message)
      .join("; ");
    throw new ShopifyApiError(`App subscription create failed: ${message}`, false);
  }

  if (!appSubscriptionCreate.appSubscription) {
    throw new ShopifyApiError("App subscription create returned no data", false);
  }

  return appSubscriptionCreate.appSubscription;
}

/**
 * Query the current active app subscription for a shop.
 *
 * @param ctx Authenticated context for the shop
 * @returns Current subscription data or null if none
 */
export async function queryAppSubscription(
  ctx: ShopApiContext,
): Promise<AppSubscriptionResponse | null> {
  const query = `
    query AppSubscription {
      appSubscription {
        id
        adminGraphqlApiId
        test
        createdAt
      }
    }
  `;

  const data = await shopifyGraphQL<{
    appSubscription: {
      id: string;
      adminGraphqlApiId: string;
      test: boolean;
      createdAt: string;
    } | null;
  }>(ctx, query);

  return data.appSubscription;
}

/**
 * Cancel an app subscription for a shop.
 *
 * @param ctx Authenticated context for the shop
 * @param subscriptionId The ID of the subscription to cancel
 * @returns True if cancelled successfully
 */
export async function cancelAppSubscription(
  ctx: ShopApiContext,
  subscriptionId: string,
): Promise<boolean> {
  const mutation = `
    mutation AppSubscriptionCancel($id: ID!) {
      appSubscriptionCancel(id: $id) {
        userErrors { field message }
        appSubscription {
          id
        }
      }
    }
  `;

  const variables = { id: subscriptionId };

  const data = await shopifyGraphQL<{
    appSubscriptionCancel: {
      userErrors: { field: string[] | null; message: string }[];
      appSubscription: { id: string } | null;
    };
  }>(ctx, mutation, variables);

  const { appSubscriptionCancel } = data;
  if (appSubscriptionCancel.userErrors.length > 0) {
    const message = appSubscriptionCancel.userErrors
      .map(e => e.message)
      .join("; ");
    throw new ShopifyApiError(`App subscription cancel failed: ${message}`, false);
  }

  return !!appSubscriptionCancel.appSubscription;
}