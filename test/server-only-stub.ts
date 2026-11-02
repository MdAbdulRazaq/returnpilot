// Test stub for the `server-only` package.
//
// The real `server-only` module throws on import outside a React Server
// Component context. In Next.js production builds the `react-server` export
// condition swaps it for an empty module; vitest has no such condition, so we
// alias `server-only` to this no-op (see vitest.config.ts) to unit-test the
// server modules that (correctly) guard themselves with it.
export {};
