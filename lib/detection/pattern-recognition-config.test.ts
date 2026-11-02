// lib/detection/pattern-recognition-config.test.ts
import { describe, it, expect } from "vitest";
import { PatternRecognitionConfig } from "./pattern-recognition-config";

describe("PatternRecognitionConfig", () => {
  it("should have default values when created", () => {
    const config: PatternRecognitionConfig = {
      enabled: true,
      sequenceAnalysis: {
        enabled: true,
        windowDays: 7,
        minSequenceLength: 3,
        sensitivityLevel: 0.7
      },
      behavioralAnalysis: {
        enabled: true,
        windowDays: 30,
        minSamples: 5,
        sensitivityLevel: 0.7
      },
      anomalyDetection: {
        enabled: true,
        stdDevThreshold: 2.5,
        minSamples: 10,
        sensitivityLevel: 0.7
      }
    };

    expect(config.enabled).toBe(true);
    expect(config.sequenceAnalysis.enabled).toBe(true);
    expect(config.sequenceAnalysis.windowDays).toBe(7);
    expect(config.sequenceAnalysis.minSequenceLength).toBe(3);
    expect(config.sequenceAnalysis.sensitivityLevel).toBe(0.7);
    expect(config.behavioralAnalysis.enabled).toBe(true);
    expect(config.behavioralAnalysis.windowDays).toBe(30);
    expect(config.behavioralAnalysis.minSamples).toBe(5);
    expect(config.behavioralAnalysis.sensitivityLevel).toBe(0.7);
    expect(config.anomalyDetection.enabled).toBe(true);
    expect(config.anomalyDetection.stdDevThreshold).toBe(2.5);
    expect(config.anomalyDetection.minSamples).toBe(10);
    expect(config.anomalyDetection.sensitivityLevel).toBe(0.7);
  });

  it("should allow disabling individual analysis types", () => {
    const config: PatternRecognitionConfig = {
      enabled: true,
      sequenceAnalysis: {
        enabled: false, // Disabled
        windowDays: 7,
        minSequenceLength: 3,
        sensitivityLevel: 0.7
      },
      behavioralAnalysis: {
        enabled: true,
        windowDays: 30,
        minSamples: 5,
        sensitivityLevel: 0.7
      },
      anomalyDetection: {
        enabled: true,
        stdDevThreshold: 2.5,
        minSamples: 10,
        sensitivityLevel: 0.7
      }
    };

    expect(config.sequenceAnalysis.enabled).toBe(false);
    expect(config.behavioralAnalysis.enabled).toBe(true);
    expect(config.anomalyDetection.enabled).toBe(true);
  });

  it("should respect custom sensitivity levels", () => {
    const config: PatternRecognitionConfig = {
      enabled: true,
      sequenceAnalysis: {
        enabled: true,
        windowDays: 7,
        minSequenceLength: 3,
        sensitivityLevel: 0.3 // Low sensitivity
      },
      behavioralAnalysis: {
        enabled: true,
        windowDays: 30,
        minSamples: 5,
        sensitivityLevel: 0.9 // High sensitivity
      },
      anomalyDetection: {
        enabled: true,
        stdDevThreshold: 2.5,
        minSamples: 10,
        sensitivityLevel: 0.5 // Medium sensitivity
      }
    };

    expect(config.sequenceAnalysis.sensitivityLevel).toBe(0.3);
    expect(config.behavioralAnalysis.sensitivityLevel).toBe(0.9);
    expect(config.anomalyDetection.sensitivityLevel).toBe(0.5);
  });

  it("should allow custom window sizes", () => {
    const config: PatternRecognitionConfig = {
      enabled: true,
      sequenceAnalysis: {
        enabled: true,
        windowDays: 14, // Two weeks
        minSequenceLength: 5,
        sensitivityLevel: 0.7
      },
      behavioralAnalysis: {
        enabled: true,
        windowDays: 60, // Two months
        minSamples: 10,
        sensitivityLevel: 0.7
      },
      anomalyDetection: {
        enabled: true,
        stdDevThreshold: 2.0, // More sensitive
        minSamples: 20,
        sensitivityLevel: 0.7
      }
    };

    expect(config.sequenceAnalysis.windowDays).toBe(14);
    expect(config.behavioralAnalysis.windowDays).toBe(60);
    expect(config.anomalyDetection.stdDevThreshold).toBe(2.0);
    expect(config.anomalyDetection.minSamples).toBe(20);
  });
});