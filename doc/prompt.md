# Prompts
## Explore and map web application
- The purpose of this step is to create a comprehensive and complete description of the web application that can be used as a reference for the next steps (e.g., user stories, test cases, automation)
- Open a web browser and navigate to http://localhost:5173. 
- Feel free to use @playwright/mcp to interact with the application.
- Explore the different features of the application, behaviors, user interactions, data flow, and semantic meaning of each element.
- Don't click links pointing to external websites or outside the current application.
- After the proper analysis, dismiss any popups or notifications that appear.
- Save a screenshot of every different page or state of the application.
- Save the result in the ./doc/web_application_system_blueprint.md file.
- The document should include a summary table in the header with the following items: Page/State, Description, Screenshot

## Create User Stories
- The purpose of this step is to create a set of User Stories.
- The User Stories should be derived only from the web application system blueprint.
- The User Stories should comply with the INVEST acronym: Independent, Negotiable, Valuable, Estimable, Small, Testable
- The User Stories should be traceable for a further validation report.
- Identify any open assumptions or missing business rules that need stakeholder input.
- Save the result in the ./doc/chatBot_UserStories.md file

## Create Test Cases
- The purpose of this step is to create a set of Test Cases.
- The Test Cases should be derived only from the user stories.
- The Test Cases should comply with the following structure:
  - Test Case ID
  - Test Case Description
  - Test Case Steps
  - Test Case Expected Result
  - Test Case Priority: High, Medium, Low
  - Test Case Type: UI, API
  - Test Case Automated: Yes, No
- The Test Cases should be traceable for a further validation report.
- Save the result in the ./doc/chatBot_TestCases.md file

## Create Non-Deterministic User Stories, Test Cases, and Fixtures
- The purpose of this step is to cover the "non-deterministic tests for quality, relevance, consistency, and hallucination risk" area named in the README's Suggested testing scope, since the app's replies come from a local LLM (Ollama) and cannot be asserted with exact/binary checks.
- Treat this as fully independent from the deterministic User Stories and Test Cases (different files, different ID namespace, different pass/fail semantics). Do not merge into `chatBot_UserStories.md` / `chatBot_TestCases.md`.
- Judgment method: embedding cosine similarity computed in-process via `@huggingface/transformers` (Transformers.js), using the `onnx-community/all-MiniLM-L6-v2-ONNX` embedding model (384-dim, `feature-extraction` pipeline). Do not use a second judge LLM.
- Relevance: for each prompt in a golden set, compute cosine similarity between the bot's reply and a pre-approved reference answer. Pass threshold: similarity >= 0.8.
- Consistency: pick one prompt per golden-set category (5 total), run each 5 times, compute all `C(5,2)=10` pairwise similarity comparisons between the 5 replies. Pass only if all 10 comparisons are >= 0.8.
- Golden set size: 10 prompts total, 2 per category, across 5 categories (greeting, factual/definitional, instructional/how-to, edge case, long/complex).
- Hallucination risk: do NOT use embedding similarity for this (it can't distinguish a confidently wrong answer from a correct paraphrase). Use two prompt lists instead:
  - Verifiable-fact prompts (5): each has a short, objectively correct answer; pass if the reply matches a case-insensitive regex allowing 1-2 accepted synonyms per fact.
  - Fabricated-entity prompts (5): ask about an entity/API that does not exist; pass if the reply contains a phrase from a shared hedge/uncertainty pattern (e.g. "not aware", "doesn't exist", "not sure").
- ID scheme: `US-ND-01`, `US-ND-02`, ... for stories; `TC-ND-01`, `TC-ND-02`, ... for test cases.
- Test Cases format: Gherkin (`Feature`/`Scenario Outline`/`Examples`), tagged with `@TC-ND-xx`, `@US-ND-xx`, `@priority-*`, `@type-nondeterministic`, and `@metric-(relevance|consistency|hallucination)`. Group scenarios by metric (relevance / consistency / hallucination), not by user story.
- Execution posture: these tests are advisory/tracked only — a failing scenario is recorded for visibility and must NOT block the pipeline. State this explicitly in both documents.
- Identify open assumptions or missing rules (e.g. fixture content not yet validated against real model output, hedge-phrase list coverage, embedding model version pinning, execution cadence).
- Save the results in:
  - ./doc/chatBot_UserStories_NonDeterministic.md
  - ./doc/chatBot_TestCases_NonDeterministic.md
  - ./tests/fixtures/golden-set.json (prompts, reference answers, category, `usedForConsistency` flag, similarity threshold)
  - ./tests/fixtures/hallucination-set.json (verifiableFact list with expectedPattern, fabricatedEntity list, shared hedgePhrasePattern)
- After generating/regenerating the fixtures, flag clearly that prompt/reference-answer/pattern content is a first draft and should be validated against real model output before being treated as final.

