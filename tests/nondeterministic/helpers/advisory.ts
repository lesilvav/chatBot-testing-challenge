import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export interface AdvisoryResult {
  id: string;
  passed: boolean;
  detail: Record<string, unknown>;
}

/**
 * These non-deterministic checks are advisory/tracked only
 * (chatBot_UserStories_NonDeterministic.md: "results are reported/tracked,
 * not a merge-blocking gate"). A failing item must never fail the
 * Playwright suite itself — instead it's written here to a JSON artifact
 * for later review, since "Advisory/tracked has no defined process" is
 * still an open assumption (chatBot_OpenAssumptions_NonDeterministic.md).
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

  console.log(
    `[advisory:${metric}] ${passed}/${results.length} passed (threshold-based, non-blocking) -> ${outPath}`,
  );
}
