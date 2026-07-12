# Local LLM Chatbot Challenge App (Ollama)

Minimal chatbot web app running fully local through Ollama.

The repository is intentionally small so it can be used as the base application
for a testing challenge focused on deterministic and non-deterministic behavior
without depending on cloud LLM quotas.

## Purpose

This repository provides a clean app baseline for testers.

It is not a testing framework. The candidate is expected to build the testing
strategy and tooling on top of this app in a fork or in a derived repository.

## Architecture

The application has two runtime parts:

- React frontend served by Vite.
- Express backend that calls a local Ollama model.

During local development:

- Frontend runs on `http://localhost:5173`.
- Backend runs on `http://localhost:3001`.
- Frontend requests to `/api/*` are proxied to backend.

### Request flow

1. User types a message in the frontend.
2. Frontend sends `POST /api/chat` with `{ "message": "..." }`.
3. Backend validates the payload.
4. Backend calls Ollama `POST /api/generate` (local).
5. Backend returns `{ "reply": "...", "latencyMs": number }`.
6. Frontend renders the assistant response.

## Tech stack

| Layer | Technology |
| ---- | ---- |
| Frontend | React 18, TypeScript, Vite |
| Backend | Node.js, Express, TypeScript |
| LLM integration | Ollama local HTTP API |
| Runtime config | dotenv |

## Project structure

```text
.
├── src/
│   ├── backend/
│   │   ├── app.ts
│   │   ├── config.ts
│   │   ├── ollama.ts
│   │   ├── server.ts
│   │   ├── timeout.ts
│   │   └── validation.ts
│   └── frontend/
│       ├── api.ts
│       ├── App.tsx
│       ├── index.html
│       ├── main.tsx
│       └── styles.css
├── .env.example
├── .npmrc
├── package.json
├── tsconfig.json
├── tsconfig.build.json
└── vite.config.ts
```

## Backend

The backend entry point is `src/backend/server.ts`. It creates the Express app
from `src/backend/app.ts` and starts listening on the configured port.

### Backend responsibilities

- Parse JSON requests.
- Enable CORS for the frontend.
- Validate incoming chat messages.
- Enforce timeout budget for local model calls.
- Translate Ollama failures into API-friendly HTTP responses.

### Endpoints

#### `GET /api/openapi.json`

Returns the OpenAPI specification in JSON format for the backend services.

#### `GET /api/docs`

Serves Swagger UI for interactive backend API documentation and testing.

#### `GET /api/health`

Health endpoint to verify backend status.

Example response:

```json
{
  "status": "ok",
  "model": "qwen2.5:3b-instruct"
}
```

#### `POST /api/chat`

Accepts user message and returns model response.

Request body:

```json
{
  "message": "Explain what an LLM is in simple terms"
}
```

Successful response:

```json
{
  "reply": "An LLM is a model trained to understand and generate language...",
  "latencyMs": 842
}
```

Possible error responses:

- `400` when `message` is missing, empty, not a string, or too long.
- `429` when upstream model/provider rate limit is reached.
- `503` when local model service is unavailable (for example Ollama not running).
- `502` for upstream failures that do not map to a specific status.
- `504` when the model exceeds timeout budget.

### API docs (Swagger UI)

When backend is running, API documentation is available at:

- `http://localhost:3001/api/docs` (interactive Swagger UI)
- `http://localhost:3001/api/openapi.json` (raw OpenAPI spec)

Use Swagger UI to test backend services:

1. Open `http://localhost:3001/api/docs`.
2. Expand `GET /api/health` and click **Try it out** then **Execute**.
3. Expand `POST /api/chat`, click **Try it out**, set request body:

```json
{
  "message": "Say hello in one short sentence."
}
```

4. Click **Execute** and review status code + response body.

### Backend modules

- `src/backend/app.ts`: Express app and route handling.
- `src/backend/server.ts`: backend bootstrap.
- `src/backend/config.ts`: environment variable loading and defaults.
- `src/backend/ollama.ts`: Ollama HTTP client and response parsing.
- `src/backend/validation.ts`: input validation rules.
- `src/backend/timeout.ts`: generic timeout wrapper.

## Frontend

The frontend is intentionally minimal.

### Frontend responsibilities

- Render chat interface.
- Keep message history in memory.
- Send requests to backend.
- Display loading and error states.

