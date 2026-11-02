// lib/detection/strategies/adaptive-learning-strategy.ts
import { DetectionStrategy } from "./detection-strategy";
import { Finding } from "../types";
import { NormalizedOrderData } from "../normalize";
import { AdaptiveLearningConfig } from "../adaptive-learning-config";
import { StoreBehaviorModel } from "../store-behavior-model";

/**
 * AdaptiveLearningStrategy: Wrapper strategy that adapts the behavior of other strategies based on historical performance.
 * Implements store-specific baseline modeling and adaptive threshold adjustment.
 */
export class AdaptiveLearningStrategy implements DetectionStrategy {
  private wrappedStrategy: DetectionStrategy;
  private config: AdaptiveLearningConfig;
  private shopId: string;

  // Baseline statistics for different metrics
  private refundAmountBaseline: { count: number; mean: number; m2: number } = {
    count: 0,
    mean: 0,
    m2: 0,
  };
  private refundCountBaseline: { count: number; mean: number; m2: number } = {
    count: 0,
    mean: 0,
    m2: 0,
  };
  private lineItemCountBaseline: { count: number; mean: number; m2: number } = {
    count: 0,
    mean: 0,
    m2: 0,
  };

  // Seasonal pattern data
  private refundAmountTimestamps: number[] = [];
  private seasonalPatterns: number[] | null = null;
  private globalRefundAmountAverage: number = 0;

  /**
   * Create an adaptive learning strategy wrapper.
   * @param wrappedStrategy The detection strategy to wrap and adapt
   * @param config Adaptive learning configuration
   * @param shopId Identifier for the store (used for store-specific baselines)
   */
  constructor(
    wrappedStrategy: DetectionStrategy,
    config: AdaptiveLearningConfig,
    shopId: string
  ) {
    this.wrappedStrategy = wrappedStrategy;
    this.config = config;
    this.shopId = shopId;
  }

  /**
   * Analyze order data using the wrapped strategy, then adapt based on historical performance.
   * @param data Normalized order data to analyze
   * @returns Array of findings, potentially adjusted based on adaptive learning
   */
  analyze(data: NormalizedOrderData): Finding[] {
    // Get findings from the wrapped strategy
    const findings = this.wrappedStrategy.analyze(data);

    // Update baselines if adaptive learning is enabled
    if (this.config.enabled) {
      this.updateBaselines(data);
    }

    // Apply adaptive adjustments to findings if enabled
    if (
      this.config.enabled &&
      this.config.thresholdAdjustmentEnabled &&
      this.shouldApplyAdaptiveAdjustment()
    ) {
      return this.applyAdaptiveAdjustment(findings, data);
    }

    return findings;
  }

  /**
   * Update baseline statistics based on order data.
   * @param data Normalized order data
   */
  private updateBaselines(data: NormalizedOrderData): void {
    // Update refund amount baseline
    const totalRefundAmount = data.refunds.reduce(
      (sum, refund) => sum + refund.totalRefundedAmount,
      0
    );
    if (totalRefundAmount > 0) {
      this.refundAmountBaseline = StoreBehaviorModel.updateBaseline(
        this.config,
        this.refundAmountBaseline.count,
        this.refundAmountBaseline.mean,
        this.refundAmountBaseline.m2,
        totalRefundAmount
      );
      this.refundAmountTimestamps.push(data.updatedAt.getTime());
    }

    // Update refund count baseline
    const refundCount = data.refunds.length;
    if (refundCount > 0) {
      this.refundCountBaseline = StoreBehaviorModel.updateBaseline(
        this.config,
        this.refundCountBaseline.count,
        this.refundCountBaseline.mean,
        this.refundCountBaseline.m2,
        refundCount
      );
    }

    // Update line item count baseline
    let totalLineItems = 0;
    for (const refund of data.refunds) {
      totalLineItems += refund.lineItems.length;
    }
    for (const Return of data.returns) {
      totalLineItems += Return.lineItems.length;
    }
    if (totalLineItems > 0) {
      this.lineItemCountBaseline = StoreBehaviorModel.updateBaseline(
        this.config,
        this.lineItemCountBaseline.count,
        this.lineItemCountBaseline.mean,
        this.lineItemCountBaseline.m2,
        totalLineItems
      );
    }

    // Update seasonal patterns periodically (simplified)
    if (
      this.config.seasonalDetectionEnabled &&
      this.refundAmountTimestamps.length % 50 === 0 && // Update every 50 samples
      this.refundAmountTimestamps.length >= this.config.minSamples
    ) {
      this.updateSeasonalPatterns();
    }
  }

