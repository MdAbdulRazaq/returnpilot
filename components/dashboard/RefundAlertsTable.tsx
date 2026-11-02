"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { AlertRow } from "@/lib/dashboard/queries";
import { formatMoney } from "@/lib/dashboard/format";
import { AlertDetailRow } from "./AlertDetailRow";
import { AlertRowActions } from "./AlertRowActions";

interface RefundAlertsTableProps {
  initialAlerts: AlertRow[];
  totalCount: number;
  page: number;
  pageSize: number;
  status: "all" | "open" | "reviewed" | "dismissed";
  reason: "all" | "NO_RETURN" | "RETURN_NOT_RECEIVED" | "QUANTITY_SHORTFALL";
  search: string;
  sort: "detected_at" | "money_at_risk" | "refunded_at";
  order: "asc" | "desc";
}

type AlertFilterParams = {
  page: number;
  pageSize: number;
  status: "all" | "open" | "reviewed" | "dismissed";
  reason: "all" | "NO_RETURN" | "RETURN_NOT_RECEIVED" | "QUANTITY_SHORTFALL";
  search: string;
  sort: "detected_at" | "money_at_risk" | "refunded_at";
  order: "asc" | "desc";
};

/**
 * Refund Alerts Table with expandable rows, pagination, and sorting.
 * Client component for interactivity; initial data passed from server.
 * Pagination and filters are URL-driven via Next.js router.
 */
export function RefundAlertsTable({
  initialAlerts,
  totalCount,
  page,
  pageSize,
  status,
  reason,
  search,
  sort,
  order,
}: RefundAlertsTableProps) {
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigate = useCallback(
    (overrides: Partial<AlertFilterParams>) => {
      const currentParams: AlertFilterParams = {
        page,
        pageSize,
        status,
        reason,
        search,
        sort,
        order,
      };
      const params = new URLSearchParams(searchParams.toString());
      const merged = { ...currentParams, ...overrides };
      Object.entries(merged).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          params.set(key, String(value));
        } else {
          params.delete(key);
        }
      });
      router.push(`?${params.toString()}`, { scroll: false });
    },
    [router, searchParams, page, pageSize, status, reason, search, sort, order],
  );

  
  const handlePageChange = useCallback(
    (newPage: number) => {
      navigate({ page: newPage });
      setExpandedRow(null);
    },
    [navigate],
  );

  
  if (totalCount === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">
          No refund alerts found.
        </p>
        <p className="mt-2 text-sm text-gray-400">
          ReturnPilot is monitoring your store automatically.
        </p>
      </div>
    );
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="overflow-x-auto">
      <table className="w-full" role="table">
        <thead className="bg-gray-50">
          <tr>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              aria-sort={sort === "detected_at" ? (order === "asc" ? "ascending" : "descending") : "none"}
            >
              Order
              {sort === "detected_at" && (order === "asc" ? " ↑" : " ↓")}
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              aria-sort={sort === "detected_at" ? (order === "asc" ? "ascending" : "descending") : "none"}
            >
              Refund ID
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Reason
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              aria-sort={sort === "money_at_risk" ? (order === "asc" ? "ascending" : "descending") : "none"}
            >
              Money At Risk
              {sort === "money_at_risk" && (order === "asc" ? " ↑" : " ↓")}
            </th>
            <th
              className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              aria-sort={sort === "detected_at" ? (order === "asc" ? "ascending" : "descending") : "none"}
            >
              Detected At
              {sort === "detected_at" && (order === "asc" ? " ↑" : " ↓")}
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Status
            </th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {initialAlerts.map((alert) => (
            <>
              <tr
                key={`${alert.id}-row`}
                className={`hover:bg-gray-50 transition-colors cursor-pointer ${
                  expandedRow === alert.id ? "bg-gray-50" : ""
                }`}
                onClick={() => setExpandedRow((prev) => (prev === alert.id ? null : alert.id))}
              >
                <td className="px-6 py-4 text-center">
                  <button
                    type="button"
                    aria-label={expandedRow === alert.id ? "Collapse details" : "Expand details"}
                    aria-expanded={expandedRow === alert.id}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {expandedRow === alert.id ? "−" : "+"}
                  </button>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                  {alert.order_name ?? alert.shopify_order_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                  {alert.shopify_refund_id}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <ReasonBadge reason={alert.reason} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-red-600">
                  {formatMoney(alert.money_at_risk)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {new Date(alert.detected_at).toLocaleString(undefined, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <StatusBadge status={alert.status} />
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <AlertRowActions alertId={alert.id} status={alert.status} />
                </td>
              </tr>
              {expandedRow === alert.id && (
                <AlertDetailRow key={`${alert.id}-detail`} alert={alert} />
              )}
            </>
          ))}
        </tbody>
      </table>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
          <p className="text-sm text-gray-700">
            Showing page {page} of {totalPages} ({totalCount} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Previous page"
            >
              Previous
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Next page"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ReasonBadge({ reason }: { reason: string }) {
  const styles = {
    NO_RETURN: "bg-red-50 text-red-700",
    RETURN_NOT_RECEIVED: "bg-amber-50 text-amber-700",
    QUANTITY_SHORTFALL: "bg-blue-50 text-blue-700",
  };

  const label = reason.replace(/_/g, " ");

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[reason as keyof typeof styles] ?? "bg-gray-50 text-gray-700"}`}>
      {label}
    </span>
  );
}

function StatusBadge({ status }: { status: "open" | "reviewed" | "dismissed" }) {
  const styles = {
    open: "bg-red-50 text-red-700",
    reviewed: "bg-amber-50 text-amber-700",
    dismissed: "bg-gray-50 text-gray-700",
  };

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {status}
    </span>
  );
}