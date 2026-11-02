"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface AlertRowActionsProps {
  alertId: string;
  status: "open" | "reviewed" | "dismissed";
}

/**
 * Review/Dismiss action buttons for a single alert row.
 * Client component that sends requests to the API and refreshes the dashboard on success.
 */
export function AlertRowActions({ alertId, status }: AlertRowActionsProps) {
  const router = useRouter();
  const [reviewPending, setReviewPending] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [dismissPending, setDismissPending] = useState(false);
  const [dismissError, setDismissError] = useState<string | null>(null);

  const handleReview = async () => {
    if (status === "reviewed") return;
    setReviewPending(true);
    setReviewError(null);
    try {
      const res = await fetch(`/api/alerts/${alertId}/review`, { method: "POST" });
      if (!res.ok) {
        throw new Error("Failed to review alert");
      }
      // Success: refresh to revalidate server data
      router.refresh();
    } catch {
      // Show generic error message
      setReviewError("Failed to review alert. Please try again.");
    } finally {
      setReviewPending(false);
    }
  };

  const handleDismiss = async () => {
    if (status === "dismissed") return;
    setDismissPending(true);
    setDismissError(null);
    try {
      const res = await fetch(`/api/alerts/${alertId}/dismiss`, { method: "POST" });
      if (!res.ok) {
        throw new Error("Failed to dismiss alert");
      }
      // Success: refresh to revalidate server data
      router.refresh();
    } catch {
      setDismissError("Failed to dismiss alert. Please try again.");
    } finally {
      setDismissPending(false);
    }
  };

  return (
    <div className="flex items-center gap-2" role="group" aria-label="Alert actions">
      {status !== "reviewed" && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleReview();
            }}
            disabled={reviewPending}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={reviewPending ? "Reviewing..." : "Mark as reviewed"}
          >
            {reviewPending ? "Reviewing..." : "Review"}
          </button>
          {reviewError && (
            <p className="text-xs text-red-500 mt-1">{reviewError}</p>
          )}
        </>
      )}
      {status !== "dismissed" && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            disabled={dismissPending}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={dismissPending ? "Dismissing..." : "Dismiss alert"}
          >
            {dismissPending ? "Dismissing..." : "Dismiss"}
          </button>
          {dismissError && (
            <p className="text-xs text-red-500 mt-1">{dismissError}</p>
          )}
        </>
      )}
      {(status === "reviewed" || status === "dismissed") && (
        <span className="text-xs text-gray-500">
          {status === "reviewed" ? "Reviewed" : "Dismissed"}
        </span>
      )}
    </div>
  );
}