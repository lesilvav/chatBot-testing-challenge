import { defineConfig } from "@playwright/test";

/**
 * Playwright configuration.
 *
 * - "api" project: specs spin up their own isolated in-process backend
 *   instance per test/file (see tests/api/helpers/testServer.ts) on an
 *   ephemeral port, so no `webServer`/`baseURL` dependency there.
 * - "ui" project: real-browser specs against the actual dev stack
 *   (frontend + backend via `npm run dev`), started/reused via `webServer`.
 * - "nondeterministic" project: advisory/tracked LLM-quality checks
 *   (relevance, consistency, hallucination) against the real Ollama model
 *   plus an in-process embedding model. Own isolated backend instance like
 *   "api", a much longer per-test timeout (real generation + embedding
 *   model load), and no parallelism to avoid hammering the local Ollama
 *   instance with concurrent requests (see tests/nondeterministic/).
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
    {
      name: "nondeterministic",
      testDir: "./tests/nondeterministic",
      // Worst case is the consistency check: 5 sequential chat() calls,
      // each capped at 45s client-side (see tests/nondeterministic/helpers/
      // chatClient.ts), plus embedding overhead.
      timeout: 300_000,
      fullyParallel: false,
    },
  ],
});
