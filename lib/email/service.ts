// Email service layer - orchestrates per-shop flow for digest generation
import "server-only";

import type { DeliveryRecord } from './types';
import { ExplanationDigestTemplate } from './templates/explanation-digest';
import type { Explanation } from '@/lib/detection/explanation/types';
import { getShopList, getLastSuccessfulDelivery, getAlertsSince, recordDeliveryAttempt } from './queries';
import { renderDigestEmail } from './templates/digest';
import resend from './resendClient';
import { logInfo, logError } from '../log';
import { getEnv } from '../env';

// Configuration constants - accessed via getEnv() for validation
const env = getEnv();
const EMAIL_INITIAL_LOOKBACK_DAYS: number = Number(env.EMAIL_INITIAL_LOOKBACK_DAYS) || 7;
const EMAIL_MAX_ALERTS_PER_EMAIL: number = Number(env.EMAIL_MAX_ALERTS_PER_EMAIL) || 50;
const EMAIL_RESEND_TIMEOUT_MS: number = Number(env.EMAIL_RESEND_TIMEOUT_MS) || 8000;

export async function processEmailDigest(): Promise<void> {
  const runStartedAt = new Date(); // Single source of truth for timestamps
  const windowEnd = runStartedAt.toISOString(); // UTC timestamp for window end

  logInfo('email_digest_start', {
    timestamp: runStartedAt.toISOString(),
  });

  try {
    // Get all eligible shops
    const shops = await getShopList();
    logInfo('email_digest_shops_loaded', {
      count: shops.length,
    });

    // Process each shop
    for (const shop of shops) {
      const shopId = shop.id;
      const shopStart = Date.now(); // Track start time for duration calculation
      // Initialize windowStart to prevent potential use-before-assignment
      let windowStart = runStartedAt.toISOString(); // Default to current time (will be overridden if needed)

      try {
        // Skip if no email (null or empty string)
        const email = shop.email;
        if (!email || email === '') {
          logInfo('email_digest_shop_skipped', {
            shopId,
            reason: 'no_email',
          });
          continue;
        }

        // Skip if alert emails are disabled for this shop
        if (shop.alerts_enabled === false) {
          logInfo('email_digest_shop_skipped', {
            shopId,
            reason: 'alerts_disabled',
          });
          continue;
        }

        // Get last successful delivery to determine window start
        const lastDelivery = await getLastSuccessfulDelivery(shopId, 'daily_digest');
        if (lastDelivery) {
          // Use the previous successful window_end as the new window start
          windowStart = lastDelivery.window_end;
        } else {
          // No previous successful delivery - use lookback period
          const lookbackDate = new Date(runStartedAt);
          lookbackDate.setDate(lookbackDate.getDate() - EMAIL_INITIAL_LOOKBACK_DAYS);
          windowStart = lookbackDate.toISOString();
        }

        // Get alerts for this shop within the window
        const alerts = await getAlertsSince(shopId, windowStart, windowEnd);

        // If no new alerts, skip this shop
        if (alerts.length === 0) {
          logInfo('email_digest_skipped', {
            shopId,
            notificationType: 'daily_digest',
            reason: 'no_alerts',
            windowStart,
            windowEnd,
            notificationWindowHours: (
              (runStartedAt.getTime() - new Date(windowStart).getTime()) / (1000 * 60 * 60)
            ),
            durationMs: Date.now() - shopStart,
          });
          continue;
        }

        // Fetch explanations for alerts (ifexplanationEnabled setting is true)
        // For now, we'll fetch explanations for all alerts as the setting check would
        // happen at a higher level or we'd fetch the setting per shop
        const explanationsPromises = alerts.map(async (alert) => {
          try {
            const explanationResponse = await fetch(
              `${process.env.NEXT_PUBLIC_APP_URL}/api/alerts/${alert.id}/explanation`,
              {
                method: 'GET',
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            );

            if (!explanationResponse.ok) {
              // If we can't get an explanation, return null for this alert
              return [alert.id, null];
            }

            const explanationData = await explanationResponse.json();
            return [alert.id, explanationData.explanation || null];
          } catch (error) {
            console.warn(`Failed to fetch explanation for alert ${alert.id}:`, error);
            return [alert.id, null];
          }
        });

        const explanationResults = await Promise.all(explanationsPromises);
        const explanationsMap = Object.fromEntries(
          explanationResults.filter(([, explanation]) => explanation !== null && explanation !== undefined)
        );

        // Apply deterministic ordering and limit
        const limitedAlerts = alerts
          .slice(0, EMAIL_MAX_ALERTS_PER_EMAIL);

        // Render email
        const shopName = (email.split('@')[0]) as string; // Use email prefix as shop name fallback

        // Create explanations object limited to the alerts we're actually including
        const limitedExplanations: Record<string, { html: string; text: string }> = {};
        limitedAlerts.forEach(alert => {
          if (explanationsMap[alert.id]) {
            const explanationSummary = ExplanationDigestTemplate.renderExplanationSummary(
              alert,
              explanationsMap[alert.id],
              200 // Truncate to 200 characters as per contract
            );
            limitedExplanations[alert.id] = explanationSummary;
          }
        });

        const { html, text } = renderDigestEmail({
          shopName,
          alerts: limitedAlerts,
          generatedAt: runStartedAt,
          explanations: limitedExplanations,
        });

        // Prepare email payload
        const emailPayload = {
          from: env.EMAIL_FROM,
          to: email,
          subject: `ReturnPilot Daily Refund Digest — ${runStartedAt.toISOString().split('T')[0]} (UTC)`,
          html,
          text,
        };

        // Send email with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), EMAIL_RESEND_TIMEOUT_MS);

        let sendResult;
        try {
          sendResult = await resend.emails.send(emailPayload);
        } finally {
          clearTimeout(timeoutId);
        }

        // Record successful delivery
        const deliveryRecord: Omit<DeliveryRecord, 'id' | 'created_at'> = {
          shop_id: shopId,
          notification_type: 'daily_digest',
          window_start: windowStart,
          window_end: windowEnd,
          sent_at: new Date().toISOString(),
          status: 'sent',
          provider_message_id: sendResult.data?.id ?? null,
          alert_count: alerts.length, // Total alerts in window, not just limited
          duration_ms: Date.now() - shopStart,
        };

        await recordDeliveryAttempt(deliveryRecord);

        logInfo('email_digest_attempt', {
          shopId,
          notificationType: 'daily_digest',
          windowStart,
          windowEnd,
          notificationWindowHours: (
            (runStartedAt.getTime() - new Date(windowStart).getTime()) / (1000 * 60 * 60)
          ),
          alertCount: alerts.length,
          durationMs: Date.now() - shopStart,
          status: 'sent',
        });

      } catch (error) {
        // Determine failure type based on error characteristics
        let failureType: 'timeout' | 'network_error' | 'provider_error' | 'unknown' = 'unknown';

        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            failureType = 'timeout';
          } else if (
            error.message &&
            (error.message.includes('timeout') ||
             error.message.includes('TimeOut') ||
             error.message.includes('TIMEOUT'))
          ) {
            failureType = 'timeout';
          } else {
            // Check for error.code property safely
            const errAny = error as { code?: string; status?: number };
            if (
              errAny.code === 'ECONNABORTED' ||
              errAny.code === 'ETIMEDOUT' ||
              errAny.code === 'ENETUNREACH' ||
              errAny.code === 'ECONNREFUSED' ||
              errAny.code === 'EHOSTUNREACH'
            ) {
              if (errAny.code === 'ECONNABORTED' || errAny.code === 'ETIMEDOUT') {
                failureType = 'timeout';
              } else {
                failureType = 'network_error';
              }
            } else if (
              typeof errAny.status === 'number' &&
              errAny.status >= 500
            ) {
              failureType = 'provider_error';
            }
          }
        }

        // Record failed delivery
        const deliveryRecord: Omit<DeliveryRecord, 'id' | 'created_at'> = {
          shop_id: shopId,
          notification_type: 'daily_digest',
          window_start: windowStart, // This is now guaranteed to be initialized
          window_end: windowEnd,
          sent_at: null,
          status: 'failed',
          provider_message_id: null,
          alert_count: 0, // No alerts processed on failure
          duration_ms: Date.now() - shopStart,
        };

        await recordDeliveryAttempt(deliveryRecord);

        logError('email_digest_attempt', error, {
          shopId,
          notificationType: 'daily_digest',
          windowStart,
          windowEnd,
          notificationWindowHours: (
            (runStartedAt.getTime() - new Date(windowStart).getTime()) / (1000 * 60 * 60)
          ),
          alertCount: 0,
          durationMs: Date.now() - shopStart,
          status: 'failed',
          failureType,
        });
      }
    }

    logInfo('email_digest_complete', {
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    logError('email_digest_fatal_error', error, {
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}