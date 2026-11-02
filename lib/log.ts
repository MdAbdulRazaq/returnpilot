/**
 * Minimal logging — no framework, no persistence.
 * Vercel serverless discards local files between invocations.
 */
export function logInfo(message: string, meta?: Record<string, unknown>) {
  console.log(JSON.stringify({ level: 'info', message, ...meta, timestamp: new Date().toISOString() }));
}

export function logError(message: string, error: unknown, meta?: Record<string, unknown>) {
  const err = error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error;
  console.error(JSON.stringify({ level: 'error', message, error: err, ...meta, timestamp: new Date().toISOString() }));
}