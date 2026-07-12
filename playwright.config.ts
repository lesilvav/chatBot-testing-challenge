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

// Playwright's `webServer` is only a top-level TestConfig option — there is
// no per-project equivalent (see node_modules/playwright/types/test.d.ts:
// TestProject vs TestConfig). All npm scripts invoke Playwright with an
// explicit `--project=<name>` (see package.json), so this inspects argv to
// decide whether "ui" is actually being run and only then starts/reuses the
// dev server. When no --project filter is present at all (e.g. plain
// `npx playwright test`), every project runs, including "ui", so it's kept.
function shouldStartWebServerForUi(): boolean {
  const argv = process.argv.slice(2);
  const projectValues: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--project") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) projectValues.push(next);
    } else if (arg.startsWith("--project=")) {
      projectValues.push(arg.slice("--project=".length));
    }
  }
  return projectValues.length === 0 || projectValues.includes("ui");
}

export default defineConfig({
  testDir: "./tests",
  timeout: 30_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  outputDir: "./test-results",
  webServer: shouldStartWebServerForUi()
    ? {
        command: "npm run dev",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      }
    : undefined,
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
      timeout: 300_000,
      fullyParallel: false,
    },
  ],
});
