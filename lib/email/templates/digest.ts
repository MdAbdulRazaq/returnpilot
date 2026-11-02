// Email digest template renderer
import type { AlertRow } from '../types';
import { escapeHtml } from '../utils/escapeHtml';
import { formatMoney } from '@/lib/dashboard/format';

/**
 * Renders the email digest HTML and plain text versions
 * This is the ONLY component allowed to generate HTML for email digests
 * All dynamic values must be escaped via escapeHtml() before insertion
 */
export function renderDigestEmail({
  shopName,
  alerts,
  generatedAt,
  explanations,
}: {
  shopName: string;
  alerts: AlertRow[];
  generatedAt: Date;
  explanations?: Record<string, { html: string; text: string }>;
}): { html: string; text: string } {
  // Format the generated date for display (UTC)
  const generatedAtString = generatedAt.toISOString().split('T')[0];

  // Escape shop name for HTML
  const escapedShopName = escapeHtml(shopName);

  // Initialize explanations if not provided
  const explanationMap = explanations || {};

  // Build HTML version
  let html = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <title>ReturnPilot Daily Refund Digest</title>
  </head>
  <body style="margin: 0; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
      <div style="background-color: #f8f9fa; padding: 20px; border-bottom: 1px solid #e9ecef;">
        <h1 style="margin: 0; color: #333; font-size: 24px;">ReturnPilot Daily Refund Digest</h1>
        <p style="margin: 5px 0 0; color: #666; font-size: 14px;">${generatedAtString} (UTC)</p>
      </div>

      <div style="padding: 20px;">
        <p style="margin: 0 0 15px; color: #333; font-size: 16px;">Hello ${escapedShopName},</p>
        <p style="margin: 0 0 15px; color: #555; font-size: 16px;">
          Here are your refund alerts detected since the last digest:
        </p>
  `;

  if (alerts.length === 0) {
    html += `
        <p style="margin: 0 0 15px; color: #666; font-size: 16px;">
          No new refund alerts detected.
        </p>
    `;
  } else {
    html += `
        <table style="width: 100%; border-collapse: collapse; margin: 0 0 20px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; font-size: 14px; color: #495057;">Order</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; font-size: 14px; color: #495057;">Refund ID</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; font-size: 14px; color: #495057;">Reason</th>
              <th style="padding: 12px; text-align: right; border-bottom: 2px solid #dee2e6; font-size: 14px; color: #495057;">Amount</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; font-size: 14px; color: #495057;">Detected</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6; font-size: 14px; color: #495057;">Explanation</th>
            </tr>
          </thead>
          <tbody>
    `;

    for (const alert of alerts) {
      // Format money values
      const moneyAtRiskFormatted = formatMoney(alert.money_at_risk.toString(), alert.currency);

      // Escape all dynamic values
      const escapedOrderName = escapeHtml(alert.order_name ?? alert.shopify_order_id);
      const escapedRefundId = escapeHtml(alert.shopify_refund_id);
      const escapedReason = escapeHtml(
        alert.reason
          .replace('_', ' ')
          .replace(/\b\w/g, c => c.toUpperCase())
      );
      const escapedDetectedAt = escapeHtml(
        new Date(alert.detected_at).toLocaleString(undefined, {
          dateStyle: 'short',
          timeStyle: 'short',
        })
      );

      // Get explanation summary for this alert
      const explanationSummary = explanationMap[alert.id] || { html: '', text: '' };
      const explanationHtml = explanationSummary.html;

      html += `
            <tr>
              <td style="padding: 12px; border-bottom: 1px solid #eee;">${escapedOrderName}</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee;">${escapedRefundId}</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee;">${escapedReason}</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${moneyAtRiskFormatted}</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee;">${escapedDetectedAt}</td>
              <td style="padding: 12px; border-bottom: 1px solid #eee; max-width: 200px; overflow: hidden; text-overflow: ellipsis;">
                ${explanationHtml}
              </td>
            </tr>
      `;
    }

    html += `
          </tbody>
        </table>

        <p style="margin: 0 0 15px; color: #333; font-size: 16px;">
          Total alerts in this period: ${alerts.length}
        </p>

        ${alerts.length > 50 ? `
        <p style="margin: 0 0 15px; color: #666; font-size: 14px; font-style: italic;">
          Showing first 50 alerts. Total alerts in window: ${alerts.length}
        </p>
        ` : ''}
    `;
  }

  html += `
        <p style="margin: 20px 0 0; color: #666; font-size: 14px;">
          This is an automated message from ReturnPilot. Please do not reply to this email.
        </p>
        <p style="margin: 5px 0 0; color: #999; font-size: 12px;">
          © ${new Date().getFullYear()} ReturnPilot. All rights reserved.
        </p>
      </div>
    </div>
  </body>
</html>
  `.trim();

  // Build plain text version
  let text = `ReturnPilot Daily Refund Digest
${generatedAtString} (UTC)

Hello ${shopName},

Here are your refund alerts detected since the last digest:

`;

  if (alerts.length === 0) {
    text += `No new refund alerts detected.

`;
  } else {
    text += `Order           Refund ID         Reason                Amount      Detected    Explanation
-----------    --------------    --------------------    ----------    ------------------    -----------
`;

    for (const alert of alerts) {
      // Format money values for text version
      const moneyAtRiskFormatted = formatMoney(alert.money_at_risk.toString(), alert.currency);

      // Format detected date for text version
      const detectedAtText = new Date(alert.detected_at).toLocaleString(undefined, {
        dateStyle: 'short',
        timeStyle: 'short',
      });

      // Truncate/pad fields for alignment
      const orderName = (alert.order_name ?? alert.shopify_order_id).padEnd(11).substring(0, 11);
      const refundId = alert.shopify_refund_id.padEnd(14).substring(0, 14);
      const reason = alert.reason
        .replace('_', ' ')
        .replace(/\b\w/g, c => c.toUpperCase())
        .padEnd(20).substring(0, 20);
      const amount = moneyAtRiskFormatted.padStart(10).substring(0, 10);
      const detected = detectedAtText.padEnd(19).substring(0, 19);
      const explanationText = explanationMap[alert.id]?.text || '';

      text += `${orderName}    ${refundId}    ${reason}    ${amount}    ${detected}    ${explanationText}\n`;
    }

    text += `

Total alerts in this period: ${alerts.length}

${alerts.length > 50 ? `Showing first 50 alerts. Total alerts in window: ${alerts.length}

` : ''}
  `;
  }

  text += `This is an automated message from ReturnPilot. Please do not reply to this email.
© ${new Date().getFullYear()} ReturnPilot. All rights reserved.`;

  return { html, text };
}