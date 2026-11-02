// lib/detection/normalize.ts

import {
  OrderNode,
  RefundNode,
  ReturnNode,
  RefundLineItemNode,
  ReturnLineItemNode,
} from "@/lib/shopify/data-loading";
import { ShopifyId, ShopId } from "./types";

/**
 * Represents a normalized refund line item.
 * We only include fields relevant for detection.
 */
export interface NormalizedRefundLineItem {
  shopifyLineItemId: ShopifyId | null;
  quantity: number;
  subtotal: number; // In USD, from shopMoney.amount
}

/**
 * Represents a normalized refund.
 * We only include fields relevant for detection.
 */
export interface NormalizedRefund {
  shopifyRefundId: ShopifyId;
  createdAt: Date;
  totalRefundedAmount: number; // In USD, from shopMoney.amount
  currency: string;
  lineItems: NormalizedRefundLineItem[];
}

/**
 * Represents a normalized return line item.
 * We only include fields relevant for detection.
 */
export interface NormalizedReturnLineItem {
  shopifyLineItemId: ShopifyId;
  quantity: number;
  processedQuantity: number; // Default to 0 if missing
  refundedQuantity: number; // Default to 0 if missing
}

/**
 * Represents a normalized return.
 * We only include fields relevant for detection.
 */
export interface NormalizedReturn {
  shopifyReturnId: ShopifyId;
  status: string;
  totalQuantity: number;
  createdAt: Date;
  lineItems: NormalizedReturnLineItem[];
}

/**
 * Represents the normalized data for a single Shopify order.
 */
export interface NormalizedOrderData {
  shopId: ShopId;
  shopifyOrderId: ShopifyId;
  shopifyOrderName: string;
  updatedAt: Date;
  refunds: NormalizedRefund[];
  returns: NormalizedReturn[];
}

/**
 * Helper to parse Shopify GID into just the ID part.
 * Example: "gid://shopify/Order/12345" -> "12345"
 */
function parseShopifyGid(gid: string): string {
  const parts = gid.split("/");
  const last = parts[parts.length - 1];
  if (!last) throw new Error(`Invalid Shopify GID: ${gid}`);
  return last;
}

/**
 * Normalizes a single raw Shopify refund line item.
 * Ignores entries without a valid Shopify line item ID as per "Never guess line-item matches".
 */
function normalizeRefundLineItem(
  lineItem: RefundLineItemNode,
): NormalizedRefundLineItem {
  const lineItemId = lineItem.lineItem?.id ?? null;
  return {
    shopifyLineItemId: lineItemId ? parseShopifyGid(lineItemId) : null,
    quantity: lineItem.quantity,
    subtotal: parseFloat(lineItem.subtotalSet.shopMoney.amount),
  };
}

/**
 * Normalizes a single raw Shopify refund.
 */
function normalizeRefund(refund: RefundNode): NormalizedRefund {
  const normalizedLineItems = refund.refundLineItems.nodes
    .map(normalizeRefundLineItem)
    .filter(Boolean) as NormalizedRefundLineItem[];

  return {
    shopifyRefundId: parseShopifyGid(refund.id),
    createdAt: new Date(refund.createdAt),
    totalRefundedAmount: parseFloat(refund.totalRefundedSet.shopMoney.amount),
    currency: refund.totalRefundedSet.shopMoney.currencyCode,
    lineItems: normalizedLineItems,
  };
}

/**
 * Normalizes a single raw Shopify return line item.
 * Ignores exchange line items as per "Ignore exchanges".
 * Defaults `processedQuantity` to 0 if missing.
 */
function normalizeReturnLineItem(
  lineItem: ReturnLineItemNode,
): NormalizedReturnLineItem | null {
  if (lineItem.__typename === "ExchangeLineItem") {
    return null; // Ignore exchanges
  }
  if (!lineItem.fulfillmentLineItem?.lineItem?.id) {
    return null; // Ignore if original line item ID is missing
  }

  return {
    shopifyLineItemId: parseShopifyGid(
      lineItem.fulfillmentLineItem.lineItem.id,
    ),
    quantity: lineItem.quantity ?? 0,
    processedQuantity: lineItem.processedQuantity ?? 0, // Default missing processed_quantity to 0
    refundedQuantity: lineItem.refundedQuantity ?? 0, // Default missing refunded_quantity to 0
  };
}

/**
 * Normalizes a single raw Shopify return.
 */
function normalizeReturn(shopifyReturn: ReturnNode): NormalizedReturn {
  const normalizedLineItems = shopifyReturn.returnLineItems.nodes
    .map(normalizeReturnLineItem)
    .filter(Boolean) as NormalizedReturnLineItem[];

  return {
    shopifyReturnId: parseShopifyGid(shopifyReturn.id),
    status: shopifyReturn.status,
    totalQuantity: shopifyReturn.totalQuantity,
    createdAt: new Date(shopifyReturn.createdAt),
    lineItems: normalizedLineItems,
  };
}

/**
 * Normalizes a raw Shopify OrderNode into a deterministic structure.
 * This is the main entry point for normalization.
 *
 * @param shopId The ID of the shop to which this order belongs.
 * @param order The raw Shopify OrderNode.
 * @returns A NormalizedOrderData object.
 */
export function normalizeOrderData(
  shopId: ShopId,
  order: OrderNode,
): NormalizedOrderData {
  const normalizedRefunds = order.refunds.map(normalizeRefund);
  const normalizedReturns = order.returns.nodes.map(normalizeReturn);

  return {
    shopId,
    shopifyOrderId: parseShopifyGid(order.id),
    shopifyOrderName: order.name,
    updatedAt: new Date(order.updatedAt),
    refunds: normalizedRefunds,
    returns: normalizedReturns,
  };
}