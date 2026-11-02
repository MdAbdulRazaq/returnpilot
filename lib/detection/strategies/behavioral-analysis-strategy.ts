// lib/detection/strategies/behavioral-analysis-strategy.ts
import { DetectionStrategy } from "./detection-strategy";
import { BaseDetectionStrategy } from "./base-detection-strategy";
import { Finding, AlertReason } from "../types";
import { NormalizedOrderData } from "../normalize";
import { StoreBehaviorModel } from "../store-behavior-model";
import { PatternRecognitionConfig } from "../pattern-recognition-config";

/**
 * BehavioralAnalysisStrategy: Identifies anomalous customer ordering patterns using statistical behavioral modeling.
 * Analyzes frequency, amount, and timing patterns to detect deviations from normal behavior.
 */
export class BehavioralAnalysisStrategy extends BaseDetectionStrategy {
  private config: PatternRecognitionConfig;
  private shopId: string;

  // Behavioral tracking data
  private refundAmounts: number[] = [];
  private refundCounts: number[] = [];
  private orderTimestamps: number[] = [];

  /**
   * Create a behavioral analysis strategy.
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
   * Analyze order data for behavioral anomalies.
   * @param data Normalized order data to analyze
   * @returns Array of findings, potentially adjusted based on behavioral analysis
   */
  analyze(data: NormalizedOrderData): Finding[] {
    // If pattern recognition is disabled, return no findings
    if (!this.config.enabled) {
      return [];
    }

    const behavioralConfig = this.config.behavioralAnalysis ?? {};

    // Check if behavioral analysis is enabled
    if (!(behavioralConfig.enabled ?? true)) {
      return [];
    }

    // Get configuration values with defaults
    const windowDays = behavioralConfig.windowDays ?? 30;
    const minSamples = behavioralConfig.minSamples ?? 5;
    const sensitivityLevel = behavioralConfig.sensitivityLevel ?? 0.7;

    // Convert windowDays to milliseconds
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    const now = data.updatedAt.getTime();

    // Extract behavioral metrics from current order
    const totalRefundAmount = data.refunds.reduce(
      (sum, refund) => sum + refund.totalRefundedAmount,
      0
    );
    const refundCount = data.refunds.length;

    // Add current order data to tracking arrays
    if (totalRefundAmount > 0) {
      this.refundAmounts.push(totalRefundAmount);
    }
    if (refundCount > 0) {
      this.refundCounts.push(refundCount);
    }
    this.orderTimestamps.push(now);

    // Remove data outside the window
    this.refundAmounts = this.refundAmounts.filter((_, index) =>
      this.orderTimestamps[index] && now - this.orderTimestamps[index] <= windowMs
    );
    this.refundCounts = this.refundCounts.filter((_, index) =>
      this.orderTimestamps[index] && now - this.orderTimestamps[index] <= windowMs
    );
    this.orderTimestamps = this.orderTimestamps.filter(ts => now - ts <= windowMs);

    // Need minimum samples to analyze
    if (this.refundAmounts.length < minSamples && this.refundCounts.length < minSamples) {
      return [];
    }

    // Calculate anomaly score based on multiple behavioral factors
    let anomalyScore = 0;

    // 1. Refund amount anomaly detection
    if (this.refundAmounts.length >= minSamples) {
      // Calculate mean and standard deviation manually
      const sum = this.refundAmounts.reduce((acc, val) => acc + val, 0);
      const mean = sum / this.refundAmounts.length;

      // Calculate variance
      const varianceSum = this.refundAmounts.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
      const variance = varianceSum / (this.refundAmounts.length - 1);
      const stdDev = Math.sqrt(variance);

      const amountZScore = stdDev > 0 ? Math.abs((totalRefundAmount - mean) / stdDev) : 0;

      if (amountZScore > 2.5) { // Beyond 2.5 standard deviations
        anomalyScore += 0.4;
      }
    }

    // 2. Refund count anomaly detection
    if (this.refundCounts.length >= minSamples) {
      // Calculate mean and standard deviation manually
      const sum = this.refundCounts.reduce((acc, val) => acc + val, 0);
      const mean = sum / this.refundCounts.length;

      // Calculate variance
      const varianceSum = this.refundCounts.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
      const variance = varianceSum / (this.refundCounts.length - 1);
      const stdDev = Math.sqrt(variance);

      const countZScore = stdDev > 0 ? Math.abs((refundCount - mean) / stdDev) : 0;

      if (countZScore > 2.5) { // Beyond 2.5 standard deviations
        anomalyScore += 0.3;
      }
    }

    // 3. Frequency anomaly detection (orders per day)
    if (this.orderTimestamps.length >= 2) {
      const timeSpanMs = Math.max(...this.orderTimestamps) - Math.min(...this.orderTimestamps);
      const days = Math.max(1, timeSpanMs / (24 * 60 * 60 * 1000));
      const ordersPerDay = this.orderTimestamps.length / days;

      // Calculate historical orders per day (excluding current)
      const historicalTimestamps = this.orderTimestamps.slice(0, -1);
      if (historicalTimestamps.length >= 2) {
        const historicalSpanMs = Math.max(...historicalTimestamps) - Math.min(...historicalTimestamps);
        const historicalDays = Math.max(1, historicalSpanMs / (24 * 60 * 60 * 1000));
        const historicalOrdersPerDay = historicalTimestamps.length / historicalDays;

        // Significant deviation from historical frequency
        if (historicalOrdersPerDay > 0) {
          const frequencyRatio = ordersPerDay / historicalOrdersPerDay;
          if (frequencyRatio > 2.0 || frequencyRatio < 0.5) { // More than 2x or less than 0.5x
            anomalyScore += 0.3;
          }
        }
      }
    }

    // Apply sensitivity level
    anomalyScore *= sensitivityLevel;

    // If anomaly score exceeds threshold, create a finding
    if (anomalyScore >= 0.5) {
      // Calculate money at risk based on deviation magnitude
      const moneyAtRisk = Math.min(500.0, anomalyScore * 1000.0); // Cap at $500

      const finding = this.createFinding(
        data,
        null, // No specific line item for behavioral analysis
        AlertReason.NO_RETURN, // Placeholder - should be BEHAVIORAL_ANALYSIS
        moneyAtRisk
        , "BehavioralAnalysisStrategy"
      );

      // TODO: Add BEHAVIORAL_ANALYSIS to AlertReason enum when extending types.ts

      return [finding];
    }

    return [];
  }
}