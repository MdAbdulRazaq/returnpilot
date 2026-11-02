// lib/detection/explanation/generator.ts
import { Finding, AlertReason } from "../types";
import { NormalizedOrderData } from "../normalize";
import { Explanation, ExplanationConfig } from "./types";
import { ExplanationEvidence } from "../types";
import { getAdaptiveLearningParameters } from "../adaptive-learning-persistence";
import { StoreBehaviorModel } from "../store-behavior-model";
import { ExplanationConfigurationQueries } from "@/lib/api/settings/queries";

/**
 * Generates explanations for detection findings.
 * This is a separate service that consumes detection results and produces explanations,
 * keeping explanation logic separate from detection strategy logic as required.
 */
export class ExplanationGenerator {
  /**
   * Generate explanation for a finding.
   * @param finding The detection finding to explain
   * @param data The order data that was analyzed
   * @param shopId The ID of the shop to get configuration for
   * @param config Optional explanation configuration (if not provided, will be fetched from shop)
   * @returns Explanation for the finding
   */
  public static async generate(
    finding: Finding,
    data: NormalizedOrderData,
    shopId: string,
    config?: ExplanationConfig
  ): Promise<Explanation> {
    // Get explanation configuration for the shop if not provided
    let resolvedConfig: ExplanationConfig;
    if (config) {
      // Use provided configuration directly
      resolvedConfig = config;
    } else {
      // Fetch configuration from shop and convert to ExplanationConfig
      const explanationConfig = await ExplanationConfigurationQueries.getOrCreateConfiguration(shopId);
      resolvedConfig = {
        enabled: explanationConfig.explanationEnabled,
        level: explanationConfig.explanationLevel,
        includeTechnicalDetails: explanationConfig.includeTechnicalDetails,
        enableConfidenceScoring: explanationConfig.enableConfidenceScoring,
        enableHistoricalContext: explanationConfig.enableHistoricalContext,
        enableEnhancedEvidence: explanationConfig.enableEnhancedEvidence,
        format: explanationConfig.explanationFormat
      };
    }

    // If explanation generation is disabled, return a minimal explanation
    if (!resolvedConfig.enabled) {
      return {
        triggeredBy: [],
        evidence: ExplanationGenerator.collectEvidence(finding, data),
        confidence: 0,
        riskStratification: 'low',
        merchantExplanation: 'Explanation generation is disabled for this shop.',
        technicalDetails: undefined,
        historicalContext: undefined
      };
    }

    // Determine what triggered this finding based on the reason and data
    const triggeredBy = ExplanationGenerator.determineTriggeredBy(finding.reason, data);

    // Collect evidence used in the decision
    const evidence = ExplanationGenerator.collectEvidence(finding, data);

    // Generate historical context if enabled (needed for confidence calculation)
    const historicalContext = resolvedConfig.enableHistoricalContext
      ? await ExplanationGenerator.generateHistoricalContext(finding, data)
      : undefined;

    // Generate merchant-friendly explanation
    const merchantExplanation = ExplanationGenerator.generateMerchantExplanation(finding.reason, finding.strategyIdentifier, triggeredBy, evidence);

    // Generate technical details if requested
    const technicalDetails = resolvedConfig.includeTechnicalDetails
      ? ExplanationGenerator.generateTechnicalDetails(finding, data, triggeredBy, evidence)
      : undefined;

    // Calculate confidence score (now with access to historical context)
    const confidence = ExplanationGenerator.calculateConfidence(finding, data, evidence, historicalContext);

    // Calculate risk stratification based on confidence score
    const riskStratification = confidence >= 0.8 ? 'high' : confidence >= 0.5 ? 'medium' : 'low';

    return {
      triggeredBy,
      evidence,
      confidence,
      riskStratification,
      merchantExplanation,
      technicalDetails,
      historicalContext
    };
  }

