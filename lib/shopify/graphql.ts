import "server-only";

import { getEnv } from "@/lib/env";
import { decryptToken } from "@/lib/crypto";
import type { ShopRow } from "@/lib/supabase/admin";

/**
 * THE single Shopify Admin API client.
 *
 * ARCHITECTURAL RULE (M4): all outbound communication with Shopify's Admin API
 * goes through this file. No other module may call `fetch` against Shopify.
 * This file is solely responsible for:
 *   - Authentication  (attaching the decrypted access token)
 *   - Retries         (transient HTTP + GraphQL throttling)
 *   - Backoff         (exponential with jitter)
 *   - Error handling  (never leaks token/PII; generic, typed failures)
 *   - Throttling      (honours Shopify's THROTTLED / 429 signals)
 *
 * NOTE: the one-time OAuth *token exchange* lives in the frozen M3
 * `lib/shopify/oauth.ts` and uses the REST OAuth endpoint, not the Admin API.
 * Everything Admin-API from M4 onward funnels through here.
 */

const MAX_ATTEMPTS = 5;
const BASE_DELAY_MS = 500; // grows exponentially: 0.5s, 1s, 2s, 4s ...
const MAX_DELAY_MS = 8_000;

/** Authenticated context for one shop. `accessToken` is plaintext, held only in memory. */
export interface ShopApiContext {
  shopDomain: string;
  accessToken: string;
}

/** Thrown for any Admin API failure. Message is safe to log (never contains the token). */
export class ShopifyApiError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
    this.name = "ShopifyApiError";
  }
}

/**
 * Turn a persisted shop row into an authenticated client context by decrypting
 * its stored offline token (M3 `lib/crypto`). This is the ONLY place the token
 * is decrypted for API use.
 */
export function shopContextFromRow(row: ShopRow): ShopApiContext {
  if (
    !row.access_token_ciphertext ||
    !row.access_token_iv ||
    !row.access_token_tag ||
    row.token_key_version == null
  ) {
    throw new ShopifyApiError("Shop has no stored access token.", false);
  }
  const accessToken = decryptToken({
    ciphertext: row.access_token_ciphertext,
    iv: row.access_token_iv,
    tag: row.access_token_tag,
    keyVersion: row.token_key_version,
  });
  return { shopDomain: row.shop_domain, accessToken };
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: { code?: string } }>;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Exponential backoff with full jitter, capped. */
function backoffDelay(attempt: number): number {
  const capped = Math.min(MAX_DELAY_MS, BASE_DELAY_MS * 2 ** attempt);
  return Math.floor(Math.random() * capped);
}

/**
 * Execute one GraphQL operation against a shop's Admin API.
 *
 * Retries transient failures (HTTP 429/5xx, network errors, and GraphQL
 * `THROTTLED`) up to MAX_ATTEMPTS with exponential backoff. Non-retryable
 * failures (auth, malformed query, other GraphQL errors) throw immediately.
 * The access token is sent only in the `X-Shopify-Access-Token` header and is
 * never included in any thrown message or log line.
 */
export async function shopifyGraphQL<T>(
  ctx: ShopApiContext,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<T> {
  const { SHOPIFY_API_VERSION } = getEnv();
  const endpoint = `https://${ctx.shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`;

  let lastError: ShopifyApiError | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(backoffDelay(attempt));

    let res: Response;
    try {
      res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "X-Shopify-Access-Token": ctx.accessToken,
        },
        body: JSON.stringify({ query, variables }),
      });
    } catch {
      // Network/DNS/socket error — transient, retry.
      lastError = new ShopifyApiError("Network error calling Shopify.", true);
      continue;
    }

    // Throttled or transient server error → back off and retry.
    if (res.status === 429 || res.status >= 500) {
      lastError = new ShopifyApiError(`Shopify HTTP ${res.status}.`, true);
      continue;
    }

    // 4xx other than 429 (401/403/404/422 ...) is not retryable.
    if (!res.ok) {
      throw new ShopifyApiError(`Shopify HTTP ${res.status}.`, false);
    }

    let body: GraphQLResponse<T>;
    try {
      body = (await res.json()) as GraphQLResponse<T>;
    } catch {
      lastError = new ShopifyApiError("Malformed Shopify response.", true);
      continue;
    }

    if (body.errors && body.errors.length > 0) {
      const throttled = body.errors.some(
        (e) => e.extensions?.code === "THROTTLED",
      );
      if (throttled) {
        lastError = new ShopifyApiError("Shopify GraphQL throttled.", true);
        continue;
      }
      // Any other GraphQL error is a real problem (bad query, permissions).
      // Surface the messages (they carry no secret) but not the variables.
      const message = body.errors.map((e) => e.message).join("; ");
      throw new ShopifyApiError(`Shopify GraphQL error: ${message}`, false);
    }

    if (!body.data) {
      throw new ShopifyApiError("Shopify returned no data.", false);
    }
    return body.data;
  }

  throw lastError ?? new ShopifyApiError("Shopify request failed.", true);
}
