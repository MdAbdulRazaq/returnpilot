// lib/detection/normalize.test.ts

import { describe, it, expect } from "vitest";
import { normalizeOrderData } from "./normalize";
import {
  OrderNode,
  RefundNode,
  ReturnNode,
  RefundLineItemNode,
  ReturnLineItemNode,
} from "@/lib/shopify/data-loading";
import { ShopId } from "./types";

describe("normalizeOrderData", () => {
  const shopId: ShopId = "test-shop-123";
  const orderId = "gid://shopify/Order/order-1";
  const orderName = "#ORD-1";

  // Mock raw Shopify data
  const mockOrderBase: Partial<OrderNode> = {
    id: orderId,
    name: orderName,
    updatedAt: new Date("2024-01-10T10:00:00Z").toISOString(),
    refunds: [],
    returns: { nodes: [] },
  };

  // --- Test case: Full return with multiple items ---
  it("should normalize a full return with multiple items", () => {
    const mockRefundLineItem1: RefundLineItemNode = {
      quantity: 2,
      restockType: "RETURN",
      subtotalSet: { shopMoney: { amount: "20.00", currencyCode: "USD" } },
      lineItem: { id: "gid://shopify/LineItem/line-1", name: "Product A" },
    };
    const mockRefundLineItem2: RefundLineItemNode = {
      quantity: 1,
      restockType: "RETURN",
      subtotalSet: { shopMoney: { amount: "10.00", currencyCode: "USD" } },
      lineItem: { id: "gid://shopify/LineItem/line-2", name: "Product B" },
    };
    const mockRefund: RefundNode = {
      id: "gid://shopify/Refund/refund-1",
      createdAt: "2024-01-11T11:00:00Z",
      totalRefundedSet: { shopMoney: { amount: "30.00", currencyCode: "USD" } },
      refundLineItems: {
        nodes: [mockRefundLineItem1, mockRefundLineItem2],
      },
    };

    const mockOrder: OrderNode = {
      ...mockOrderBase,
      refunds: [mockRefund],
      returns: { nodes: [] },
    } as OrderNode;

    const normalized = normalizeOrderData(shopId, mockOrder);

    expect(normalized.shopId).toBe(shopId);
    expect(normalized.shopifyOrderId).toBe("order-1");
    expect(normalized.shopifyOrderName).toBe("#ORD-1");
    expect(normalized.refunds).toHaveLength(1);
    expect(normalized.refunds[0]!.shopifyRefundId).toBe("refund-1");
    expect(normalized.refunds[0]!.lineItems).toHaveLength(2);
    expect(normalized.refunds[0]!.lineItems[0]!.shopifyLineItemId).toBe("line-1");
    expect(normalized.refunds[0]!.lineItems[0]!.quantity).toBe(2);
    expect(normalized.refunds[0]!.lineItems[0]!.subtotal).toBe(20.00);
  });

  // --- Test case: Partial return with ignored items ---
  it("should normalize partial return and ignore exchanges/missing IDs", () => {
    const mockReturnLineItem1: ReturnLineItemNode = {
      __typename: "ReturnLineItem",
      id: "gid://shopify/ReturnLineItem/ret-item-1",
      quantity: 1,
      processedQuantity: 1,
      fulfillmentLineItem: {
        lineItem: { id: "gid://shopify/LineItem/line-1", name: "Product A" },
      },
    };
    const mockExchangeLineItem: ReturnLineItemNode = {
      __typename: "ExchangeLineItem",
      id: "gid://shopify/ExchangeLineItem/exch-item-1",
      quantity: 1,
      processedQuantity: 1,
      // fulfillmentLineItem and lineItem are not expected for ExchangeLineItem in this context
    };
    const mockReturnLineItem3MissingId: ReturnLineItemNode = {
      __typename: "ReturnLineItem",
      id: "gid://shopify/ReturnLineItem/ret-item-3-missing-id",
      quantity: 1,
      processedQuantity: 0,
      fulfillmentLineItem: {
        lineItem: null, // Missing original line item ID
      },
    };

    const mockReturn: ReturnNode = {
      id: "gid://shopify/Return/return-1",
      name: "RET-1",
      status: "RECEIVED",
      totalQuantity: 3, // Includes the exchange and missing ID item
      createdAt: "2024-01-12T11:00:00Z",
      returnLineItems: {
        nodes: [
          mockReturnLineItem1,
          mockExchangeLineItem,
          mockReturnLineItem3MissingId,
        ],
      },
    };

    const mockOrder: OrderNode = {
      ...mockOrderBase,
      refunds: [],
      returns: { nodes: [mockReturn] },
    } as OrderNode;

    const normalized = normalizeOrderData(shopId, mockOrder);

    expect(normalized.returns).toHaveLength(1);
    expect(normalized.returns[0]!.shopifyReturnId).toBe("return-1");
    expect(normalized.returns[0]!.status).toBe("RECEIVED");
    // Only the valid ReturnLineItem should be included
    expect(normalized.returns[0]!.lineItems).toHaveLength(1);
    expect(normalized.returns[0]!.lineItems[0]!.shopifyLineItemId).toBe("line-1");
    expect(normalized.returns[0]!.lineItems[0]!.quantity).toBe(1);
    expect(normalized.returns[0]!.lineItems[0]!.processedQuantity).toBe(1);
  });

  // --- Test case: Order with no refunds or returns ---
  it("should handle orders with no refunds or returns gracefully", () => {
    const mockOrder: OrderNode = {
      ...mockOrderBase,
      refunds: [],
      returns: { nodes: [] },
    } as OrderNode;

    const normalized = normalizeOrderData(shopId, mockOrder);

    expect(normalized.refunds).toHaveLength(0);
    expect(normalized.returns).toHaveLength(0);
  });
});
