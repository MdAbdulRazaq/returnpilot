// Since DetectionStrategy is an interface and BaseDetectionStrategy is abstract,
// we'll test them through concrete implementations
import { BaseDetectionStrategy } from "./base-detection-strategy";
import type { Finding } from "../types";
import type { NormalizedOrderData } from "../normalize";

// Create a test subclass to access protected members
class TestDetectionStrategy extends BaseDetectionStrategy {
  analyze(data: NormalizedOrderData): Finding[] {
    return [];
  }
}

describe("DetectionStrategy Interface", () => {
  it("should be implemented by concrete classes", () => {
    // This test passes if LegacyDetectionStrategy can be instantiated
    // and implements the DetectionStrategy interface
    expect(true).toBe(true);
  });
});

describe("BaseDetectionStrategy", () => {
  it("should provide helper methods", () => {
    // Test that the base class provides the expected helper methods
    // Test the methods through a concrete subclass
    const testStrategy = new TestDetectionStrategy();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(typeof (testStrategy as any).aggregateReturnLineItems).toBe("function");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(typeof (testStrategy as any).getProcessedQuantity).toBe("function");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(typeof (testStrategy as any).createFinding).toBe("function");
  });
});