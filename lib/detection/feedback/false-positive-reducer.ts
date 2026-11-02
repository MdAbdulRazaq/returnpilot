// lib/detection/feedback/false-positive-reducer.ts
import { Finding } from "../types";
import { NormalizedOrderData } from "../normalize";

/**
 * Reduces false positives by applying heuristics based on merchant feedback.
 * This implements deterministic, repository-supported heuristics for false positive reduction.
 */
export class FalsePositiveReducer {
  /**
   * Reduce false positives in findings based on learned patterns.
   * This is a placeholder implementation - in a full system, this would use
   * stored feedback patterns to adjust detection sensitivity.
   * @param findings Original findings from detection strategies
   * @param data The order data being analyzed
   * @param feedbackHistory Historical feedback for similar patterns
   * @return Findings with false positive reduction applied
   */
  static reduceFalsePositives(
    findings: Finding[],
    data: NormalizedOrderData,
    feedbackHistory: Array<{
      reason: string;
      lineItemId: string | null;
      feedbackType: 'confirmed' | 'false_positive';
      explanationUsefulness?: number; // 1-5 scale, where 5 is most useful
      timestamp: number
    }>
  ): Finding[] {
    // If no feedback history, return findings unchanged
    if (feedbackHistory.length === 0) {
      return findings;
    }

    return findings.map(finding => {
      // Check if we have feedback history for this specific type of finding
      const relevantFeedback = feedbackHistory.filter(fb =>
        fb.reason === finding.reason &&
        fb.lineItemId === finding.shopifyLineItemId
      );

      // If no relevant feedback, return finding unchanged
      if (relevantFeedback.length === 0) {
        return finding;
      }

      // Calculate false positive ratio and average explanation usefulness for this specific pattern
      const falsePositiveCount = relevantFeedback.filter(fb => fb.feedbackType === 'false_positive').length;
      const totalRelevantFeedback = relevantFeedback.length;
      const falsePositiveRatio = falsePositiveCount / totalRelevantFeedback;

      const usefulnessScores = relevantFeedback
        .filter(fb => fb.explanationUsefulness !== undefined)
        .map(fb => fb.explanationUsefulness!);
      const averageUsefulness = usefulnessScores.length > 0
        ? usefulnessScores.reduce((sum, score) => sum + score, 0) / usefulnessScores.length
        : 3; // Default to middle rating if no usefulness data

      // If false positive ratio is high, reduce the moneyAtRisk to make the alert less severe
      // This is a deterministic heuristic: higher false positive rate -> lower perceived risk
      if (falsePositiveRatio > 0.3) { // More than 30% false positives for this pattern
        const reductionFactor = 1 - (falsePositiveRatio * 0.5); // Reduce by up to 50% of the ratio
        const adjustedFinding = { ...finding };
        adjustedFinding.moneyAtRisk = finding.moneyAtRisk * reductionFactor;
        return adjustedFinding;
      }

      // If explanation usefulness is low, we might want to adjust detection parameters
      // but for now we'll keep it simple and just return the finding unchanged
      // to avoid over-correction
      return finding;
    });
  }

