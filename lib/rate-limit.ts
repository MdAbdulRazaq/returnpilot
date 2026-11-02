import "server-only";

/**
 * Lean, dependency-free rate limiter (MVP — Decision A1).
 *
 * WHY: OAuth endpoints are public and unauthenticated; without a limit an
 * attacker can hammer them to brute-force parameters or run up cost. This is a
 * fixed-window counter kept in a module-level Map.
 *
 * KNOWN LIMITATION (documented, to be upgraded later): the counter is
 * PER SERVERLESS INSTANCE and in-memory. It resets on cold start and is not
 * shared across concurrently-running instances, so it is best-effort — a
 * determined, distributed attacker can exceed the nominal limit. When we need a
 * hard, shared limit we will move this to Upstash Redis behind the same
 * interface (Decision A2). Do NOT rely on this for security-critical quotas.
 */

interface Bucket {
  count: number;
  resetAt: number; // epoch ms
}

const buckets = new Map<string, Bucket>();

/**
 * Returns `true` if the caller is within the limit (request allowed).
 * @param key    stable identifier (e.g. `auth:<ip>`), never PII in logs
 * @param limit  max requests per window
 * @param windowMs  window length in milliseconds
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (bucket.count >= limit) return false;

  bucket.count += 1;
  return true;
}

/**
 * Best-effort client IP from proxy headers. Vercel sets `x-forwarded-for`; we
 * take the first hop. Only used as a rate-limit bucket key — never trusted for
 * authorization and never logged alongside secrets.
 */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return headers.get("x-real-ip") ?? "unknown";
}
