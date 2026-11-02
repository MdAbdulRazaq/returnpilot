// lib/detection/pattern-recognition-config.ts
/**
 * Configuration interface for pattern recognition parameters.
 * Defines the settings for sequence analysis, behavioral analysis, and anomaly detection.
 */
export interface PatternRecognitionConfig {
  /** Enable pattern recognition system. */
  enabled: boolean;

  /** Configuration for sequence analysis detection. */
  sequenceAnalysis: {
    /** Enable sequence analysis detection. */
    enabled?: boolean;
    /** Number of days to consider for sequence analysis. */
    windowDays?: number;
    /** Minimum sequence length to consider for analysis. */
    minSequenceLength?: number;
    /** Sensitivity level (0.0 to 1.0). Higher values increase sensitivity. */
    sensitivityLevel?: number;
  };

  /** Configuration for behavioral analysis detection. */
  behavioralAnalysis: {
    /** Enable behavioral analysis detection. */
    enabled?: boolean;
    /** Number of days to consider for behavioral analysis. */
    windowDays?: number;
    /** Minimum samples required before behavioral analysis begins. */
    minSamples?: number;
    /** Sensitivity level (0.0 to 1.0). Higher values increase sensitivity. */
    sensitivityLevel?: number;
  };

  /** Configuration for anomaly detection. */
  anomalyDetection: {
    /** Enable anomaly detection. */
    enabled?: boolean;
    /** Standard deviation threshold for outlier detection. */
    stdDevThreshold?: number;
    /** Minimum samples required before anomaly detection begins. */
    minSamples?: number;
    /** Sensitivity level (0.0 to 1.0). Higher values increase sensitivity. */
    sensitivityLevel?: number;
  };
}