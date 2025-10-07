import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import path from "node:path";

export default defineConfig(({ mode }) => {
  // Load env files for the specified mode
  const env = loadEnv(mode, process.cwd(), "");
  process.env = { ...process.env, ...env };

  return {
    test: {
      environment: "jsdom",
      globals: true,
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  };
});