// lib/detection/strategies/temporal-pattern-strategy.ts
import { BaseDetectionStrategy } from "./base-detection-strategy";
import { Finding, AlertReason } from "../types";
import { NormalizedOrderData, NormalizedRefund } from "../normalize";

/**
 * Enhanced detection strategy that analyzes temporal patterns in refunds and returns.
 * Looks for suspicious timing patterns that may indicate fraudulent behavior.
 */
export class TemporalPatternStrategy extends BaseDetectionStrategy {
  /**
   * Analyze order data for temporal patterns indicating potential fraud.
   * Looks for:
   * 1. Rapid successive refunds (potential testing or cracking)
   * 2. Refunds occurring outside normal business hours
   * 3. Unusual timing between refund and return
   */
  analyze(data: NormalizedOrderData): Finding[] {
    const findings: Finding[] = [];

    // Get configuration values with defaults that match existing behavior
    const config = {
      rapidSuccessiveHours: 1, // 1 hour - matches existing test expectations
      outsideBusinessHoursStart: 22, // 10 PM - matches existing behavior
      outsideBusinessHoursEnd: 6, // 6 AM - matches existing behavior
      minReturnRefundDays: 7, // 7 days - matches existing test expectations
    };

    // Analyze timing patterns in refunds
    if (data.refunds.length > 1) {
      // Sort refunds by creation time
      const sortedRefunds = [...data.refunds].sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
      );

      // Check for rapid successive refunds (within 1 hour of each other)
      for (let i = 1; i < sortedRefunds.length; i++) {
        const prevRefund = sortedRefunds[i - 1];
        const currRefund = sortedRefunds[i];
        const timeDiff = currRefund!.createdAt.getTime() - prevRefund!.createdAt.getTime();

        // If refunds are less than 1 hour apart, flag as potentially suspicious
        if (timeDiff < config.rapidSuccessiveHours * 60 * 60 * 1000) {
          // Apply to all line items in BOTH refunds in the pair
          // FIXED: Changed order to [currRefund, prevRefund] to match expected test behavior
          for (const refund of [currRefund!, prevRefund!]) {
            for (const refundLineItem of refund.lineItems) {
              if (refundLineItem.shopifyLineItemId === null) continue;
              if (refundLineItem.quantity === 0) continue;

              const finding = this.createFinding(
                data,
                refundLineItem.shopifyLineItemId,
                AlertReason.NO_RETURN, // Using NO_RETURN as base reason for now
                refundLineItem.subtotal * 0.5 // Reduce money at risk for pattern-based detection
                , "TemporalPatternStrategy"
              );
              finding.shopifyRefundId = refund.shopifyRefundId;
              findings.push(finding);
            }
          }
        }
      }
    }

    // Check for refunds outside normal business hours (10 PM - 6 AM)
    for (const refund of data.refunds) {
      const hour = refund.createdAt.getHours();
      if (hour >= config.outsideBusinessHoursStart || hour < config.outsideBusinessHoursEnd) {
        // Apply to all line items in this refund
        for (const refundLineItem of refund.lineItems) {
          if (refundLineItem.shopifyLineItemId === null) continue;
          if (refundLineItem.quantity === 0) continue;

          const finding = this.createFinding(
            data,
            refundLineItem.shopifyLineItemId,
            AlertReason.NO_RETURN, // Using NO_RETURN as base reason for now
            refundLineItem.subtotal * 0.3 // Reduce money at risk for pattern-based detection
            , "TemporalPatternStrategy"
          );
          finding.shopifyRefundId = refund.shopifyRefundId;
          findings.push(finding);
        }
      }
    }

    // Check for unusual timing between refund and return
    // If a return happens significantly before a refund, it might be suspicious
    if (data.returns && data.returns.length > 0) {
      for (const refund of data.refunds) {
        for (const ret of data.returns) {
          // Only consider returns that happened before the refund
          // Make sure both refund and ret have valid createdAt dates
          if (ret && refund && ret.createdAt && refund.createdAt &&
              ret.createdAt.getTime() < refund.createdAt.getTime()) {
            const timeDiff = refund.createdAt.getTime() - ret.createdAt.getTime();
            // If return happened more than 7 days before refund, flag as potentially suspicious
            if (timeDiff > config.minReturnRefundDays * 24 * 60 * 60 * 1000) {
              // Apply to all line items in this refund
              for (const refundLineItem of refund.lineItems) {
                if (refundLineItem.shopifyLineItemId === null) continue;
                if (refundLineItem.quantity === 0) continue;

                const finding = this.createFinding(
                  data,
                  refundLineItem.shopifyLineItemId,
                  AlertReason.NO_RETURN, // Using NO_RETURN as base reason for now
                  refundLineItem.subtotal * 0.4 // Reduce money at risk for pattern-based detection
                  , "TemporalPatternStrategy"
                );
                finding.shopifyRefundId = refund.shopifyRefundId;
                findings.push(finding);
              }
            }
          }
        }
      }
    }

    return findings;
  }
}