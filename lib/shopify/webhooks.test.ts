import { describe, it, expect, vi } from "vitest";
import { createHmac } from "node:crypto";

const SECRET = "shpss_test_secret";

// verifyWebhookHmac reads SHOPIFY_API_SECRET via getEnv(); mock it so the test
// needs no real environment. (Hoisted above the import below by vitest.)
vi.mock("@/lib/env", () => ({
  getEnv: () => ({ SHOPIFY_API_SECRET: SECRET }),
}));

import { verifyWebhookHmac } from "@/lib/shopify/webhooks";

function sign(body: string): string {
  return createHmac("sha256", SECRET).update(body, "utf8").digest("base64");
}

describe("verifyWebhookHmac", () => {
  it("accepts a correctly signed body", () => {
    const body = JSON.stringify({ order_id: 123 });
    expect(verifyWebhookHmac(body, sign(body))).toBe(true);
  });

  it("rejects a body that was tampered with after signing", () => {
    const original = JSON.stringify({ order_id: 123 });
    const sig = sign(original);
    const tampered = JSON.stringify({ order_id: 999 });
    expect(verifyWebhookHmac(tampered, sig)).toBe(false);
  });

  it("rejects a signature made with the wrong secret", () => {
    const body = JSON.stringify({ order_id: 1 });
    const wrong = createHmac("sha256", "other-secret")
      .update(body)
      .digest("base64");
    expect(verifyWebhookHmac(body, wrong)).toBe(false);
  });

  it("rejects a missing HMAC header", () => {
    expect(verifyWebhookHmac("{}", null)).toBe(false);
    expect(verifyWebhookHmac("{}", undefined)).toBe(false);
  });

  it("rejects a garbage / wrong-length signature without throwing", () => {
    expect(verifyWebhookHmac("{}", "not-a-real-hmac")).toBe(false);
  });

  it("verifies Buffer and string bodies identically", () => {
    const bodyStr = JSON.stringify({ a: 1, b: [2, 3] });
    const sig = sign(bodyStr);
    expect(verifyWebhookHmac(Buffer.from(bodyStr, "utf8"), sig)).toBe(true);
  });
});