  /**
   * Update seasonal patterns based on collected timestamps.
   */
  private updateSeasonalPatterns(): void {
    if (this.refundAmountTimestamps.length === 0) return;

    // Calculate seasonal patterns (day-of-week averages)
    this.seasonalPatterns = StoreBehaviorModel.detectSeasonalPattern(
      this.refundAmountTimestamps
    );

    // Calculate global average
    this.globalRefundAmountAverage = this.refundAmountTimestamps.length / 7.0; // Average per day of week
  }

  /**
   * Determine if we have enough data to apply adaptive adjustments.
   * @returns True if adaptive adjustment should be applied
   */
  private shouldApplyAdaptiveAdjustment(): boolean {
    return (
      this.refundAmountBaseline.count >= this.config.minSamples &&
      this.refundCountBaseline.count >= this.config.minSamples
    );
  }

  /**
   * Apply adaptive adjustments to findings based on learned baselines.
   * Adjusts the moneyAtRisk of findings based on learned thresholds and seasonal patterns.
   * @param findings Original findings from wrapped strategy
   * @param data Normalized order data
   * @returns Adjusted findings
   */
  private applyAdaptiveAdjustment(
    findings: Finding[],
    data: NormalizedOrderData
  ): Finding[] {
    // If no findings, nothing to adjust
    if (findings.length === 0) return findings;

    // Calculate adaptation factors based on how current order compares to baseline
    const totalRefundAmount = data.refunds.reduce(
      (sum, refund) => sum + refund.totalRefundedAmount,
      0
    );
    const refundCount = data.refunds.length;

    // Calculate seasonal adjustment if enabled
    let seasonalAdjustment = 1.0;
    if (
      this.config.seasonalDetectionEnabled &&
      this.seasonalPatterns !== null &&
      this.globalRefundAmountAverage > 0
    ) {
      seasonalAdjustment = StoreBehaviorModel.getSeasonalAdjustment(
        data.updatedAt.getTime(),
        this.seasonalPatterns,
        this.globalRefundAmountAverage
      );
    }

    // Determine if current order is anomalous compared to baselines
    const isAmountAnomalous = !StoreBehaviorModel.isWithinExpectedBounds(
      totalRefundAmount,
      this.refundAmountBaseline.mean,
      Math.sqrt(
        this.refundAmountBaseline.m2 /
          Math.max(1, this.refundAmountBaseline.count)
      ),
      this.config.outlierStdDevMultiplier
    );

    const isCountAnomalous = !StoreBehaviorModel.isWithinExpectedBounds(
      refundCount,
      this.refundCountBaseline.mean,
      Math.sqrt(
        this.refundCountBaseline.m2 /
          Math.max(1, this.refundCountBaseline.count)
      ),
      this.config.outlierStdDevMultiplier
    );

    // If order is significantly anomalous, reduce confidence in findings
    const confidenceMultiplier =
      (isAmountAnomalous || isCountAnomalous) ? this.config.anomalyConfidenceMultiplier ?? 0.7 : 1.0;

    // Apply seasonal adjustment to threshold sensitivity
    // Higher seasonal adjustment means higher than normal activity -> potentially increase thresholds
    const thresholdMultiplier = seasonalAdjustment * confidenceMultiplier;

    // Apply adaptive adjustment to findings by modifying moneyAtRisk
    // This implements threshold adjustment based on learned baselines
    return findings.map(finding => {
      // Create a copy of the finding with adjusted moneyAtRisk
      const adjustedFinding = { ...finding };
      // Apply the threshold multiplier to adjust the money at risk
      // Values > 1.0 increase the perceived risk (more sensitive detection)
      // Values < 1.0 decrease the perceived risk (less sensitive detection)
      adjustedFinding.moneyAtRisk = finding.moneyAtRisk * thresholdMultiplier;
      // Set strategy identifier to indicate this finding was processed by adaptive learning
      adjustedFinding.strategyIdentifier = "AdaptiveLearningStrategy";
      return adjustedFinding;
    });
  }
}