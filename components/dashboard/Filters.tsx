'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useMemo } from 'react';

interface FiltersProps {
  params: {
    status: string;
    reason: string;
    search: string;
    sort: string;
    order: string;
    page: number;
    pageSize: number;
  };
}

export function Filters({ params }: FiltersProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract current filter values from URL (single source of truth)
  const status = searchParams.get('status') ?? params.status;
  const reason = searchParams.get('reason') ?? params.reason;
  const search = searchParams.get('search') ?? params.search;
  const sortParam = searchParams.get('sort') ?? params.sort;
  const orderParam = searchParams.get('order') ?? params.order;

  // Compute current sort option for the UI
  const currentSortOption = useMemo(() => {
    if (sortParam === 'detected_at' && orderParam === 'desc') return 'detected_at_desc';
    if (sortParam === 'detected_at' && orderParam === 'asc') return 'detected_at_asc';
    if (sortParam === 'money_at_risk' && orderParam === 'desc') return 'money_at_risk_desc';
    if (sortParam === 'money_at_risk' && orderParam === 'asc') return 'money_at_risk_asc';
    // Default to Detected At (Newest)
    return 'detected_at_desc';
  }, [sortParam, orderParam]);

  // Map sort option to sort and order values
  type SortOption = 'detected_at_desc' | 'detected_at_asc' | 'money_at_risk_desc' | 'money_at_risk_asc';
  const sortOptionMap = useMemo<Record<SortOption, {sort: string; order: string}>>(() => {
    return {
      'detected_at_desc': { sort: 'detected_at', order: 'desc' },
      'detected_at_asc': { sort: 'detected_at', order: 'asc' },
      'money_at_risk_desc': { sort: 'money_at_risk', order: 'desc' },
      'money_at_risk_asc': { sort: 'money_at_risk', order: 'asc' },
    };
  }, []);

  // Handler to update URL for a given filter
  const updateURL = (updates: Record<string, string | null>) => {
    const newParams = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        newParams.delete(key);
      } else {
        newParams.set(key, value);
      }
    });
    // Reset page to 1 when filters change
    newParams.delete('page');
    router.push(`?${newParams.toString()}`, { scroll: false });
  };

  // Handlers for each filter
  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateURL({ status: e.target.value });
  };

  const handleReasonChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateURL({ reason: e.target.value });
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateURL({ search: e.target.value });
  };

  const handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const option = e.target.value as SortOption;
    const { sort, order } = sortOptionMap[option];
    updateURL({ sort, order });
  };

  return (
    <div className="flex flex-wrap items-center gap-4 mb-6">
      <div className="flex items-center gap-2">
        <label htmlFor="status-filter" className="text-sm font-medium text-gray-500">
          Status
        </label>
        <select
          id="status-filter"
          value={status}
          onChange={handleStatusChange}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All</option>
          <option value="open">Open</option>
          <option value="reviewed">Reviewed</option>
          <option value="dismissed">Dismissed</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="reason-filter" className="text-sm font-medium text-gray-500">
          Reason
        </label>
        <select
          id="reason-filter"
          value={reason}
          onChange={handleReasonChange}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All</option>
          <option value="NO_RETURN">No Return</option>
          <option value="RETURN_NOT_RECEIVED">Return Not Received</option>
          <option value="QUANTITY_SHORTFALL">Quantity Shortfall</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="search-filter" className="text-sm font-medium text-gray-500">
          Search
        </label>
        <input
          id="search-filter"
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Search order or refund ID"
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
        />
      </div>

      <div className="flex items-center gap-2">
        <label htmlFor="sort-filter" className="text-sm font-medium text-gray-500">
          Sort by
        </label>
        <select
          id="sort-filter"
          value={currentSortOption}
          onChange={handleSortChange}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="detected_at_desc">Detected At (Newest)</option>
          <option value="detected_at_asc">Detected At (Oldest)</option>
          <option value="money_at_risk_desc">Money At Risk (Highest)</option>
          <option value="money_at_risk_asc">Money At Risk (Lowest)</option>
        </select>
      </div>
    </div>
  );
}