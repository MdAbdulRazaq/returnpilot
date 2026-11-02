// lib/detection/detection-strategy-factory.ts
import { DetectionStrategy } from "./strategies/detection-strategy";
import { LegacyDetectionStrategy } from "./strategies/legacy-detection-strategy";
import { TemporalPatternStrategy } from "./strategies/temporal-pattern-strategy";
import { FuzzyMatchingStrategy } from "./strategies/fuzzy-matching-strategy";
import { AdaptiveLearningStrategy } from "./strategies/adaptive-learning-strategy";
import { AdaptiveLearningConfig } from "./adaptive-learning-config";
import { DetectionEngine } from "./detection-engine";
import { DetectionConfig } from "./types";
import { SequenceDetectionStrategy } from "./strategies/sequence-detection-strategy";
import { BehavioralAnalysisStrategy } from "./strategies/behavioral-analysis-strategy";
import { AnomalyDetectionStrategy } from "./strategies/anomaly-detection-strategy";
import { PatternRecognitionConfig } from "./pattern-recognition-config";

/**
 * Factory for creating and configuring detection strategies based on merchant tier and settings.
 */
export class DetectionStrategyFactory {
  /**
   * Create detection strategies based on merchant tier and configuration.
   * @param merchantTier The merchant's pricing tier (free, starter, growth, pro, enterprise)
   * @param config Detection configuration including strategy-specific settings
   * @param shopId Identifier for the store (used for adaptive learning)
   * @returns Array of configured detection strategies
   */
  static createStrategies(
    merchantTier: string,
    config: DetectionConfig,
    shopId: string
  ): DetectionStrategy[] {
    const strategies: DetectionStrategy[] = [];

    // Add enhanced strategies based on merchant tier and configuration
    const tierLower = merchantTier.toLowerCase();

    // Check if temporal pattern strategy is enabled
    const temporalEnabled = config.temporalPattern?.enabled ??
      (tierLower === "growth" || tierLower === "pro" || tierLower === "enterprise");

    // Check if fuzzy matching strategy is enabled
    const fuzzyEnabled = config.fuzzyMatching?.enabled ??
      (tierLower === "pro" || tierLower === "enterprise");

    // Check if adaptive learning is enabled
    const adaptiveEnabled =
      config.adaptiveLearning?.enabled ??
      (tierLower === "pro" || tierLower === "enterprise");

    // Check if pattern recognition is enabled
    const patternRecognitionEnabled = config.patternRecognition?.enabled ?? false;

    // Use provided config or create default adaptive learning config
    const adaptiveConfig: AdaptiveLearningConfig = config.adaptiveLearning ?? {
      enabled: true,
      learningRate: 0.1,
      seasonalWindow: 30,
      minSamples: 5,
      outlierStdDevMultiplier: 2.5,
      seasonalDetectionEnabled: true,
      thresholdAdjustmentEnabled: true,
      performanceWindow: 60,
      anomalyConfidenceMultiplier: 0.7,
      feedbackProcessing: {
        enabled: false,
        feedbackWeight: 0.1,
        minFeedbackSamples: 5
      },
      explanationFeedbackProcessing: {
        enabled: false,
        feedbackWeight: 0.1,
        minFeedbackSamples: 5,
        usefulnessThreshold: 3
      }
    };

    // Use provided config or create default pattern recognition config
    const patternRecognitionConfig: PatternRecognitionConfig = config.patternRecognition ?? {
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

    if (adaptiveEnabled) {
      // Apply adaptive wrapping to temporal pattern strategy if enabled
      if (temporalEnabled) {
        const temporalStrategy = new TemporalPatternStrategy();
        const adaptiveTemporal = new AdaptiveLearningStrategy(
          temporalStrategy,
          adaptiveConfig,
          shopId
        );
        strategies.push(adaptiveTemporal);
      }

      // Apply adaptive wrapping to fuzzy matching strategy if enabled
      if (fuzzyEnabled) {
        const fuzzyStrategy = new FuzzyMatchingStrategy();
        const adaptiveFuzzy = new AdaptiveLearningStrategy(
          fuzzyStrategy,
          adaptiveConfig,
          shopId
        );
        strategies.push(adaptiveFuzzy);
      }

      // Apply adaptive wrapping to legacy strategy (always present)
      const legacyStrategy = new LegacyDetectionStrategy();
      const adaptiveLegacy = new AdaptiveLearningStrategy(
        legacyStrategy,
        adaptiveConfig,
        shopId
      );
      strategies.push(adaptiveLegacy);
    } else {
      // Fallback to original behavior when adaptive learning is disabled
      // Always include the legacy strategy for backward compatibility
      strategies.push(new LegacyDetectionStrategy());

      // Add enhanced strategies based on merchant tier and configuration
      if (temporalEnabled) {
        const temporalStrategy = new TemporalPatternStrategy();
        strategies.push(temporalStrategy);
      }

      if (fuzzyEnabled) {
        const fuzzyStrategy = new FuzzyMatchingStrategy();
        strategies.push(fuzzyStrategy);
      }
    }

    // Add pattern recognition strategies when enabled
    if (patternRecognitionEnabled) {
      // Add sequence detection strategy if enabled
      const sequenceConfig = patternRecognitionConfig.sequenceAnalysis ?? {};
      if (sequenceConfig.enabled ?? true) {
        const sequenceStrategy = new SequenceDetectionStrategy(
          patternRecognitionConfig,
          shopId
        );
        strategies.push(sequenceStrategy);
      }

      // Add behavioral analysis strategy if enabled
      const behavioralConfig = patternRecognitionConfig.behavioralAnalysis ?? {};
      if (behavioralConfig.enabled ?? true) {
        const behavioralStrategy = new BehavioralAnalysisStrategy(
          patternRecognitionConfig,
          shopId
        );
        strategies.push(behavioralStrategy);
      }

      // Add anomaly detection strategy if enabled
      const anomalyConfig = patternRecognitionConfig.anomalyDetection ?? {};
      if (anomalyConfig.enabled ?? true) {
        const anomalyStrategy = new AnomalyDetectionStrategy(
          patternRecognitionConfig,
          shopId
        );
        strategies.push(anomalyStrategy);
      }
    }

    return strategies;
  }

  /**
   * Create a DetectionEngine with strategies appropriate for the merchant tier.
   * @param merchantTier The merchant's pricing tier
   * @param config Detection configuration
   * @param shopId Identifier for the store (used for adaptive learning)
   * @returns Configured DetectionEngine instance
   */
  static createEngine(
    merchantTier: string,
    config: DetectionConfig,
    shopId: string
  ): DetectionEngine {
    const strategies = this.createStrategies(merchantTier, config, shopId);
    return new DetectionEngine(strategies, config);
  }
}