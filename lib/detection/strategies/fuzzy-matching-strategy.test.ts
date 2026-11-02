// lib/detection/strategies/fuzzy-matching-strategy.test.ts
import { describe, it, expect } from "vitest";
import { FuzzyMatchingStrategy } from "./fuzzy-matching-strategy";
import { NormalizedOrderData } from "../normalize";
import { AlertReason } from "../types";

describe("FuzzyMatchingStrategy", () => {
  const shopId = "test-shop-123";
  const orderId = "order-1";

  const createMockOrderData = (normalizedOrder: Partial<NormalizedOrderData>): NormalizedOrderData => {
    const defaultOrder: NormalizedOrderData = {
      shopId,
      shopifyOrderId: orderId,
      shopifyOrderName: "#ORD-1",
      updatedAt: new Date("2024-01-10T10:00:00Z"),
      refunds: [],
      returns: [],
    };
    return { ...defaultOrder, ...normalizedOrder };
  };

  describe("with default configuration", () => {
    it("should return no findings when there are no suspicious patterns", () => {
      const strategy = new FuzzyMatchingStrategy();
      const orderData: NormalizedOrderData = createMockOrderData({
        refunds: [
          {
            shopifyRefundId: "refund-1",
            createdAt: new Date("2024-01-11T11:00:00Z"),
            totalRefundedAmount: 40.73,
            currency: "USD",
            lineItems: [
              { shopifyLineItemId: "line-1", quantity: 1, subtotal: 16.23 },
              { shopifyLineItemId: "line-2", quantity: 2, subtotal: 24.50 },
            ],
          },
        ],
        returns: [],
      });

      const findings = strategy.analyze(orderData);
      expect(findings).toEqual([]);
    });

    it("should detect repeated identical amounts", () => {
      const strategy = new FuzzyMatchingStrategy();
      const orderData: NormalizedOrderData = createMockOrderData({
        refunds: [
          {
            shopifyRefundId: "refund-1",
            createdAt: new Date("2024-01-11T11:00:00Z"),
            totalRefundedAmount: 60.00,
            currency: "USD",
            lineItems: [
              { shopifyLineItemId: "line-1", quantity: 1, subtotal: 20.00 },
              { shopifyLineItemId: "line-2", quantity: 1, subtotal: 20.00 }, // Same amount
              { shopifyLineItemId: "line-3", quantity: 1, subtotal: 20.00 }, // Same amount (3x total)
            ],
          },
        ],
        returns: [],
      });

      const findings = strategy.analyze(orderData);
      expect(findings).toHaveLength(3); // One finding for each line item with the repeated amount
      expect(findings[0]!.reason).toBe(AlertReason.NO_RETURN);
      expect(findings[0]!.moneyAtRisk).toBe(20.00 * 0.6); // 60% of amount for fuzzy matching
    });

    it("should detect suspicious round number amounts", () => {
      const strategy = new FuzzyMatchingStrategy();
      const orderData: NormalizedOrderData = createMockOrderData({
        refunds: [
          {
            shopifyRefundId: "refund-1",
            createdAt: new Date("2024-01-11T11:00:00Z"),
            totalRefundedAmount: 30.50,
            currency: "USD",
            lineItems: [
              { shopifyLineItemId: "line-1", quantity: 1, subtotal: 20.00 }, // Round number >= 10
              { shopifyLineItemId: "line-2", quantity: 1, subtotal: 10.50 }, // Not a round number
            ],
          },
        ],
        returns: [],
      });

      const findings = strategy.analyze(orderData);
      expect(findings).toHaveLength(1); // Only the round number amount should trigger
      expect(findings[0]!.reason).toBe(AlertReason.NO_RETURN);
      expect(findings[0]!.moneyAtRisk).toBe(20.00 * 0.4); // 40% of amount for fuzzy matching
    });
  });
});