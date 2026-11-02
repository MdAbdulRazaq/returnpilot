// lib/detection/monitoring/explanation-monitor.ts
import type { Explanation } from '@/lib/detection/explanation/types';
import type { AlertRow } from '@/lib/dashboard/queries';

/**
 * Monitors explanation system performance and effectiveness.
 * Follows the existing PerformanceMonitor pattern - observational only,
 * collects metrics but does not influence explanation decisions.
 */
export class ExplanationMonitor {
  private static instance: ExplanationMonitor;

  // Counters for various metrics
  private explanationDashboardDeliverySuccess: number = 0;
  private explanationDashboardDeliveryAttempts: number = 0;
  private explanationEmailDeliverySuccess: number = 0;
  private explanationEmailDeliveryAttempts: number = 0;
  private explanationUsefulnessRatingTotal: number = 0;
  private explanationUsefulnessRatingCount: number = 0;
  private explanationUsefulnessHelpful: number = 0;
  private explanationUsefulnessTotal: number = 0;
  private explanationConfidenceScoreTotal: number = 0;
  private explanationConfidenceScoreCount: number = 0;
  private explanationAccuracyAccurate: number = 0;
  private explanationAccuracyTotal: number = 0;
  private explanationActionTakenHigh: number = 0;
  private explanationAlertsHigh: number = 0;
  private explanationActionTakenMedium: number = 0;
  private explanationAlertsMedium: number = 0;
  private explanationActionTakenLow: number = 0;
  private explanationAlertsLow: number = 0;
  private explanationGenerationSuccess: number = 0;
  private explanationGenerationError: number = 0;
  private explanationGenerationAttempts: number = 0;

  // Histogram for generation duration
  private explanationGenerationDurations: number[] = [];
  private readonly maxSamples = 1000; // Keep last N samples

  private constructor() {}

  /**
   * Get the singleton instance.
   */
  public static getInstance(): ExplanationMonitor {
    if (!ExplanationMonitor.instance) {
      ExplanationMonitor.instance = new ExplanationMonitor();
    }
    return ExplanationMonitor.instance;
  }

  /**
   * Track explanation delivery success rate for dashboard
   * @param success Whether the explanation was successfully delivered to dashboard
   */
  public trackDashboardDeliverySuccess(success: boolean): void {
    if (success) {
      this.explanationDashboardDeliverySuccess++;
    }
    this.explanationDashboardDeliveryAttempts++;
  }

  /**
   * Track explanation delivery success rate for email
   * @param success Whether the explanation was successfully included in email
   */
  public trackEmailDeliverySuccess(success: boolean): void {
    if (success) {
      this.explanationEmailDeliverySuccess++;
    }
    this.explanationEmailDeliveryAttempts++;
  }

  /**
   * Track explanation usefulness feedback
   * @param rating The usefulness rating (1-5 scale)
   */
  public trackUsefulnessFeedback(rating: number): void {
    // Track the rating value
    this.explanationUsefulnessRatingTotal += rating;
    this.explanationUsefulnessRatingCount++;

    // Track whether it was considered helpful (rating >= 3)
    const isHelpful = rating >= 3;
    if (isHelpful) {
      this.explanationUsefulnessHelpful++;
    }
    this.explanationUsefulnessTotal++;
  }

  /**
   * Track correlation between explanation confidence scores and actual alert accuracy
   * @param confidence The explanation confidence score (0.0 to 1.0)
   * @param isAccurate Whether the alert was actually accurate (true) or a false positive (false)
   */
  public trackConfidenceAccuracyCorrelation(confidence: number, isAccurate: boolean): void {
    // Store confidence score for correlation calculation
    this.explanationConfidenceScoreTotal += confidence;
    this.explanationConfidenceScoreCount++;

    // Track accuracy outcome
    if (isAccurate) {
      this.explanationAccuracyAccurate++;
    }
    this.explanationAccuracyTotal++;
  }

  /**
   * Track merchant action rates on alerts by explanation confidence level
   * @param confidence The explanation confidence score (0.0 to 1.0)
   * @param actionTaken Whether the merchant took action on the alert
   */
  public trackActionRateByConfidence(confidence: number, actionTaken: boolean): void {
    // Categorize confidence level
    const confidenceLevel =
      confidence >= 0.8 ? 'high' :
      confidence >= 0.5 ? 'medium' : 'low';

    // Track action taken for this confidence level
    if (confidenceLevel === 'high') {
      if (actionTaken) {
        this.explanationActionTakenHigh++;
      }
      this.explanationAlertsHigh++;
    } else if (confidenceLevel === 'medium') {
      if (actionTaken) {
        this.explanationActionTakenMedium++;
      }
      this.explanationAlertsMedium++;
    } else { // 'low'
      if (actionTaken) {
        this.explanationActionTakenLow++;
      }
      this.explanationAlertsLow++;
    }
  }

  /**
   * Track explanation generation performance and error rates
   * @param success Whether the explanation was generated successfully
   * @param durationMs The time taken to generate the explanation in milliseconds
   */
  public trackGenerationPerformance(success: boolean, durationMs: number): void {
    if (success) {
      this.explanationGenerationSuccess++;
      this.explanationGenerationDurations.push(durationMs);

      // Keep only the last N samples
      if (this.explanationGenerationDurations.length > this.maxSamples) {
        this.explanationGenerationDurations.splice(0, this.explanationGenerationDurations.length - this.maxSamples);
      }
    } else {
      this.explanationGenerationError++;
    }
    this.explanationGenerationAttempts++;
  }

