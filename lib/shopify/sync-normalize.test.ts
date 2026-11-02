import { describe, it, expect } from "vitest";

import { normalizeOrder } from "@/lib/shopify/sync";
import type { OrderNode } from "@/lib/shopify/queries";

// A representative order: one refund (two line items, one unattributed) and one
// return whose line items carry the processed/refunded quantities M5 needs.
const ORDER: OrderNode = {
  id: "gid://shopify/Order/1001",
  name: "#1001",
  updatedAt: "2026-07-05T12:00:00Z",
  refunds: [
    {
      id: "gid://shopify/Refund/5001",
      createdAt: "2026-07-05T11:00:00Z",
      totalRefundedSet: {
        shopMoney: { amount: "42.50", currencyCode: "USD" },
      },
      refundLineItems: {
        nodes: [
          {
            quantity: 2,
            restockType: "NO_RESTOCK",
            subtotalSet: { shopMoney: { amount: "30.00", currencyCode: "USD" } },
            lineItem: { id: "gid://shopify/LineItem/9001", name: "Blue Shirt" },
          },
          {
            quantity: 1,
            restockType: "RETURN",
            subtotalSet: { shopMoney: { amount: "12.50", currencyCode: "USD" } },
            lineItem: null, // unattributed line item
          },
        ],
      },
    },
  ],
  returns: {
    nodes: [
      {
        id: "gid://shopify/Return/7001",
        name: "#1001-R1",
        status: "OPEN",
        totalQuantity: 1,
        createdAt: "2026-07-05T11:00:00Z",
        returnLineItems: {
          nodes: [
            {
              __typename: "ReturnLineItem",
              id: "gid://shopify/ReturnLineItem/8001",
              quantity: 1,
              processedQuantity: 0,
              refundedQuantity: 1,
              fulfillmentLineItem: {
                lineItem: { id: "gid://shopify/LineItem/9001", name: "Blue Shirt" },
              },
            },
            // An ExchangeLineItem node must be ignored by normalization.
            { __typename: "ExchangeLineItem" },
          ],
        },
      },
    ],
  },
};

describe("normalizeOrder", () => {
  it("flattens order identity", () => {
    const n = normalizeOrder(ORDER);
    expect(n.shopifyOrderId).toBe("gid://shopify/Order/1001");
    expect(n.orderName).toBe("#1001");
    expect(n.updatedAt).toBe("2026-07-05T12:00:00Z");
  });

  it("maps refund amount, currency, and line items", () => {
    const refund = normalizeOrder(ORDER).refunds[0]!;
    expect(refund.shopifyRefundId).toBe("gid://shopify/Refund/5001");
    expect(refund.amount).toBe("42.50");
    expect(refund.currency).toBe("USD");
    expect(refund.lineItems).toHaveLength(2);
    expect(refund.lineItems[0]!).toMatchObject({
      shopifyLineItemId: "gid://shopify/LineItem/9001",
      quantity: 2,
      subtotal: "30.00",
      restockType: "NO_RESTOCK",
    });
  });

  it("tolerates an unattributed refund line item", () => {
    const refund = normalizeOrder(ORDER).refunds[0]!;
    expect(refund.lineItems[1]!.shopifyLineItemId).toBeNull();
    expect(refund.lineItems[1]!.name).toBeNull();
    expect(refund.lineItems[1]!.quantity).toBe(1);
  });

  it("maps return status and the quantities the engine keys on", () => {
    const ret = normalizeOrder(ORDER).returns[0]!;
    expect(ret.shopifyReturnId).toBe("gid://shopify/Return/7001");
    expect(ret.status).toBe("OPEN");
    expect(ret.totalQuantity).toBe(1);
    // The ExchangeLineItem node is dropped; only the ReturnLineItem remains.
    expect(ret.lineItems).toHaveLength(1);
    expect(ret.lineItems[0]).toMatchObject({
      // join key shared with the refund line item above
      shopifyLineItemId: "gid://shopify/LineItem/9001",
      quantity: 1,
      processedQuantity: 0, // 0 processed while refunded → exactly the M5 leak signal
      refundedQuantity: 1,
    });
  });
});