### Frontend modules

- `src/frontend/App.tsx`: main chat UI and state management.
- `src/frontend/api.ts`: wrapper around `/api/chat`.
- `src/frontend/main.tsx`: React bootstrap.
- `src/frontend/index.html`: Vite HTML entry.
- `src/frontend/styles.css`: base styles.

## Configuration

The app reads runtime settings from environment variables.

| Variable | Required | Description |
| ---- | ---- | ---- |
| `OLLAMA_BASE_URL` | No | Ollama base URL. Default: `http://localhost:11434`. |
| `OLLAMA_MODEL` | No | Local model tag to use. Default: `qwen2.5:3b-instruct`. |
| `PORT` | No | Backend port. Default: `3001`. |
| `REQUEST_TIMEOUT_MS` | No | Timeout budget per model request. Default: `20000`. |

## Prerequisites

Before running the app, make sure you have:

- Node.js 20 or newer.
- npm available in your environment.
- Ollama installed locally.

## Install Ollama (macOS, Linux, Windows)

### macOS

1. Install from https://ollama.com/download.
2. Launch Ollama.
3. Verify:

```bash
ollama --version
```

### Linux

1. Install from https://ollama.com/download/linux.
2. Start service (if needed):

```bash
sudo systemctl start ollama
```

3. Verify service/API:

```bash
curl -s http://localhost:11434/api/tags
```

### Windows

1. Install from https://ollama.com/download/windows.
2. Open Ollama app (or start service from installed shortcut).
3. Verify in PowerShell:

```powershell
ollama --version
```

## Choose and pull a local model

After installing Ollama, pull one model before starting the app.

Recommended small models for lower-resource laptops:

- `qwen2.5:3b-instruct` (default in this repo)
- `phi3:mini`
- `gemma2:2b`

Example:

```bash
ollama pull qwen2.5:3b-instruct
```

You can check downloaded models with:

```bash
ollama list
```

## Environment setup

Create your local environment file:

```bash
cp .env.example .env
```

Default `.env` values are already local-only and free to run:

```env
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=qwen2.5:3b-instruct
PORT=3001
REQUEST_TIMEOUT_MS=20000
```

If you pulled a different model, update `OLLAMA_MODEL` accordingly.

`.env` is ignored by Git and must not be committed.

## Install dependencies

```bash
npm install
```

The repository includes `.npmrc` pointing to the public npm registry.

## Run the app

### Start frontend and backend together

```bash
npm run dev
```

This starts:

- backend on `http://localhost:3001`
- frontend on `http://localhost:5173`

Open `http://localhost:5173` in your browser.

### Manual verification after startup

1. Confirm Ollama is running and model exists:

```bash
ollama list
```

2. Open `http://localhost:5173`.
3. Type a simple prompt (example: `Say hello in one short sentence.`).
4. Click **Send**.
5. Confirm a bot response appears in the UI.

If no response appears:

- Verify Ollama is running.
- Verify `OLLAMA_MODEL` exists in `ollama list`.
- Check backend logs for `503`, `502`, or `504`.

### Start only the backend

```bash
npm run dev:server
```

### Start only the frontend

```bash
npm run dev:web
```

## Build and run in production mode

Create frontend bundle:

```bash
npm run build
```

Start backend runtime:

```bash
npm run start
```

## Low-resource machine recommendations

If the computer is slow or has limited RAM:

- Prefer 2B to 3B models (`gemma2:2b`, `qwen2.5:3b-instruct`, `phi3:mini`).
- Keep prompts short.
- Increase `REQUEST_TIMEOUT_MS` if timeouts are frequent.
- Avoid running other heavy processes in parallel.

This setup is still valid for the challenge because the focus is testing strategy,
not peak model quality.

## Operational notes

- LLM responses are non-deterministic by nature.
- Local models may vary in quality depending on model size and hardware.
- `503` usually indicates Ollama service is not reachable.
- `504` indicates the model exceeded timeout budget.
- `429` may appear depending on provider/model behavior or middleware constraints.

These behaviors are part of the app reality and are relevant for API, UI, and
non-deterministic testing scenarios.

## Testing Strategy

The testing framework covers four layers: unit, API, UI (end-to-end), and non-deterministic LLM quality. Each layer has a dedicated Playwright project (or Vitest for units), its own test directory, and a specific npm script.

### Setup