  /**
   * Get dashboard delivery success rate
   * @returns Success rate as a percentage (0-100)
   */
  public getDashboardDeliverySuccessRate(): number {
    return this.explanationDashboardDeliveryAttempts > 0
      ? (this.explanationDashboardDeliverySuccess / this.explanationDashboardDeliveryAttempts) * 100
      : 0;
  }

  /**
   * Get email delivery success rate
   * @returns Success rate as a percentage (0-100)
   */
  public getEmailDeliverySuccessRate(): number {
    return this.explanationEmailDeliveryAttempts > 0
      ? (this.explanationEmailDeliverySuccess / this.explanationEmailDeliveryAttempts) * 100
      : 0;
  }

  /**
   * Get average usefulness rating
   * @returns Average rating (1-5) or 0 if no ratings
   */
  public getAverageUsefulnessRating(): number {
    return this.explanationUsefulnessRatingCount > 0
      ? this.explanationUsefulnessRatingTotal / this.explanationUsefulnessRatingCount
      : 0;
  }

  /**
   * Get helpfulness rate (percentage of ratings >= 3)
   * @returns Helpfulness rate as a percentage (0-100)
   */
  public getHelpfulnessRate(): number {
    return this.explanationUsefulnessTotal > 0
      ? (this.explanationUsefulnessHelpful / this.explanationUsefulnessTotal) * 100
      : 0;
  }

  /**
   * Get average confidence score
   * @returns Average confidence score (0.0-1.0) or 0 if no scores
   */
  public getAverageConfidenceScore(): number {
    return this.explanationConfidenceScoreCount > 0
      ? this.explanationConfidenceScoreTotal / this.explanationConfidenceScoreCount
      : 0;
  }

  /**
   * Get accuracy rate (percentage of accurate alerts)
   * @returns Accuracy rate as a percentage (0-100)
   */
  public getAccuracyRate(): number {
    return this.explanationAccuracyTotal > 0
      ? (this.explanationAccuracyAccurate / this.explanationAccuracyTotal) * 100
      : 0;
  }

  /**
   * Get action rate for a specific confidence level
   * @param confidenceLevel The confidence level ('high', 'medium', or 'low')
   * @returns Action rate as a percentage (0-100)
   */
  public getActionRateByConfidence(confidenceLevel: 'high' | 'medium' | 'low'): number {
    let actions = 0;
    let alerts = 0;

    switch (confidenceLevel) {
      case 'high':
        actions = this.explanationActionTakenHigh;
        alerts = this.explanationAlertsHigh;
        break;
      case 'medium':
        actions = this.explanationActionTakenMedium;
        alerts = this.explanationAlertsMedium;
        break;
      case 'low':
        actions = this.explanationActionTakenLow;
        alerts = this.explanationAlertsLow;
        break;
    }

    return alerts > 0 ? (actions / alerts) * 100 : 0;
  }

  /**
   * Get average generation duration in milliseconds
   * @returns Average duration in ms or 0 if no measurements
   */
  public getAverageGenerationDurationMs(): number {
    if (this.explanationGenerationDurations.length === 0) {
      return 0;
    }
    const sum = this.explanationGenerationDurations.reduce((acc, t) => acc + t, 0);
    return sum / this.explanationGenerationDurations.length;
  }

  /**
   * Get generation success rate
   * @returns Success rate as a percentage (0-100)
   */
  public getGenerationSuccessRate(): number {
    return this.explanationGenerationAttempts > 0
      ? (this.explanationGenerationSuccess / this.explanationGenerationAttempts) * 100
      : 0;
  }

  /**
   * Get monitoring statistics.
   * @returns Object containing explanation monitoring metrics
   */
  public getStatistics() {
    return {
      dashboardDeliverySuccessRate: this.getDashboardDeliverySuccessRate(),
      emailDeliverySuccessRate: this.getEmailDeliverySuccessRate(),
      averageUsefulnessRating: this.getAverageUsefulnessRating(),
      helpfulnessRate: this.getHelpfulnessRate(),
      averageConfidenceScore: this.getAverageConfidenceScore(),
      accuracyRate: this.getAccuracyRate(),
      actionRateByConfidence: {
        high: this.getActionRateByConfidence('high'),
        medium: this.getActionRateByConfidence('medium'),
        low: this.getActionRateByConfidence('low')
      },
      averageGenerationDurationMs: this.getAverageGenerationDurationMs(),
      generationSuccessRate: this.getGenerationSuccessRate()
    };
  }

  /**
   * Reset all monitoring metrics.
   * Useful for testing.
   */
  public reset(): void {
    this.explanationDashboardDeliverySuccess = 0;
    this.explanationDashboardDeliveryAttempts = 0;
    this.explanationEmailDeliverySuccess = 0;
    this.explanationEmailDeliveryAttempts = 0;
    this.explanationUsefulnessRatingTotal = 0;
    this.explanationUsefulnessRatingCount = 0;
    this.explanationUsefulnessHelpful = 0;
    this.explanationUsefulnessTotal = 0;
    this.explanationConfidenceScoreTotal = 0;
    this.explanationConfidenceScoreCount = 0;
    this.explanationAccuracyAccurate = 0;
    this.explanationAccuracyTotal = 0;
    this.explanationActionTakenHigh = 0;
    this.explanationAlertsHigh = 0;
    this.explanationActionTakenMedium = 0;
    this.explanationAlertsMedium = 0;
    this.explanationActionTakenLow = 0;
    this.explanationAlertsLow = 0;
    this.explanationGenerationSuccess = 0;
    this.explanationGenerationError = 0;
    this.explanationGenerationAttempts = 0;
    this.explanationGenerationDurations = [];
  }
}