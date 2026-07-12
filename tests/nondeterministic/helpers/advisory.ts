import { mkdirSync, writeFileSync } from "node:fs";
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
 */
export function writeAdvisorySummary(metric: string, results: AdvisoryResult[]): void {
  const passed = results.filter((r) => r.passed).length;
  const summary = {
    metric,
    generatedAt: new Date().toISOString(),
    total: results.length,
    passed,
    failed: results.length - passed,
    results,
  };

  const outPath = join(process.cwd(), "test-results", "nondeterministic", `${metric}.json`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(summary, null, 2));

  console.log(`[advisory:${metric}] ${passed}/${results.length} passed -> ${outPath}`);
}
