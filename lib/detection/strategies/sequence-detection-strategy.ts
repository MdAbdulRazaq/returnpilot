// lib/detection/strategies/sequence-detection-strategy.ts
import { DetectionStrategy } from "./detection-strategy";
import { BaseDetectionStrategy } from "./base-detection-strategy";
import { Finding, AlertReason } from "../types";
import { NormalizedOrderData } from "../normalize";
import { StoreBehaviorModel } from "../store-behavior-model";
import { PatternRecognitionConfig } from "../pattern-recognition-config";

/**
 * SequenceDetectionStrategy: Detects coordinated fraud attempts through temporal analysis of order sequences.
 * Identifies patterns like rapid successive refunds, burst testing, and unusual timing patterns.
 */
export class SequenceDetectionStrategy extends BaseDetectionStrategy {
  private config: PatternRecognitionConfig;
  private shopId: string;

  // Store recent order timestamps for sequence analysis
  private recentTimestamps: number[] = [];

  /**
   * Create a sequence detection strategy.
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
   * Analyze order data for sequence-based fraud patterns.
   * @param data Normalized order data to analyze
   * @returns Array of findings, potentially adjusted based on sequence analysis
   */
  analyze(data: NormalizedOrderData): Finding[] {
    // If pattern recognition is disabled, return no findings
    if (!this.config.enabled) {
      return [];
    }

    const sequenceConfig = this.config.sequenceAnalysis ?? {};

    // Check if sequence analysis is enabled
    if (!(sequenceConfig.enabled ?? true)) {
      return [];
    }

    // Get configuration values with defaults
    const windowDays = sequenceConfig.windowDays ?? 7;
    const minSequenceLength = sequenceConfig.minSequenceLength ?? 3;
    const sensitivityLevel = sequenceConfig.sensitivityLevel ?? 0.7;

    // Convert windowDays to milliseconds
    const windowMs = windowDays * 24 * 60 * 60 * 1000;
    const now = data.updatedAt.getTime();

    // Add current timestamp to recent timestamps
    this.recentTimestamps.push(now);

    // Remove timestamps outside the window
    this.recentTimestamps = this.recentTimestamps.filter(ts => now - ts <= windowMs);

    // Need minimum sequence length to analyze
    if (this.recentTimestamps.length < minSequenceLength) {
      return [];
    }

    // Sort timestamps ascending (oldest first)
    const sortedTimestamps = [...this.recentTimestamps].sort((a, b) => a - b);

    // Calculate time differences between consecutive orders
    const timeDiffs: number[] = [];
    for (let i = 1; i < sortedTimestamps.length; i++) {
      timeDiffs.push(sortedTimestamps[i]! - sortedTimestamps[i-1]!);
    }

    // Detect rapid successive refunds (bursts)
    const rapidSuccessiveThreshold = 2 * 60 * 60 * 1000; // 2 hours in ms
    const rapidSuccessiveCount = timeDiffs.filter(diff => diff < rapidSuccessiveThreshold).length;

    // Detect unusual timing patterns (too regular or too irregular)
    const avgTimeDiff = timeDiffs.reduce((sum, diff) => sum + diff, 0) / timeDiffs.length;
    const expectedTimeDiff = (windowMs * 0.8) / Math.max(1, sortedTimestamps.length - 1); // 80% of window distributed

    // Calculate anomaly score based on timing patterns
    let anomalyScore = 0;

    // Check for rapid successive bursts
    if (rapidSuccessiveCount >= minSequenceLength - 1) {
      anomalyScore += 0.4;
    }

    // Check for unusual regularity (coefficient of variation)
    if (timeDiffs.length > 1) {
      const meanDiff = avgTimeDiff;
      const variance = timeDiffs.reduce((sum, diff) => sum + Math.pow(diff - meanDiff, 2), 0) / timeDiffs.length;
      const stdDev = Math.sqrt(variance);
      const cv = stdDev / meanDiff; // Coefficient of variation

      // Too regular (low CV) or too irregular (high CV) can be suspicious
      if (cv < 0.3 || cv > 2.0) {
        anomalyScore += 0.3;
      }
    }

    // Check for clustering at unusual hours
    const unusualHourCount = sortedTimestamps.filter(ts => {
      const date = new Date(ts);
      const hour = date.getHours();
      return hour < 6 || hour > 22; // Unusual hours: 10pm to 6am
    }).length;

    const unusualHourRatio = unusualHourCount / sortedTimestamps.length;
    if (unusualHourRatio > 0.6) { // More than 60% of orders in unusual hours
      anomalyScore += 0.3;
    }

    // Apply sensitivity level
    anomalyScore *= sensitivityLevel;

    // If anomaly score exceeds threshold, create a finding
    if (anomalyScore >= 0.5) {
      // Calculate money at risk based on recent order amounts
      // For simplicity, we'll use a placeholder - in reality this would analyze recent order values
      const moneyAtRisk = 100.0; // Placeholder value

      const finding = this.createFinding(
        data,
        null, // No specific line item for sequence analysis
        AlertReason.NO_RETURN, // We'll reuse existing reason for now - in a real implementation we'd add new reasons
        moneyAtRisk
        , "SequenceDetectionStrategy"
      );

      // In a real implementation, we would add a new AlertReason for sequence detection
      // For now, we'll use NO_RETURN but note in comments that this should be a new reason
      // TODO: Add SEQUENCE_ANALYSIS to AlertReason enum when extending types.ts

      return [finding];
    }

    return [];
  }
}