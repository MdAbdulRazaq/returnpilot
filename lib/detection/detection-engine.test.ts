// lib/detection/detection-engine.test.ts
import { describe, it, expect } from "vitest";
import { DetectionEngine } from "./detection-engine";
import { LegacyDetectionStrategy } from "./strategies/legacy-detection-strategy";
import { NormalizedOrderData } from "./normalize";
import { AlertReason, Finding } from "./types";

describe("DetectionEngine", () => {
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

  describe("with default constructor (no strategies)", () => {
    it("should return no findings when no strategies are configured", async () => {
      const engine = new DetectionEngine();
      const orderData: NormalizedOrderData = createMockOrderData({});

      const findings = await engine.detect(orderData);
      expect(findings).toEqual([]);
    });
  });

  describe("with legacy strategy", () => {
    it("should delegate to the legacy strategy", async () => {
      const legacyStrategy = new LegacyDetectionStrategy();
      const engine = new DetectionEngine([legacyStrategy]);
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
            createdAt: new Date("2024-01-12T11:00:00Z"),
            status: "RECEIVED",
            totalQuantity: 3,
            lineItems: [
              { shopifyLineItemId: "line-1", quantity: 2, processedQuantity: 2, refundedQuantity: 0 },
              { shopifyLineItemId: "line-2", quantity: 1, processedQuantity: 1, refundedQuantity: 0 },
            ],
          },
        ],
      });

      const findings = await engine.detect(orderData);
      expect(findings).toEqual([]);
    });
  });

  describe("with multiple strategies", () => {
    it("should combine findings from all strategies", async () => {
      const legacyStrategy = new LegacyDetectionStrategy();
      // We'll use a mock strategy that returns a known finding for testing
      const mockStrategy = {
        analyze: (data: NormalizedOrderData): Finding[] => [
          {
            shopId: data.shopId,
            shopifyRefundId: "mock-refund",
            shopifyOrderId: data.shopifyOrderId,
            shopifyLineItemId: "mock-line",
            reason: AlertReason.NO_RETURN,
            moneyAtRisk: 999.00,
            createdAt: new Date(),
            updatedAt: new Date(),
            reviewedAt: null,
            dismissedAt: null,
          }
        ]
      };

      const engine = new DetectionEngine([legacyStrategy, mockStrategy]);
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
            createdAt: new Date("2024-01-12T11:00:00Z"),
            status: "RECEIVED",
            totalQuantity: 2,
            lineItems: [
              { shopifyLineItemId: "line-1", quantity: 2, processedQuantity: 2, refundedQuantity: 0 },
            ],
          },
        ],
      });

      const findings = await engine.detect(orderData);
      // Should have the mock finding (legacy strategy returns empty for this data)
      expect(findings).toHaveLength(1);
      expect(findings[0]!.moneyAtRisk).toBe(999.00);
    });
  });

  describe("addStrategy and removeStrategy methods", () => {
    it("should allow adding and removing strategies", async () => {
      const engine = new DetectionEngine();
      const strategy1 = new LegacyDetectionStrategy();
      const strategy2 = new LegacyDetectionStrategy(); // Another instance

      // Create order data that will trigger the legacy strategy
      // Need refunds that are past grace period and no returns to trigger NO_RETURN
      const orderDataWithRefund = createMockOrderData({
        refunds: [
          {
            shopifyRefundId: "refund-1",
            createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
            totalRefundedAmount: 30.00,
            currency: "USD",
            lineItems: [
              { shopifyLineItemId: "line-1", quantity: 2, subtotal: 20.00 },
              { shopifyLineItemId: "line-2", quantity: 1, subtotal: 10.00 },
            ],
          },
        ],
        returns: [], // No returns to trigger NO_RETURN logic
      });

      // Initially should have no strategies (will use legacy fallback in detect)
      let findings = await engine.detect(orderDataWithRefund);
      expect(findings).toHaveLength(2); // Legacy strategy fallback (2 line items = 2 findings)

      engine.addStrategy(strategy1);
      findings = await engine.detect(orderDataWithRefund);
      expect(findings).toHaveLength(2); // strategy1 only (2 line items = 2 findings)

      engine.addStrategy(strategy2);
      findings = await engine.detect(orderDataWithRefund);
      expect(findings).toHaveLength(4); // strategy1 + strategy2 (2 + 2 = 4 findings)

      engine.removeStrategy(strategy1);
      findings = await engine.detect(orderDataWithRefund);
      expect(findings).toHaveLength(2); // strategy2 only (2 findings)

      // Add a mock strategy to verify specific strategy removal
      const mockStrategy = {
        analyze: (data: NormalizedOrderData): Finding[] => [
          {
            shopId: "test-shop-123",
            shopifyRefundId: "mock-refund",
            shopifyOrderId: "order-1",
            shopifyLineItemId: "mock-line",
            reason: AlertReason.NO_RETURN,
            moneyAtRisk: 999.00,
            createdAt: new Date(),
            updatedAt: new Date(),
            reviewedAt: null,
            dismissedAt: null,
          }
        ]
      };

      engine.addStrategy(mockStrategy);
      findings = await engine.detect(orderDataWithRefund);
      expect(findings).toHaveLength(3); // strategy2 (2 findings) + mock (1 finding) = 3 findings
      expect(findings.some(f => f.moneyAtRisk === 999.00)).toBe(true);

      engine.removeStrategy(mockStrategy);
      findings = await engine.detect(orderDataWithRefund);
      expect(findings).toHaveLength(2); // strategy2 only (2 findings)
      expect(findings.some(f => f.moneyAtRisk === 999.00)).toBe(false);
    });
  });
});