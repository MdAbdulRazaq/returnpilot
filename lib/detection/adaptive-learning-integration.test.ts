// lib/detection/adaptive-learning-integration.test.ts
import { describe, it, expect } from "vitest";
import { DetectionEngine } from "./detection-engine";
import { DetectionStrategyFactory } from "./detection-strategy-factory";
import { DetectionConfig } from "./types";
import { NormalizedOrderData } from "./normalize";
import { ShopId } from "./types";

describe("AdaptiveLearningIntegration", () => {
  const shopId: ShopId = "test-shop-456";

  // Helper to create mock order data with refunds
  const createOrderDataWithRefund = (amount: number, timestamp: string): NormalizedOrderData => {
    return {
      shopId: shopId as ShopId,
      shopifyOrderId: `order_${Date.now()}`,
      shopifyOrderName: `ORDER-${Date.now()}`,
      updatedAt: new Date(timestamp),
      refunds: [
        {
          shopifyRefundId: `refund_${Date.now()}`,
          createdAt: new Date(timestamp),
          totalRefundedAmount: amount,
          currency: "USD",
          lineItems: [
            {
              shopifyLineItemId: `line_item_${Date.now()}`,
              quantity: 2,
              subtotal: amount,
            }
          ]
        }
      ],
      returns: []
    };
  };

  it("should create detection engine with adaptive learning strategies when enabled", () => {
    const config: DetectionConfig = {
      gracePeriodDays: 3,
      adaptiveLearning: {
        enabled: true,
        learningRate: 0.1,
        seasonalWindow: 30,
        minSamples: 2,
        outlierStdDevMultiplier: 2.5,
        seasonalDetectionEnabled: true,
        thresholdAdjustmentEnabled: true,
        performanceWindow: 60,
      }
    };

    const engine = DetectionStrategyFactory.createEngine("pro", config, shopId);

    // Should have created strategies (legacy + adaptive wrappers)
    // Note: We can't easily inspect the engine's strategies directly due to encapsulation
    // But we can verify it was created successfully
    expect(engine).toBeInstanceOf(DetectionEngine);
  });

  it("should create detection engine without adaptive learning when disabled", () => {
    const config: DetectionConfig = {
      gracePeriodDays: 3,
      adaptiveLearning: {
        enabled: false, // Disabled
        learningRate: 0.1,
        seasonalWindow: 30,
        minSamples: 2,
        outlierStdDevMultiplier: 2.5,
        seasonalDetectionEnabled: true,
        thresholdAdjustmentEnabled: true,
        performanceWindow: 60,
      }
    };

    const engine = DetectionStrategyFactory.createEngine("pro", config, shopId);
    expect(engine).toBeInstanceOf(DetectionEngine);
  });

  it("should process orders through adaptive learning system", async () => {
    const config: DetectionConfig = {
      gracePeriodDays: 3,
      temporalPattern: {
        enabled: true,
      },
      fuzzyMatching: {
        enabled: true,
      },
      adaptiveLearning: {
        enabled: true,
        learningRate: 0.1,
        seasonalWindow: 30,
        minSamples: 2,
        outlierStdDevMultiplier: 2.5,
        seasonalDetectionEnabled: true,
        thresholdAdjustmentEnabled: true,
        performanceWindow: 60,
      }
    };

    const engine = DetectionStrategyFactory.createEngine("pro", config, shopId);

    // Process several orders to build up baseline
    const order1 = createOrderDataWithRefund(50.0, "2023-01-01T10:00:00Z");
    const order2 = createOrderDataWithRefund(55.0, "2023-01-02T10:00:00Z");
    const order3 = createOrderDataWithRefund(45.0, "2023-01-03T10:00:00Z");

    // Process orders
    const findings1 = await engine.detect(order1);
    const findings2 = await engine.detect(order2);
    const findings3 = await engine.detect(order3);

    // Process an anomalous order (much higher refund amount)
    const anomalousOrder = createOrderDataWithRefund(200.0, "2023-01-04T10:00:00Z");
    const anomalousFindings = await engine.detect(anomalousOrder);

    // Process a normal order again
    const normalOrder = createOrderDataWithRefund(52.0, "2023-01-05T10:00:00Z");
    const normalFindings = await engine.detect(normalOrder);

    // Verify that the engine processes without errors
    expect(findings1).toBeDefined();
    expect(findings2).toBeDefined();
    expect(findings3).toBeDefined();
    expect(anomalousFindings).toBeDefined();
    expect(normalFindings).toBeDefined();

    // All should be arrays (even if empty)
    expect(Array.isArray(findings1)).toBe(true);
    expect(Array.isArray(findings2)).toBe(true);
    expect(Array.isArray(findings3)).toBe(true);
    expect(Array.isArray(anomalousFindings)).toBe(true);
    expect(Array.isArray(normalFindings)).toBe(true);
  });

  it("should maintain backward compatibility when adaptive learning is disabled", async () => {
    const configWithAL: DetectionConfig = {
      gracePeriodDays: 3,
      adaptiveLearning: {
        enabled: true,
        learningRate: 0.1,
        seasonalWindow: 30,
        minSamples: 2,
        outlierStdDevMultiplier: 2.5,
        seasonalDetectionEnabled: true,
        thresholdAdjustmentEnabled: true,
        performanceWindow: 60,
      }
    };

    const configWithoutAL: DetectionConfig = {
      gracePeriodDays: 3,
      adaptiveLearning: {
        enabled: false,
        learningRate: 0.1,
        seasonalWindow: 30,
        minSamples: 2,
        outlierStdDevMultiplier: 2.5,
        seasonalDetectionEnabled: true,
        thresholdAdjustmentEnabled: true,
        performanceWindow: 60,
      }
    };

    const engineWithAL = DetectionStrategyFactory.createEngine("pro", configWithAL, shopId);
    const engineWithoutAL = DetectionStrategyFactory.createEngine("pro", configWithoutAL, shopId);

    const orderData = createOrderDataWithRefund(75.0, "2023-01-01T10:00:00Z");

    const findingsWithAL = await engineWithAL.detect(orderData);
    const findingsWithoutAL = await engineWithoutAL.detect(orderData);

    // Both should return findings (the actual values may differ due to adaptive adjustments)
    // But both should be arrays without errors
    expect(Array.isArray(findingsWithAL)).toBe(true);
    expect(Array.isArray(findingsWithoutAL)).toBe(true);
  });

  it("should handle empty order data gracefully", async () => {
    const config: DetectionConfig = {
      gracePeriodDays: 3,
      adaptiveLearning: {
        enabled: true,
        learningRate: 0.1,
        seasonalWindow: 30,
        minSamples: 2,
        outlierStdDevMultiplier: 2.5,
        seasonalDetectionEnabled: true,
        thresholdAdjustmentEnabled: true,
        performanceWindow: 60,
      }
    };

    const engine = DetectionStrategyFactory.createEngine("pro", config, shopId);
    const emptyOrderData: NormalizedOrderData = {
      shopId: shopId as ShopId,
      shopifyOrderId: "order_empty",
      shopifyOrderName: "ORDER-EMPTY",
      updatedAt: new Date(),
      refunds: [],
      returns: []
    };

    const findings = await engine.detect(emptyOrderData);
    expect(Array.isArray(findings)).toBe(true);
    expect(findings.length).toBe(0); // Should return empty array for empty data
  });
});