  /**
   * Determine which specific rules/patterns triggered the finding.
   * @param reason The alert reason
   * @param data The order data
   * @returns Array of strings describing what triggered the detection
   */
  private static determineTriggeredBy(reason: AlertReason, data: NormalizedOrderData): string[] {
    const triggered: string[] = [];

    switch (reason) {
      case AlertReason.NO_RETURN:
        // Check if grace period has passed
        triggered.push("Grace period exceeded for refund");

        // Check if there are no returns at all
        if (data.returns.length === 0) {
          triggered.push("No returns found for order");
        }

        // Check specific refunds past grace period
        const now = new Date();
        const gracePeriodMs = 7 * 24 * 60 * 60 * 1000; // 7 days - would come from config in real implementation
        const refundsPastGrace = data.refunds.filter(
          refund => now.getTime() - refund.createdAt.getTime() > gracePeriodMs
        );
        if (refundsPastGrace.length > 0) {
          triggered.push(`${refundsPastGrace.length} refund(s) past grace period`);
        }
        break;

      case AlertReason.RETURN_NOT_RECEIVED:
        triggered.push("Return exists but no goods processed");
        triggered.push("Processed quantity is zero for refunded line item");
        break;

      case AlertReason.QUANTITY_SHORTFALL:
        triggered.push("Refunded quantity exceeds processed quantity");
        triggered.push("Partial return detected - some goods processed but not all");
        break;
    }

    return triggered;
  }

  /**
   * Collect evidence/data points used in the detection decision.
   * @param finding The detection finding
   * @param data The order data
   * @returns Object containing evidence used in decision
*/
  private static collectEvidence(finding: Finding, data: NormalizedOrderData): ExplanationEvidence {
    // Calculate total processed quantity from returns
    const totalProcessed = data.returns
      .flatMap(returnOrder => returnOrder.lineItems)
      .reduce((sum, item) => sum + item.processedQuantity, 0);

    const evidence: ExplanationEvidence = {
      // Basic order information
      orderId: data.shopifyOrderId,
      refundCount: data.refunds.length,
      returnCount: data.returns.length,

      // Timing information
      orderDate: data.updatedAt.toISOString(),

      // Financial information
      totalRefundAmount: data.refunds.reduce((sum, refund) => sum + refund.totalRefundedAmount, 0),
      currency: 'USD',

      // Line item information specific to the finding
      lineItemId: finding.shopifyLineItemId,
      moneyAtRisk: finding.moneyAtRisk,

      // Always include processed quantity information
      totalProcessedQuantity: totalProcessed
    };

    // Add specific evidence based on alert reason
    if (finding.reason === AlertReason.NO_RETURN || finding.reason === AlertReason.RETURN_NOT_RECEIVED || finding.reason === AlertReason.QUANTITY_SHORTFALL) {
      // Find the specific refund line item related to this finding
      const refundLineItem = data.refunds
        .flatMap(refund => refund.lineItems)
        .find(item => item.shopifyLineItemId === finding.shopifyLineItemId);

      if (refundLineItem) {
        evidence.refundLineItemQuantity = refundLineItem.quantity;
        evidence.refundLineItemSubtotal = refundLineItem.subtotal;
      }

      // Find return line items for comparison
      const returnLineItems = data.returns
        .flatMap(returnOrder => returnOrder.lineItems)
        .filter(item => item.shopifyLineItemId === finding.shopifyLineItemId);

      // Calculate quantity difference (refunded - processed quantity)
      const refundQuantity = data.refunds
        .flatMap(refund => refund.lineItems)
        .find(item => item.shopifyLineItemId === finding.shopifyLineItemId)?.quantity ?? 0;
      evidence.quantityDifference = refundQuantity - totalProcessed;
    }

    return evidence;
  }

  /**
   * Generate merchant-friendly explanation.
   * @param reason The alert reason
   * @param strategyIdentifier The strategy that detected this finding
   * @param triggeredBy What triggered the detection
   * @param evidence Evidence used in decision
   * @returns Human-readable explanation
   */
  private static generateMerchantExplanation(
    reason: AlertReason,
    strategyIdentifier: string | undefined,
    triggeredBy: string[],
    evidence: ExplanationEvidence
  ): string {
    const strategyName = strategyIdentifier || "Unknown Strategy";

    switch (reason) {
      case AlertReason.NO_RETURN:
        return `This order was flagged by the ${strategyName} because a refund was issued but no return was received within the expected timeframe. Review the order to confirm if the customer returned the items.`;

      case AlertReason.RETURN_NOT_RECEIVED:
        return `This order was flagged by the ${strategyName} because a return was initiated but no items were processed/received. The customer may have sent back an empty package or not returned the items at all.`;

      case AlertReason.QUANTITY_SHORTFALL:
        return `This order was flagged by the ${strategyName} because more items were refunded than were processed as returned. This suggests the customer may have received a partial refund for items they didn't return.`;

      default:
        return `This order was flagged for review by the ${strategyName} based on our detection analysis.`;
    }
  }

