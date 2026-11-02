/**
 * Performance monitoring for detection engine.
 * Observational only - collects metrics but does not influence detection decisions.
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private strategyExecutions: Map<string, number[]> = new Map();
  private detectionLatencies: number[] = [];
  private readonly maxSamples = 1000; // Keep last N samples

  private constructor() {}

  /**
   * Get the singleton instance.
   */
  public static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Record the execution time of a strategy.
   * @param strategyName Name of the strategy
   * @param executionTimeMs Execution time in milliseconds
   */
  public recordStrategyExecution(strategyName: string, executionTimeMs: number): void {
    if (!this.strategyExecutions.has(strategyName)) {
      this.strategyExecutions.set(strategyName, []);
    }
    const times = this.strategyExecutions.get(strategyName)!;
    times.push(executionTimeMs);

    // Keep only the last N samples
    if (times.length > this.maxSamples) {
      times.splice(0, times.length - this.maxSamples);
    }
  }

  /**
   * Record overall detection latency.
   * @param latencyMs Total detection latency in milliseconds
   */
  public recordDetectionLatency(latencyMs: number): void {
    this.detectionLatencies.push(latencyMs);
    if (this.detectionLatencies.length > this.maxSamples) {
      this.detectionLatencies.splice(0, this.detectionLatencies.length - this.maxSamples);
    }
  }

  /**
   * Get average execution time for a strategy.
   * @param strategyName Name of the strategy
   * @returns Average execution time in milliseconds, or 0 if no data
   */
  public getAverageStrategyExecutionTime(strategyName: string): number {
    const times = this.strategyExecutions.get(strategyName);
    if (!times || times.length === 0) {
      return 0;
    }
    const sum = times.reduce((acc, t) => acc + t, 0);
    return sum / times.length;
  }

  /**
   * Get average detection latency.
   * @returns Average detection latency in milliseconds, or 0 if no data
   */
  public getAverageDetectionLatency(): number {
    if (this.detectionLatencies.length === 0) {
      return 0;
    }
    const sum = this.detectionLatencies.reduce((acc, t) => acc + t, 0);
    return sum / this.detectionLatencies.length;
  }

  /**
   * Get performance statistics.
   * @returns Object containing performance metrics
   */
  public getStatistics(): {
    strategyAverages: Record<string, number>;
    averageDetectionLatency: number;
    totalDetections: number;
  } {
    const strategyAverages: Record<string, number> = {};
    for (const [strategyName, times] of this.strategyExecutions.entries()) {
      if (times.length > 0) {
        const sum = times.reduce((acc, t) => acc + t, 0);
        strategyAverages[strategyName] = sum / times.length;
      }
    }

    return {
      strategyAverages,
      averageDetectionLatency: this.getAverageDetectionLatency(),
      totalDetections: this.detectionLatencies.length,
    };
  }

  /**
   * Reset all performance metrics.
   * Useful for testing.
   */
  public reset(): void {
    this.strategyExecutions.clear();
    this.detectionLatencies = [];
  }
}