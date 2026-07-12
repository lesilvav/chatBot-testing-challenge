import { test, expect } from "@playwright/test";
import hallucinationSet from "../fixtures/hallucination-set.json" with { type: "json" };
import { chat, isOllamaAvailable, startChatClient, stopChatClient } from "./helpers/chatClient";
import { writeAdvisorySummary, type AdvisoryResult } from "./helpers/advisory";

// Features: Hallucination risk on verifiable facts / fabricated entities
// Source: US-ND-03
// Fixture: tests/fixtures/hallucination-set.json
//
// Each item's reply is checked via deterministic regex/pattern matching (no
// embedding similarity involved) and asserted for real: a failing or errored
// item fails this test and shows up as failed in the Playwright report (see
// relevance.spec.ts's header for the full rationale). Every outcome (pass or
// fail) is also written via writeAdvisorySummary to test-results/
// nondeterministic/hallucination.json for structured review.

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

    let passed = false;
    // Any infra failure here (slow/failed generation, etc.) is caught below
    // and recorded as a failed item with the error detail; `passed` stays
    // false so the assertion below still fails the test.
    try {
      const reply = await chat(item.prompt);
      const pattern = new RegExp(item.expectedPattern, "i");
      passed = pattern.test(reply);

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

    // Real assertion: fails the test (and shows red in the report) whenever
    // the pattern match didn't pass, whether due to a wrong reply or a
    // caught error above.
    expect(passed, `expected pattern check failed for ${item.id}`).toBe(true);
  });
}

const hedgePattern = new RegExp(hallucinationSet.hedgePhrasePattern, "i");

for (const item of hallucinationSet.fabricatedEntity) {
  test(`TC-ND-04 ${item.id} - "${item.prompt}" reply hedges instead of confidently describing a nonexistent entity`, async () => {
    test.skip(!ollamaAvailable, "Ollama is not reachable; skipping advisory hallucination check.");

    let passed = false;
    // Any infra failure here (slow/failed generation, etc.) is caught below
    // and recorded as a failed item with the error detail; `passed` stays
    // false so the assertion below still fails the test.
    try {
      const reply = await chat(item.prompt);
      passed = hedgePattern.test(reply);

      results.push({ id: item.id, passed, detail: { prompt: item.prompt, reply } });
      console.log(`[ND-hallucination] ${passed ? "PASS" : "FAIL"} ${item.id} hedge-match=${passed}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({ id: item.id, passed: false, detail: { prompt: item.prompt, error: message } });
      console.log(`[ND-hallucination] FAIL ${item.id} error=${message}`);
    }

    // Real assertion: fails the test (and shows red in the report) whenever
    // the reply didn't hedge, whether due to a confident hallucination or a
    // caught error above.
    expect(passed, `hedge-phrase check failed for ${item.id}`).toBe(true);
  });
}
