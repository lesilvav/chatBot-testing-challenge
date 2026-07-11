| LLM used | Date | Summary |
| ---- | ---- | ---- |
| Claude (Cascade/Windsurf) | 2026-07-10 | Documents the unit-testing strategy for the chatbot app's frontend request logic and component behavior using Vitest, React Testing Library, and jsdom — scope, directory structure, tooling, configuration, and planned test scenarios. |

# Unit Testing Strategy — Vitest (Frontend Logic + Components)

This document describes the unit-testing strategy for the frontend's request logic (`src/frontend/api.ts`) and component behavior (`src/frontend/App.tsx`), using Vitest, React Testing Library, and jsdom. It is a living document, currently reflecting **planned** strategy prior to implementation; it will be updated with real results (pass/fail, coverage %) once tests are written and run.

## Scope

- **In scope**:
  - `src/frontend/api.ts` — `sendChat()` request building and its error-mapping behavior (via `getDefaultErrorMessage`, exercised indirectly since it isn't exported).
  - `src/frontend/App.tsx` — component render states and user interactions, rendered in jsdom (no real browser), with `sendChat` mocked (no real network/backend).
- **Deferred to later phases**:
  - Backend modules (`validation.ts`, `timeout.ts`, `config.ts`, `ollama.ts`) — to be planned as a follow-up unit-test batch.
  - `app.ts` (`createApp`) — integration surface, covered in the API-test phase.
  - Real-browser E2E (Playwright) — will exercise the same UI through an actual browser against a running app, complementing (not duplicating) the jsdom component tests here.

## Directory structure

Top-level `tests/` root (kept separate from `src/`, structured so `tests/api/` and `tests/e2e/` phases slot in later without rework):

```text
chatBot-testing-challenge/
├── tests/
│   ├── setup.ts                     # jest-dom matcher registration for component tests
│   └── unit/
│       └── frontend/
│           ├── api.test.ts          # sendChat() success + error-mapping cases
│           └── App.test.tsx         # component render/interaction cases
├── vitest.config.ts                 # dedicated to test running (kept separate from vite.config.ts, which is app build/dev only)
├── package.json                     # test scripts + devDependencies
```

A dedicated `vitest.config.ts` (instead of extending `vite.config.ts`) keeps concerns separated: the app's Vite config sets `root: "src/frontend"` and a dev proxy, which are irrelevant/harmful for test resolution.

## Tooling & dependencies (devDependencies)

- `vitest`
- `@vitest/coverage-v8`
- `jsdom` — DOM environment for rendering `App.tsx` in Node.
- `@testing-library/react` — render components + query them by role/text/label.
- `@testing-library/jest-dom` — extra matchers (`toBeDisabled`, `toBeInTheDocument`, etc.).
- `@testing-library/user-event` — realistic user interaction simulation (typing, clicking).
- `@vitejs/plugin-react` — already a devDependency, reused in `vitest.config.ts` so `.tsx` test files transform correctly.

## Vitest configuration (key settings)

- `plugins: [react()]` (reuse existing `@vitejs/plugin-react`).
- `test.environment: "node"` globally, with `// @vitest-environment jsdom` docblock override at the top of `App.test.tsx` only — keeps `api.test.ts` on the lighter `node` environment and isolates jsdom to the file that needs it.
- `test.setupFiles: ["tests/setup.ts"]` — imports `@testing-library/jest-dom/vitest` to register matchers globally.
- `test.include: ["tests/unit/**/*.test.{ts,tsx}"]`.
- `test.coverage`:
  - `provider: "v8"`
  - `include: ["src/frontend/api.ts", "src/frontend/App.tsx"]` (scoped to what's actually under test this phase, so untested files don't distort/fail the threshold)
  - `thresholds`: `lines/functions/branches/statements: 80` — fails the run if not met.
  - reporters: `text` + `html` (for local inspection).

## npm scripts

- `"test": "vitest run"`
- `"test:watch": "vitest"`
- `"test:coverage": "vitest run --coverage"`

## Test scenarios — `tests/unit/frontend/api.test.ts`

Mocking strategy: stub global `fetch` per test with `vi.stubGlobal("fetch", vi.fn())`, reset in `afterEach` via `vi.unstubAllGlobals()` — no real network calls occur. AAA pattern (Arrange/Act/Assert), one behavior per test, no shared mutable state between tests.

1. **Sends correct request shape** — asserts `fetch` called with `/api/chat`, `POST`, JSON header, and `{ message }` body matching input.
2. **Returns parsed response on success (200)** — mocked `ok: true` response resolves `{ reply, latencyMs }` matching the mocked JSON body.
3. **Throws server-provided error message when `res.ok` is false and body has `error`** — e.g. mock `503` with `{ error: "..." }`, assert thrown `Error.message` equals that string.
4. **Falls back to default message per status code when body has no `error`** — parametrized cases for `429`, `502`, `503`, `504`, and one unmapped status (e.g. `500`) to hit the `default` branch — asserts exact fallback strings from `getDefaultErrorMessage`.
5. **Falls back to default message when response body isn't valid JSON** — mock `res.json()` rejecting, confirm the `.catch(() => ({}))` path is exercised and default message is used.

## Test scenarios — `tests/unit/frontend/App.test.tsx`

Mocking strategy: `vi.mock("../../../src/frontend/api")` to replace `sendChat` with a controllable mock — no real `fetch`/network/backend involved. Render with `render(<App />)` from RTL; interact via `@testing-library/user-event`; query by role/label/text (not test IDs or internals). Reset mocks in `afterEach`.

1. **Initial render state** — input is empty, Send button is disabled, no messages, no loader, no error alert present.
2. **Typing enables Send** — typing non-whitespace text enables the Send button; clearing the input disables it again.
3. **Whitespace-only input is not submittable** — typing only spaces keeps Send disabled / submitting is a no-op (`if (!text || loading) return;`), `sendChat` is never called.
4. **Submit adds user message immediately and clears input** — on submit, a "You" message bubble with the typed text appears right away, and the input resets to empty, before the mocked `sendChat` promise resolves.
5. **Loading state while awaiting response** — with `sendChat` mocked to a pending/delayed promise, the "Bot is thinking…" status is shown and both input and Send button are disabled during that window.
6. **Successful reply renders bot message and clears loading** — mocked `sendChat` resolves `{ reply, latencyMs }`; a "Bot" message bubble with that reply text appears, loading indicator disappears, no error alert shown.
7. **Failed request renders error and clears loading** — mocked `sendChat` rejects with `new Error("some message")`; the error alert shows that exact message, loading indicator disappears, no new bot message is added.
8. **Non-Error rejection falls back to generic message** — mocked `sendChat` rejects with a non-`Error` value (e.g. a string/object); error alert shows the component's fallback text ("something went wrong"), per the `err instanceof Error ? ... : "something went wrong"` branch.
9. **Error clears on next submit** — after an error is shown, submitting a new message clears the previous error (`setError(null)` at the start of `onSubmit`) before/while the new request is in flight.
10. **Sequential messages accumulate in order** — sending two messages one after another appends both user+bot pairs to the list in the correct order (no overwriting/race in state updates).
11. **Cannot double-submit while loading** — attempting to submit again while a request is in flight (e.g. pressing Enter again) does not trigger a second `sendChat` call, consistent with the `loading` guard.

## Status / follow-ups

- **Status**: strategy documented, implementation not started.
- Backend unit tests (`validation.ts`, `timeout.ts`, `config.ts`, `ollama.ts`) are intentionally deferred to a follow-up batch.
- Coverage `include` will need to expand as more source files get unit tests in later phases, otherwise the global threshold will fail on files with 0% coverage.
- Real-browser E2E (Playwright) in a later phase will re-exercise similar user flows against a live app/backend — some overlap with these component tests is expected and acceptable (different failure modes: jsdom/mocked vs. real browser/network).
