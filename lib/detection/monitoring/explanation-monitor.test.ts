// lib/detection/monitoring/explanation-monitor.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { ExplanationMonitor } from "./explanation-monitor";

describe("ExplanationMonitor", () => {
  let monitor: ExplanationMonitor;

  beforeEach(() => {
    monitor = ExplanationMonitor.getInstance();
    monitor.reset(); // Clear any existing state
  });

  describe("Dashboard Delivery Tracking", () => {
    it("should track dashboard delivery success", () => {
      monitor.trackDashboardDeliverySuccess(true);
      monitor.trackDashboardDeliverySuccess(false);
      monitor.trackDashboardDeliverySuccess(true);

      expect(monitor.getDashboardDeliverySuccessRate()).toBe(66.66666666666666); // 2/3 * 100
    });

    it("should return 0 when no dashboard delivery attempts", () => {
      expect(monitor.getDashboardDeliverySuccessRate()).toBe(0);
    });
  });

  describe("Email Delivery Tracking", () => {
    it("should track email delivery success", () => {
      monitor.trackEmailDeliverySuccess(true);
      monitor.trackEmailDeliverySuccess(true);
      monitor.trackEmailDeliverySuccess(false);

      expect(monitor.getEmailDeliverySuccessRate()).toBe(66.66666666666666); // 2/3 * 100
    });

    it("should return 0 when no email delivery attempts", () => {
      expect(monitor.getEmailDeliverySuccessRate()).toBe(0);
    });
  });

  describe("Usefulness Feedback Tracking", () => {
    it("should track usefulness feedback ratings", () => {
      monitor.trackUsefulnessFeedback(5);
      monitor.trackUsefulnessFeedback(3);
      monitor.trackUsefulnessFeedback(4);

      expect(monitor.getAverageUsefulnessRating()).toBe(4); // (5+3+4)/3
    });

    it("should track helpfulness rate", () => {
      monitor.trackUsefulnessFeedback(5); // helpful
      monitor.trackUsefulnessFeedback(3); // helpful
      monitor.trackUsefulnessFeedback(2); // not helpful
      monitor.trackUsefulnessFeedback(1); // not helpful

      expect(monitor.getHelpfulnessRate()).toBe(50); // 2/4 * 100
    });

    it("should return 0 when no feedback", () => {
      expect(monitor.getAverageUsefulnessRating()).toBe(0);
      expect(monitor.getHelpfulnessRate()).toBe(0);
    });
  });

  describe("Confidence Accuracy Correlation Tracking", () => {
    it("should track confidence scores and accuracy", () => {
      monitor.trackConfidenceAccuracyCorrelation(0.8, true);
      monitor.trackConfidenceAccuracyCorrelation(0.6, false);
      monitor.trackConfidenceAccuracyCorrelation(0.9, true);

      expect(monitor.getAverageConfidenceScore()).toBe(0.7666666666666666); // (0.8+0.6+0.9)/3
      expect(monitor.getAccuracyRate()).toBe(66.66666666666666); // 2/3 * 100
    });

    it("should return 0 when no data", () => {
      expect(monitor.getAverageConfidenceScore()).toBe(0);
      expect(monitor.getAccuracyRate()).toBe(0);
    });
  });

  describe("Action Rate by Confidence Tracking", () => {
    it("should track action rates by confidence level", () => {
      // High confidence actions
      monitor.trackActionRateByConfidence(0.9, true);  // high confidence, action taken
      monitor.trackActionRateByConfidence(0.85, false); // high confidence, no action
      monitor.trackActionRateByConfidence(0.95, true);  // high confidence, action taken

      // Medium confidence actions
      monitor.trackActionRateByConfidence(0.6, false);  // medium confidence, no action
      monitor.trackActionRateByConfidence(0.55, true);  // medium confidence, action taken

      // Low confidence actions
      monitor.trackActionRateByConfidence(0.3, false);  // low confidence, no action
      monitor.trackActionRateByConfidence(0.4, false);  // low confidence, no action

      expect(monitor.getActionRateByConfidence('high')).toBe(66.66666666666666); // 2/3 * 100
      expect(monitor.getActionRateByConfidence('medium')).toBe(50); // 1/2 * 100
      expect(monitor.getActionRateByConfidence('low')).toBe(0); // 0/2 * 100
    });

    it("should return 0 when no actions for a confidence level", () => {
      expect(monitor.getActionRateByConfidence('high')).toBe(0);
      expect(monitor.getActionRateByConfidence('medium')).toBe(0);
      expect(monitor.getActionRateByConfidence('low')).toBe(0);
    });
  });

  describe("Generation Performance Tracking", () => {
    it("should track generation performance and errors", () => {
      monitor.trackGenerationPerformance(true, 100);
      monitor.trackGenerationPerformance(true, 200);
      monitor.trackGenerationPerformance(false, 0);
      monitor.trackGenerationPerformance(true, 150);

      expect(monitor.getGenerationSuccessRate()).toBe(75); // 3/4 * 100
      expect(monitor.getAverageGenerationDurationMs()).toBe(150); // (100+200+150)/3
    });

    it("should return 0 when no generation attempts", () => {
      expect(monitor.getGenerationSuccessRate()).toBe(0);
      expect(monitor.getAverageGenerationDurationMs()).toBe(0);
    });
  });

  describe("Statistics Aggregation", () => {
    it("should return all statistics in the getStatistics method", () => {
      // Set up some test data
      monitor.trackDashboardDeliverySuccess(true);
      monitor.trackEmailDeliverySuccess(true);
      monitor.trackEmailDeliverySuccess(false);
      monitor.trackUsefulnessFeedback(5);
      monitor.trackUsefulnessFeedback(3);
      monitor.trackConfidenceAccuracyCorrelation(0.8, true);
      monitor.trackActionRateByConfidence(0.9, true);
      monitor.trackActionRateByConfidence(0.6, false);
      monitor.trackGenerationPerformance(true, 100);
      monitor.trackGenerationPerformance(true, 200);

      const stats = monitor.getStatistics();

      expect(stats).toHaveProperty('dashboardDeliverySuccessRate');
      expect(stats).toHaveProperty('emailDeliverySuccessRate');
      expect(stats).toHaveProperty('averageUsefulnessRating');
      expect(stats).toHaveProperty('helpfulnessRate');
      expect(stats).toHaveProperty('averageConfidenceScore');
      expect(stats).toHaveProperty('accuracyRate');
      expect(stats).toHaveProperty('actionRateByConfidence');
      expect(stats).toHaveProperty('averageGenerationDurationMs');
      expect(stats).toHaveProperty('generationSuccessRate');

      // Check some specific values
      expect(stats.dashboardDeliverySuccessRate).toBe(100); // 1/1 * 100
      expect(stats.emailDeliverySuccessRate).toBe(50); // 1/2 * 100
      expect(stats.averageUsefulnessRating).toBe(4); // (5+3)/2
      expect(stats.helpfulnessRate).toBe(100); // 2/2 * 100
      expect(stats.averageConfidenceScore).toBe(0.8); // 0.8/1
      expect(stats.accuracyRate).toBe(100); // 1/1 * 100
      expect(stats.actionRateByConfidence.high).toBe(100); // 1/1 * 100
      expect(stats.actionRateByConfidence.medium).toBe(0); // 0/1 * 100
      expect(stats.generationSuccessRate).toBe(100); // 2/2 * 100
      expect(stats.averageGenerationDurationMs).toBe(150); // (100+200)/2
    });

    it("should reset all statistics", () => {
      // Add some data
      monitor.trackDashboardDeliverySuccess(true);
      monitor.trackUsefulnessFeedback(5);

      // Verify data was added
      expect(monitor.getDashboardDeliverySuccessRate()).toBe(100);
      expect(monitor.getAverageUsefulnessRating()).toBe(5);

      // Reset
      monitor.reset();

      // Verify data was cleared
      expect(monitor.getDashboardDeliverySuccessRate()).toBe(0);
      expect(monitor.getAverageUsefulnessRating()).toBe(0);
    });
  });

  describe("Singleton Pattern", () => {
    it("should return the same instance on multiple calls", () => {
      const instance1 = ExplanationMonitor.getInstance();
      const instance2 = ExplanationMonitor.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});