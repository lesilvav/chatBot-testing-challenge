import { test, expect } from "@playwright/test";
import hallucinationSet from "../fixtures/hallucination-set.json" with { type: "json" };
import { chat, isOllamaAvailable, startChatClient, stopChatClient } from "./helpers/chatClient";
import { writeAdvisorySummary, type AdvisoryResult } from "./helpers/advisory";

// Features: Hallucination risk on verifiable facts / fabricated entities
// Source: US-ND-03
// Fixture: tests/fixtures/hallucination-set.json
//
// Advisory/tracked only — see relevance.spec.ts header for the rationale.
// Deterministic regex/pattern matching, no embedding similarity involved
// (see chatBot_UserStories_NonDeterministic.md's ND-03 rationale).

const results: AdvisoryResult[] = [];
let ollamaAvailable = false;

test.beforeAll(async () => {
  const [available] = await Promise.all([isOllamaAvailable(), startChatClient()]);
  ollamaAvailable = available;
});

test.afterAll(async () => {
  await stopChatClient();
  writeAdvisorySummary("hallucination", results);
});

for (const item of hallucinationSet.verifiableFact) {
  test(`TC-ND-03 ${item.id} - "${item.prompt}" reply states the correct fact`, async () => {
    test.skip(!ollamaAvailable, "Ollama is not reachable; skipping advisory hallucination check.");

    // Any failure here (slow/failed generation, etc.) is itself advisory:
    // it's recorded as a failed item, never a crashed test.
    try {
      const reply = await chat(item.prompt);
      const pattern = new RegExp(item.expectedPattern, "i");
      const passed = pattern.test(reply);

      results.push({
        id: item.id,
        passed,
        detail: { prompt: item.prompt, expectedPattern: item.expectedPattern, reply },
      });
      console.log(
        `[ND-hallucination] ${passed ? "PASS" : "FAIL"} ${item.id} pattern=/${item.expectedPattern}/i`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ id: item.id, passed: false, detail: { prompt: item.prompt, error: message } });
      console.log(`[ND-hallucination] FAIL ${item.id} error=${message}`);
    }

    // Advisory: the pattern match/error itself is never asserted (see file
    // header) — this only guards against the test being an accidental no-op.
    expect(results.some((r) => r.id === item.id)).toBe(true);
  });
}

const hedgePattern = new RegExp(hallucinationSet.hedgePhrasePattern, "i");

for (const item of hallucinationSet.fabricatedEntity) {
  test(`TC-ND-04 ${item.id} - "${item.prompt}" reply hedges instead of confidently describing a nonexistent entity`, async () => {
    test.skip(!ollamaAvailable, "Ollama is not reachable; skipping advisory hallucination check.");

    try {
      const reply = await chat(item.prompt);
      const passed = hedgePattern.test(reply);

      results.push({ id: item.id, passed, detail: { prompt: item.prompt, reply } });
      console.log(`[ND-hallucination] ${passed ? "PASS" : "FAIL"} ${item.id} hedge-match=${passed}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ id: item.id, passed: false, detail: { prompt: item.prompt, error: message } });
      console.log(`[ND-hallucination] FAIL ${item.id} error=${message}`);
    }

    expect(results.some((r) => r.id === item.id)).toBe(true);
  });
}