  /**
   * Generate technical details for debugging/investigation.
   * @param finding The detection finding
   * @param data The order data
   * @param triggeredBy What triggered the detection
   * @param evidence Evidence used in decision
   * @returns Technical details string
   */
  private static generateTechnicalDetails(
    finding: Finding,
    data: NormalizedOrderData,
    triggeredBy: string[],
    evidence: ExplanationEvidence
  ): string {
    let details = `Detection Explanation (Technical):\n`;
    details += `------------------------\n`;
    details += `Alert Reason: ${finding.reason}\n`;
    details += `Strategy Identifier: ${finding.strategyIdentifier ?? 'Unknown'}\n`;
    details += `Finding ID: ${finding.shopifyOrderId}-${finding.shopifyLineItemId ?? 'no-line-item'}\n`;
    details += `Triggered By: ${triggeredBy.join(', ')}\n`;
    details += `Order Date: ${evidence.orderDate}\n`;
    details += `Refund Count: ${evidence.refundCount}\n`;
    details += `Return Count: ${evidence.returnCount}\n`;
    details += `Total Refund Amount: ${evidence.totalRefundAmount} ${evidence.currency}\n`;
    details += `Money at Risk: $${evidence.moneyAtRisk}\n`;

    if (evidence.lineItemId !== undefined) {
      details += `Line Item ID: ${evidence.lineItemId}\n`;
    }

    if (evidence.refundLineItemQuantity !== undefined) {
      details += `Refunded Quantity: ${evidence.refundLineItemQuantity}\n`;
    }

    if (evidence.totalProcessedQuantity !== undefined) {
      details += `Processed Quantity: ${evidence.totalProcessedQuantity}\n`;
    }

    if (evidence.quantityDifference !== undefined) {
      details += `Quantity Difference (Refunded - Processed): ${evidence.quantityDifference}\n`;
    }

    return details;
  }

  /**
   * Calculate confidence score for the explanation based on evidence strength and historical context
   * @param finding The detection finding
   * @param data The order data
   * @param evidence The collected evidence
   * @param historicalContext Historical context information (if available)
   * @returns Confidence score between 0.0 and 1.0
   */
  private static calculateConfidence(
    finding: Finding,
    data: NormalizedOrderData,
    evidence: ExplanationEvidence,
    historicalContext: Explanation['historicalContext'] | undefined
  ): number {
    // Start with base confidence
    let confidence = 0.3;

    // Evidence strength factors (up to 0.4)
    let evidenceStrength = 0.0;

    // Increase confidence if we have clear line item evidence
    if (evidence.lineItemId !== null && evidence.lineItemId !== undefined) {
      evidenceStrength += 0.1;
    }

    // Increase confidence if we have quantity evidence
    if (evidence.refundLineItemQuantity !== undefined && evidence.totalProcessedQuantity !== undefined) {
      evidenceStrength += 0.1;
    }

    // Increase confidence if we have amount evidence
    if (evidence.refundLineItemSubtotal !== undefined) {
      evidenceStrength += 0.1;
    }

    // Increase confidence based on money at risk (higher amounts = clearer evidence)
    if (evidence.moneyAtRisk > 100) {
      evidenceStrength += 0.05;
    } else if (evidence.moneyAtRisk > 50) {
      evidenceStrength += 0.025;
    }

    // Historical anomaly factors (up to 0.3)
    let historicalAnomalyFactor = 0.0;
    if (historicalContext) {
      // Base factor for having historical context
      historicalAnomalyFactor += 0.1;

      // Additional factor based on deviation significance
      const deviation = historicalContext.deviation;
      if (deviation) {
        const amountDev = Math.abs(deviation.amountDeviationPercent);
        const countDev = Math.abs(deviation.countDeviationPercent);
        const freqDev = Math.abs(deviation.frequencyDeviationPercent);

        // Significant deviations increase confidence in the explanation
        const maxDev = Math.max(amountDev, countDev, freqDev);
        if (maxDev >= 50) { // 50%+ deviation is strong evidence
          historicalAnomalyFactor += 0.1;
        } else if (maxDev >= 25) { // 25%+ deviation is moderate evidence
          historicalAnomalyFactor += 0.05;
        }

        // Direction matters - significantly above or below normal is more scrutinizable
        if (historicalContext.comparison === 'significantly_above' ||
            historicalContext.comparison === 'significantly_below') {
          historicalAnomalyFactor += 0.05;
        }
      }
    }

    // Combine factors
    confidence += Math.min(evidenceStrength, 0.4); // Cap evidence strength contribution
    confidence += Math.min(historicalAnomalyFactor, 0.3); // Cap historical factor contribution

    // Ensure confidence is within bounds
    return Math.min(1.0, Math.max(0.0, confidence));
  }

