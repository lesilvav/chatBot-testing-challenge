import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

/**
 * Unit test configuration (Vitest), kept separate from `vite.config.ts`
 * since that file sets `root: "src/frontend"` for the dev server/build,
 * while unit tests live under `tests/unit/` at the repo root.
 */
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/unit/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    css: false,
  },
});
