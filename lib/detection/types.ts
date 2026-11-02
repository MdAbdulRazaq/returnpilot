// lib/detection/types.ts
import { AdaptiveLearningConfig } from "./adaptive-learning-config";
import { PatternRecognitionConfig } from "./pattern-recognition-config";

/** Evidence collected during explanation generation */
export interface ExplanationEvidence {
  orderId: string;
  refundCount: number;
  returnCount: number;
  orderDate: string;
  totalRefundAmount: number;
  currency: string;
  lineItemId?: string | null;
  moneyAtRisk: number;
  refundLineItemQuantity?: number;
  refundLineItemSubtotal?: number;
  totalProcessedQuantity?: number;
  quantityDifference?: number;

  // Enhanced explanation
  matchedItems?: Array<{
    lineItemId: string;
    description: string;
    quantity: number;
    amount: number;
    matchedReason: string;
  }>;
  unmatchedItems?: Array<{
    lineItemId: string;
    description: string;
    refundedQuantity: number;
    processedQuantity: number;
    discrepancyType: 'quantity' | 'amount' | 'both';
  }>;
  matchedAmount?: number;
  unmatchedAmount?: number;
}

/**
 * Configuration for the detection engine.
 */
export interface DetectionConfig {
  /** Master flag to enable/disable all Package 4 optimization capabilities.
   * When false, the system behaves exactly as the baseline (Package 1-3 only).
   */
  optimizationsEnabled?: boolean;

  /** Number of days after refund before flagging NO_RETURN if no return exists. */
  gracePeriodDays: number;

  /** Configuration for temporal pattern detection strategy. */
  temporalPattern?: {
    /** Enable temporal pattern detection. */
    enabled?: boolean;
    /** Threshold in hours for considering refunds as "rapid successive". */
    rapidSuccessiveHours?: number;
    /** Hours considered outside normal business hours (start hour, 0-23). */
    outsideBusinessHoursStart?: number;
    /** Hours considered outside normal business hours (end hour, 0-23). */
    outsideBusinessHoursEnd?: number;
    /** Minimum days between return and refund to consider suspicious. */
    minReturnRefundDays?: number;
  };

  /** Configuration for fuzzy matching detection strategy. */
  fuzzyMatching?: {
    /** Enable fuzzy matching detection. */
    enabled?: boolean;
    /** Minimum number of identical amounts to flag as suspicious. */
    minIdenticalAmounts?: number;
    /** Minimum amount to consider for round number checking. */
    minRoundAmount?: number;
    /** Minimum number of identical quantities to flag as suspicious. */
    minIdenticalQuantities?: number;
  };

  /** Configuration for adaptive learning system. */
  adaptiveLearning?: AdaptiveLearningConfig;

  /** Configuration for pattern recognition system. */
  patternRecognition?: PatternRecognitionConfig;

  /** Configuration for explanation generation. */
  explanation?: {
    /** Enable explanation generation. */
    enabled?: boolean;
    /** Level of detail for explanations */
    level?: 'basic' | 'detailed' | 'full';
    /** Whether to include technical details */
    includeTechnicalDetails?: boolean;
    /** Enable confidence scoring */
    enableConfidenceScoring?: boolean;
    /** Enable historical context */
    enableHistoricalContext?: boolean;
    /** Enable enhanced evidence breakdown */
    enableEnhancedEvidence?: boolean;
    /** Explanation format preference */
    format?: 'technical' | 'merchant-friendly' | 'both';
  };
}

/**
 * Represents a detected finding from the return processing analysis.
 */
export interface Finding {
  shopId: string;
  shopifyRefundId: string;
  shopifyOrderId: string;
  shopifyLineItemId: string | null;
  reason: AlertReason;
  /** Strategy identifier that produced this finding (runtime metadata, not persisted) */
  strategyIdentifier?: string;
  moneyAtRisk: number; // Amount in USD
  createdAt: Date;
  updatedAt: Date;
  reviewedAt: Date | null;
  dismissedAt: Date | null;
  /** Explanation of why this finding was generated (optional, only populated when explanation generation is enabled) */
  explanation?: {
    /** Which specific rules or patterns triggered the detection */
    triggeredBy: string[];
    /** Evidence/data points used in the decision (e.g., specific order attributes) */
    evidence: ExplanationEvidence;
    /** Confidence score for this explanation (0.0 to 1.0) */
    confidence: number;
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
  };
}

/**
 * Defines the fixed set of alert reasons for findings.
 * These are the only approved alert reasons for this implementation.
 */
export enum AlertReason {
  /**
   * No return record exists for this order at all (after grace period).
   * Determined by absence of ANY synced return for the order, not by
   * searching for a matching return line item.
   */
  NO_RETURN = "no_return",

  /**
   * A return exists for the order, but goods aren't confirmed back.
   * Derived from ReturnLineItem.processedQuantity = 0 for the matching line item.
   */
  RETURN_NOT_RECEIVED = "return_not_received",

  /**
   * Refunded quantity exceeds processed/received return quantity.
   * Refunded quantity > processedQuantity for the matching line item.
   */
  QUANTITY_SHORTFALL = "quantity_shortfall",
}

/**
 * Helper type for common identifiers.
 */
export type ShopifyId = string;
export type ShopId = string;