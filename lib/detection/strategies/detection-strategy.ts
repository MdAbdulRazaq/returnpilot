// lib/detection/strategies/detection-strategy.ts
import { Finding } from "../types";
import { NormalizedOrderData } from "../normalize";

/**
 * Interface defining the contract for all detection strategies.
 * Each strategy analyzes order data and returns findings.
 */
export interface DetectionStrategy {
  /**
   * Analyze the provided order data and return any detected findings.
   * @param data The normalized order data to analyze
   * @returns Array of findings detected by this strategy
   */
  analyze(data: NormalizedOrderData): Finding[];
}