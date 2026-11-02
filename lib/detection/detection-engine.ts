// lib/detection/detection-engine.ts
import { DetectionStrategy } from "./strategies/detection-strategy";
import { LegacyDetectionStrategy } from "./strategies/legacy-detection-strategy";
import { Finding } from "./types";
import { NormalizedOrderData } from "./normalize";
import { PerformanceMonitor } from "./performance/monitor";
import { ExplanationGenerator } from "./explanation/generator";
import { DetectionConfig } from "./types";

/**
 * Detection engine that orchestrates multiple detection strategies.
 * This is the main entry point for detection functionality.
 */
export class DetectionEngine {
  private strategies: DetectionStrategy[];
  private config: DetectionConfig; // DetectionConfig would be ideal but avoiding circular deps for now
  private performanceMonitor: PerformanceMonitor;
  private explanationGenerator: ExplanationGenerator;

  /**
   * Create a new DetectionEngine with the specified strategies.
   * @param strategies Array of detection strategies to use
   * @param config Configuration for the detection engine
   */
  constructor(strategies: DetectionStrategy[] = [], config: DetectionConfig = { gracePeriodDays: 7 }) {
    this.strategies = strategies;
    this.config = config;
    this.performanceMonitor = PerformanceMonitor.getInstance();
    this.explanationGenerator = new ExplanationGenerator();
  }

  /**
   * Add a detection strategy to the engine.
   * @param strategy The strategy to add
   */
  addStrategy(strategy: DetectionStrategy): void {
    this.strategies.push(strategy);
  }

  /**
   * Remove a detection strategy from the engine.
   * @param strategy The strategy to remove
   */
  removeStrategy(strategy: DetectionStrategy): void {
    const index = this.strategies.indexOf(strategy);
    if (index > -1) {
      this.strategies.splice(index, 1);
    }
  }

  /**
   * Run all strategies on the provided order data and return aggregated findings.
   * @param data The normalized order data to analyze
   * @returns Promise of findings with explanations (if enabled)
   */
  public async detect(data: NormalizedOrderData): Promise<Finding[]> {
    // Use the strategies as provided - don't override based on optimization settings
    // The factory is responsible for applying Package 4 enhancements to strategies
    let effectiveStrategies: DetectionStrategy[] = this.strategies;

    // Ensure we always have at least the legacy strategy for backward compatibility
    // if no strategies were explicitly provided
    if (effectiveStrategies.length === 0) {
      effectiveStrategies = [new LegacyDetectionStrategy()];
    }

    const startTime = Date.now();
    const allFindings: Finding[] = [];

    // Record individual strategy execution times
    const strategyStartTimes: Map<string, number> = new Map();

    for (const strategy of effectiveStrategies) {
      const strategyName = strategy.constructor.name;
      const strategyStart = Date.now();
      strategyStartTimes.set(strategyName, strategyStart);

      const findings = strategy.analyze(data);

      const strategyEnd = Date.now();
      const strategyExecutionTime = strategyEnd - strategyStart;
      this.performanceMonitor.recordStrategyExecution(strategyName, strategyExecutionTime);

      allFindings.push(...findings);
    }

    // Generate explanations if optimizations are enabled
    // Explanation generation is part of Package 4 capabilities
    const optimizationsEnabled = this.config.optimizationsEnabled ?? false;
    const finalFindings = optimizationsEnabled
      ? await this.addExplanations(allFindings, data)
      : allFindings;

    const endTime = Date.now();
    const detectionLatency = endTime - startTime;
    this.performanceMonitor.recordDetectionLatency(detectionLatency);

    return finalFindings;
  }

  /**
   * Add explanations to findings if explanation generation is enabled.
   * @param findings The findings to explain
   * @param data The order data that was analyzed
   * @returns Findings with explanations added
   */
  private async addExplanations(findings: Finding[], data: NormalizedOrderData): Promise<Finding[]> {
    return await Promise.all(
      findings.map(async (finding) => {
        // Generate explanation using the shop's explanation configuration
        const explanation = await ExplanationGenerator.generate(finding, data, finding.shopId);
        return { ...finding, explanation };
      })
    );
  }

  /**
   * Create a default detection engine with the legacy strategy for backward compatibility.
   * @returns A DetectionEngine instance with the legacy strategy
   */
  static createDefault(): DetectionEngine {
    return new DetectionEngine([new LegacyDetectionStrategy()]);
  }

  /**
   * Get performance statistics.
   * @returns Performance statistics from the monitor
   */
  getPerformanceStatistics() {
    return this.performanceMonitor.getStatistics();
  }

  /**
   * Reset performance metrics.
   * Useful for testing.
   */
  resetPerformanceMetrics() {
    this.performanceMonitor.reset();
  }
}