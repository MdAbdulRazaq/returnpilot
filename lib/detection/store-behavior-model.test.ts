// lib/detection/store-behavior-model.test.ts
import { describe, it, expect } from "vitest";
import { StoreBehaviorModel } from "./store-behavior-model";
import { AdaptiveLearningConfig } from "./adaptive-learning-config";

describe("StoreBehaviorModel", () => {
  const config: AdaptiveLearningConfig = {
    enabled: true,
    learningRate: 0.1,
    seasonalWindow: 30,
    minSamples: 5,
    outlierStdDevMultiplier: 2.5,
    seasonalDetectionEnabled: true,
    thresholdAdjustmentEnabled: true,
    performanceWindow: 60,
  };

  describe("updateMean", () => {
    it("should calculate mean correctly for first value", () => {
      const result = StoreBehaviorModel.updateMean(0, 0, 10);
      expect(result).toBe(10);
    });

    it("should calculate mean correctly for subsequent values", () => {
      let mean = StoreBehaviorModel.updateMean(0, 0, 10); // 10
      mean = StoreBehaviorModel.updateMean(1, mean, 20); // 15
      mean = StoreBehaviorModel.updateMean(2, mean, 30); // 20
      expect(mean).toBe(20);
    });
  });

  describe("updateM2", () => {
    it("should calculate M2 correctly", () => {
      // Testing with known values: [2, 4, 4, 4, 5, 5, 7, 9]
      // Mean = 5, M2 = 32
      let count = 0;
      let mean = 0;
      let m2 = 0;

      const values = [2, 4, 4, 4, 5, 5, 7, 9];
      for (const value of values) {
        m2 = StoreBehaviorModel.updateM2(count, mean, m2, value);
        mean = StoreBehaviorModel.updateMean(count, mean, value);
        count++;
      }

      expect(mean).toBeCloseTo(5);
      expect(m2).toBeCloseTo(32);
    });
  });

  describe("calculateStdDev", () => {
    it("should return 0 for less than 2 samples", () => {
      expect(StoreBehaviorModel.calculateStdDev(0, 0)).toBe(0);
      expect(StoreBehaviorModel.calculateStdDev(5, 1)).toBe(0);
    });

    it("should calculate standard deviation correctly", () => {
      // For values [2, 4, 4, 4, 5, 5, 7, 9]
      // Mean = 5, variance = 32/8 = 4, stdDev = 2
      expect(StoreBehaviorModel.calculateStdDev(32, 8)).toBeCloseTo(2);
    });
  });

  describe("updateBaseline", () => {
    it("should update baseline with new value", () => {
      const result = StoreBehaviorModel.updateBaseline(config, 0, 0, 0, 10);
      expect(result.count).toBe(1);
      expect(result.mean).toBe(10);
      expect(result.m2).toBe(0);
    });

    it("should not adapt when below minSamples", () => {
      // Establish baseline with 4 updates (below minSamples=5)
      let result = StoreBehaviorModel.updateBaseline(config, 0, 0, 0, 10);
      result = StoreBehaviorModel.updateBaseline(config, result.count, result.mean, result.m2, 20);
      result = StoreBehaviorModel.updateBaseline(config, result.count, result.mean, result.m2, 30);
      result = StoreBehaviorModel.updateBaseline(config, result.count, result.mean, result.m2, 40);

      // With minSamples = 5, the 5th update should still behave normally (not using adaptive learning rate yet)
      result = StoreBehaviorModel.updateBaseline(config, result.count, result.mean, result.m2, 50);
      expect(result.count).toBe(5);
      expect(result.mean).toBeCloseTo(30);
      expect(result.m2).toBeCloseTo(1000);
    });
  });

  describe("detectSeasonalPattern", () => {
    it("should detect seasonal pattern from timestamps", () => {
      // Create timestamps for one week: Sunday through Saturday
      const baseTime = new Date("2023-01-01T00:00:00Z").getTime(); // Sunday
      const timestamps = [
        baseTime, // Sunday
        baseTime + 24 * 60 * 60 * 1000, // Monday
        baseTime + 2 * 24 * 60 * 60 * 1000, // Tuesday
        baseTime + 3 * 24 * 60 * 60 * 1000, // Wednesday
        baseTime + 4 * 24 * 60 * 60 * 1000, // Thursday
        baseTime + 5 * 24 * 60 * 60 * 1000, // Friday
        baseTime + 6 * 24 * 60 * 60 * 1000, // Saturday
      ];

      const pattern = StoreBehaviorModel.detectSeasonalPattern(timestamps);
      expect(pattern.length).toBe(7);
      expect(pattern[0]).toBe(1); // Sunday
      expect(pattern[1]).toBe(1); // Monday
      // Assuming each day has equal weight in this simple example
    });

    it("should handle empty timestamps array", () => {
      const pattern = StoreBehaviorModel.detectSeasonalPattern([]);
      expect(pattern.length).toBe(7);
      expect(pattern.every(val => val === 0)).toBe(true);
    });
  });

  describe("getSeasonalAdjustment", () => {
    it("should return 1.0 when global average is 0", () => {
      const adjustment = StoreBehaviorModel.getSeasonalAdjustment(
        Date.now(),
        [1, 1, 1, 1, 1, 1, 1],
        0
      );
      expect(adjustment).toBe(1.0);
    });

    it("should calculate adjustment correctly", () => {
      // If Sunday has value 2 and global average is 1, adjustment should be 2.0
      const adjustment = StoreBehaviorModel.getSeasonalAdjustment(
        new Date("2023-01-01T00:00:00Z").getTime(), // Sunday
        [2, 1, 1, 1, 1, 1, 1], // Sunday=2, others=1
        1.0 // Global average
      );
      expect(adjustment).toBeCloseTo(2.0);
    });
  });

  describe("isWithinExpectedBounds", () => {
    it("should return true for value equal to mean when stdDev is 0", () => {
      expect(
        StoreBehaviorModel.isWithinExpectedBounds(5, 5, 0)
      ).toBe(true);
    });

    it("should return false for value not equal to mean when stdDev is 0", () => {
      expect(
        StoreBehaviorModel.isWithinExpectedBounds(6, 5, 0)
      ).toBe(false);
    });

    it("should return true for value within 1 stdDev", () => {
      expect(
        StoreBehaviorModel.isWithinExpectedBounds(6, 5, 2, 1)
      ).toBe(true); // 6 is within 1 stdDev of 5 (range: 3-7)
    });

    it("should return false for value outside 2 stdDev", () => {
      expect(
        StoreBehaviorModel.isWithinExpectedBounds(10, 5, 2, 2)
      ).toBe(false); // 10 is outside 2 stdDev of 5 (range: 1-9)
    });
  });
});