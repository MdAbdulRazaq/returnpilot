// lib/detection/adaptive-learning-persistence.test.ts
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { saveAdaptiveLearningParameters, getAdaptiveLearningParameters } from "./adaptive-learning-persistence";
import { AdaptiveLearningParameters } from "./adaptive-learning-persistence";
import { ShopId } from "./types";

// Mock the getEnv function to return dummy values for testing
vi.mock("@/lib/env", () => ({
  getEnv: () => ({
    NEXT_PUBLIC_APP_URL: "http://localhost:3000",
    APP_ENV: "development",
    SHOPIFY_API_KEY: "test-shopify-key",
    SHOPIFY_API_SECRET: "test-shopify-secret",
    SHOPIFY_SCOPES: "read_orders,read_returns",
    SHOPIFY_API_VERSION: "2025-07",
    SHOPIFY_BILLING_API_VERSION: "2025-07",
    SHOPIFY_WEBHOOK_SECRET: "test-webhook-secret",
    NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: "test-anon-key",
    SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    TOKEN_ENCRYPTION_KEY: "test-token-encryption-key-32-bytes-base64-encoded====",
    TOKEN_ENCRYPTION_KEY_VERSION: 1,
    TOKEN_ENCRYPTION_KEYS_RETIRED: undefined,
    CRON_SECRET: "test-cron-secret-12345678",
    RESEND_API_KEY: "test-resend-key",
    EMAIL_FROM: "test@example.com",
    EMAIL_DIGEST_SECRET: "test-email-digest-secret",
    EMAIL_INITIAL_LOOKBACK_DAYS: 7,
    EMAIL_MAX_ALERTS_PER_EMAIL: 50,
    EMAIL_RESEND_TIMEOUT_MS: 8000,
  })
}));

// Mock Supabase client with in-memory storage
const testData = new Map<string, unknown>();

vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (table: string) => ({
      upsert: (values: Record<string, unknown>, options: { onConflict: string }) => {
        if (table === "adaptive_learning_parameters" && options.onConflict === "shop_id") {
          const shopId = values.shop_id as string;
          testData.set(shopId, { ...values });
          return Promise.resolve({ error: null });
        }
        return Promise.resolve({ error: null });
      },
      delete: () => ({
        eq: (_column: string, _value: unknown) => {
          // Return an object that has a single method
          return {
            single: () => Promise.resolve({ data: null, error: null })
          };
        }
      }),
      select: (_columns: string) => ({
        eq: (_column: string, _value: unknown) => ({
          single: () => {
            if (_column === "shop_id") {
              const shopId = _value as string;
              const data = testData.get(shopId) || null;
              // For the single() method, we need to throw an error with code PGRST116 if data is null
              if (data === null) {
                return Promise.resolve({ data: null, error: { code: "PGRST116" } });
              }
              return Promise.resolve({ data, error: null });
            }
            return Promise.resolve({ data: null, error: { code: "PGRST116" } });
          }
        })
      })
    })
  })
}));