Complete the standard app setup first (see [Prerequisites](#prerequisites), [Environment setup](#environment-setup), and [Install dependencies](#install-dependencies) above), then install Playwright browsers:

```bash
npx playwright install
```

No extra dependencies are required. The model (`Xenova/all-MiniLM-L6-v2`) used for the embedding comparison in non-deterministic tests is downloaded automatically on the first run.

### Running tests

| Suite | Command | Requires Ollama | Requires dev server |
| --- | --- | --- | --- |
| Unit | `npm run test:unit` | No | No |
| API | `npm run test:api` | Only TC-03 (skipped if unavailable) | No |
| UI | `npm run test:ui` | Only TC-01 (skipped if unavailable) | Auto-started |
| Non-deterministic | `npm run test:nd` | Yes (skipped if unavailable) | No |
| All Playwright projects | `npx playwright test` | See above | Auto-started |

The `test:ui` command (and `npx playwright test`) automatically starts `npm run dev` via Playwright's `webServer` configuration and waits for `http://localhost:5173` to be ready before executing tests. If the server is already started, it will skip the auto-start. The `test:api` and `test:nd` create an isolated back end instance.

View the last HTML report after any Playwright run:

```bash
npm run test:api:report
```

### Deterministic tests

#### Unit tests (`npm run test:unit`)

Vitest tests under `tests/unit/`. These run with no backend, no browser, and no Ollama dependency.

- **`api.test.ts`**: Tests the frontend `sendChat` function in isolation against a mocked `fetch`. Covers the success path, server-provided error messages, and all default fallback messages for HTTP status codes 429, 503, 504, 502, and 500.
- **`App.test.tsx`**: Tests the React `App` component in isolation using `@testing-library/react`. Covers initial render, user input, loading state during a pending request, successful reply rendering, and error display.

#### API tests (`npm run test:api`)

Playwright tests under `tests/api/`. Each test or group of tests starts its own isolated in-process Express backend on an ephemeral port — no shared server, no port conflicts. Ollama is not required for the error-scenario tests.

- **`health.spec.ts`**: `GET /api/health` returns `200` with `status: "ok"` and the configured model name.
- **`chat-success.spec.ts`**: `POST /api/chat` returns a non-empty `reply` string and a non-negative `latencyMs` when Ollama is reachable. Skipped gracefully when Ollama is unavailable.
- **`chat-validation.spec.ts`**: `POST /api/chat` rejects messages exceeding 2000 characters with `400` and confirms the model is never invoked.
- **`chat-errors.spec.ts`**: Verifies that the backend maps Ollama failures to the correct HTTP status codes. The real Ollama client is replaced with a controllable stub injected through `startTestServer()`, allowing each test to simulate a specific failure (rate-limit, service unavailable, timeout, or unclassified error) without needing Ollama to be running. Each test spins up its own server instance to keep stubs isolated.

#### UI / E2E tests (`npm run test:ui`)

Playwright tests under `tests/e2e/`. Run in a real Chromium browser against the actual Vite dev server (`http://localhost:5173`), which is started automatically.

- **`chat-happy-path.spec.ts`**: Sends a message via the Send button, confirms the user bubble appears immediately, and waits for the bot reply bubble to populate. Skipped if Ollama is unreachable.
- **`chat-validation.spec.ts`**: Fills an over-length message and confirms the UI renders the server's validation error alert. No Ollama dependency.
- **`chat-mocked-error.spec.ts`**: Intercepts `POST /api/chat` at the browser network layer via Playwright route stubbing and confirms the UI displays the correct default rate-limit error message end-to-end through the real frontend `sendChat` fallback logic.
- **`mobile-viewport.spec.ts`**: Resizes the viewport to a mobile size and verifies the chat layout renders correctly.

### Non-deterministic tests

Non-deterministic tests are under `tests/nondeterministic/` and run as the `nondeterministic` Playwright project (`npm run test:nd`). Each test is a **real assertion**: a below-threshold or failed-pattern item fails its Playwright test and shows up as red in the report. Every result (pass or fail) is also written to a structured JSON artifact under `test-results/nondeterministic/` for detailed review of the underlying prompt, reply, similarity score, and pattern data.

#### How non-determinism is handled

The LLM produces different replies each run, so assertions use **embedding cosine similarity** (for relevance and consistency tests) and **regex pattern matching** (for hallucination tests) rather than exact string comparison. A configurable threshold determines what counts as passing. The thresholds and golden set were chosen conservatively so the suite is useful without being brittle.

LLM-as-a-judge was intentionally not used: it would require a second model (adding local resource pressure and setup complexity) and would introduce a second source of non-determinism into the evaluation itself.

#### Non-deterministic test cases

- **`relevance.spec.ts`** (US-ND-01): Each of the 5 golden-set items is sent to the chat backend. The reply is embedded with `Xenova/all-MiniLM-L6-v2` and compared to the `referenceAnswer` embedding via cosine similarity. The test passes if similarity ≥ `goldenSet.similarityThreshold`.

- **`consistency.spec.ts`** (US-ND-02): Items flagged `usedForConsistency=true` in the golden set are sent `goldenSet.consistency.runsPerPrompt` times. All pairwise similarities across the runs are computed; the test passes if every pair is ≥ `goldenSet.consistency.threshold`.

- **`hallucination.spec.ts`** (US-ND-03/ND-04): Two categories are checked:
  - **Verifiable facts**: Reply must match an `expectedPattern` regex (e.g. the correct capital, year, or fact).
  - **Fabricated entities**: Reply must contain a hedge phrase (e.g. "I don't know", "I'm not sure") rather than a confident description of a nonexistent thing.

#### Golden set

The initial golden set (`tests/fixtures/golden-set.json`) was generated using Claude Sonnet and then manually curated against actual LLM responses to ensure the reference answers and thresholds are realistic. The hallucination fixture (`tests/fixtures/hallucination-set.json`) was authored in the same way.

#### Infrastructure design for non-deterministic tests

- **Isolated backend**: Each spec file starts its own in-process Express backend instance (same pattern as the API tests). The non-deterministic tests never depend on the Vite dev server.
- **Single worker**: `npm run test:nd` enforces `--workers=1`. On CPU-only local inference, concurrent requests do not run faster and multiple workers would spawn multiple backend + embedding model instances competing for the same CPU and memory.
- **Merge-on-write for JSON artifacts**: Playwright restarts its worker process after any failing test. Because `afterAll` can therefore run multiple times within a single spec file's execution (each time seeing only the results from its own worker generation), `writeAdvisorySummary` merges new results into the existing JSON by result `id` rather than overwriting it. This prevents data loss when multiple tests fail in the same spec file.

#### Tradeoffs and assumptions

- The golden set and run counts are intentionally small so the suite completes in a reasonable time on a local machine. In a real scheduled pipeline the set size, run counts, and thresholds should be tuned.
- Whether to gate CI merges on the non-deterministic project's exit code is a pipeline-level decision not enforced by the test code.
- Tests that require Ollama skip gracefully (with a clear reason) instead of failing when the model is unreachable, so the suite can still run in environments where Ollama is not installed.

## Challenge instructions

This repository is the base app for a testing challenge.

### Goal

Build a testing framework around this chatbot application. The solution should
cover both deterministic and non-deterministic LLM behavior.

### Expected approach

The candidate should create either:

- a fork of this repository, or
- a separate repository containing the app plus the testing framework.

### Suggested testing scope

Suggested areas:

- unit tests for isolated logic and utility behavior
- API tests for backend contracts and error handling
- UI or end-to-end tests for chat flow
- non-deterministic tests for quality, relevance, consistency, and hallucination risk

### Use of AI tools

The challenge encourages AI-assisted tooling to:

- design framework structure
- generate test cases
- generate test data and prompt sets
- propose assertions and evaluation strategies
- improve documentation and maintenance

### Deliverables

The candidate should provide:

1. URL of fork/derived repository with solution.
2. Clear setup instructions.
3. Clear commands to execute tests.
4. Documentation of strategy, coverage, assumptions, and tradeoffs.

### README expectations for candidate solution

Candidate should either:

- rewrite this README to include testing solution, or
- extend it with a dedicated testing section.

Documentation should explain what was implemented, why, how to run it, and how
non-deterministic behavior was handled.

## Review checklist

When reviewing candidate solution, verify:

- app still runs locally
- framework is easy to install and execute
- strategy matches LLM chatbot characteristics
- deterministic vs non-deterministic checks are clearly separated
- README is clear and reproducible
- shared repository can be executed by another reviewer
