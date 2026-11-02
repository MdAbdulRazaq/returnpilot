// lib/detection/store-behavior-model.ts
import { AdaptiveLearningConfig } from "./adaptive-learning-config";

/**
 * StoreBehaviorModel: Stateless utility class for calculating and updating store-specific baselines.
 * Implements incremental statistical algorithms for mean, standard deviation, and seasonal patterns.
 */
export class StoreBehaviorModel {
  /**
   * Calculate the mean of a dataset using Welford's online algorithm for numerical stability.
   * @param count Current number of samples
   * @param mean Current mean value
   * @param newValue New value to incorporate
   * @returns Updated mean
   */
  static updateMean(count: number, mean: number, newValue: number): number {
    return count === 0 ? newValue : mean + (newValue - mean) / (count + 1);
  }

  /**
   * Calculate the variance using Welford's online algorithm.
   * @param count Current number of samples
   * @param mean Current mean value
   * @param M2 Current sum of squares of differences from mean
   * @param newValue New value to incorporate
   * @returns Updated M2 (sum of squares of differences from mean)
   */
  static updateM2(count: number, mean: number, M2: number, newValue: number): number {
    const newCount = count + 1;
    const delta = newValue - mean;
    const newMean = mean + delta / newCount;
    const newDelta = newValue - newMean;
    const newM2 = M2 + delta * newDelta;
    return newM2;
  }

  /**
   * Calculate standard deviation from M2 and count.
   * @param M2 Sum of squares of differences from mean
   * @param count Number of samples
   * @returns Standard deviation
   */
  static calculateStdDev(M2: number, count: number): number {
    return count < 2 ? 0 : Math.sqrt(M2 / count);
  }

  /**
   * Update baseline statistics (mean, stdDev) for a given metric using adaptive learning rate.
   * @param config Adaptive learning configuration
   * @param currentCount Current sample count
   * @param currentMean Current mean value
   * @param currentM2 Current M2 value (sum of squares)
   * @param newValue New observation to incorporate
   * @returns Object containing updated count, mean, and M2
   */
  static updateBaseline(
    config: AdaptiveLearningConfig,
    currentCount: number,
    currentMean: number,
    currentM2: number,
    newValue: number
  ): { count: number; mean: number; m2: number } {
    // Don't adapt if we haven't reached minimum samples
    if (currentCount < config.minSamples) {
      return {
        count: currentCount + 1,
        mean: this.updateMean(currentCount, currentMean, newValue),
        m2: this.updateM2(currentCount, currentMean, currentM2, newValue),
      };
    }

    // Check if new value is an outlier
    const currentStdDev = this.calculateStdDev(currentM2, currentCount);
    const isOutlier =
      Math.abs(newValue - currentMean) >
      currentStdDev * config.outlierStdDevMultiplier;

    // If it's an outlier, adapt more slowly (or not at all depending on config)
    const effectiveLearningRate = isOutlier
      ? config.learningRate * 0.1 // Reduce learning rate for outliers
      : config.learningRate;

    // Apply incremental update with learning rate
    const delta = newValue - currentMean;
    const newMean = currentMean + effectiveLearningRate * delta;
    const newM2 = currentM2 + effectiveLearningRate * delta * (newValue - newMean);

    return {
      count: currentCount + 1,
      mean: newMean,
      m2: newM2,
    };
  }

  /**
   * Detect seasonal patterns in timestamp data.
   * Simplified implementation note: This is a simplified implementation focusing on weekly patterns.
   For production, this could be enhanced with more sophisticated seasonal decomposition.
   * @param timestamps Array of timestamps (in milliseconds since epoch)
   * @returns Object containing day-of-week patterns (0-6, where 0 is Sunday)
   */
  static detectSeasonalPattern(timestamps: number[]): number[] {
    // Initialize day-of-week counters (0-6)
    const dayCounts = new Array(7).fill(0);
    const daySums = new Array(7).fill(0);

    // Aggregate data by day of week
    for (const timestamp of timestamps) {
      const date = new Date(timestamp);
      const dayOfWeek = date.getDay(); // 0-6 (Sunday-Saturday)
      dayCounts[dayOfWeek]++;
      daySums[dayOfWeek] += 1; // Counting occurrences
    }

    // Calculate average activity per day of week
    const dayAverages = new Array(7);
    for (let i = 0; i < 7; i++) {
      dayAverages[i] = dayCounts[i] > 0 ? daySums[i] / dayCounts[i] : 0;
    }

    return dayAverages;
  }

  /**
   * Get seasonal adjustment factor for a given timestamp.
   * @param timestamp Timestamp to check (milliseconds since epoch)
   * @param seasonalPatterns Pre-computed seasonal patterns (day-of-week averages)
   * @param globalAverage Global average activity level
   * @returns Seasonal adjustment factor (multiplier for thresholds)
   */
  static getSeasonalAdjustment(
    timestamp: number,
    seasonalPatterns: number[],
    globalAverage: number
  ): number {
    const date = new Date(timestamp);
    const dayOfWeek = date.getDay(); // 0-6 (Sunday-Saturday)
    const dayAverage = seasonalPatterns[dayOfWeek] || 0;

    // Avoid division by zero
    if (globalAverage === 0) return 1.0;

    // Return ratio of day-specific average to global average
    // Values > 1.0 indicate higher than average activity (may need higher thresholds)
    // Values < 1.0 indicate lower than average activity (may need lower thresholds)
    return dayAverage / globalAverage;
  }