describe("AdaptiveLearningPersistence", () => {
  const testShopId: ShopId = "test-shop-123";

  const testParameters: AdaptiveLearningParameters = {
    shop_id: testShopId,
    refund_amount_mean: 50.0,
    refund_amount_m2: 200.0,
    refund_amount_count: 10,
    refund_count_mean: 2.0,
    refund_count_m2: 4.0,
    refund_count_count: 10,
    line_item_count_mean: 3.0,
    line_item_count_m2: 6.0,
    line_item_count_count: 10,
    seasonal_pattern_monday: 1.2,
    seasonal_pattern_tuesday: 1.0,
    seasonal_pattern_wednesday: 0.9,
    seasonal_pattern_thursday: 1.1,
    seasonal_pattern_friday: 1.5,
    seasonal_pattern_saturday: 2.0,
    seasonal_pattern_sunday: 1.8,
    global_refund_average: 1.25,
    updated_at: new Date().toISOString(),
  };

  beforeEach(() => {
    // Clear the test data store before each test
    testData.clear();
  });

  afterEach(() => {
    // Clean up test data after each test
    testData.clear();
  });

  it("should save and retrieve adaptive learning parameters", async () => {
    // Save parameters
    await saveAdaptiveLearningParameters(testShopId, testParameters);

    // Retrieve parameters
    const retrieved = await getAdaptiveLearningParameters(testShopId);

    expect(retrieved).not.toBeNull();
    if (retrieved) {
      expect(retrieved.shop_id).toBe(testShopId);
      expect(retrieved.refund_amount_mean).toBe(testParameters.refund_amount_mean);
      expect(retrieved.refund_amount_m2).toBe(testParameters.refund_amount_m2);
      expect(retrieved.refund_amount_count).toBe(testParameters.refund_amount_count);
      expect(retrieved.refund_count_mean).toBe(testParameters.refund_count_mean);
      expect(retrieved.refund_count_m2).toBe(testParameters.refund_count_m2);
      expect(retrieved.refund_count_count).toBe(testParameters.refund_count_count);
      expect(retrieved.line_item_count_mean).toBe(testParameters.line_item_count_mean);
      expect(retrieved.line_item_count_m2).toBe(testParameters.line_item_count_m2);
      expect(retrieved.line_item_count_count).toBe(testParameters.line_item_count_count);
      expect(retrieved.seasonal_pattern_monday).toBe(testParameters.seasonal_pattern_monday);
      expect(retrieved.seasonal_pattern_tuesday).toBe(testParameters.seasonal_pattern_tuesday);
      expect(retrieved.seasonal_pattern_wednesday).toBe(testParameters.seasonal_pattern_wednesday);
      expect(retrieved.seasonal_pattern_thursday).toBe(testParameters.seasonal_pattern_thursday);
      expect(retrieved.seasonal_pattern_friday).toBe(testParameters.seasonal_pattern_friday);
      expect(retrieved.seasonal_pattern_saturday).toBe(testParameters.seasonal_pattern_saturday);
      expect(retrieved.seasonal_pattern_sunday).toBe(testParameters.seasonal_pattern_sunday);
      expect(retrieved.global_refund_average).toBe(testParameters.global_refund_average);
    }
  });

  it("should return null when no parameters exist for shop", async () => {
    const retrieved = await getAdaptiveLearningParameters("non-existent-shop");
    expect(retrieved).toBeNull();
  });

  it("should handle partial parameters correctly", async () => {
    const partialParameters: Partial<AdaptiveLearningParameters> = {
      shop_id: testShopId,
      refund_amount_mean: 75.0,
      refund_amount_count: 5,
    };

    // Save partial parameters
    await saveAdaptiveLearningParameters(testShopId, partialParameters);

    // Retrieve parameters
    const retrieved = await getAdaptiveLearningParameters(testShopId);

    expect(retrieved).not.toBeNull();
    if (retrieved) {
      expect(retrieved.shop_id).toBe(testShopId);
      expect(retrieved.refund_amount_mean).toBe(partialParameters.refund_amount_mean);
      expect(retrieved.refund_amount_count).toBe(partialParameters.refund_amount_count);
      // Other fields should be null
      expect(retrieved.refund_amount_m2).toBeNull();
      expect(retrieved.refund_count_mean).toBeNull();
      expect(retrieved.refund_count_m2).toBeNull();
      expect(retrieved.refund_count_count).toBeNull();
    }
  });

  it("should update existing parameters", async () => {
    // Save initial parameters
    await saveAdaptiveLearningParameters(testShopId, testParameters);

    // Update parameters
    const updatedParameters: Partial<AdaptiveLearningParameters> = {
      ...testParameters,
      refund_amount_mean: 100.0,
      refund_count_mean: 5.0,
    };

    await saveAdaptiveLearningParameters(testShopId, updatedParameters);

    // Retrieve and verify updated values
    const retrieved = await getAdaptiveLearningParameters(testShopId);

    expect(retrieved).not.toBeNull();
    if (retrieved) {
      expect(retrieved.refund_amount_mean).toBe(100.0);
      expect(retrieved.refund_count_mean).toBe(5.0);
      // Other values should remain unchanged
      expect(retrieved.refund_amount_m2).toBe(testParameters.refund_amount_m2);
      expect(retrieved.seasonal_pattern_monday).toBe(testParameters.seasonal_pattern_monday);
    }
  });
});