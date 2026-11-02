// lib/email/templates/explanation-digest.ts
import type { AlertRow } from '../types';
import type { Explanation } from '@/lib/detection/explanation/types';
import { escapeHtml } from '../utils/escapeHtml';
import { formatMoney } from '@/lib/dashboard/format';

/**
 * Template for rendering explanation summaries in email digests
 * Produces both HTML and plain text versions with configurable truncation
 */
export class ExplanationDigestTemplate {
  /**
   * Render explanation summary for an alert
   * @param alert The alert row data
   * @param explanation The explanation object (if available)
   * @param maxLength Maximum length for explanation summary (default 200)
   * @returns Object containing HTML and plain text explanation summaries
   */
  static renderExplanationSummary(
    alert: AlertRow,
    explanation: Explanation | null | undefined,
    maxLength: number = 200
  ): { html: string; text: string } {
    // If no explanation is available, return empty strings
    if (!explanation) {
      return { html: '', text: '' };
    }

    // Use the merchant explanation as the base for our summary
    const explanationText = explanation.merchantExplanation || '';

    // Truncate if necessary
    const truncatedExplanation =
      explanationText.length > maxLength
        ? explanationText.substring(0, maxLength - 3) + '...'
        : explanationText;

    // Escape for HTML
    const escapedExplanation = escapeHtml(truncatedExplanation);

    // Return both HTML and plain text versions
    return {
      html: `<p className="text-sm text-gray-600">${escapedExplanation}</p>`,
      text: truncatedExplanation
    };
  }

  /**
   * Check if explanations should be included in email digest based on configuration
   * @param explanationEnabled Configuration flag for explanation inclusion
   * @returns Boolean indicating whether to include explanations
   */
  static shouldIncludeExplanations(explanationEnabled: boolean): boolean {
    return explanationEnabled;
  }
}