// lib/detection/explanation/types.ts
/**
 * Explanation data for a detection finding.
 * Contains details about why a finding was generated and what evidence was used.
 */
import { ExplanationEvidence } from "../types";

export interface Explanation {
  /** Which specific rules or patterns triggered the detection */
  triggeredBy: string[];

  /** Evidence/data points used in the decision (e.g., specific order attributes) */
  evidence: ExplanationEvidence;

  /** Confidence score for this explanation (0.0 to 1.0) */
  confidence: number;

  /** Risk stratification level based on confidence score */
  riskStratification: 'low' | 'medium' | 'high';

  /** Human-readable explanation suitable for merchant display */
  merchantExplanation: string;

  /** Technical details for debugging/investigation */
  technicalDetails?: string;

  // Historical context fields
  historicalContext?: {
    /** How the current alert compares to historical norms */
    comparison: 'above_normal' | 'below_normal' | 'normal' | 'significantly_above' | 'significantly_below';

    /** Baseline metrics for comparison */
    baselineMetrics?: {
      averageRefundAmount: number;
      averageRefundCount: number;
      averageQuantityPerRefund: number;
      refundFrequency: number; // refunds per day/week
    };

    /** Current metrics */
    currentMetrics?: {
      refundAmount: number;
      refundCount: number;
      quantityPerRefund: number;
    };

    /** Deviation from baseline */
    deviation?: {
      amountDeviationPercent: number;
      countDeviationPercent: number;
      frequencyDeviationPercent: number;
    };

    /** Seasonal adjustment information */
    seasonalAdjustment?: {
      isPeakSeason: boolean;
      seasonalFactor: number; // multiplier for expected values
      expectedBaseline: {
        amount: number;
        count: number;
      };
    };
  };
}

/** Configuration for explanation generation */
export interface ExplanationConfig {
  /** Master flag to enable/disable explanation generation */
  enabled?: boolean;
  /** Level of detail for explanations */
  level?: 'basic' | 'detailed' | 'full';
  /** Whether to include technical details */
  includeTechnicalDetails?: boolean;
  /** Whether to enable confidence scoring */
  enableConfidenceScoring?: boolean;
  /** Whether to enable historical context */
  enableHistoricalContext?: boolean;
  /** Whether to enable enhanced evidence */
  enableEnhancedEvidence?: boolean;
  /** Format of explanation */
  format?: 'technical' | 'merchant-friendly' | 'both';
}