// lib/detection/engine.ts
import { Finding, DetectionConfig } from "./types";
import { NormalizedOrderData } from "./normalize";
import { DetectionStrategyFactory } from "./detection-strategy-factory";

/**
 * Main detection engine.
 * Now fully uses the new modular architecture while maintaining
 * backward compatibility through the LegacyDetectionStrategy.
 *
 * @param data The normalized order data to analyze
 * @param config Detection configuration
 * @returns Promise of findings detected by the engine
 */
export async function runDetection(
  data: NormalizedOrderData,
  config: DetectionConfig
): Promise<Finding[]> {
  // For backward compatibility, we disable enhanced strategies by default
  // In a real implementation, these would be configured based on merchant tier and settings
  const backwardCompatConfig: DetectionConfig = {
    ...config,
    temporalPattern: { enabled: false },
    fuzzyMatching: { enabled: false },
    adaptiveLearning: {
      enabled: false,
      learningRate: 0.1,
      seasonalWindow: 30,
      minSamples: 5,
      outlierStdDevMultiplier: 2.5,
      seasonalDetectionEnabled: true,
      thresholdAdjustmentEnabled: true,
      performanceWindow: 60
    }
  };

  // For backward compatibility, we use a default merchant tier
  // In a real implementation, this would come from the shop data or context
  const merchantTier = "pro"; // Default to pro tier for backward compatibility
  const shopId = "unknown"; // Default shop ID for backward compatibility
  const engine = DetectionStrategyFactory.createEngine(merchantTier, backwardCompatConfig, shopId);

  // Run detection using the new modular architecture
  return engine.detect(data);
}