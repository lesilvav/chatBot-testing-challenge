import { test, expect } from "@playwright/test";
import goldenSet from "../fixtures/golden-set.json" with { type: "json" };
import { chat, isOllamaAvailable, startChatClient, stopChatClient } from "./helpers/chatClient";
import { cosineSimilarity, embed, warmUpEmbeddingModel } from "./helpers/embedding";
import { writeAdvisorySummary, type AdvisoryResult } from "./helpers/advisory";

// Feature: Response consistency across repeated identical prompts
// Source: US-ND-02
// Fixture: tests/fixtures/golden-set.json (items where usedForConsistency = true)
//
// Each prompt is run goldenSet.consistency.runsPerPrompt times sequentially
// (same worker, no concurrency, to avoid hammering the local Ollama
// instance). All pairwise similarities across those runs are asserted for
// real via minSimilarity below: a below-threshold or errored item fails
// this test and shows up as failed in the Playwright report (see
// relevance.spec.ts's header for the full rationale). Every outcome (pass
// or fail) is also written via writeAdvisorySummary to test-results/
// nondeterministic/consistency.json for structured review.

const results: AdvisoryResult[] = [];
let ollamaAvailable = false;

const RUNS = goldenSet.consistency.runsPerPrompt;
const THRESHOLD = goldenSet.consistency.threshold;
const consistencyItems = goldenSet.items.filter((item) => item.usedForConsistency);

test.beforeAll(async () => {
  const [available] = await Promise.all([
    isOllamaAvailable(),
    startChatClient(),
    warmUpEmbeddingModel(),
  ]);
  ollamaAvailable = available;
});

test.afterAll(async () => {
  await stopChatClient();
  writeAdvisorySummary("consistency", results);
});

for (const item of consistencyItems) {
  test(`TC-ND-02 ${item.id} - "${item.prompt}" stays consistent across ${RUNS} repeated runs`, async () => {
    test.skip(!ollamaAvailable, "Ollama is not reachable; skipping advisory consistency check.");

    // Any infra failure here (a slow/failed run, embedding error, etc.) is
    // caught below and recorded as a failed item with the error detail;
    // minSimilarity stays at its initial 0 so the assertion below still
    // fails the test.
    let minSimilarity = 0;
    try {
      const replies: string[] = [];
      for (let i = 0; i < RUNS; i++) {
        replies.push(await chat(item.prompt));
      }
      const vectors = await Promise.all(replies.map((reply) => embed(reply)));

      const pairwise: { pair: string; similarity: number }[] = [];
      for (let i = 0; i < vectors.length; i++) {
        for (let j = i + 1; j < vectors.length; j++) {
          pairwise.push({
            pair: `${i + 1}-${j + 1}`,
            similarity: cosineSimilarity(vectors[i], vectors[j]),
          });
        }
      }
      const passed = pairwise.every((p) => p.similarity >= THRESHOLD);

      results.push({
        id: item.id,
        passed,
        detail: { prompt: item.prompt, threshold: THRESHOLD, pairwise, replies },
      });
      minSimilarity = Math.min(...pairwise.map((p) => p.similarity));
      console.log(
        `[ND-consistency] ${passed ? "PASS" : "FAIL"} ${item.id} min=${minSimilarity.toFixed(3)} (>= ${THRESHOLD})`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ id: item.id, passed: false, detail: { prompt: item.prompt, error: message } });
      console.log(`[ND-consistency] FAIL ${item.id} error=${message}`);
    }

    // Real assertion: fails the test (and shows red in the report) whenever
    // the minimum pairwise similarity is below threshold, whether from an
    // inconsistent reply or a caught error above (minSimilarity left at 0).
    expect(minSimilarity, `min pairwise similarity too low for ${item.id}`).toBeGreaterThanOrEqual(THRESHOLD);
  });
}
