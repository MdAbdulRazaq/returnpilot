"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

type AlertFilterParams = {
  page: number;
  pageSize: number;
  status: "all" | "open" | "reviewed" | "dismissed";
  reason: "all" | "NO_RETURN" | "RETURN_NOT_RECEIVED" | "QUANTITY_SHORTFALL";
  search: string;
  sort: "detected_at" | "money_at_risk" | "refunded_at";
  order: "asc" | "desc";
};

interface FiltersProps {
  params: AlertFilterParams;
}

/**
 * Filter controls — Client Component.
 * Uses Next.js router for URL-driven navigation without page reload.
 */
export function Filters({ params }: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const navigate = useCallback(
    (overrides: Partial<AlertFilterParams>) => {
      const currentParams = new URLSearchParams(searchParams.toString());
      const merged = { ...params, ...overrides };
      Object.entries(merged).forEach(([key, value]) => {
        if (value !== undefined && value !== "") {
          currentParams.set(key, String(value));
        } else {
          currentParams.delete(key);
        }
      });
      router.push(`?${currentParams.toString()}`, { scroll: false });
    },
    [router, searchParams, params],
  );

  return (
    <form className="mb-6 flex flex-wrap gap-4 items-end" role="search" aria-label="Alert filters">
      {/* Status filter */}
      <div>
        <label htmlFor="status" className="sr-only">
          Status
        </label>
        <select
          id="status"
          name="status"
          value={params.status}
          onChange={(e) => navigate({ status: e.target.value as AlertFilterParams["status"], page: 1 })}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="all">All Statuses</option>
          <option value="open">Open</option>
          <option value="reviewed">Reviewed</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      {/* Reason filter */}
      <div>
        <label htmlFor="reason" className="sr-only">
          Reason
        </label>
        <select
          id="reason"
          name="reason"
          value={params.reason}
          onChange={(e) => navigate({ reason: e.target.value as AlertFilterParams["reason"], page: 1 })}
          className="rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        >
          <option value="all">All Reasons</option>
          <option value="NO_RETURN">No Return</option>
          <option value="RETURN_NOT_RECEIVED">Return Not Received</option>
          <option value="QUANTITY_SHORTFALL">Quantity Shortfall</option>
        </select>
      </div>

      {/* Search */}
      <div className="flex-1 min-w-[200px]">
        <label htmlFor="search" className="sr-only">
          Search order or refund ID
        </label>
        <input
          id="search"
          name="search"
          type="search"
          value={params.search}
          onChange={(e) => navigate({ search: e.target.value, page: 1 })}
          placeholder="Search order or refund ID…"
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
        />
      </div>

      {/* Refresh button */}
      <button
        type="button"
        onClick={() => router.refresh()}
        className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500"
      >
        Refresh
      </button>
    </form>
  );
}