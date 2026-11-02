// lib/detection/strategies/anomaly-detection-strategy.ts
import { DetectionStrategy } from "./detection-strategy";
import { BaseDetectionStrategy } from "./base-detection-strategy";
import { Finding, AlertReason } from "../types";
import { NormalizedOrderData } from "../normalize";
import { StoreBehaviorModel } from "../store-behavior-model";
import { PatternRecognitionConfig } from "../pattern-recognition-config";

/**
 * AnomalyDetectionStrategy: Flags statistically significant outliers in order amounts using distribution analysis.
 * Uses multiple outlier detection methods (z-score, IQR, percentiles) to identify unusual order patterns.
 */
export class AnomalyDetectionStrategy extends BaseDetectionStrategy {
  private config: PatternRecognitionConfig;
  private shopId: string;

  // Order amount tracking for anomaly detection
  private orderAmounts: number[] = [];

  /**
   * Create an anomaly detection strategy.
   * @param config Pattern recognition configuration
   * @param shopId Identifier for the store (used for store-specific analysis)
   */
  constructor(
    config: PatternRecognitionConfig,
    shopId: string
  ) {
    super();
    this.config = config;
    this.shopId = shopId;
  }

  /**
   * Analyze order data for statistical anomalies.
   * @param data Normalized order data to analyze
   * @returns Array of findings, potentially adjusted based on anomaly detection
   */
  analyze(data: NormalizedOrderData): Finding[] {
    // If pattern recognition is disabled, return no findings
    if (!this.config.enabled) {
      return [];
    }

    const anomalyConfig = this.config.anomalyDetection ?? {};

    // Check if anomaly detection is enabled
    if (!(anomalyConfig.enabled ?? true)) {
      return [];
    }

    // Get configuration values with defaults
    const windowDays = 30; // Fixed window for anomaly detection (could be made configurable)
    const minSamples = anomalyConfig.minSamples ?? 10;
    const stdDevThreshold = anomalyConfig.stdDevThreshold ?? 2.5;
    const sensitivityLevel = anomalyConfig.sensitivityLevel ?? 0.7;

    // Convert windowDays to milliseconds
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    const now = data.updatedAt.getTime();

    // Extract order amount from current order
    const totalRefundAmount = data.refunds.reduce(
      (sum, refund) => sum + refund.totalRefundedAmount,
      0
    );

    // Add current order amount to tracking array
    if (totalRefundAmount > 0) {
      this.orderAmounts.push(totalRefundAmount);
    }

    // Remove data outside the window
    // We need to track which amounts correspond to which timestamps
    // For simplicity, we'll assume all tracked amounts are within window
    // In a production system, we'd track amounts with timestamps
    // For now, we'll use a simple approach: keep last N samples where N is reasonable
    const maxSamples = 100; // Limit memory usage
    if (this.orderAmounts.length > maxSamples) {
      this.orderAmounts = this.orderAmounts.slice(-maxSamples);
    }

    // Need minimum samples to analyze
    if (this.orderAmounts.length < minSamples) {
      return [];
    }

    // Calculate anomaly score using multiple methods
    let anomalyScore = 0;

    // Method 1: Z-score analysis
    if (this.orderAmounts.length >= 2) { // Need at least 2 samples for std dev
      // Calculate mean and standard deviation manually
      const sum = this.orderAmounts.reduce((acc, val) => acc + val, 0);
      const mean = sum / this.orderAmounts.length;

      // Calculate variance
      const varianceSum = this.orderAmounts.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
      const variance = varianceSum / (this.orderAmounts.length - 1);
      const stdDev = Math.sqrt(variance);

      const zScore = stdDev > 0 ? Math.abs((totalRefundAmount - mean) / stdDev) : 0;

      if (zScore > stdDevThreshold) {
        anomalyScore += 0.4; // Z-score contributes 40% to anomaly score
      }
    }

    // Method 2: IQR (Interquartile Range) analysis
    const sortedAmounts = [...this.orderAmounts].sort((a, b) => a - b);
    const q1Index = Math.floor(sortedAmounts.length * 0.25);
    const q3Index = Math.floor(sortedAmounts.length * 0.75);
    const q1 = sortedAmounts[q1Index];
    const q3 = sortedAmounts[q3Index];

    // Guard against undefined values (should not happen with minSamples check, but added for safety)
    if (q1 === undefined || q3 === undefined) {
      // Skip IQR analysis if we can't compute quartiles
    } else {
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      if (totalRefundAmount < lowerBound || totalRefundAmount > upperBound) {
        anomalyScore += 0.3; // IQR contributes 30% to anomaly score
      }
    }

    // Method 3: Percentile-based analysis (95th percentile)
    const percentile95Index = Math.floor(sortedAmounts.length * 0.95);
    const percentile95 = sortedAmounts[percentile95Index];
    if (percentile95 !== undefined) {
      if (totalRefundAmount > percentile95) {
        // How much above the 95th percentile?
        const excessRatio = (totalRefundAmount - percentile95) / percentile95;
        if (excessRatio > 0.5) { // More than 50% above 95th percentile
          anomalyScore += 0.3; // Percentile contributes 30% to anomaly score
        }
      }
    }

    // Apply sensitivity level
    anomalyScore *= sensitivityLevel;

    // If anomaly score exceeds threshold, create a finding
    if (anomalyScore >= 0.5) {
      // Calculate money at risk based on deviation magnitude
      const moneyAtRisk = Math.min(1000.0, anomalyScore * 2000.0); // Cap at $1000

      const finding = this.createFinding(
        data,
        null, // No specific line item for anomaly analysis
        AlertReason.NO_RETURN, // Placeholder - should be ANOMALY_DETECTION
        moneyAtRisk
        , "AnomalyDetectionStrategy"
      );

      // TODO: Add ANOMALY_DETECTION to AlertReason enum when extending types.ts

      return [finding];
    }

    return [];
  }
}