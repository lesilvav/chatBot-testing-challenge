import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface AdvisoryResult {
  id: string;
  passed: boolean;
  detail: Record<string, unknown>;
}

/**
 * Writes a structured JSON artifact for a non-deterministic metric run,
 * independent of whether individual checks passed or failed.
 *
 * relevance.spec.ts, consistency.spec.ts, and hallucination.spec.ts all
 * assert their real outcome — a failing item fails its Playwright test and
 * shows red in the report. This JSON artifact is still written for every
 * run (pass or fail) so the underlying prompt/reply/similarity/pattern
 * detail can be reviewed without re-running the suite. Whether/how to gate
 * CI on this project's exit code is a pipeline-level decision, not
 * something this helper enforces.
 *
 * Playwright restarts the worker process after any failing test (built-in
 * isolation, not configurable), which resets this file's module-level
 * `results` array. That means afterAll/writeAdvisorySummary can run
 * multiple times across a single spec file's execution, each call only
 * "seeing" the subset of items that ran in its own worker generation. To
 * avoid losing earlier generations' data, this merges (upserts by `id`)
 * with whatever is already on disk rather than overwriting it. Playwright
 * clears its outputDir (this file's directory) once at the very start of
 * every invocation, so this still starts clean per run — it just also
 * means running one spec file currently clears the other metrics' JSON
 * too (no run-scoped reset marker yet, see globalSetup discussion).
 */
export function writeAdvisorySummary(metric: string, results: AdvisoryResult[]): void {
  const outPath = join(process.cwd(), "test-results", "nondeterministic", `${metric}.json`);
  mkdirSync(dirname(outPath), { recursive: true });

  const merged = new Map<string, AdvisoryResult>();
  if (existsSync(outPath)) {
    try {
      const previous = JSON.parse(readFileSync(outPath, "utf-8")) as { results?: AdvisoryResult[] };
      for (const r of previous.results ?? []) merged.set(r.id, r);
    } catch {
      // Corrupt/partial previous file (e.g. a crash mid-write) — ignore and
      // start fresh from this generation's results rather than fail the run.
    }
  }
  for (const r of results) merged.set(r.id, r);

  const mergedResults = [...merged.values()];
  const passed = mergedResults.filter((r) => r.passed).length;
  const summary = {
    metric,
    generatedAt: new Date().toISOString(),
    total: mergedResults.length,
    passed,
    failed: mergedResults.length - passed,
    results: mergedResults,
  };

  writeFileSync(outPath, JSON.stringify(summary, null, 2));

  console.log(`[advisory:${metric}] ${passed}/${mergedResults.length} passed -> ${outPath}`);
}
