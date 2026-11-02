"use client";

import type { AlertRow } from "@/lib/dashboard/queries";
import { formatMoney } from "@/lib/dashboard/format";
import { useEffect, useState } from "react";
import type { Explanation } from "@/lib/detection/explanation/types";
import { ExplanationFeedback } from "@/components/dashboard/ExplanationFeedback";

/**
 * Expandable detail row showing refund leak information.
 * Only displayed when a row is expanded.
 */
interface AlertDetailRowProps {
  alert: AlertRow;
}

interface ExplanationData {
  merchantExplanation: string;
  technicalDetails: string | null;
  confidence: number | null;
  riskStratification: string | null;
  historicalContext: Explanation['historicalContext'] | null;
}

export function AlertDetailRow({ alert }: AlertDetailRowProps) {
  const [explanation, setExplanation] = useState<ExplanationData | null>(null);
  const [strategyIdentifier, setStrategyIdentifier] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch explanation data for this alert
    let isMounted = true;

    const fetchExplanation = async () => {
      if (!alert.id) return;

      setLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/alerts/${alert.id}/explanation`);

        if (!response.ok) {
          throw new Error(`Failed to fetch explanation: ${response.statusText}`);
        }

        const data = await response.json();

        if (isMounted) {
          setExplanation({
            merchantExplanation: data.explanation.merchantExplanation,
            technicalDetails: data.explanation.technicalDetails,
            confidence: data.explanation.confidence,
            riskStratification: data.explanation.riskStratification,
            historicalContext: data.explanation.historicalContext
          });

          // Set strategy identifier if available
          if (data.strategyIdentifier !== undefined && data.strategyIdentifier !== null) {
            setStrategyIdentifier(data.strategyIdentifier);
          }
        }
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setExplanation(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchExplanation();

    return () => {
      isMounted = false;
    };
  }, [alert.id]);

  return (
    <tr className="bg-gray-50">
      <td colSpan={7} className="px-6 py-4">
        {loading && (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">Loading explanation...</p>
          </div>
        )}
        {!loading && error && (
          <div className="text-center py-4">
            <p className="text-sm text-red-500">Failed to load explanation: {error}</p>
          </div>
        )}
        {!loading && !error && (
          <dl className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-sm font-medium text-gray-500">Shopify Order ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">{alert.shopify_order_id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Shopify Refund ID</dt>
              <dd className="mt-1 text-sm text-gray-900 font-mono">{alert.shopify_refund_id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Alert Reason</dt>
              <dd className="mt-1 text-sm text-gray-900">
                <ReasonBadge reason={alert.reason} />
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Money At Risk</dt>
              <dd className="mt-1 text-sm text-gray-900 font-medium text-red-600">
                {formatMoney(alert.money_at_risk)}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-sm font-medium text-gray-500">Detection Timestamp</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(alert.detected_at).toLocaleString(undefined, {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </dd>
            </div>
            {alert.reviewed_at && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Review Timestamp</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(alert.reviewed_at).toLocaleString(undefined, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </dd>
              </div>
            )}
            {alert.dismissed_at && (
              <div className="sm:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Dismiss Timestamp</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(alert.dismissed_at).toLocaleString(undefined, {
                    dateStyle: "short",
                    timeStyle: "short",
                  })}
                </dd>
              </div>
            )}
            {/* Explanation Section */}
            {explanation && (
              <>
                {strategyIdentifier && (
                  <div className="sm:col-span-2 pt-4 border-t">
                    <dt className="text-sm font-medium text-gray-500">Strategy Attribution</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">
                      {strategyIdentifier}
                    </dd>
                  </div>
                )}
                <div className="sm:col-span-2 pt-4 border-t">
                  <dt className="text-sm font-medium text-gray-500">Explanation</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <p className="text-sm text-gray-700">{explanation.merchantExplanation}</p>
                  </dd>
                </div>
                {explanation.technicalDetails && (
                  <div className="sm:col-span-2 pt-4 border-t">
                    <dt className="text-sm font-medium text-gray-500">Technical Details</dt>
                    <dd className="mt-1">
                      <pre className="text-xs text-gray-600 bg-gray-50 p-3 rounded">{explanation.technicalDetails}</pre>
                    </dd>
                  </div>
                )}
                {explanation.confidence !== null && (
                  <div className="sm:col-span-2 pt-4 border-t">
                    <dt className="text-sm font-medium text-gray-500">Confidence Score</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-medium">
                      {(explanation.confidence * 100).toFixed(1)}%
                    </dd>
                  </div>
                )}
                {explanation.riskStratification && (
                  <div className="sm:col-span-2 pt-4 border-t">
                    <dt className="text-sm font-medium text-gray-500">Risk Level</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-medium">
                      <span className={`
                        ${explanation.riskStratification === "high" ? "text-red-600" :
                          explanation.riskStratification === "medium" ? "text-amber-600" :
                          "text-green-600"}
                      `}>
                        {explanation.riskStratification}
                      </span>
                    </dd>
                  </div>
                )}
                {explanation.historicalContext && (
                  <div className="sm:col-span-2 pt-4 border-t">
                    <dt className="text-sm font-medium text-gray-500">Historical Context</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {explanation.historicalContext.comparison && (
                        <p className="text-sm">
                          Compared to historical patterns:{' '}
                          <span className="font-medium">
                            {explanation.historicalContext.comparison.replace(/_/g, " ")}
                          </span>
                        </p>
                      )}
                      {explanation.historicalContext?.seasonalAdjustment && (
                        <p className="text-sm">
                          Seasonal adjustment: {explanation.historicalContext.seasonalAdjustment.seasonalFactor.toFixed(2)}x
                        </p>
                      )}
                    </dd>
                  </div>
                )}

                {/* Explanation Feedback Section */}
                {explanation && alert.id && (
                  <div className="sm:col-span-2 pt-4 border-t">
                    <ExplanationFeedback explanationId={alert.id} currentRating={rating} />
                  </div>
                )}
              </>
            )}
          </dl>
        )}
      </td>
    </tr>
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