// lib/detection/strategies/temporal-pattern-strategy.test.ts
import { describe, it, expect } from "vitest";
import { TemporalPatternStrategy } from "./temporal-pattern-strategy";
import { NormalizedOrderData } from "../normalize";
import { AlertReason } from "../types";

describe("TemporalPatternStrategy", () => {
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
    it("should return no findings when there are no temporal patterns", () => {
      const strategy = new TemporalPatternStrategy();
      const orderData: NormalizedOrderData = createMockOrderData({
        refunds: [
          {
            shopifyRefundId: "refund-1",
            createdAt: new Date("2024-01-11T11:00:00Z"),
            totalRefundedAmount: 30.00,
            currency: "USD",
            lineItems: [
              { shopifyLineItemId: "line-1", quantity: 2, subtotal: 20.00 },
            ],
          },
        ],
        returns: [
          {
            shopifyReturnId: "return-1",
            status: "RECEIVED",
            totalQuantity: 2,
            createdAt: new Date("2024-01-12T11:00:00Z"),
            lineItems: [
              { shopifyLineItemId: "line-1", quantity: 2, processedQuantity: 2, refundedQuantity: 2 },
            ],
          },
        ],
      });

      const findings = strategy.analyze(orderData);
      expect(findings).toEqual([]);
    });

    it("should detect rapid successive refunds", () => {
      const strategy = new TemporalPatternStrategy();
      const orderData: NormalizedOrderData = createMockOrderData({
        refunds: [
          {
            shopifyRefundId: "refund-1",
            createdAt: new Date("2024-01-11T11:00:00Z"),
            totalRefundedAmount: 20.00,
            currency: "USD",
            lineItems: [
              { shopifyLineItemId: "line-1", quantity: 1, subtotal: 20.00 },
            ],
          },
          {
            shopifyRefundId: "refund-2",
            createdAt: new Date("2024-01-11T11:30:00Z"), // 30 minutes later
            totalRefundedAmount: 10.00,
            currency: "USD",
            lineItems: [
              { shopifyLineItemId: "line-2", quantity: 1, subtotal: 10.00 },
            ],
          },
        ],
        returns: [],
      });

      const findings = strategy.analyze(orderData);
      expect(findings).toHaveLength(2); // One finding for each line item in the second refund
      expect(findings[0]!.reason).toBe(AlertReason.NO_RETURN);
      expect(findings[0]!.moneyAtRisk).toBe(10.00 * 0.5); // 50% of amount for temporal pattern
    });
  });
});