// lib/detection/feedback/feedback-processor.test.ts
import { describe, it, expect } from "vitest";
import { FeedbackProcessor } from "./feedback-processor";
import { AdaptiveLearningConfig } from "../adaptive-learning-config";

describe("FeedbackProcessor", () => {
  const baseConfig: AdaptiveLearningConfig = {
    enabled: true,
    learningRate: 0.1,
    seasonalWindow: 30,
    minSamples: 5,
    outlierStdDevMultiplier: 2.5,
    seasonalDetectionEnabled: true,
    thresholdAdjustmentEnabled: true,
    performanceWindow: 60,
  };

  describe("processFeedback", () => {
    it("should return unchanged config when feedback processing is disabled", () => {
      const config: AdaptiveLearningConfig = {
        ...baseConfig,
        feedbackProcessing: { enabled: false },
      };

      const result = FeedbackProcessor.processFeedback('confirmed', config);
      expect(result).toStrictEqual(config); // Should return equivalent object (not same reference due to spread)
    });

    it("should initialize feedback processing config when not present", () => {
      const config: AdaptiveLearningConfig = {
        ...baseConfig,
        feedbackProcessing: undefined,
      };

      const result = FeedbackProcessor.processFeedback('confirmed', config);
      expect(result.feedbackProcessing).toBeDefined();
      expect(result.feedbackProcessing?.enabled).toBe(true);
      expect(result.feedbackProcessing?.feedbackWeight).toBe(0.1);
      expect(result.feedbackProcessing?.minFeedbackSamples).toBe(5);
    });

    it("should decrease learning rate for false positive feedback", () => {
      const config: AdaptiveLearningConfig = {
        ...baseConfig,
        feedbackProcessing: { enabled: true, feedbackWeight: 0.1 },
        learningRate: 0.1,
      };

      const result = FeedbackProcessor.processFeedback('false_positive', config);
      // Should decrease learning rate: 0.1 * (1 - 0.1) = 0.09
      expect(result.learningRate).toBeCloseTo(0.09);
    });

    it("should increase learning rate for confirmed feedback", () => {
      const config: AdaptiveLearningConfig = {
        ...baseConfig,
        feedbackProcessing: { enabled: true, feedbackWeight: 0.1 },
        learningRate: 0.1,
      };

      const result = FeedbackProcessor.processFeedback('confirmed', config);
      // Should increase learning rate: 0.1 * (1 + 0.1) = 0.11
      expect(result.learningRate).toBeCloseTo(0.11);
    });

    it("should not change learning rate for comment feedback", () => {
      const config: AdaptiveLearningConfig = {
        ...baseConfig,
        feedbackProcessing: { enabled: true, feedbackWeight: 0.1 },
        learningRate: 0.1,
      };

      const result = FeedbackProcessor.processFeedback('comment', config);
      expect(result.learningRate).toBe(0.1); // Unchanged
    });

    it("should respect minimum learning rate limit", () => {
      const config: AdaptiveLearningConfig = {
        ...baseConfig,
        feedbackProcessing: { enabled: true, feedbackWeight: 0.5 }, // High weight
        learningRate: 0.02, // Already low
      };

      const result = FeedbackProcessor.processFeedback('false_positive', config);
      // Should not go below 0.01 minimum
      expect(result.learningRate).toBeGreaterThanOrEqual(0.01);
    });

    it("should respect maximum learning rate limit", () => {
      const config: AdaptiveLearningConfig = {
        ...baseConfig,
        feedbackProcessing: { enabled: true, feedbackWeight: 0.5 }, // High weight
        learningRate: 0.4, // Already high
      };

      const result = FeedbackProcessor.processFeedback('confirmed', config);
      // Should not go above 0.5 maximum
      expect(result.learningRate).toBeLessThanOrEqual(0.5);
    });
  });

  describe("processExplanationUsefulnessFeedback", () => {
    it("should return unchanged config when explanation feedback processing is disabled", () => {
      const config: AdaptiveLearningConfig = {
        ...baseConfig,
        explanationFeedbackProcessing: { enabled: false },
      };

      const result = FeedbackProcessor.processExplanationUsefulnessFeedback(3, config);
      expect(result).toStrictEqual(config); // Should return equivalent object (not same reference due to spread)
    });

    it("should initialize explanation feedback processing config when not present", () => {
      const config: AdaptiveLearningConfig = {
        ...baseConfig,
        explanationFeedbackProcessing: undefined,
      };

      const result = FeedbackProcessor.processExplanationUsefulnessFeedback(3, config);
      expect(result.explanationFeedbackProcessing).toBeDefined();
      expect(result.explanationFeedbackProcessing?.enabled).toBe(true);
      expect(result.explanationFeedbackProcessing?.feedbackWeight).toBe(0.1);
      expect(result.explanationFeedbackProcessing?.minFeedbackSamples).toBe(5);
      expect(result.explanationFeedbackProcessing?.usefulnessThreshold).toBe(3);
    });

    it("should increase learning rate when explanation is not useful (rating below threshold)", () => {
      const config: AdaptiveLearningConfig = {
        ...baseConfig,
        explanationFeedbackProcessing: { enabled: true, feedbackWeight: 0.1, usefulnessThreshold: 3 },
        learningRate: 0.1,
      };

      const result = FeedbackProcessor.processExplanationUsefulnessFeedback(2, config); // Rating 2 < threshold 3
      // Should increase learning rate: 0.1 * (1 + 0.1) = 0.11
      expect(result.learningRate).toBeCloseTo(0.11);
    });

    it("should decrease learning rate when explanation is useful (rating at or above threshold)", () => {
      const config: AdaptiveLearningConfig = {
        ...baseConfig,
        explanationFeedbackProcessing: { enabled: true, feedbackWeight: 0.1, usefulnessThreshold: 3 },
        learningRate: 0.1,
      };

      const result = FeedbackProcessor.processExplanationUsefulnessFeedback(3, config); // Rating 3 >= threshold 3
      // Should decrease learning rate: 0.1 * (1 - 0.1) = 0.09
      expect(result.learningRate).toBeCloseTo(0.09);
    });

    it("should respect minimum learning rate limit for explanation feedback", () => {
      const config: AdaptiveLearningConfig = {
        ...baseConfig,
        explanationFeedbackProcessing: { enabled: true, feedbackWeight: 0.5 },
        learningRate: 0.02,
      };

      const result = FeedbackProcessor.processExplanationUsefulnessFeedback(1, config); // Not useful
      // Should not go below 0.01 minimum
      expect(result.learningRate).toBeGreaterThanOrEqual(0.01);
    });

    it("should respect maximum learning rate limit for explanation feedback", () => {
      const config: AdaptiveLearningConfig = {
        ...baseConfig,
        explanationFeedbackProcessing: { enabled: true, feedbackWeight: 0.5 },
        learningRate: 0.4,
      };

      const result = FeedbackProcessor.processExplanationUsefulnessFeedback(5, config); // Useful
      // Should not go above 0.5 maximum
      expect(result.learningRate).toBeLessThanOrEqual(0.5);
    });
  });

  describe("shouldAdjustBaselinesFromFeedback", () => {
    it("should return false when feedback history has less than 5 items", () => {
      const feedbackHistory: Array<{ type: 'confirmed' | 'false_positive'; timestamp: number }> = [
        { type: 'confirmed', timestamp: Date.now() },
        { type: 'false_positive', timestamp: 1000 },
        { type: 'confirmed', timestamp: 2000 },
        { type: 'false_positive', timestamp: 3000 }
      ];

      const result = FeedbackProcessor.shouldAdjustBaselinesFromFeedback(feedbackHistory);
      expect(result).toBe(false);
    });

    it("should return false when false positive ratio is low (< 0.3)", () => {
      const feedbackHistory: Array<{ type: 'confirmed' | 'false_positive'; timestamp: number }> = Array(10).fill(null).map((_, i) => ({
        type: i < 7 ? 'confirmed' : 'false_positive' as const, // 70% confirmed, 30% false positive
        timestamp: Date.now() - i * 1000
      }));

      const result = FeedbackProcessor.shouldAdjustBaselinesFromFeedback(feedbackHistory);
      expect(result).toBe(false); // Exactly at threshold should return false
    });

    it("should return true when false positive ratio is high (> 0.3)", () => {
      const feedbackHistory: Array<{ type: 'confirmed' | 'false_positive'; timestamp: number }> = Array(10).fill(null).map((_, i) => ({
        type: i < 6 ? 'confirmed' : 'false_positive' as const, // 60% confirmed, 40% false positive
        timestamp: Date.now() - i * 1000
      }));

      const result = FeedbackProcessor.shouldAdjustBaselinesFromFeedback(feedbackHistory);
      expect(result).toBe(true);
    });
  });

  describe("calculateBaselineAdjustment", () => {
    it("should return 1.0 when no feedback history", () => {
      const result = FeedbackProcessor.calculateBaselineAdjustment(
        [],
        { mean: 100, stdDev: 10 }
      );
      expect(result).toBe(1.0);
    });

    it("should decrease baseline when more false positives than confirmations", () => {
      const feedbackHistory: Array<{ type: 'confirmed' | 'false_positive'; timestamp: number }> = [
        { type: 'false_positive', timestamp: Date.now() },
        { type: 'false_positive', timestamp: Date.now() },
        { type: 'confirmed', timestamp: Date.now() }
      ];

      const result = FeedbackProcessor.calculateBaselineAdjustment(
        feedbackHistory,
        { mean: 100, stdDev: 10 }
      );
      // More false positives (2) than confirmations (1) -> should decrease baseline (< 1.0)
      expect(result).toBeLessThan(1.0);
      expect(result).toBeGreaterThan(0.8); // Within clamping range
    });

    it("should increase baseline when more confirmations than false positives", () => {
      const feedbackHistory: Array<{ type: 'confirmed' | 'false_positive'; timestamp: number }> = [
        { type: 'confirmed', timestamp: Date.now() },
        { type: 'confirmed', timestamp: Date.now() },
        { type: 'false_positive', timestamp: Date.now() }
      ];

      const result = FeedbackProcessor.calculateBaselineAdjustment(
        feedbackHistory,
        { mean: 100, stdDev: 10 }
      );
      // More confirmations (2) than false positives (1) -> should increase baseline (> 1.0)
      expect(result).toBeGreaterThan(1.0);
      expect(result).toBeLessThan(1.2); // Within clamping range
    });

    it("should clamp adjustment factor between 0.8 and 1.2", () => {
      // Create extreme feedback history to test clamping
      const feedbackHistory: Array<{ type: 'confirmed' | 'false_positive'; timestamp: number }> = Array(20).fill(null).map(() => ({
        type: 'false_positive' as const, // All false positives
        timestamp: Date.now()
      }));

      const result = FeedbackProcessor.calculateBaselineAdjustment(
        feedbackHistory,
        { mean: 100, stdDev: 10 }
      );
      // Should be clamped to 0.8 minimum
      expect(result).toBeGreaterThanOrEqual(0.8);
      expect(result).toBeLessThanOrEqual(1.2);
    });
  });
});