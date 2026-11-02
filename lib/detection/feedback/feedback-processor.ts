// lib/detection/feedback/feedback-processor.ts
import { AdaptiveLearningConfig } from "../adaptive-learning-config";
import { StoreBehaviorModel } from "../store-behavior-model";

/**
 * Processes merchant feedback to improve detection accuracy.
 * Works with the adaptive learning system to refine baselines based on merchant markings.
 */
export class FeedbackProcessor {
  /**
   * Process feedback and update adaptive learning configuration if needed.
   * @param feedbackType Type of feedback received
   * @param currentConfig Current adaptive learning configuration
   * @returns Updated adaptive learning configuration with feedback adjustments
   */
  static processFeedback(
    feedbackType: 'confirmed' | 'false_positive' | 'comment',
    currentConfig: AdaptiveLearningConfig
  ): AdaptiveLearningConfig {
    // Create a copy of the config to avoid mutating the original
    const updatedConfig = { ...currentConfig };

    // Initialize feedback processing config if not present
    if (!updatedConfig.feedbackProcessing) {
      updatedConfig.feedbackProcessing = {
        enabled: true,
        feedbackWeight: 0.1,
        minFeedbackSamples: 5
      };
    }

    const feedbackConfig = updatedConfig.feedbackProcessing!;

    // Only process if feedback processing is enabled
    if (!feedbackConfig.enabled) {
      return updatedConfig;
    }

    // Adjust learning rate based on feedback type
    // This implements the heuristic: decrease learning rate when false positives are marked
    // to make the model more conservative, increase when confirmed to make it more confident
    if (feedbackType === 'false_positive') {
      // Decrease learning rate to make model more conservative (less likely to flag similar items)
      updatedConfig.learningRate = Math.max(
        0.01,  // Minimum learning rate
        updatedConfig.learningRate * (1 - (feedbackConfig.feedbackWeight ?? 0.1))
      );
    } else if (feedbackType === 'confirmed') {
      // Slightly increase learning rate to make model more confident in similar detections
      // but cap it to prevent overfirmed') {
      // Slightly increase learning rate to make model more confident in similar detections
      // but cap it to prevent overfitting
      updatedConfig.learningRate = Math.min(
        0.5,   // Maximum learning rate
        updatedConfig.learningRate * (1 + (feedbackConfig.feedbackWeight ?? 0.1))
      );
    }
    // For comments, we don't adjust learning rate as they don't indicate correctness

    return updatedConfig;
  }

  /**
   * Process explanation usefulness feedback.
   * @param usefulnessRating Rating of explanation usefulness (1-5 scale)
   * @param currentConfig Current adaptive learning configuration
   * @returns Updated adaptive learning configuration with feedback adjustments
   */
  static processExplanationUsefulnessFeedback(
    usefulnessRating: number, // 1-5 scale
    currentConfig: AdaptiveLearningConfig
  ): AdaptiveLearningConfig {
    // Create a copy of the config to avoid mutating the original
    const updatedConfig = { ...currentConfig };

    // Initialize explanation feedback processing config if not present
    if (!updatedConfig.explanationFeedbackProcessing) {
      updatedConfig.explanationFeedbackProcessing = {
        enabled: true,
        feedbackWeight: 0.1,
        minFeedbackSamples: 5,
        usefulnessThreshold: 3 // Ratings >= this are considered useful
      };
    }

    const feedbackConfig = updatedConfig.explanationFeedbackProcessing!;

    // Only process if explanation feedback processing is enabled
    if (!feedbackConfig.enabled) {
      return updatedConfig;
    }

    // Adjust based on usefulness rating
    const isUseful = usefulnessRating >= (feedbackConfig.usefulnessThreshold ?? 3);

    if (!isUseful) {
      // If explanation is not useful, slightly increase learning rate to make model more adaptive
      // (since current explanations aren't helping merchants understand)
      updatedConfig.learningRate = Math.min(
        0.5,   // Maximum learning rate
        updatedConfig.learningRate * (1 + (feedbackConfig.feedbackWeight ?? 0.1))
      );
    } else {
      // If explanation is useful, slightly decrease learning rate to stabilize the model
      updatedConfig.learningRate = Math.max(
        0.01,  // Minimum learning rate
        updatedConfig.learningRate * (1 - (feedbackConfig.feedbackWeight ?? 0.1))
      );
    }

    return updatedConfig;
  }

  /**
   * Determine if we should adjust baselines based on feedback patterns.
   * This implements a heuristic to detect when baseline modeling might be off.
   * @param feedbackHistory History of feedback for similar detections
   * @returns True if baselines should be adjusted based on feedback
   */
  static shouldAdjustBaselinesFromFeedback(
    feedbackHistory: Array<{ type: 'confirmed' | 'false_positive'; timestamp: number }>
  ): boolean {
    if (feedbackHistory.length < 5) {
      return false; // Not enough data
    }

    // Calculate the ratio of false positives to total feedback in recent history
    const recentHistory = feedbackHistory.slice(-10); // Last 10 feedback items
    const falsePositiveCount = recentHistory.filter(f => f.type === 'false_positive').length;
    const falsePositiveRatio = falsePositiveCount / recentHistory.length;

    // If false positive ratio is high, suggest adjusting baselines to be more conservative
    return falsePositiveRatio > 0.3; // More than 30% false positives suggests baseline adjustment needed
  }

  /**
   * Calculate suggested baseline adjustment based on feedback.
   * @param feedbackHistory History of feedback for similar detections
   * @param currentBaseline Current baseline statistics
   * @returns Suggested adjustment factor for baseline ( >1 = increase, <1 = decrease)
   */
  static calculateBaselineAdjustment(
    feedbackHistory: Array<{ type: 'confirmed' | 'false_positive'; timestamp: number }>,
    currentBaseline: { mean: number; stdDev: number }
  ): number {
    if (feedbackHistory.length === 0) {
      return 1.0; // No adjustment
    }

    // Simple heuristic: more false positives -> decrease baseline threshold
    // more confirmations -> increase baseline threshold
    const falsePositiveCount = feedbackHistory.filter(f => f.type === 'false_positive').length;
    const confirmedCount = feedbackHistory.filter(f => f.type === 'confirmed').length;
    const totalFeedback = falsePositiveCount + confirmedCount;

    if (totalFeedback === 0) {
      return 1.0;
    }

    const feedbackScore = (confirmedCount - falsePositiveCount) / totalFeedback;
    // Convert to adjustment factor: negative score = decrease baseline, positive score = increase
    // Scale factor so that extreme values don't cause drastic changes
    const adjustmentFactor = 1 + (feedbackScore * 0.2); // Max 20% adjustment in either direction

    return Math.max(0.8, Math.min(1.2, adjustmentFactor)); // Clamp between 0.8 and 1.2
  }
}