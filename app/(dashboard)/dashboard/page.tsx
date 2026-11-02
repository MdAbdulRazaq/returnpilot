import { cookies } from "next/headers";
import { getShopIdFromSession } from "@/lib/auth/session";
import { getAdminClient } from "@/lib/supabase/admin";
import { getAlerts, getTotalCount, getAlertCounts, type AlertFilterParams } from "@/lib/dashboard/queries";
import { RefundAlertsTable } from "@/components/dashboard/RefundAlertsTable";
import { SummaryCards } from "@/components/dashboard/SummaryCards";
import { Filters } from "../Filters";
import { redirect } from "next/navigation";

interface DashboardPageProps {
  searchParams: Promise<{
    page?: string;
    pageSize?: string;
    status?: string;
    reason?: string;
    search?: string;
    sort?: string;
    order?: string;
  }>;
}

const DEFAULT_PAGE_SIZE = 20;
const VALID_STATUS = ["all", "open", "reviewed", "dismissed"] as const;
const VALID_REASON = ["all", "NO_RETURN", "RETURN_NOT_RECEIVED", "QUANTITY_SHORTFALL"] as const;
const VALID_SORT = ["detected_at", "money_at_risk", "refunded_at"] as const;
const VALID_ORDER = ["asc", "desc"] as const;

function parseIntSafe(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = parseInt(value ?? "", 10);
  if (Number.isNaN(parsed) || parsed < min || parsed > max) return fallback;
  return parsed;
}

function parseEnum<T extends string>(value: string | undefined, valid: readonly T[], fallback: T): T {
  if (!value) return fallback;
  return valid.includes(value as T) ? (value as T) : fallback;
}

/**
 * Dashboard page — Server Component.
 * Fetches alert data and counts, passes to client components for interactivity.
 */
export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const resolvedParams = await searchParams;

  // Auth: resolve shop_id from session cookie
  const cookieStore = await cookies();
  const shopId = await getShopIdFromSession(cookieStore);

  if (!shopId) {
    redirect("/api/auth");
  }

  /**
   * Fetch the shop's currency from the shops table.
   * Fallback to USD if not found or on error.
   */
  async function getShopCurrency(shopId: string): Promise<string> {
    try {
      const db = getAdminClient();
      const { data, error } = await db
        .from('shops')
        .select('currency')
        .eq('id', shopId)
        .single();

      if (error) {
        console.error('Failed to fetch shop currency:', error);
        return 'USD';
      }

      return data?.currency ?? 'USD';
    } catch (err) {
      console.error('Exception fetching shop currency:', err);
      return 'USD';
    }
  }

  // Parse and validate URL-driven filter/sort/pagination params
  const page = parseIntSafe(resolvedParams.page, 1, 1, 1000);
  const pageSize = parseIntSafe(resolvedParams.pageSize, DEFAULT_PAGE_SIZE, 5, 100);
  const status = parseEnum(resolvedParams.status, VALID_STATUS, "all");
  const reason = parseEnum(resolvedParams.reason, VALID_REASON, "all");
  const search = resolvedParams.search?.trim() ?? "";
  const sort = parseEnum(resolvedParams.sort, VALID_SORT, "detected_at");
  const order = parseEnum(resolvedParams.order, VALID_ORDER, "desc");

  const filterParams: AlertFilterParams = {
    page,
    pageSize,
    status,
    reason,
    search,
    sort,
    order,
  };

  // Server-side data fetching (parallel)
  const [alerts, totalCount, counts, currency] = await Promise.all([
    getAlerts(shopId, filterParams),
    getTotalCount(shopId, filterParams),
    getAlertCounts(shopId),
    getShopCurrency(shopId),
  ]);

  // Build query string for filter URLs
  // const buildQueryString = (overrides: Partial<AlertFilterParams> = {}) => {
  //   const params = new URLSearchParams();
  //   const merged = { ...filterParams, ...overrides };
  //   Object.entries(merged).forEach(([key, value]) => {
  //     if (value !== undefined && value !== "") {
  //       params.set(key, String(value));
  //     }
  //   });
  //   return params.toString();
  // };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Refund Alerts</h1>
        <p className="mt-1 text-sm text-gray-500">
          Refunds issued without a confirmed received return — potential leaks.
        </p>
      </header>

      <SummaryCards counts={counts} currency={currency} />

      {/* Filters */}
      <Filters
        params={filterParams}
      />

      {/* Table */}
      <RefundAlertsTable
        initialAlerts={alerts}
        totalCount={totalCount}
        page={page}
        pageSize={pageSize}
        status={status}
        reason={reason}
        search={search}
        sort={sort}
        order={order}
      />
    </div>
  );
}