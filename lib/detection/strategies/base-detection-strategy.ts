// lib/detection/strategies/base-detection-strategy.ts
import { DetectionStrategy } from "./detection-strategy";
import { Finding, AlertReason } from "../types";
import { NormalizedOrderData, NormalizedRefundLineItem, NormalizedReturnLineItem, NormalizedReturn } from "../normalize";

/**
 * Abstract base class providing common utilities and helper functions for detection strategies.
 */
export abstract class BaseDetectionStrategy implements DetectionStrategy {
  /**
   * Aggregate processed quantities from all return line items for a given shopifyLineItemId.
   * Returns a map of shopifyLineItemId -> total processed quantity.
   */
  protected aggregateReturnLineItems(returns: NormalizedReturn[]): Map<string, number> {
    const map = new Map<string, number>();
    for (const ret of returns) {
      for (const lineItem of ret.lineItems) {
        const existing = map.get(lineItem.shopifyLineItemId) ?? 0;
        map.set(lineItem.shopifyLineItemId, existing + lineItem.processedQuantity);
      }
    }
    return map;
  }

  /**
   * Gets the total processed quantity for a specific line item across all returns.
   */
  protected getProcessedQuantity(
    shopifyLineItemId: string,
    processedQuantities: Map<string, number>
  ): number {
    return processedQuantities.get(shopifyLineItemId) ?? 0;
  }

  /**
   * Creates a basic finding object with common properties.
   */
  protected createFinding(
    data: NormalizedOrderData,
    shopifyLineItemId: string | null,
    reason: AlertReason,
    moneyAtRisk: number,
    strategyIdentifier?: string
  ): Finding {
    const now = new Date();
    return {
      shopId: data.shopId,
      shopifyRefundId: "", // Will be set by caller
      shopifyOrderId: data.shopifyOrderId,
      shopifyLineItemId,
      reason,
      strategyIdentifier,
      moneyAtRisk,
      createdAt: now,
      updatedAt: now,
      reviewedAt: null,
      dismissedAt: null,
    };
  }

  /**
   * Abstract method that must be implemented by concrete strategies.
   */
  abstract analyze(data: NormalizedOrderData): Finding[];
}