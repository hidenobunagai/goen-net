import path from "node:path";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    environmentMatchGlobs: [
      ["tests/api/**", "node"],
      ["tests/actions/**", "node"],
    ],
    globals: true,
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/**",
        ".next/**",
        "tests/**",
        "**/*.config.*",
        "**/types/**",
        "src/components/emails/**",
        "src/lib/shims/**",
        "turbopack/**",
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
