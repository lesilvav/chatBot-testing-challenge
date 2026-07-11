import { defineConfig } from "@playwright/test";

/**
 * Playwright configuration.
 *
 * - "api" project: specs spin up their own isolated in-process backend
 *   instance per test/file (see tests/api/helpers/testServer.ts) on an
 *   ephemeral port, so no `webServer`/`baseURL` dependency there.
 * - "ui" project: real-browser specs against the actual dev stack
 *   (frontend + backend via `npm run dev`), started/reused via `webServer`.
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "./test-results",
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    {
      name: "api",
      testDir: "./tests/api",
    },
    {
      name: "ui",
      testDir: "./tests/e2e",
      use: {
        baseURL: "http://localhost:5173",
      },
    },
  ],
});
