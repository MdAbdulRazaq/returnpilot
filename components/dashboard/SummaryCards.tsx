import type { AlertCounts } from "@/lib/dashboard/queries";
import { formatMoneyNumber } from "@/lib/dashboard/format";

/**
 * SummaryCards — four metric cards at the top of the dashboard.
 * Server Component: receives pre-fetched data, no client-side state.
 */
export function SummaryCards({ counts, currency }: { counts: AlertCounts; currency: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <MetricCard
        title="Open Alerts"
        value={counts.open}
        description="Refund leaks requiring attention"
        color="blue"
      />
      <MetricCard
        title="Money At Risk"
        value={formatMoneyNumber(counts.moneyAtRisk, currency)}
        description="Total refund amount on open alerts"
        color="red"
      />
      <MetricCard
        title="Reviewed"
        value={counts.reviewed}
        description="Alerts you have reviewed"
        color="amber"
      />
      <MetricCard
        title="Dismissed"
        value={counts.dismissed}
        description="Alerts dismissed as false positives"
        color="gray"
      />
    </div>
  );
}

/**
 * Individual metric card.
 * Pure presentational component — no logic, no hooks.
 */
function MetricCard({
  title,
  value,
  description,
  color,
}: {
  title: string;
  value: string | number;
  description: string;
  color: "blue" | "red" | "amber" | "gray";
}) {
  const colorClasses = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    red: "bg-red-50 text-red-700 border-red-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    gray: "bg-gray-50 text-gray-700 border-gray-200",
  };

  return (
    <div className={`rounded-xl border p-4 ${colorClasses[color]}`}>
      <p className="text-sm font-medium tracking-wide uppercase">{title}</p>
      <p className="mt-1 text-3xl font-bold" aria-label={`${title} ${value}`}>
        {value}
      </p>
      <p className="mt-2 text-sm opacity-70">{description}</p>
    </div>
  );
}