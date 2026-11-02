// lib/detection/engine.test.ts

import { describe, it, expect, vi } from "vitest";
import { runDetection } from "./engine";
import { NormalizedOrderData } from "./normalize";
import { AlertReason, ShopId, DetectionConfig } from "./types";

describe("runDetection", () => {
  const shopId: ShopId = "test-shop-123";
  const orderId = "order-1";

  // Mock configuration
  const defaultConfig: DetectionConfig = {
    gracePeriodDays: 7,
  };

  // Helper to create a mock NormalizedOrderData object
  const createMockOrderData = (
    normalizedOrder: Partial<NormalizedOrderData>,
  ): NormalizedOrderData => {
    const defaultOrder: NormalizedOrderData = {
      shopId: shopId,
      shopifyOrderId: orderId,
      shopifyOrderName: "#ORD-1",
      updatedAt: new Date("2024-01-10T10:00:00Z"),
      refunds: [],
      returns: [],
    };
    return { ...defaultOrder, ...normalizedOrder };
  };

  // --- Test case: Full return, no discrepancies ---
  it("should return no findings for a full return matching refunded quantity", async () => {
    const orderData: NormalizedOrderData = createMockOrderData({
      refunds: [
        {
          shopifyRefundId: "refund-1",
          createdAt: new Date("2024-01-11T11:00:00Z"),
          totalRefundedAmount: 30.00,
          currency: "USD",
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 2, subtotal: 20.00 },
            { shopifyLineItemId: "line-2", quantity: 1, subtotal: 10.00 },
          ],
        },
      ],
      returns: [
        {
          shopifyReturnId: "return-1",
          createdAt: new Date("2024-01-12T11:00:00Z"),
          status: "RECEIVED",
          totalQuantity: 3,
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 2, processedQuantity: 2, refundedQuantity: 0 },
            { shopifyLineItemId: "line-2", quantity: 1, processedQuantity: 1, refundedQuantity: 0 },
          ],
        },
      ],
    });

    const findings = await runDetection(orderData, defaultConfig);
    expect(findings).toEqual([]);
  });

  // --- Test case: NO_RETURN - order has no returns at all, refund past grace period ---
  it("should detect NO_RETURN when order has no returns and refund is past grace period", async () => {
    const orderData: NormalizedOrderData = createMockOrderData({
      refunds: [
        {
          shopifyRefundId: "refund-1",
          createdAt: new Date("2024-01-01T11:00:00Z"), // 19 days ago (past 7-day grace)
          totalRefundedAmount: 30.00,
          currency: "USD",
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 2, subtotal: 20.00 },
            { shopifyLineItemId: "line-2", quantity: 1, subtotal: 10.00 },
          ],
        },
      ],
      returns: [], // No returns at all
    });

    // Mock current date to be Jan 20 (grace period passed)
    const mockNow = new Date("2024-01-20T12:00:00Z");
    vi.useFakeTimers().setSystemTime(mockNow);

    const findings = await runDetection(orderData, defaultConfig);
    expect(findings).toHaveLength(2); // Two line items flagged
    expect(findings[0]!.reason).toBe(AlertReason.NO_RETURN);
    expect(findings[0]!.shopifyLineItemId).toBe("line-1");
    expect(findings[0]!.moneyAtRisk).toBe(20.00);
    expect(findings[1]!.reason).toBe(AlertReason.NO_RETURN);
    expect(findings[1]!.shopifyLineItemId).toBe("line-2");
    expect(findings[1]!.moneyAtRisk).toBe(10.00);

    vi.useRealTimers();
  });

  // --- Test case: NO_RETURN not triggered - refund within grace period ---
  it("should NOT detect NO_RETURN when refund is within grace period even if no returns", async () => {
    const orderData: NormalizedOrderData = createMockOrderData({
      refunds: [
        {
          shopifyRefundId: "refund-1",
          createdAt: new Date("2024-01-15T11:00:00Z"), // 3 days ago (within 7-day grace)
          totalRefundedAmount: 30.00,
          currency: "USD",
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 2, subtotal: 20.00 },
          ],
        },
      ],
      returns: [], // No returns at all
    });

    // Mock current date to be Jan 18 (within grace period)
    const mockNow = new Date("2024-01-18T12:00:00Z");
    vi.useFakeTimers().setSystemTime(mockNow);

    const findings = await runDetection(orderData, defaultConfig);
    expect(findings).toEqual([]);

    vi.useRealTimers();
  });

  // --- Test case: RETURN_NOT_RECEIVED ---
  it("should detect RETURN_NOT_RECEIVED when return exists but processedQuantity is 0", async () => {
    const orderData: NormalizedOrderData = createMockOrderData({
      refunds: [
        {
          shopifyRefundId: "refund-1",
          createdAt: new Date("2024-01-11T11:00:00Z"),
          totalRefundedAmount: 30.00,
          currency: "USD",
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 2, subtotal: 20.00 },
            { shopifyLineItemId: "line-2", quantity: 1, subtotal: 10.00 },
          ],
        },
      ],
      returns: [
        {
          shopifyReturnId: "return-1",
          createdAt: new Date("2024-01-12T11:00:00Z"),
          status: "OPEN",
          totalQuantity: 1,
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 2, processedQuantity: 0, refundedQuantity: 2 }, // Not received but fully refunded
            { shopifyLineItemId: "line-2", quantity: 1, processedQuantity: 1, refundedQuantity: 0 }, // Received and not refunded
          ],
        },
      ],
    });

    const findings = await runDetection(orderData, defaultConfig);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.reason).toBe(AlertReason.RETURN_NOT_RECEIVED);
    expect(findings[0]!.shopifyLineItemId).toBe("line-1");
    expect(findings[0]!.moneyAtRisk).toBe(20.00);
  });

  // --- Test case: QUANTITY_SHORTFALL ---
  it("should detect QUANTITY_SHORTFALL when refunded quantity exceeds processed quantity", async () => {
    const orderData: NormalizedOrderData = createMockOrderData({
      refunds: [
        {
          shopifyRefundId: "refund-1",
          createdAt: new Date("2024-01-11T11:00:00Z"),
          totalRefundedAmount: 30.00,
          currency: "USD",
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 2, subtotal: 20.00 },
          ],
        },
      ],
      returns: [
        {
          shopifyReturnId: "return-1",
          status: "RECEIVED",
          totalQuantity: 1,
          createdAt: new Date("2024-01-12T11:00:00Z"),
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 1, processedQuantity: 1, refundedQuantity: 1 },
          ],
        },
      ],
    });

    const findings = await runDetection(orderData, defaultConfig);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.reason).toBe(AlertReason.QUANTITY_SHORTFALL);
    expect(findings[0]!.shopifyLineItemId).toBe("line-1");
    // Proportional: 1 of 2 units unconfirmed → 50% of $20 = $10
    expect(findings[0]!.moneyAtRisk).toBe(10.00);
  });

  // --- Test case: QUANTITY_SHORTFALL proportional moneyAtRisk ---
  it("should calculate proportional moneyAtRisk for QUANTITY_SHORTFALL", async () => {
    // Refunded 5 units @ $100 total, received 3 → 2 unconfirmed → 40% = $40 at risk
    const orderData: NormalizedOrderData = createMockOrderData({
      refunds: [
        {
          shopifyRefundId: "refund-1",
          createdAt: new Date("2024-01-11T11:00:00Z"),
          totalRefundedAmount: 100.00,
          currency: "USD",
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 5, subtotal: 100.00 },
          ],
        },
      ],
      returns: [
        {
          shopifyReturnId: "return-1",
          status: "RECEIVED",
          totalQuantity: 3,
          createdAt: new Date("2024-01-12T11:00:00Z"),
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 3, processedQuantity: 3, refundedQuantity: 3 },
          ],
        },
      ],
    });

    const findings = await runDetection(orderData, defaultConfig);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.reason).toBe(AlertReason.QUANTITY_SHORTFALL);
    expect(findings[0]!.shopifyLineItemId).toBe("line-1");
    // 2 of 5 units unconfirmed = 40% of $100 = $40
    expect(findings[0]!.moneyAtRisk).toBe(40.00);
  });

  // --- Test case: QUANTITY_SHORTFALL with single unit short ---
  it("should calculate proportional moneyAtRisk when 1 unit short", async () => {
    // Refunded 10 units @ $500 total, received 9 → 1 unconfirmed → 10% = $50 at risk
    const orderData: NormalizedOrderData = createMockOrderData({
      refunds: [
        {
          shopifyRefundId: "refund-1",
          createdAt: new Date("2024-01-11T11:00:00Z"),
          totalRefundedAmount: 500.00,
          currency: "USD",
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 10, subtotal: 500.00 },
          ],
        },
      ],
      returns: [
        {
          shopifyReturnId: "return-1",
          status: "RECEIVED",
          totalQuantity: 9,
          createdAt: new Date("2024-01-12T11:00:00Z"),
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 9, processedQuantity: 9, refundedQuantity: 9 },
          ],
        },
      ],
    });

    const findings = await runDetection(orderData, defaultConfig);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.reason).toBe(AlertReason.QUANTITY_SHORTFALL);
    expect(findings[0]!.shopifyLineItemId).toBe("line-1");
    expect(findings[0]!.moneyAtRisk).toBe(50.00);
  });

  // --- Test case: Multiple returns aggregate processed quantities ---
  it("should aggregate processed quantities from multiple returns for the same line item", async () => {
    const orderData: NormalizedOrderData = createMockOrderData({
      refunds: [
        {
          shopifyRefundId: "refund-1",
          createdAt: new Date("2024-01-11T11:00:00Z"),
          totalRefundedAmount: 40.00,
          currency: "USD",
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 2, subtotal: 20.00 },
          ],
        },
      ],
      returns: [
        {
          shopifyReturnId: "return-1",
          status: "RECEIVED",
          totalQuantity: 1,
          createdAt: new Date("2024-01-12T11:00:00Z"),
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 1, processedQuantity: 1, refundedQuantity: 1 },
          ],
        },
        {
          shopifyReturnId: "return-2",
          status: "RECEIVED",
          totalQuantity: 1,
          createdAt: new Date("2024-01-12T11:00:00Z"),
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 1, processedQuantity: 1, refundedQuantity: 1 },
          ],
        },
      ],
    });

    const findings = await runDetection(orderData, defaultConfig);
    expect(findings).toEqual([]); // Should not find any issues as total processed matches refunded
  });

  // --- Test case: NO_RETURN only applies when NO returns exist for the ORDER ---
  it("should NOT detect NO_RETURN when order has returns (even if not for specific line item)", async () => {
    const orderData: NormalizedOrderData = createMockOrderData({
      refunds: [
        {
          shopifyRefundId: "refund-1",
          createdAt: new Date("2024-01-01T11:00:00Z"), // Past grace period
          totalRefundedAmount: 30.00,
          currency: "USD",
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 2, subtotal: 20.00 },
            { shopifyLineItemId: "line-2", quantity: 1, subtotal: 10.00 },
          ],
        },
      ],
      returns: [
        {
          shopifyReturnId: "return-1",
          status: "OPEN",
          totalQuantity: 1,
          createdAt: new Date("2024-01-01T11:00:00Z"),
          // Return exists but only for line-2, not line-1
          lineItems: [
            { shopifyLineItemId: "line-2", quantity: 1, processedQuantity: 0, refundedQuantity: 0 },
          ],
        },
      ],
    });

    // Mock current date to be Jan 20 (grace period passed)
    const mockNow = new Date("2024-01-20T12:00:00Z");
    vi.useFakeTimers().setSystemTime(mockNow);

    const findings = await runDetection(orderData, defaultConfig);
    // line-1: has no matching return line item -> RETURN_NOT_RECEIVED (not NO_RETURN)
    // line-2: has return but processedQuantity=0 -> RETURN_NOT_RECEIVED
    expect(findings).toHaveLength(2);
    expect(findings[0]!.reason).toBe(AlertReason.RETURN_NOT_RECEIVED);
    expect(findings[1]!.reason).toBe(AlertReason.RETURN_NOT_RECEIVED);

    vi.useRealTimers();
  });

  // --- Test case: refund line item with null shopifyLineItemId is skipped ---
  it("should skip refund line items with missing shopifyLineItemId", async () => {
    const orderData: NormalizedOrderData = createMockOrderData({
      refunds: [
        {
          shopifyRefundId: "refund-1",
          createdAt: new Date("2024-01-01T11:00:00Z"),
          totalRefundedAmount: 20.00,
          currency: "USD",
          lineItems: [
            { shopifyLineItemId: null, quantity: 1, subtotal: 20.00 }, // Missing line item ID
          ],
        },
      ],
      returns: [], // No returns
    });

    const mockNow = new Date("2024-01-20T12:00:00Z");
    vi.useFakeTimers().setSystemTime(mockNow);

    const findings = await runDetection(orderData, defaultConfig);
    expect(findings).toEqual([]); // Should be skipped, not flagged

    vi.useRealTimers();
  });

  // --- Test case: zero refunded quantity is ignored ---
  it("should ignore line items with zero refunded quantity", async () => {
    const orderData: NormalizedOrderData = createMockOrderData({
      refunds: [
        {
          shopifyRefundId: "refund-1",
          createdAt: new Date("2024-01-11T11:00:00Z"),
          totalRefundedAmount: 0.00,
          currency: "USD",
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 0, subtotal: 0.00 },
          ],
        },
      ],
      returns: [
        {
          shopifyReturnId: "return-1",
          status: "RECEIVED",
          totalQuantity: 1,
          createdAt: new Date("2024-01-12T11:00:00Z"),
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 1, processedQuantity: 1, refundedQuantity: 1 },
          ],
        },
      ],
    });

    const findings = await runDetection(orderData, defaultConfig);
    expect(findings).toEqual([]); // No findings for zero refunded quantity
  });

  // --- Test case: NO_RETURN and other reasons don't overlap ---
  it("should only flag NO_RETURN for orders with no returns; not also RETURN_NOT_RECEIVED", async () => {
    const orderData: NormalizedOrderData = createMockOrderData({
      refunds: [
        {
          shopifyRefundId: "refund-1",
          createdAt: new Date("2024-01-01T11:00:00Z"),
          totalRefundedAmount: 30.00,
          currency: "USD",
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 2, subtotal: 20.00 },
          ],
        },
      ],
      returns: [], // No returns at all -> NO_RETURN, not RETURN_NOT_RECEIVED
    });

    const mockNow = new Date("2024-01-20T12:00:00Z");
    vi.useFakeTimers().setSystemTime(mockNow);

    const findings = await runDetection(orderData, defaultConfig);
    expect(findings).toHaveLength(1);
    expect(findings[0]!.reason).toBe(AlertReason.NO_RETURN);
    // Should NOT also have RETURN_NOT_RECEIVED for the same item

    vi.useRealTimers();
  });

  // --- Test case: Multiple refunds for same line item ---
  it("should handle multiple refunds for the same line item correctly", async () => {
    const orderData: NormalizedOrderData = createMockOrderData({
      refunds: [
        {
          shopifyRefundId: "refund-1",
          createdAt: new Date("2024-01-11T11:00:00Z"),
          totalRefundedAmount: 20.00,
          currency: "USD",
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 1, subtotal: 20.00 },
          ],
        },
        {
          shopifyRefundId: "refund-2",
          createdAt: new Date("2024-01-12T11:00:00Z"),
          totalRefundedAmount: 10.00,
          currency: "USD",
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 1, subtotal: 10.00 },
          ],
        },
      ],
      returns: [
        {
          shopifyReturnId: "return-1",
          status: "RECEIVED",
          totalQuantity: 2,
          createdAt: new Date("2024-01-12T11:00:00Z"),
          lineItems: [
            { shopifyLineItemId: "line-1", quantity: 2, processedQuantity: 2, refundedQuantity: 2 },
          ],
        },
      ],
    });

    const findings = await runDetection(orderData, defaultConfig);
    expect(findings).toEqual([]); // Total refunded quantity matches total processed
  });
});