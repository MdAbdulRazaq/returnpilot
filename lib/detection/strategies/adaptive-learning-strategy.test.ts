// lib/detection/strategies/adaptive-learning-strategy.test.ts
import { describe, it, expect } from "vitest";
import { AdaptiveLearningStrategy } from "./adaptive-learning-strategy";
import { LegacyDetectionStrategy } from "./legacy-detection-strategy";
import { AdaptiveLearningConfig } from "../adaptive-learning-config";
import { Finding, AlertReason } from "../types";
import { DetectionStrategy } from "./detection-strategy";
import { NormalizedOrderData } from "../normalize";
import { ShopId } from "../types";

describe("AdaptiveLearningStrategy", () => {
  const shopId: ShopId = "test-shop-123";
  const config: AdaptiveLearningConfig = {
    enabled: true,
    learningRate: 0.1,
    seasonalWindow: 30,
    minSamples: 3,
    outlierStdDevMultiplier: 2.5,
    seasonalDetectionEnabled: true,
    thresholdAdjustmentEnabled: true,
    performanceWindow: 60,
  };

  // Helper to create mock order data
  const createMockOrderData = (): NormalizedOrderData => {
    return {
      shopId: shopId as ShopId,
      shopifyOrderId: "order_123",
      shopifyOrderName: "ORDER-123",
      updatedAt: new Date(),
      refunds: [],
      returns: [],
    };
  };

  it("should be instantiated with wrapped strategy and config", () => {
    const legacyStrategy = new LegacyDetectionStrategy();
    const adaptiveStrategy = new AdaptiveLearningStrategy(
      legacyStrategy,
      config,
      shopId
    );

    expect(adaptiveStrategy).toBeInstanceOf(AdaptiveLearningStrategy);
  });

  it("should delegate analysis to wrapped strategy when adaptive learning is disabled", () => {
    const legacyStrategy = new LegacyDetectionStrategy();
    const disabledConfig = { ...config, enabled: false };
    const adaptiveStrategy = new AdaptiveLearningStrategy(
      legacyStrategy,
      disabledConfig,
      shopId
    );

    const orderData = createMockOrderData();
    const findings = adaptiveStrategy.analyze(orderData);

    // LegacyDetectionStrategy returns no findings for empty data
    expect(findings).toHaveLength(0);
  });

  it("should update baselines when analyzing order data with refunds", () => {
    const legacyStrategy = new LegacyDetectionStrategy();
    const adaptiveStrategy = new AdaptiveLearningStrategy(
      legacyStrategy,
      config,
      shopId
    );

    // Create order data with a refund
    const orderData: NormalizedOrderData = {
      shopId: shopId as ShopId,
      shopifyOrderId: "order_123",
      shopifyOrderName: "ORDER-123",
      updatedAt: new Date("2023-01-01T00:00:00Z"),
      refunds: [
        {
          shopifyRefundId: "refund_123",
          createdAt: new Date("2023-01-01T00:00:00Z"),
          totalRefundedAmount: 50.0,
          currency: "USD",
          lineItems: [
            {
              shopifyLineItemId: "line_item_1",
              quantity: 2,
              subtotal: 50.0,
            }
          ]
        }
      ],
      returns: []
    };

    // Analyze the order data (this should update baselines)
    const findings = adaptiveStrategy.analyze(orderData);

    // Should return findings from legacy strategy (one finding for the refund with no returns)
    expect(findings).toHaveLength(1);
  });

  it("should not apply adaptive adjustment when below minSamples", () => {
    const legacyStrategy = new LegacyDetectionStrategy();
    const adaptiveStrategy = new AdaptiveLearningStrategy(
      legacyStrategy,
      { ...config, minSamples: 10 }, // Require 10 samples
      shopId
    );

    // Create order data with a refund
    const orderData: NormalizedOrderData = {
      shopId: shopId as ShopId,
      shopifyOrderId: "order_123",
      shopifyOrderName: "ORDER-123",
      updatedAt: new Date("2023-01-01T00:00:00Z"),
      refunds: [
        {
          shopifyRefundId: "refund_123",
          createdAt: new Date("2023-01-01T00:00:00Z"),
          totalRefundedAmount: 50.0,
          currency: "USD",
          lineItems: [
            {
              shopifyLineItemId: "line_item_1",
              quantity: 2,
              subtotal: 50.0,
            }
          ]
        }
      ],
      returns: []
    };

    // Analyze multiple times but still below minSamples
    for (let i = 0; i < 5; i++) {
      adaptiveStrategy.analyze(orderData);
    }

    // Should still delegate to wrapped strategy without adjustment
    const findings = adaptiveStrategy.analyze(orderData);
    expect(findings).toHaveLength(1);
  });

  it("should return same findings when there are no findings to adjust", () => {
    const legacyStrategy = new LegacyDetectionStrategy();
    const adaptiveStrategy = new AdaptiveLearningStrategy(
      legacyStrategy,
      config,
      shopId
    );

    const orderData = createMockOrderData();
    const findings = adaptiveStrategy.analyze(orderData);

    // Should return empty array (no findings from legacy strategy)
    expect(findings).toEqual([]);
  });

  describe("when wrapped strategy returns findings", () => {
    // Mock a detection strategy that returns findings
    class MockDetectionStrategy implements DetectionStrategy {
      analyze(data: NormalizedOrderData): Finding[] {
        // Return a simple finding for testing
        const now = new Date();
        return [{
          shopId: data.shopId,
          shopifyRefundId: "mock_refund",
          shopifyOrderId: data.shopifyOrderId,
          shopifyLineItemId: null,
          reason: AlertReason.NO_RETURN,
          moneyAtRisk: 100.0,
          createdAt: now,
          updatedAt: now,
          reviewedAt: null,
          dismissedAt: null,
        }];
      }
    };

    it("should return findings from wrapped strategy", () => {
      const mockStrategy = new MockDetectionStrategy();
      const adaptiveStrategy = new AdaptiveLearningStrategy(
        mockStrategy,
        config,
        shopId
      );

      const orderData = createMockOrderData();
      const findings = adaptiveStrategy.analyze(orderData);

      expect(findings).toHaveLength(1);
      expect(findings[0]!.reason).toBe(AlertReason.NO_RETURN);
      expect(findings[0]!.moneyAtRisk).toBe(100.0);
    });

    it("should return same number of findings when adjustment is disabled", () => {
      const mockStrategy = new MockDetectionStrategy();
      const adaptiveStrategy = new AdaptiveLearningStrategy(
        mockStrategy,
        { ...config, thresholdAdjustmentEnabled: false },
        shopId
      );

      const orderData = createMockOrderData();
      const findings = adaptiveStrategy.analyze(orderData);

      expect(findings).toHaveLength(1);
    });
  });
});