import { defineConfig } from "@playwright/test";

/**
 * Playwright configuration.
 *
 * Only the "api" project is active for now. API specs spin up their own
 * isolated in-process backend instance per test/file (see
 * tests/api/helpers/testServer.ts) on an ephemeral port, so no `webServer`
 * or global `baseURL` is configured here.
 *
 * A "ui"/"e2e" project (testDir: "./tests/e2e") will be added later once UI
 * automation is implemented.
 */
export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "./test-results",
  projects: [
    {
      name: "api",
      testDir: "./tests/api",
    },
  ],
});
