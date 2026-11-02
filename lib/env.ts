import "server-only";
import { z } from "zod";

/**
 * Centralised, validated environment access.
 *
 * - Import this ONLY from server code (it is guarded by `server-only`).
 * - Values are validated lazily on first access so that `next build` and
 *   client bundles never crash just because a server secret is absent.
 * - Never read `process.env` directly elsewhere — import `env` from here.
 */
const serverSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url(),
  APP_ENV: z.enum(["development", "production", "test"]).default("development"),

  SHOPIFY_API_KEY: z.string().min(1),
  SHOPIFY_API_SECRET: z.string().min(1),
  SHOPIFY_SCOPES: z.string().min(1).default("read_orders,read_returns"),
  SHOPIFY_API_VERSION: z.string().min(1).default("2025-07"),
  // Billing-specific API version (optional, defaults to main API version)
  SHOPIFY_BILLING_API_VERSION: z.string().min(1).optional(),
  // Webhook secret for billing webhooks (optional, defaults to main webhook secret)
  SHOPIFY_WEBHOOK_SECRET: z.string().min(1).optional(),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Active token-encryption key: 32 bytes, base64-encoded → 44 chars incl. padding.
  TOKEN_ENCRYPTION_KEY: z.string().min(44),
  // Version stamped onto tokens sealed with the active key. Bump when rotating.
  TOKEN_ENCRYPTION_KEY_VERSION: z.coerce.number().int().positive().default(1),
  // Optional decrypt-only keyring for rotation: JSON like {"1":"<base64key>"}.
  // Retired keys can still open old ciphertexts but are never used to encrypt.
  TOKEN_ENCRYPTION_KEYS_RETIRED: z.string().optional(),

  CRON_SECRET: z.string().min(16),

  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  EMAIL_DIGEST_SECRET: z.string().min(1),
  EMAIL_INITIAL_LOOKBACK_DAYS: z.coerce.number().positive().default(7),
  EMAIL_MAX_ALERTS_PER_EMAIL: z.coerce.number().positive().default(50),
  EMAIL_RESEND_TIMEOUT_MS: z.coerce.number().positive().default(8000),
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

/** Parse and cache server env. Throws a readable error if misconfigured. */
export function getEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Invalid or missing environment variables:\n${issues}\n` +
        `See .env.example and set them in .env.local (or your Vercel project).`,
    );
  }
  cached = parsed.data;
  return cached;
}