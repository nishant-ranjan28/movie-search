import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["src/test/setup.ts"],
    css: true,
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["node_modules", "dist", "legacy/**"],
    coverage: { provider: "v8", reporter: ["text", "lcov"] },
    // Stub VITE_TMDB_KEY for tests so client.request() doesn't short-circuit
    // when .env.local is missing (e.g., on CI). MSW intercepts the actual
    // network call regardless of key value.
    env: {
      VITE_TMDB_KEY: "TEST_KEY",
    },
  },
});
