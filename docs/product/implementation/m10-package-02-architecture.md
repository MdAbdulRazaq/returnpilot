// docs/product/implementation/m10-package-02-architecture.md
# Milestone 10 Package 2: Adaptive Learning System - Architecture Document

## Overview

This document describes the architecture of the Adaptive Learning System implemented in Milestone 10 Package 2. The system enhances the Detection Engine Foundation from Package 1 by adding store-specific behavioral modeling and adaptive threshold adjustment capabilities while maintaining backward compatibility through a modular wrapper strategy approach.

## Architecture Goals

1. **Enhance Detection Accuracy**: Improve detection accuracy over time through store-specific baseline modeling
2. **Maintain Backward Compatibility**: Preserve existing detection behavior when adaptive learning is disabled
3. **Ensure Privacy**: Store only aggregated, anonymized statistics - no raw order data or PII
4. **Provide Deterministic Behavior**: All adaptive adjustments are rule-based and explainable
5. **Enable Configuration**: Allow merchants to tune adaptive learning parameters per their needs
6. **Minimize Performance Impact**: Use efficient incremental algorithms with O(1) update complexity

## Core Components

### 1. AdaptiveLearningConfig

Defines the configuration interface for adaptive learning parameters:
- `enabled`: Master switch for the adaptive learning system
- `learningRate`: Controls adaptation speed (0.0 to 1.0)
- `seasonalWindow`: Days to consider for seasonal pattern detection
- `minSamples`: Minimum samples required before adaptation begins
- `outlierStdDevMultiplier`: Threshold for anomaly detection
- `seasonalDetectionEnabled`: Toggle for seasonal adjustments
- `thresholdAdjustmentEnabled`: Toggle for threshold adaptation
- `performanceWindow`: Days of historical performance to consider

### 2. StoreBehaviorModel

Stateless utility class implementing incremental statistical algorithms:
- **Welford's Online Algorithm**: Numerically stable computation of mean and variance
- **Outlier Detection**: Identifies anomalies using standard deviation multiples
- **Seasonal Pattern Detection**: Tracks day-of-week patterns for temporal adjustments
- **Baseline Updates**: Applies learning rate to adjust to new observations
- **Bounds Checking**: Determines if values are within expected statistical bounds

### 3. AdaptiveLearningStrategy

Wrapper strategy that adapts existing DetectionStrategy instances:
- **Strategy Wrapping**: Enhances any DetectionStrategy without modifying its core logic
- **Baseline Tracking**: Maintains store-specific statistics for refund amounts, counts, and line items
- **Adaptive Adjustment**: Modifies behavior based on learned patterns when enabled
- **Fallback Behavior**: Delegates completely to wrapped strategy when disabled or insufficient data
- **Seasonal Adjustment**: Applies temporal patterns to adjust sensitivity
- **Anomaly Handling**: Reduces adaptation strength for anomalous observations

### 4. AdaptiveLearningPersistence

Privacy-preserving storage layer for model parameters:
- **Aggregated Storage**: Stores only mean, M2, and count statistics (no raw data)
- **Seasonal Patterns**: Stores day-of-week adjustment factors
- **UPSERT Operations**: Efficiently updates or inserts shop-specific parameters
- **Data Minimization**: Contains no PII or order-level details
- **Existing Patterns**: Follows the same approach as finding persistence

### 5. DetectionStrategyFactory Extension

Enhanced factory that creates adaptive learning strategies:
- **Tier-Based Defaults**: Enables adaptive learning for Pro and Enterprise tiers by default
- **Strategy Wrapping**: Wraps enabled strategies (temporal, fuzzy, legacy) with adaptive learning
- **Shop Identification**: Uses shopId for store-specific baseline maintenance
- **Backward Compatibility**: Preserves existing behavior when adaptive learning disabled

## Data Flow

### Normal Operation (Adaptive Learning Enabled)
```
1. Order data arrives via webhook
2. DetectionStrategyFactory creates engine with adaptive learning strategies
   - Each strategy (legacy, temporal, fuzzy) wrapped in AdaptiveLearningStrategy
3. DetectionEngine.detect() called with normalized order data
4. For each AdaptiveLearningStrategy:
   a. Delegate to wrapped strategy to get initial findings
   b. Update internal baselines with order metrics (refund amount, count, etc.)
   c. If sufficient data and adjustments enabled:
      - Calculate adaptation factors based on deviation from baseline
      - Apply seasonal adjustments if enabled
      - Return findings (in enhanced version, would adjust moneyAtRisk or confidence)
   d. If insufficient data or disabled:
      - Return findings unchanged from wrapped strategy
5. Store updated baseline parameters via AdaptiveLearningPersistence (asynchronous)
6. Return aggregated findings to caller
```

### Privacy Preservation
All stored data is strictly aggregated and anonymized:
- **What We Store**: Mean, M2 (sum of squared differences), and count for:
  - Refund totals (USD)
  - Refund counts (number of refunds)
  - Line item counts (total items)
  - Seasonal patterns (day-of-week adjustment factors)
  - Global averages for normalization
- **What We Don't Store**: 
  - Raw order data
  - Shopify IDs (beyond shopId for partitioning)
  - Line item details
  - Customer information
  - Product details
  - Any personally identifiable information

## Extension Points

