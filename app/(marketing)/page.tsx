import Link from "next/link";

/**
 * Marketing landing page.
 * Route group "(marketing)" keeps this URL at "/" while isolating its layout
 * from the authenticated app segment "(app)".
 */
export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
        ReturnPilot
      </p>

      <h1 className="mt-3 text-4xl font-bold leading-tight text-gray-900 sm:text-5xl">
        Stop paying refunds for returns that never arrive.
      </h1>

      <p className="mt-6 text-lg text-gray-600">
        One Shopify merchant issued{" "}
        <span className="font-semibold text-risk-fg">
          over $15,000 in refunds for products that were never returned
        </span>{" "}
        — and only caught it after the money was gone. ReturnPilot watches your
        refunds and flags any that went out{" "}
        <span className="font-semibold">
          without a confirmed, received return
        </span>
        , so you catch the leak the same day.
      </p>

      <div className="mt-10 flex flex-wrap gap-4">
        <Link
          href="/api/auth"
          className="rounded-lg bg-brand-600 px-6 py-3 font-semibold text-white transition hover:bg-brand-700"
        >
          Connect your Shopify store
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-gray-300 px-6 py-3 font-semibold text-gray-700 transition hover:bg-white"
        >
          View demo dashboard
        </Link>
      </div>

      <ul className="mt-14 space-y-4 text-gray-700">
        <li className="flex gap-3">
          <span aria-hidden className="text-brand-600">
            ✓
          </span>
          Read-only. We never change your refunds, orders, or returns workflow.
        </li>
        <li className="flex gap-3">
          <span aria-hidden className="text-brand-600">
            ✓
          </span>
          A daily email: “3 refunds worth $420 need review.”
        </li>
        <li className="flex gap-3">
          <span aria-hidden className="text-brand-600">
            ✓
          </span>
          Live in minutes. Works alongside Loop, AfterShip, or manual returns.
        </li>
      </ul>
    </main>
  );
}
