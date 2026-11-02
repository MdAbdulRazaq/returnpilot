import "server-only";

/**
 * Shopify Admin GraphQL query strings and their response types for M4 sync.
 *
 * These are DATA ONLY — no network calls live here. They are handed to
 * `shopifyGraphQL()` in `lib/shopify/graphql.ts`, the single API client.
 *
 * Design (verified against Admin API 2025-07):
 *   - There is no top-level "refunds since X" query, so we page ORDERS by
 *     `updated_at` and read each order's refunds + returns.
 *   - `order.refunds` is a plain array (`first:` only, no cursors). We request a
 *     generous cap per order.
 *   - `order.returns` is a proper connection; we take a page large enough for
 *     realistic order sizes (returns per single order are few).
 *   - `ReturnStatus` has NO `RECEIVED`/`INSPECTED` value. Whether goods are
 *     actually back is inferred in M5 from `returnLineItems.processedQuantity`,
 *     which is why we persist those quantities now.
 */

// How many refunds / returns / line items to pull inline per order. Orders with
// more than this are extraordinarily rare; M5 detection tolerates truncation
// (it can only under-flag, never falsely flag) and the hourly resync re-reads.
const REFUNDS_PER_ORDER = 50;
const RETURNS_PER_ORDER = 25;
const LINE_ITEMS = 100;

/** Reusable fragment: everything the detection engine needs from one order. */
const ORDER_SYNC_FIELDS = `
  id
  name
  updatedAt
  refunds(first: ${REFUNDS_PER_ORDER}) {
    id
    createdAt
    totalRefundedSet { shopMoney { amount currencyCode } }
    refundLineItems(first: ${LINE_ITEMS}) {
      nodes {
        quantity
        restockType
        subtotalSet { shopMoney { amount currencyCode } }
        lineItem { id name }
      }
    }
  }
  returns(first: ${RETURNS_PER_ORDER}) {
    nodes {
      id
      name
      status
      createdAt
      totalQuantity
      returnLineItems(first: ${LINE_ITEMS}) {
        nodes {
          # nodes are the ReturnLineItemType interface (ReturnLineItem |
          # ExchangeLineItem). The returned-goods fields live on ReturnLineItem;
          # we tag each node with __typename and keep only ReturnLineItem in
          # normalization (exchanges aren't refund-without-return leaks).
          __typename
          ... on ReturnLineItem {
            id
            quantity
            processedQuantity
            refundedQuantity
            fulfillmentLineItem { lineItem { id name } }
          }
        }
      }
    }
  }
`;

/**
 * Page orders updated at/after a cursor timestamp, newest activity first matched
 * by sort key. `$query` carries the `updated_at:>=...` filter so the string is
 * never concatenated with untrusted input here.
 */
export const ORDERS_SINCE_QUERY = `
  query OrdersSince($query: String!, $cursor: String) {
    orders(first: 50, after: $cursor, query: $query, sortKey: UPDATED_AT) {
      pageInfo { hasNextPage endCursor }
      nodes {
        ${ORDER_SYNC_FIELDS}
      }
    }
  }
`;

/** Fetch one order by ID (webhook near-real-time path). */
export const ORDER_BY_ID_QUERY = `
  query OrderById($id: ID!) {
    order(id: $id) {
      ${ORDER_SYNC_FIELDS}
    }
  }
`;

/** Register a webhook subscription (idempotent use in register.ts). */
export const WEBHOOK_SUBSCRIPTION_CREATE = `
  mutation WebhookCreate($topic: WebhookSubscriptionTopic!, $callbackUrl: URL!) {
    webhookSubscriptionCreate(
      topic: $topic
      webhookSubscription: { callbackUrl: $callbackUrl, format: JSON }
    ) {
      userErrors { field message }
      webhookSubscription { id }
    }
  }
`;

// ── Response types (only the fields we select) ────────────────────────────────

export interface MoneyShape {
  shopMoney: { amount: string; currencyCode: string };
}

export interface RefundLineItemNode {
  quantity: number;
  restockType: string;
  subtotalSet: MoneyShape;
  lineItem: { id: string; name: string } | null;
}

export interface RefundNode {
  id: string;
  createdAt: string;
  totalRefundedSet: MoneyShape;
  refundLineItems: { nodes: RefundLineItemNode[] };
}

export interface ReturnLineItemNode {
  __typename: string; // "ReturnLineItem" | "ExchangeLineItem"
  // The fields below are present only when __typename === "ReturnLineItem".
  id?: string;
  quantity?: number;
  processedQuantity?: number;
  refundedQuantity?: number;
  fulfillmentLineItem?: {
    lineItem: { id: string; name: string } | null;
  } | null;
}

export interface ReturnNode {
  id: string;
  name: string;
  status: string;
  totalQuantity: number;
  createdAt: string;
  returnLineItems: { nodes: ReturnLineItemNode[] };
}

export interface OrderNode {
  id: string;
  name: string;
  updatedAt: string;
  refunds: RefundNode[];
  returns: { nodes: ReturnNode[] };
}

export interface OrdersSinceResponse {
  orders: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    nodes: OrderNode[];
  };
}

export interface OrderByIdResponse {
  order: OrderNode | null;
}

export interface WebhookCreateResponse {
  webhookSubscriptionCreate: {
    userErrors: Array<{ field: string[] | null; message: string }>;
    webhookSubscription: { id: string } | null;
  };
}