### 1. Strategy Enhancement
The AdaptiveLearningStrategy can wrap any DetectionStrategy to add adaptive behavior:
```javascript
// Existing strategy
const temporalStrategy = new TemporalPatternStrategy();

// Adaptive enhancement
const adaptiveTemporal = new AdaptiveLearningStrategy(
  temporalStrategy,
  adaptiveLearningConfig,
  shopId
);
```

### 2. Statistical Model Enhancement
StoreBehaviorModel can be extended with additional metrics:
- Additional baseline types (e.g., average item value, time between orders)
- More sophisticated seasonal models (monthly, holiday patterns)
- Correlation analysis between metrics
- Machine learning readiness (though ML is out of scope for this milestone)

### 3. Configuration Expansion
AdaptiveLearningConfig can be extended with new parameters:
- Different learning rates for different metrics
- Advanced outlier detection mechanisms
- Custom seasonal pattern types
- Performance optimization toggles

## Dependency Direction

```
DetectionStrategyFactory 
    → AdaptiveLearningStrategy (when enabled)
    → DetectionStrategy (wraps existing strategies: legacy, temporal, fuzzy)
AdaptiveLearningStrategy 
    → StoreBehaviorModel (for baseline calculations)
    → AdaptiveLearningPersistence (for storage/retrieval)
StoreBehaviorModel 
    → Mathematical operations only (no external dependencies)
AdaptiveLearningPersistence 
    → Supabase client (existing finding persistence pattern)
DetectionConfig 
    → DetectionStrategyFactory (provides configuration)
All modules 
    → lib/detection/types.ts (shared types and interfaces)
```

## Security Considerations

### Data Privacy
- **Aggregation Only**: Never stores raw order data or line-item details
- **Anonymized Storage**: Parameters are shop-scoped but contain no PII
- **Existing Patterns**: Uses same security mechanisms as finding persistence
- **Data Minimization**: Stores minimum necessary for adaptive behavior

### Access Control
- **Shop-Scoped**: All data partitioned by shop_id
- **Server-Side**: All persistence operations occur in server-only contexts
- **Existing Infrastructure**: Leverages Supabase row-level security (RLS)

## Performance Characteristics

### Time Complexity
- **Baseline Update**: O(1) per metric using incremental algorithms
- **Seasonal Adjustment**: O(1) lookup with periodic O(n) pattern calculation
- **Storage Operations**: O(1) UPSERT operations
- **Overall Detection**: Minimal overhead added to existing strategy execution

### Space Complexity
- **Per Shop**: Fixed number of numeric values (approximately 20 parameters)
- **Growth**: Linear with number of shops, not with order volume
- **Cleanup**: Automatic through UPSERT - old data overwritten

## Configuration Defaults

### By Merchant Tier
| Tier | Adaptive Learning | Learning Rate | Min Samples | Seasonal Detection |
|------|------------------|---------------|-------------|-------------------|
| Free | Disabled         | N/A           | N/A         | Disabled          |
| Starter | Disabled       | N/A           | N/A         | Disabled          |
| Growth | Enabled        | 0.05          | 5           | Enabled           |
| Pro | Enabled          | 0.1           | 3           | Enabled           |
| Enterprise | Enabled    | 0.15          | 3           | Enabled           |

### Rationale
- **Free/Starter**: Focus on core protection without complexity
- **Growth**: Introduce adaptive learning with conservative parameters
- **Pro/Enterprise**: Full adaptive capabilities with more aggressive learning

## Error Handling

### Graceful Degradation
- **Configuration Errors**: Fall back to disabled state with logging
- **Insufficient Data**: Continue with wrapped strategy behavior
- **Persistence Failures**: Log errors but don't disrupt detection flow
- **Mathematical Errors**: Reset to safe defaults and continue Operation

### Logging
- **Structured Logging**: All operations logged with shopId and context
- **Error Tracking**: Persistence and mathematical errors tracked separately
- **Performance Monitoring**: Baseline update times logged for anomaly detection

## Testing Approach

### Unit Testing
- **AdaptiveLearningConfig**: Validation of configuration values
- **StoreBehaviorModel**: Mathematical accuracy of incremental algorithms
- **AdaptiveLearningStrategy**: Strategy wrapping and delegation behavior
- **AdaptiveLearningPersistence**: Storage and retrieval of aggregated data

### Integration Testing
- **End-to-End Flow**: Verify adaptive behavior influences detection outcomes
- **Backward Compatibility**: Confirm identical behavior when disabled
- **Privacy Verification**: Ensure no raw data persists
- **Performance Benchmarking**: Validate <2% latency increase

### Regression Testing
- **Existing Test Suite**: Confirm all Package 1 tests continue to pass
- **Behavioral Equivalence**: Validate outputs match baseline when disabled
- **Edge Case Testing**: Boundary conditions for learning rates and sample counts

## Compliance with Scope Guardrails

✓ **No Machine Learning**: Uses statistical modeling (mean, stdDev), not ML algorithms
✓ **No AI Model Training**: No training pipelines, feature stores, or model serving
✓ **No Predictive Analytics**: Focuses on historical adaptation, not future predictions
✓ **No Merchant Dashboard**: No new UI components or merchant-facing dashboards
✓ **No Analytics Platform**: No new analytics infrastructure or reporting engine
✓ **No Multi-Platform Support**: Enhancements remain Shopify-specific
✓ **No Product Owner Changes**: All tasks trace back to approved decisions
✓ **No Architecture Redesign**: Extends existing modular strategy architecture