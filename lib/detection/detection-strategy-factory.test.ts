// lib/detection/detection-strategy-factory.test.ts
import { describe, it, expect } from "vitest";
import { DetectionStrategyFactory } from "./detection-strategy-factory";
import { DetectionConfig } from "./types";
import { LegacyDetectionStrategy } from "./strategies/legacy-detection-strategy";
import { TemporalPatternStrategy } from "./strategies/temporal-pattern-strategy";
import { FuzzyMatchingStrategy } from "./strategies/fuzzy-matching-strategy";
import { DetectionEngine } from "./detection-engine";
import { AdaptiveLearningStrategy } from "./strategies/adaptive-learning-strategy";

describe("DetectionStrategyFactory", () => {
  const defaultConfig: DetectionConfig = {
    gracePeriodDays: 7
  };

  describe("createStrategies", () => {
    it("should always include the legacy strategy", () => {
      const strategies = DetectionStrategyFactory.createStrategies("free", defaultConfig, "test-shop-123");
      expect(strategies).toContainEqual(expect.any(LegacyDetectionStrategy));
    });

    it("should not include enhanced strategies for free tier by default", () => {
      const strategies = DetectionStrategyFactory.createStrategies("free", defaultConfig, "test-shop-123");
      const legacyCount = strategies.filter(s => s instanceof LegacyDetectionStrategy).length;
      const temporalCount = strategies.filter(s => s instanceof TemporalPatternStrategy).length;
      const fuzzyCount = strategies.filter(s => s instanceof FuzzyMatchingStrategy).length;

      expect(legacyCount).toBe(1);
      expect(temporalCount).toBe(0);
      expect(fuzzyCount).toBe(0);
      expect(strategies.length).toBe(1);
    });

    it("should include temporal strategy for growth tier by default", () => {
      const strategies = DetectionStrategyFactory.createStrategies("growth", defaultConfig, "test-shop-123");
      const legacyCount = strategies.filter(s => s instanceof LegacyDetectionStrategy).length;
      const temporalCount = strategies.filter(s => s instanceof TemporalPatternStrategy).length;
      const fuzzyCount = strategies.filter(s => s instanceof FuzzyMatchingStrategy).length;

      expect(legacyCount).toBe(1);
      expect(temporalCount).toBe(1);
      expect(fuzzyCount).toBe(0);
      expect(strategies.length).toBe(2);
    });

    it("should include both temporal and fuzzy strategies for pro tier by default", () => {
      const strategies = DetectionStrategyFactory.createStrategies("pro", defaultConfig, "test-shop-123");
      const legacyCount = strategies.filter(s => s instanceof AdaptiveLearningStrategy &&
        // Check if it's wrapping a LegacyDetectionStrategy
        // @ts-expect-error: Accessing private property for testing
        s.wrappedStrategy instanceof LegacyDetectionStrategy).length;
      const temporalCount = strategies.filter(s => s instanceof AdaptiveLearningStrategy &&
        // Check if it's wrapping a TemporalPatternStrategy
        // @ts-expect-error: Accessing private property for testing
        s.wrappedStrategy instanceof TemporalPatternStrategy).length;
      const fuzzyCount = strategies.filter(s => s instanceof AdaptiveLearningStrategy &&
        // Check if it's wrapping a FuzzyMatchingStrategy
        // @ts-expect-error: Accessing private property for testing
        s.wrappedStrategy instanceof FuzzyMatchingStrategy).length;

      expect(legacyCount).toBe(1);
      expect(temporalCount).toBe(1);
      expect(fuzzyCount).toBe(1);
      expect(strategies.length).toBe(3);
    });

    it("should respect explicit configuration overrides", () => {
      const config: DetectionConfig = {
        ...defaultConfig,
        temporalPattern: { enabled: false },
        fuzzyMatching: { enabled: false }
      };

      const strategies = DetectionStrategyFactory.createStrategies("pro", config, "test-shop-123");
      const legacyCount = strategies.filter(s => s instanceof AdaptiveLearningStrategy &&
        // Check if it's wrapping a LegacyDetectionStrategy
        // @ts-expect-error: Accessing private property for testing
        s.wrappedStrategy instanceof LegacyDetectionStrategy).length;
      const temporalCount = strategies.filter(s => s instanceof AdaptiveLearningStrategy &&
        // Check if it's wrapping a TemporalPatternStrategy (should be 0 since temporal is disabled)
        // @ts-expect-error: Accessing private property for testing
        s.wrappedStrategy instanceof TemporalPatternStrategy).length;
      const fuzzyCount = strategies.filter(s => s instanceof AdaptiveLearningStrategy &&
        // Check if it's wrapping a FuzzyMatchingStrategy (should be 0 since fuzzy is disabled)
        // @ts-expect-error: Accessing private property for testing
        s.wrappedStrategy instanceof FuzzyMatchingStrategy).length;

      expect(legacyCount).toBe(1);
      expect(temporalCount).toBe(0);
      expect(fuzzyCount).toBe(0);
      expect(strategies.length).toBe(1);
    });

    it("should enable strategies when explicitly configured to do so", () => {
      const config: DetectionConfig = {
        ...defaultConfig,
        temporalPattern: { enabled: true },
        fuzzyMatching: { enabled: true }
      };

      const strategies = DetectionStrategyFactory.createStrategies("free", config, "test-shop-123");
      const legacyCount = strategies.filter(s => s instanceof LegacyDetectionStrategy).length;
      const temporalCount = strategies.filter(s => s instanceof TemporalPatternStrategy).length;
      const fuzzyCount = strategies.filter(s => s instanceof FuzzyMatchingStrategy).length;

      expect(legacyCount).toBe(1);
      expect(temporalCount).toBe(1);
      expect(fuzzyCount).toBe(1);
      expect(strategies.length).toBe(3);
    });
  });

  describe("createEngine", () => {
    it("should create a DetectionEngine with the correct strategies", () => {
      const engine = DetectionStrategyFactory.createEngine("pro", defaultConfig, "test-shop-123");
      expect(engine).toBeInstanceOf(DetectionEngine);
      // Should have 3 adaptive learning strategies when adaptive learning is enabled for pro tier
      // @ts-expect-error: Accessing private property for testing
      const legacyCount = engine.strategies.filter(s => s instanceof AdaptiveLearningStrategy &&
        // Check if it's wrapping a LegacyDetectionStrategy
        // @ts-expect-error: Accessing private property for testing
        s.wrappedStrategy instanceof LegacyDetectionStrategy).length;
      // @ts-expect-error: Accessing private property for testing
      const temporalCount = engine.strategies.filter(s => s instanceof AdaptiveLearningStrategy &&
        // Check if it's wrapping a TemporalPatternStrategy
        // @ts-expect-error: Accessing private property for testing
        s.wrappedStrategy instanceof TemporalPatternStrategy).length;
      // @ts-expect-error: Accessing private property for testing
      const fuzzyCount = engine.strategies.filter(s => s instanceof AdaptiveLearningStrategy &&
        // Check if it's wrapping a FuzzyMatchingStrategy
        // @ts-expect-error: Accessing private property for testing
        s.wrappedStrategy instanceof FuzzyMatchingStrategy).length;

      expect(legacyCount).toBe(1);
      expect(temporalCount).toBe(1);
      expect(fuzzyCount).toBe(1);
      // @ts-expect-error: Accessing private property for testing
      expect(engine.strategies).toHaveLength(3);
    });
  });
});