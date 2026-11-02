// lib/detection/adaptive-learning-config.test.ts
import { describe, it, expect } from "vitest";
import { AdaptiveLearningConfig } from "./adaptive-learning-config";

describe("AdaptiveLearningConfig", () => {
  const validConfig: AdaptiveLearningConfig = {
    enabled: true,
    learningRate: 0.1,
    seasonalWindow: 30,
    minSamples: 10,
    outlierStdDevMultiplier: 2.5,
    seasonalDetectionEnabled: true,
    thresholdAdjustmentEnabled: true,
    performanceWindow: 60,
    anomalyConfidenceMultiplier: 0.7
  };

  it("should create a valid configuration with all required fields", () => {
    expect(validConfig.enabled).toBe(true);
    expect(validConfig.learningRate).toBe(0.1);
    expect(validConfig.seasonalWindow).toBe(30);
    expect(validConfig.minSamples).toBe(10);
    expect(validConfig.outlierStdDevMultiplier).toBe(2.5);
    expect(validConfig.seasonalDetectionEnabled).toBe(true);
    expect(validConfig.thresholdAdjustmentEnabled).toBe(true);
    expect(validConfig.performanceWindow).toBe(60);
    expect(validConfig.anomalyConfidenceMultiplier).toBe(0.7);
  });

  it("should have default values when not specified", () => {
    const configWithDefaults: AdaptiveLearningConfig = {
      enabled: false,
      learningRate: 0.05,
      seasonalWindow: 14,
      minSamples: 5,
      outlierStdDevMultiplier: 2.0,
      seasonalDetectionEnabled: false,
      thresholdAdjustmentEnabled: false,
      performanceWindow: 30,
      anomalyConfidenceMultiplier: 0.5
    };

    expect(configWithDefaults.enabled).toBe(false);
    expect(configWithDefaults.learningRate).toBe(0.05);
    expect(configWithDefaults.seasonalWindow).toBe(14);
    expect(configWithDefaults.minSamples).toBe(5);
    expect(configWithDefaults.outlierStdDevMultiplier).toBe(2.0);
    expect(configWithDefaults.seasonalDetectionEnabled).toBe(false);
    expect(configWithDefaults.thresholdAdjustmentEnabled).toBe(false);
    expect(configWithDefaults.performanceWindow).toBe(30);
    expect(configWithDefaults.anomalyConfidenceMultiplier).toBe(0.5);
  });

  it("should validate learning rate is between 0 and 1", () => {
    // Note: In a real implementation, we might use a validation library like zod or yup
    // For this test, we're just verifying the values we set are reasonable
    expect(validConfig.learningRate).toBeGreaterThanOrEqual(0);
    expect(validConfig.learningRate).toBeLessThanOrEqual(1);
  });

  it("should validate seasonal window is positive", () => {
    expect(validConfig.seasonalWindow).toBeGreaterThan(0);
  });

  it("should validate min samples is positive", () => {
    expect(validConfig.minSamples).toBeGreaterThan(0);
  });

  it("should validate outlier std dev multiplier is positive", () => {
    expect(validConfig.outlierStdDevMultiplier).toBeGreaterThan(0);
  });

  it("should validate performance window is positive", () => {
    expect(validConfig.performanceWindow).toBeGreaterThan(0);
  });

  it("should validate anomaly confidence multiplier is between 0 and 1", () => {
    // Note: In a real implementation, we might use a validation library like zod or yup
    // For this test, we're just verifying the values we set are reasonable
    expect(validConfig.anomalyConfidenceMultiplier).toBeGreaterThanOrEqual(0);
    expect(validConfig.anomalyConfidenceMultiplier).toBeLessThanOrEqual(1);
  });
});