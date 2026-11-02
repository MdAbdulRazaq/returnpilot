import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Repo root (no trailing slash) for resolving the `@/*` tsconfig path alias.
const root = fileURLToPath(new URL(".", import.meta.url)).replace(/\/$/, "");

export default defineConfig({
  resolve: {
    alias: [
      // Neutralize `server-only` so server modules can be imported in tests
      // (mirrors Next's `react-server` export condition). See test/server-only-stub.ts.
      {
        find: /^server-only$/,
        replacement: fileURLToPath(
          new URL("./test/server-only-stub.ts", import.meta.url),
        ),
      },
      // `@/lib/x` → `<root>/lib/x`, matching tsconfig.json "paths".
      { find: /^@\//, replacement: `${root}/` },
    ],
  },
  test: {
    environment: "jsdom",
    include: ["**/*.test.ts", "**/*.test.tsx"],
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
  },
});