// HTML escaping utility for email rendering
// This helper is strictly for HTML contexts only - never use for SQL, URLs, headers, or logs

/**
 * Escapes HTML special characters to prevent XSS.
 * @param str - String to escape (must be a string)
 * @returns Escaped string safe for HTML contexts.
 * @throws {TypeError} If input is not a string.
 */
export function escapeHtml(str: string): string {
  if (typeof str !== "string") {
    throw new TypeError("escapeHtml only accepts string inputs");
  }

  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}