  /**
   * Determine if a finding should be suppressed based on feedback history.
   * This implements a more aggressive false positive reduction strategy.
   * @param finding The finding to evaluate
   * @param feedbackHistory Historical feedback for similar patterns
   * @returns True if the finding should be suppressed (not shown to merchant)
   */
  static shouldSuppressFinding(
    finding: Finding,
    feedbackHistory: Array<{
      reason: string;
      lineItemId: string | null;
      feedbackType: 'confirmed' | 'false_positive';
      explanationUsefulness?: number; // 1-5 scale, where 5 is most useful
      timestamp: number
    }>
  ): boolean {
    // If no feedback history, don't suppress
    if (feedbackHistory.length === 0) {
      return false;
    }

    // Check if we have feedback history for this specific type of finding
    const relevantFeedback = feedbackHistory.filter(fb =>
      fb.reason === finding.reason &&
      fb.lineItemId === finding.shopifyLineItemId
    );

    // If no relevant feedback, don't suppress
    if (relevantFeedback.length === 0) {
      return false;
    }

    // Calculate false positive ratio for this specific pattern
    const falsePositiveCount = relevantFeedback.filter(fb => fb.feedbackType === 'false_positive').length;
    const totalRelevantFeedback = relevantFeedback.length;
    const falsePositiveRatio = falsePositiveCount / totalRelevantFeedback;

    // Calculate average explanation usefulness
    const usefulnessScores = relevantFeedback
      .filter(fb => fb.explanationUsefulness !== undefined)
      .map(fb => fb.explanationUsefulness!);
    const averageUsefulness = usefulnessScores.length > 0
      ? usefulnessScores.reduce((sum, score) => sum + score, 0) / usefulnessScores.length
      : 3; // Default to middle rating if no usefulness data

    // Suppress if false positive ratio is very high (more than 70%)
    // OR if explanation usefulness is very low (less than 2) AND false positive ratio is moderate
    const isLowUsefulness = averageUsefulness < 2;
    return falsePositiveRatio > 0.7 || (falsePositiveRatio > 0.4 && isLowUsefulness);
  }

  /**
   * Get feedback-based adjustment explanation for a finding.
   * @param finding The finding to explain
   * @param feedbackHistory Historical feedback for similar patterns
   * @returns Explanation of how feedback affected this finding
   */
  static getFeedbackExplanation(
    finding: Finding,
    feedbackHistory: Array<{
      reason: string;
      lineItemId: string | null;
      feedbackType: 'confirmed' | 'false_positive';
      explanationUsefulness?: number; // 1-5 scale, where 5 is most useful
      timestamp: number
    }>
  ): string {
    // If no feedback history, no explanation
    if (feedbackHistory.length === 0) {
      return "No feedback history available for this pattern.";
    }

    // Check if we have feedback history for this specific type of finding
    const relevantFeedback = feedbackHistory.filter(fb =>
      fb.reason === finding.reason &&
      fb.lineItemId === finding.shopifyLineItemId
    );

    // If no relevant feedback, no specific explanation
    if (relevantFeedback.length === 0) {
      return `No specific feedback history for ${finding.reason} on line item ${finding.shopifyLineItemId || 'none'}.`;
    }

    // Calculate feedback statistics
    const falsePositiveCount = relevantFeedback.filter(fb => fb.feedbackType === 'false_positive').length;
    const confirmedCount = relevantFeedback.filter(fb => fb.feedbackType === 'confirmed').length;
    const totalRelevantFeedback = relevantFeedback.length;
    const falsePositiveRatio = falsePositiveCount / totalRelevantFeedback;
    const confirmedRatio = confirmedCount / totalRelevantFeedback;

    // Calculate average explanation usefulness
    const usefulnessScores = relevantFeedback
      .filter(fb => fb.explanationUsefulness !== undefined)
      .map(fb => fb.explanationUsefulness!);
    const averageUsefulness = usefulnessScores.length > 0
      ? usefulnessScores.reduce((sum, score) => sum + score, 0) / usefulnessScores.length
      : 3; // Default to middle rating if no usefulness data

    let explanation = `Based on ${totalRelevantFeedback} feedback items for similar patterns: `;
    explanation += `${Math.round(confirmedRatio * 100)}% confirmed, ${Math.round(falsePositiveRatio * 100)}% marked as false positive.`;

    if (usefulnessScores.length > 0) {
      explanation += ` Average explanation usefulness rating: ${averageUsefulness.toFixed(1)}/5.`;
    }

    if (falsePositiveRatio > 0.3) {
      explanation += " This pattern has been frequently marked as false positive, so the alert severity has been reduced.";
    } else if (confirmedRatio > 0.7) {
      explanation += " This pattern has been frequently confirmed as accurate, indicating high confidence in this detection.";
    }

    if (averageUsefulness < 2.5) {
      explanation += " Explanations for this pattern have been rated as not very useful, suggesting improvements could be made.";
    } else if (averageUsefulness > 4) {
      explanation += " Explanations for this pattern have been rated as highly useful by merchants.";
    }

    return explanation;
  }
}