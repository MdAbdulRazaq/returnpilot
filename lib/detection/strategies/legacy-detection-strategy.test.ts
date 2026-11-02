// lib/detection/strategies/legacy-detection-strategy.test.ts
import { describe, it, expect } from "vitest";
import { LegacyDetectionStrategy } from "./legacy-detection-strategy";
import { NormalizedOrderData } from "../normalize";
import { AlertReason } from "../types";

describe("LegacyDetectionStrategy", () => {
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

  it("should return no findings for a full return matching refunded quantity", () => {
    const strategy = new LegacyDetectionStrategy();
    const orderData: NormalizedOrderData = createMockOrderData({
      refunds: [
        {
          shopifyRefundId: "refund-1",
          createdAt: new Date("2024-01-11T11:00:00Z"),
          totalRefundedAmount: 30.00,
          currency: "USD",
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 2, subtotal: 20.00 },
            { shopifyLineItemId: "line-2", quantity: 1, subtotal: 10.00 },
          ],
        },
      ],
      returns: [
        {
          shopifyReturnId: "return-1",
          status: "RECEIVED",
          totalQuantity: 3,
          createdAt: new Date("2024-01-12T11:00:00Z"),
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 2, processedQuantity: 2, refundedQuantity: 2 },
            { shopifyLineItemId: "line-2", quantity: 1, processedQuantity: 1, refundedQuantity: 1 },
          ],
        },
      ],
    });

    const findings = strategy.analyze(orderData);
    expect(findings).toEqual([]);
  });

  it("should detect NO_RETURN when order has no returns and refund is past grace period", () => {
    const strategy = new LegacyDetectionStrategy();
    const orderData: NormalizedOrderData = createMockOrderData({
      refunds: [
        {
          shopifyRefundId: "refund-1",
          createdAt: new Date("2024-01-01T11:00:00Z"), // 19 days ago
          totalRefundedAmount: 30.00,
          currency: "USD",
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 2, subtotal: 20.00 },
            { shopifyLineItemId: "line-2", quantity: 1, subtotal: 10.00 },
          ],
        },
      ],
      returns: [], // No returns at all
    });

    // We need to mock the date for this test
    const originalDate = global.Date;
    global.Date = function(...args: unknown[]): Date {
      if (args.length === 0) {
        return new originalDate("2024-01-20T12:00:00Z");
      }
      // For all other cases, delegate to original Date
      return new originalDate(...(args as ConstructorParameters<typeof Date>));
    } as { (...args: unknown[]): Date } & typeof originalDate;

    try {
      const findings = strategy.analyze(orderData);
      expect(findings).toHaveLength(2);
      expect(findings[0]!.reason).toBe(AlertReason.NO_RETURN);
      expect(findings[0]!.shopifyLineItemId).toBe("line-1");
      expect(findings[0]!.moneyAtRisk).toBe(20.00);
      expect(findings[1]!.reason).toBe(AlertReason.NO_RETURN);
      expect(findings[1]!.shopifyLineItemId).toBe("line-2");
      expect(findings[1]!.moneyAtRisk).toBe(10.00);
    } finally {
      global.Date = originalDate;
    }
  });
});