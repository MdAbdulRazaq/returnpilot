// app/api/email/digest/route.ts
import { NextResponse, type NextRequest } from "next/server";
import { processEmailDigest } from "@/lib/email/service";
import { getEnv } from "@/lib/env";
import { safeEqual } from "@/lib/crypto";

// Node runtime REQUIRED for node:crypto (session signing).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // digest can process several shops

/**
 * GET /api/email/digest — Vercel Cron entry point for daily digest emails.
 *
 * Auth: a constant-time-checked `Authorization: Bearer <CRON_SECRET>`.
 * Vercel Cron sends this header; without it we reject.
 *
 * POST /api/email/digest — send daily digest emails (retained for backwards compat).
 *
 * Fail-closed authentication:
 * 1. Reject non-POST requests (405)
 * 2. Require vercel-cron: 1 header (401 if missing/invalid)
 * 3. Require X-Email-Digest-Secret header validated with crypto.timingSafeEqual() (401 if missing/invalid)
 *
 * Only after authentication succeeds:
 * - Capture runStartedAt
 * - Call service layer to process email digest
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const { CRON_SECRET } = getEnv();

  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${CRON_SECRET}`;
  if (!safeEqual(auth, expected)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    await processEmailDigest();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Email digest processing failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Reject every non-POST request
  if (req.method !== "POST") {
    return new NextResponse("Method Not Allowed", { status: 405 });
  }

  // 2. Verify vercel-cron: 1 header
  const vercelCronHeader = req.headers.get("vercel-cron");
  if (vercelCronHeader !== "1") {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 3. Verify X-Email-Digest-Secret using crypto.timingSafeEqual()
  const providedSecret = req.headers.get("X-Email-Digest-Secret");
  const expectedSecret = process.env.EMAIL_DIGEST_SECRET;

  if (!providedSecret || !expectedSecret) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // Import crypto only when needed to avoid client-side issues
  const { timingSafeEqual } = await import("node:crypto");
  const providedSecretBuf = Buffer.from(providedSecret);
  const expectedSecretBuf = Buffer.from(expectedSecret);

  if (!timingSafeEqual(providedSecretBuf, expectedSecretBuf)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 4. Only AFTER all authentication succeeds: capture runStartedAt and call service layer
  try {
    await processEmailDigest();
    return NextResponse.json({ success: true });
  } catch (error) {
    // Log error but don't expose details in response (security)
    console.error("Email digest processing failed:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}