  /**
   * Determine if a value is within expected bounds based on baseline statistics.
   * @param value Value to check
   * @param mean Baseline mean
   * @param stdDev Baseline standard deviation
   * @param sensitivity Multiplier for stdDev to determine bounds (default 2.0 for ~95% confidence)
   * @returns True if value is within expected bounds
   */
  static isWithinExpectedBounds(
    value: number,
    mean: number,
    stdDev: number,
    sensitivity: number = 2.0
  ): boolean {
    if (stdDev === 0) return value === mean;
    const deviation = Math.abs(value - mean);
    return deviation <= sensitivity * stdDev;
  }

  /**
   * Calculate mean from count and M2 (for retrieving stored statistics).
   * @param count Number of samples
   * @param M2 Sum of squares of differences from mean
   * @param mean Current mean value (optional, for validation)
   * @returns Object containing mean and standard deviation
   */
  static getBaselineStats(count: number, M2: number, mean?: number): {
    mean: number;
    stdDev: number;
  } {
    const calculatedMean = count > 0 ? (mean !== undefined ? mean : 0) : 0;
    const stdDev = this.calculateStdDev(M2, count);
    return { mean: calculatedMean, stdDev };
  }

  /**
   * Calculate deviation percentage of a value from baseline.
   * @param value Current value to compare
   * @param mean Baseline mean
   * @returns Deviation percentage (positive = above baseline, negative = below baseline)
   */
  static calculateDeviationPercent(value: number, mean: number): number {
    if (mean === 0) return value === 0 ? 0 : Number.POSITIVE_INFINITY;
    return ((value - mean) / mean) * 100;
  }

  /**
   * Format baseline metrics for explanation historical context.
   * @param refundAmountMean Mean refund amount
   * @param refundAmountStdDev Standard deviation of refund amount
   * @param refundCountMean Mean refund count
   * @param refundCountStdDev Standard deviation of refund count
   * @param lineItemCountMean Mean line items per refund
   * @param lineItemCountStdDev Standard deviation of line items per refund
   * @param refundFrequency Refunds per time period
   * @param seasonalAdjustment Seasonal adjustment factor
   * @returns Formatted baseline metrics for explanation
   */
  static formatBaselineMetricsForExplanation(
    refundAmountMean: number,
    refundAmountStdDev: number,
    refundCountMean: number,
    refundCountStdDev: number,
    lineItemCountMean: number,
    lineItemCountStdDev: number,
    refundFrequency: number,
    seasonalAdjustment: number = 1.0
  ): {
    baselineMetrics: {
      averageRefundAmount: number;
      averageRefundCount: number;
      averageQuantityPerRefund: number;
      refundFrequency: number; // refunds per day/week
    };
    seasonalAdjustment?: {
      isPeakSeason: boolean;
      seasonalFactor: number; // multiplier for expected values
      expectedBaseline: {
        amount: number;
        count: number;
      };
    };
  } {
    return {
      baselineMetrics: {
        averageRefundAmount: refundAmountMean,
        averageRefundCount: refundCountMean,
        averageQuantityPerRefund: lineItemCountMean,
        refundFrequency: refundFrequency,
      },
      ...(seasonalAdjustment !== 1.0 && {
        seasonalAdjustment: {
          isPeakSeason: seasonalAdjustment > 1.0,
          seasonalFactor: seasonalAdjustment,
          expectedBaseline: {
            amount: refundAmountMean * seasonalAdjustment,
            count: refundCountMean * seasonalAdjustment,
          },
        },
      }),
    };
  }

  /**
   * Format current metrics for explanation historical context.
   * @param refundAmount Current refund amount
   * @param refundCount Current refund count
   * @param lineItemCount Current line items count
   * @returns Formatted current metrics for explanation
   */
  static formatCurrentMetricsForExplanation(
    refundAmount: number,
    refundCount: number,
    lineItemCount: number
  ): {
    currentMetrics: {
      refundAmount: number;
      refundCount: number;
      quantityPerRefund: number;
    };
  } {
    return {
      currentMetrics: {
        refundAmount: refundAmount,
        refundCount: refundCount,
        quantityPerRefund: lineItemCount,
      },
    };
  }

  /**
   * Format deviation metrics for explanation historical context.
   * @param amountDeviationPercent Percent deviation for amount
   * @param countDeviationPercent Percent deviation for count
   * @param frequencyDeviationPercent Percent deviation for frequency
   * @returns Formatted deviation metrics for explanation
   */
  static formatDeviationMetricsForExplanation(
    amountDeviationPercent: number,
    countDeviationPercent: number,
    frequencyDeviationPercent: number
  ): {
    deviation: {
      amountDeviationPercent: number;
      countDeviationPercent: number;
      frequencyDeviationPercent: number;
    };
  } {
    return {
      deviation: {
        amountDeviationPercent: amountDeviationPercent,
        countDeviationPercent: countDeviationPercent,
        frequencyDeviationPercent: frequencyDeviationPercent,
      },
    };
  }
}