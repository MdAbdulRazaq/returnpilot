// lib/detection/explanation/generator.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Finding, AlertReason } from "../types";
import { NormalizedOrderData } from "../normalize";
import { ExplanationGenerator } from "./generator";
import { ExplanationConfigurationQueries } from "@/lib/api/settings/queries";

// Mock only the adaptive learning persistence dependency
vi.mock("../adaptive-learning-persistence", () => ({
  getAdaptiveLearningParameters: vi.fn().mockResolvedValue({
    shop_id: "test-shop-123",
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
  })
}));

// Spy on the configuration queries
const getOrCreateConfiguration = vi.spyOn(ExplanationConfigurationQueries, "getOrCreateConfiguration");

describe("ExplanationGenerator", () => {
  const mockShopId: string = "test-shop-123";
  const mockOrderId: string = "order_456";

  // Helper to create mock order data
  const createMockOrderData = (): NormalizedOrderData => {
    return {
      shopId: mockShopId as string,
      shopifyOrderId: mockOrderId,
      shopifyOrderName: `ORDER-${Date.now()}`,
      updatedAt: new Date(),
      refunds: [
        {
          shopifyRefundId: `refund_${Date.now()}`,
          createdAt: new Date(),
          totalRefundedAmount: 75.5,
          currency: "USD",
          lineItems: [
            {
              shopifyLineItemId: `line_item_${Date.now()}_1`,
              quantity: 2,
              subtotal: 75.5,
            },
          ],
        },
      ],
      returns: [],
    };
  };

  // Helper to create a mock finder
  const createMockFinding = (): Finding => {
    return {
      shopId: mockShopId,
      shopifyRefundId: `refund_${Date.now()}`,
      shopifyOrderId: mockOrderId,
      shopifyLineItemId: `line_item_${Date.now()}_1`,
      reason: AlertReason.NO_RETURN,
      moneyAtRisk: 75.5,
      createdAt: new Date(),
      updatedAt: new Date(),
      reviewedAt: null,
      dismissedAt: null,
    };
  };

  describe("Basic Explanation Generation", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    describe("Basic Config", () => {
      it("should generate a basic explanation for a finding", async () => {
        // Mock shop configuration for BASIC level
        getOrCreateConfiguration.mockResolvedValueOnce({
          id: `config-${mockShopId}-basic`,
          shopId: mockShopId,
          explanationEnabled: true,
          explanationLevel: "basic",
          includeTechnicalDetails: false, // BASIC level should not include technical details
          enableConfidenceScoring: true,
          enableHistoricalContext: true,
          enableEnhancedEvidence: true,
          explanationFormat: "merchant-friendly",
          collectExplanationFeedback: true,
          feedbackCollectionEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const testData = createMockOrderData();
        const testFinding = createMockFinding();

        const explanation = await ExplanationGenerator.generate(testFinding, testData, mockShopId);

        expect(explanation).toBeDefined();
        expect(explanation.merchantExplanation).toBeDefined();
        expect(explanation.merchantExplanation).toContain("Review the order to confirm if the customer returned the items.");
        expect(explanation.technicalDetails).toBeUndefined(); // Basic config should not include technical details
        expect(explanation.confidence).toBeGreaterThanOrEqual(0);
        expect(explanation.confidence).toBeLessThanOrEqual(1);
        expect(explanation.riskStratification).toBeDefined();
        expect(explanation.triggeredBy).toContain("Grace period exceeded for refund");
        expect(explanation.triggeredBy).toContain("No returns found for order");
        expect(explanation.evidence).toBeDefined();
        expect(explanation.evidence.orderId).toBe(testData.shopifyOrderId);
        expect(explanation.evidence.refundCount).toBe(1);
        expect(explanation.evidence.returnCount).toBe(0);
        expect(explanation.evidence.totalRefundAmount).toBe(75.5);
        expect(explanation.evidence.currency).toBe("USD");
        expect(explanation.evidence.lineItemId).toBe(testFinding.shopifyLineItemId);
        expect(explanation.evidence.moneyAtRisk).toBe(75.5);
        expect(explanation.evidence.refundLineItemQuantity).toBe(2);
        expect(explanation.evidence.totalProcessedQuantity).toBe(0);
        expect(explanation.evidence.quantityDifference).toBe(2);
      });
    });

    describe("Technical Details Config", () => {
      it("should include technical details when requested", async () => {
        // Mock shop configuration for DETAILED level
        getOrCreateConfiguration.mockResolvedValueOnce({
          id: `config-${mockShopId}-detailed`,
          shopId: mockShopId,
          explanationEnabled: true,
          explanationLevel: "detailed",
          includeTechnicalDetails: true, // DETAILED level should include technical details
          enableConfidenceScoring: true,
          enableHistoricalContext: true,
          enableEnhancedEvidence: true,
          explanationFormat: "merchant-friendly",
          collectExplanationFeedback: true,
          feedbackCollectionEnabled: true,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        const testData = createMockOrderData();
        const testFinding = createMockFinding();

        const explanation = await ExplanationGenerator.generate(testFinding, testData, mockShopId);

        expect(explanation).toBeDefined();
        expect(explanation.merchantExplanation).toBeDefined();
        expect(explanation.technicalDetails).toBeDefined(); // Detailed config should include technical details
        expect(explanation.confidence).toBeGreaterThanOrEqual(0);
        expect(explanation.confidence).toBeLessThanOrEqual(1);
        expect(explanation.riskStratification).toBeDefined();
        expect(explanation.triggeredBy).toContain("Grace period exceeded for refund");
        expect(explanation.triggeredBy).toContain("No returns found for order");
        expect(explanation.evidence).toBeDefined();
        expect(explanation.evidence.orderId).toBe(testData.shopifyOrderId);
        expect(explanation.evidence.refundCount).toBe(1);
        expect(explanation.evidence.returnCount).toBe(0);
        expect(explanation.evidence.totalRefundAmount).toBe(75.5);
        expect(explanation.evidence.currency).toBe("USD");
        expect(explanation.evidence.lineItemId).toBe(testFinding.shopifyLineItemId);
        expect(explanation.evidence.moneyAtRisk).toBe(75.5);
        expect(explanation.evidence.refundLineItemQuantity).toBe(2);
        expect(explanation.evidence.totalProcessedQuantity).toBe(0);
        expect(explanation.evidence.quantityDifference).toBe(2);
      });
    });
  });
});
