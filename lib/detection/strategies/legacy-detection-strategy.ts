// lib/detection/strategies/legacy-detection-strategy.ts
import { BaseDetectionStrategy } from "./base-detection-strategy";
import { Finding, AlertReason } from "../types";
import { NormalizedOrderData } from "../normalize";

/**
 * Legacy detection strategy that preserves the exact behavior of the current detection engine.
 * This ensures backward compatibility during the refactoring process.
 */
export class LegacyDetectionStrategy extends BaseDetectionStrategy {
  /**
   * Analyze order data using the original detection logic.
   * Implements the three original rules: NO_RETURN, RETURN_NOT_RECEIVED, QUANTITY_SHORTFALL.
   */
  analyze(data: NormalizedOrderData): Finding[] {
    const findings: Finding[] = [];
    const now = new Date();
    // Note: gracePeriodDays would come from configuration in a real implementation
    // For now, we'll use a default value that matches the existing behavior
    const gracePeriodDays = 7; // Default to match existing tests
    const gracePeriodMs = gracePeriodDays * 24 * 60 * 60 * 1000;

    // Check if the order has ANY returns at all
    const hasAnyReturns = data.returns.length > 0;

    // For NO_RETURN: check if grace period has passed for each refund
    // A refund is "past grace period" if its createdAt + gracePeriodDays < now
    const refundsPastGrace = data.refunds.filter(
      (refund) => now.getTime() - refund.createdAt.getTime() > gracePeriodMs
    );

    // First pass: NO_RETURN for refunds past grace period on orders with NO returns
    if (!hasAnyReturns) {
      for (const refund of refundsPastGrace) {
        for (const refundLineItem of refund.lineItems) {
          if (refundLineItem.shopifyLineItemId === null) {
            // Skip lines with missing original line item ID - cannot attribute
            continue;
          }
          if (refundLineItem.quantity === 0) continue;

          const finding = this.createFinding(
            data,
            refundLineItem.shopifyLineItemId,
            AlertReason.NO_RETURN,
            refundLineItem.subtotal
            , "LEGACY"
          );
          finding.shopifyRefundId = refund.shopifyRefundId;
          findings.push(finding);
        }
      }
      // If NO_RETURN applies, we don't check the other reasons for these items
      // Return early since there are no returns to check against
      return findings;
    }

    // Order HAS returns - check RETURN_NOT_RECEIVED and QUANTITY_SHORTFALL
    const processedQuantities = this.aggregateReturnLineItems(data.returns);

    for (const refund of data.refunds) {
      for (const refundLineItem of refund.lineItems) {
        if (refundLineItem.shopifyLineItemId === null) {
          // Skip lines with missing original line item ID - cannot attribute
          continue;
        }
        if (refundLineItem.quantity === 0) continue;

        const returnedQuantity = this.getProcessedQuantity(
          refundLineItem.shopifyLineItemId,
          processedQuantities
        );

        // RETURN_NOT_RECEIVED - return exists but nothing processed for this line item
        if (returnedQuantity === 0) {
          const finding = this.createFinding(
            data,
            refundLineItem.shopifyLineItemId,
            AlertReason.RETURN_NOT_RECEIVED,
            refundLineItem.subtotal
            , "LEGACY"
          );
          finding.shopifyRefundId = refund.shopifyRefundId;
          findings.push(finding);
          // Skip QUANTITY_SHORTFALL when nothing received - it's the same root cause
          continue;
        }

        // QUANTITY_SHORTFALL - refunded more than what was processed/received (but some WAS received)
        if (refundLineItem.quantity > returnedQuantity) {
          const unconfirmedQty = refundLineItem.quantity - returnedQuantity;
          const proportion = unconfirmedQty / refundLineItem.quantity;
          const finding = this.createFinding(
            data,
            refundLineItem.shopifyLineItemId,
            AlertReason.QUANTITY_SHORTFALL,
            refundLineItem.subtotal * proportion
            , "LEGACY"
          );
          finding.shopifyRefundId = refund.shopifyRefundId;
          findings.push(finding);
        }
      }
    }

    return findings;
  }
}