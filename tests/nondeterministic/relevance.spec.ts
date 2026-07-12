import { test, expect } from "@playwright/test";
import goldenSet from "../fixtures/golden-set.json" with { type: "json" };
import { chat, isOllamaAvailable, startChatClient, stopChatClient } from "./helpers/chatClient";
import { cosineSimilarity, embed, warmUpEmbeddingModel } from "./helpers/embedding";
import { writeAdvisorySummary, type AdvisoryResult } from "./helpers/advisory";

// Feature: Response relevance against golden answers
// Source: US-ND-01
// Fixture: tests/fixtures/golden-set.json (all 10 items)
//
// Advisory/tracked only (chatBot_UserStories_NonDeterministic.md): a
// below-threshold item is recorded for visibility via writeAdvisorySummary,
// it must NOT fail this suite. Real Ollama, real embedding model, no mocking.

const results: AdvisoryResult[] = [];
let ollamaAvailable = false;

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
  writeAdvisorySummary("relevance", results);
});

for (const item of goldenSet.items) {
  test(`TC-ND-01 ${item.id} - "${item.prompt}" is semantically relevant to the golden reference answer`, async () => {
    test.skip(!ollamaAvailable, "Ollama is not reachable; skipping advisory relevance check.");

    let passed = false;
    // Any failure here (slow/failed generation, embedding error, etc.) is
    // itself advisory: it's recorded as a failed item, never a crashed test.
    try {
      const reply = await chat(item.prompt);
      const [replyVector, referenceVector] = await Promise.all([
        embed(reply),
        embed(item.referenceAnswer),
      ]);
      const similarity = cosineSimilarity(replyVector, referenceVector);
      passed = similarity >= goldenSet.similarityThreshold;

      results.push({
        id: item.id,
        passed,
        detail: {
          prompt: item.prompt,
          referenceAnswer: item.referenceAnswer,
          reply,
          similarity,
          threshold: goldenSet.similarityThreshold,
        },
      });
      console.log(
        `[ND-relevance] ${passed ? "PASS" : "FAIL"} ${item.id} similarity=${similarity.toFixed(3)} (>= ${goldenSet.similarityThreshold})`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ id: item.id, passed: false, detail: { prompt: item.prompt, error: message } });
      console.log(`[ND-relevance] FAIL ${item.id} error=${message}`);
    }

    // Advisory: the threshold/error itself is never asserted here (see file
    // header) — this only guards against the test being an accidental no-op.
    expect(passed, `similarity/pattern check failed for ${item.id}`).toBe(true);
  });
}