  /**
   * Generate historical context for the explanation
   * @param finding The detection finding
   * @param data The order data
   * @returns Historical context object or undefined
   */
  private static async generateHistoricalContext(
    finding: Finding,
    data: NormalizedOrderData
  ): Promise<Explanation['historicalContext'] | undefined> {
    try {
      // Get adaptive learning parameters for this shop
      const adaptiveParams = await getAdaptiveLearningParameters(finding.shopId);

      // If no historical data available, return undefined
      if (!adaptiveParams) {
        return undefined;
      }

      // Extract metrics from adaptive learning parameters
      const refundAmountMean = adaptiveParams.refund_amount_mean ?? 0;
      const refundAmountM2 = adaptiveParams.refund_amount_m2 ?? 0;
      const refundAmountCount = adaptiveParams.refund_amount_count ?? 0;

      const refundCountMean = adaptiveParams.refund_count_mean ?? 0;
      const refundCountM2 = adaptiveParams.refund_count_m2 ?? 0;
      const refundCountCount = adaptiveParams.refund_count_count ?? 0;

      const lineItemCountMean = adaptiveParams.line_item_count_mean ?? 0;
      const lineItemCountM2 = adaptiveParams.line_item_count_m2 ?? 0;
      const lineItemCountCount = adaptiveParams.line_item_count_count ?? 0;

      // Calculate standard deviations using StoreBehaviorModel
      const refundAmountStdDev = StoreBehaviorModel.calculateStdDev(refundAmountM2, refundAmountCount);
      const refundCountStdDev = StoreBehaviorModel.calculateStdDev(refundCountM2, refundCountCount);
      const lineItemCountStdDev = StoreBehaviorModel.calculateStdDev(lineItemCountM2, lineItemCountCount);

      // Get baseline stats (mean and stdDev)
      const refundAmountStats = StoreBehaviorModel.getBaselineStats(refundAmountCount, refundAmountM2, refundAmountMean);
      const refundCountStats = StoreBehaviorModel.getBaselineStats(refundCountCount, refundCountM2, refundCountMean);
      const lineItemCountStats = StoreBehaviorModel.getBaselineStats(lineItemCountCount, lineItemCountM2, lineItemCountMean);

      // Calculate seasonal patterns (simplified - using day-of-week average)
      const seasonalPatterns = [
        adaptiveParams.seasonal_pattern_sunday ?? 0,
        adaptiveParams.seasonal_pattern_monday ?? 0,
        adaptiveParams.seasonal_pattern_tuesday ?? 0,
        adaptiveParams.seasonal_pattern_wednesday ?? 0,
        adaptiveParams.seasonal_pattern_thursday ?? 0,
        adaptiveParams.seasonal_pattern_friday ?? 0,
        adaptiveParams.seasonal_pattern_saturday ?? 0
      ];

      const globalAverage = adaptiveParams.global_refund_average ?? 1;

      // Get current timestamp for seasonal adjustment
      const timestamp = data.updatedAt.getTime();
      const seasonalAdjustment = StoreBehaviorModel.getSeasonalAdjustment(timestamp, seasonalPatterns, globalAverage);

      // Calculate current metrics from the order data
      const totalRefundAmount = data.refunds.reduce((sum, refund) => sum + refund.totalRefundedAmount, 0);
      const refundCount = data.refunds.length;
      const totalLineItems = data.refunds.reduce((sum, refund) => sum + refund.lineItems.length, 0);
      const lineItemCount = refundCount > 0 ? totalLineItems / refundCount : 0;

      // Format baseline metrics
      const baselineMetrics = StoreBehaviorModel.formatBaselineMetricsForExplanation(
        refundAmountStats.mean,
        refundAmountStats.stdDev,
        refundCountStats.mean,
        refundCountStats.stdDev,
        lineItemCountStats.mean,
        lineItemCountStats.stdDev,
        refundCount / Math.max(1, (data.updatedAt.getTime() - new Date(data.updatedAt.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)), // refunds per day
        seasonalAdjustment
      );

      // Format current metrics
      const currentMetrics = StoreBehaviorModel.formatCurrentMetricsForExplanation(
        totalRefundAmount,
        refundCount,
        lineItemCount
      );

      // Calculate deviations
      const amountDeviationPercent = StoreBehaviorModel.calculateDeviationPercent(totalRefundAmount, refundAmountStats.mean);
      const countDeviationPercent = StoreBehaviorModel.calculateDeviationPercent(refundCount, refundCountStats.mean);
      const frequencyDeviationPercent = StoreBehaviorModel.calculateDeviationPercent(
        refundCount / Math.max(1, (data.updatedAt.getTime() - new Date(data.updatedAt.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)), // refunds per day
        refundCountStats.mean / Math.max(1, (new Date().getTime() - new Date(data.updatedAt.getFullYear(), 0, 1).getTime()) / (1000 * 60 * 60 * 24)) // baseline frequency per day
      );

      // Format deviation metrics
      const deviation = StoreBehaviorModel.formatDeviationMetricsForExplanation(
        amountDeviationPercent,
        countDeviationPercent,
        frequencyDeviationPercent
      );

      // Determine comparison category based on deviation
      let comparison: 'above_normal' | 'below_normal' | 'normal' | 'significantly_above' | 'significantly_below';
      const deviationThreshold = 25; // 25% deviation threshold for "significant"

      if (Math.abs(amountDeviationPercent) < deviationThreshold &&
          Math.abs(countDeviationPercent) < deviationThreshold &&
          Math.abs(frequencyDeviationPercent) < deviationThreshold) {
        comparison = 'normal';
      } else if (amountDeviationPercent > deviationThreshold ||
                 countDeviationPercent > deviationThreshold ||
                 frequencyDeviationPercent > deviationThreshold) {
        comparison = 'significantly_above';
      } else if (amountDeviationPercent < -deviationThreshold ||
                 countDeviationPercent < -deviationThreshold ||
                 frequencyDeviationPercent < -deviationThreshold) {
        comparison = 'significantly_below';
      } else if (amountDeviationPercent > 0 ||
                 countDeviationPercent > 0 ||
                 frequencyDeviationPercent > 0) {
        comparison = 'above_normal';
      } else {
        comparison = 'below_normal';
      }

      // Return the historical context
      const result: Explanation['historicalContext'] = {
        comparison,
        baselineMetrics: baselineMetrics.baselineMetrics,
        currentMetrics: currentMetrics.currentMetrics,
        deviation: deviation.deviation
      };

      // Add seasonal adjustment if present
      if (baselineMetrics.seasonalAdjustment) {
        result.seasonalAdjustment = baselineMetrics.seasonalAdjustment;
      }

      return result;
    } catch (error) {
      // Log error but don't fail the explanation generation
      console.warn(`Failed to generate historical context for shop ${finding.shopId}:`, error);
      return undefined;
    }
  }
}

// TODO: Ensure consistent explanation formatting across strategies