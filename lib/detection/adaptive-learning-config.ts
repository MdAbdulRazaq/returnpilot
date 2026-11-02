// lib/detection/adaptive-learning-config.ts
/**
 * Configuration interface for adaptive learning parameters.
 * Defines the settings for store-specific baseline modeling and adaptive threshold adjustment.
 */
export interface AdaptiveLearningConfig {
  /** Enable adaptive learning system. */
  enabled: boolean;

  /** Learning rate for baseline updates (0.0 to 1.0). Higher values adapt faster but may overfit to anomalies. */
  learningRate: number;

  /** Number of days to consider for seasonal pattern detection. */
  seasonalWindow: number;

  /** Minimum number of samples required before adapting thresholds. */
  minSamples: number;

  /** Standard deviation multiplier for outlier detection. Values beyond this are considered anomalies. */
  outlierStdDevMultiplier: number;

  /** Enable seasonal trend detection and adjustment. */
  seasonalDetectionEnabled: boolean;

  /** Enable automatic threshold adjustment based on historical performance. */
  thresholdAdjustmentEnabled: boolean;

  /** Number of days of historical performance to consider for threshold adjustment. */
  performanceWindow: number;

  /** Configuration for feedback processing integration. */
  feedbackProcessing?: {
    /** Enable feedback processing to improve baseline accuracy. */
    enabled?: boolean;
    /** Weight given to recent feedback when adjusting baselines (0.0 to 1.0). */
    feedbackWeight?: number;
    /** Minimum feedback samples required before adjusting baselines. */
    minFeedbackSamples?: number;
  };

  /** Configuration for explanation feedback processing. */
  explanationFeedbackProcessing?: {
    /** Enable explanation feedback processing. */
    enabled?: boolean;
    /** Weight given to recent explanation feedback when adjusting learning rate. */
    feedbackWeight?: number;
    /** Minimum explanation feedback samples required before adjusting learning rate. */
    minFeedbackSamples?: number;
    /** Usefulness threshold: ratings >= this are considered useful. */
    usefulnessThreshold?: number;
  };

  /** Confidence multiplier for anomalous orders (0.0 to 1.0). Lower values reduce confidence more when anomalies are detected. */
  anomalyConfidenceMultiplier?: number;
}