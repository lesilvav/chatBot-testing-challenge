# ChatBot User Stories — Non-Deterministic Testing

| LLM used | Date | Summary |
| ---- | ---- | ---- |
| Cascade (Claude) | 2026-07-10 | User Stories for the non-deterministic quality dimensions called out in `README.md` → *Suggested testing scope* ("non-deterministic tests for quality, relevance, consistency, and hallucination risk"). Independent of the deterministic `chatBot_UserStories.md` (US-01–US-12). Scope, thresholds, and methodology were settled interactively and are logged in "Design decisions" below. |

## Relationship to the deterministic User Stories

This file is **independent** of `chatBot_UserStories.md`. The deterministic stories (US-01–US-12) assert exact, binary outcomes (status codes, element presence, literal error text). These three stories (`ND-01`–`ND-03`) assert **statistical/threshold-based** outcomes over real LLM output, and are treated as **advisory/tracked, not release-blocking**.

## Design decisions (locked in for this scope)

- **Judgment method**: embedding cosine similarity, computed in-process via `@huggingface/transformers` (Transformers.js, no second judge LLM, no external API), using the `onnx-community/all-MiniLM-L6-v2-ONNX` embedding model (384-dim, `feature-extraction` pipeline).
- **Relevance & consistency threshold**: cosine similarity ≥ `0.8`.
- **Consistency protocol**: 5 runs per prompt; all `C(5,2) = 10` pairwise similarity comparisons must be ≥ `0.8` to pass.
- **Hallucination protocol**: not similarity-based — a fact/pattern checklist (see `US-ND-03`), because embedding similarity cannot distinguish a confidently wrong answer from a correct paraphrase (same topic/structure, different facts).
- **Data source**: `tests/fixtures/golden-set.json` (relevance + consistency) and `tests/fixtures/hallucination-set.json` (hallucination). Both are a first draft, **not yet validated against real model output**.
- **CI posture**: results are reported/tracked, not a merge-blocking gate, given known LLM output variance.

## Summary table

| ID | Title | Priority | Metric |
| ---- | ---- | ---- | ---- |
| ND-01 | Bot replies are semantically relevant to a golden reference answer | Medium | Embedding similarity ≥ 0.8 |
| ND-02 | Bot replies stay consistent across repeated identical prompts | Low | Pairwise embedding similarity ≥ 0.8 (5 runs) |
| ND-03 | Bot replies avoid hallucinating on verifiable facts and fabricated entities | Medium | Regex fact match / hedge-phrase presence |

## User Stories

### ND-01 — Bot replies are semantically relevant to a golden reference answer
- **As a** QA engineer
- **I want** each bot reply to a known prompt to be semantically close to a pre-approved reference answer
- **So that** I can detect drift or degraded response quality without requiring exact text matches

**Acceptance criteria**
- Given a prompt from `tests/fixtures/golden-set.json`, when it is submitted to the chatbot, then its embedding cosine similarity to the item's `referenceAnswer` is computed.
- Given the similarity score, when it is ≥ `0.8`, then the scenario passes; otherwise it is recorded as a failure for tracking, without blocking the pipeline.
- Given the full golden set (10 prompts across 5 categories: greeting, factual, how-to, edge, long), then each is evaluated independently and reported per-item.

**INVEST notes**: Independent of ND-02/ND-03 (different metric, different data slice); Negotiable on exact threshold/model; Valuable (catches quality regressions); Estimable/Small (bounded to 10 fixed prompts); Testable only in the statistical sense — a single run is a data point, not a verdict, since embedding models and prompts are deterministic but the LLM's output is not.

---

### ND-02 — Bot replies stay consistent across repeated identical prompts
- **As a** QA engineer
- **I want** to confirm the bot doesn't wildly contradict itself when asked the same question multiple times
- **So that** users get a stable experience rather than random, conflicting answers

**Acceptance criteria**
- Given a prompt flagged `usedForConsistency: true` in `tests/fixtures/golden-set.json` (one per category, 5 total), when it is submitted 5 times independently, then 5 replies are collected.
- Given the 5 replies, when all `C(5,2) = 10` pairwise embedding similarity comparisons are computed, then the scenario passes only if **all 10** comparisons are ≥ `0.8`.
- Given a failing comparison, then it is recorded for tracking without blocking the pipeline.

**INVEST notes**: Small in scope (5 prompts, not the full golden set) specifically to bound the cost of 5x repeated real LLM calls per prompt; Testable in the same statistical sense as ND-01; Independent — a prompt can be relevant (ND-01) yet inconsistent (ND-02) or vice versa, so both must be tracked separately.

---

### ND-03 — Bot replies avoid hallucinating on verifiable facts and fabricated entities
- **As a** QA engineer
- **I want** to check the bot doesn't confidently state wrong facts or invent details about things that don't exist
- **So that** users aren't misled by fabricated information

**Acceptance criteria**
- Given a prompt from the `verifiableFact` list in `tests/fixtures/hallucination-set.json` (5 prompts, each with a short objectively-correct answer), when submitted to the chatbot, then the reply must match the item's `expectedPattern` (case-insensitive regex, 1–2 accepted synonyms) to pass.
- Given a prompt from the `fabricatedEntity` list (5 prompts asking about entities/APIs that do not exist), when submitted to the chatbot, then the reply must contain at least one phrase matching the shared `hedgePhrasePattern` to pass.
- Given any failing item in either list, then it is recorded for tracking without blocking the pipeline.

**INVEST notes**: Testable via deterministic regex checks (no similarity scoring involved), which makes this story more binary/reliable than ND-01/ND-02 despite still operating on non-deterministic model output; Small (10 fixed prompts total, 5+5); Valuable — directly targets the "hallucination risk" requirement named in `README.md`.
