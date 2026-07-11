# ChatBot User Stories

| LLM used | Date | Summary |
| ---- | ---- | ---- |
| Cascade (Claude) | 2026-07-10 | User Stories derived exclusively from `chatBot_SystemBlueprint.md`, covering the chat flow, loading/error states, and the backend API docs surface. Includes traceability to blueprint sections and a list of open assumptions/missing business rules for stakeholder review. |

## Traceability legend

Each story's **Source** column references the section/table row of `./chatBot_SystemBlueprint.md` it was derived from. No behavior is introduced here beyond what that document describes.

## Summary table

| ID | Title | Priority | Source (blueprint) |
| ---- | ---- | ---- | ---- |
| US-01 | Send a message and receive a bot reply | High | Page/state inventory #1–#4; Interaction model |
| US-02 | See visual feedback while waiting for a reply | High | Page/state inventory #3 |
| US-03 | Prevent submitting an empty message | Medium | Page/state inventory #1 |
| US-04 | See a clear error when a message is too long | Medium | Page/state inventory #5 |
| US-05 | See a clear error when the model is rate-limited | Medium | Page/state inventory #5; Out of scope |
| US-06 | See a clear error when the local model service is unavailable | Medium | Page/state inventory #5; Out of scope |
| US-07 | See a clear error when the model times out | Medium | Page/state inventory #5; Out of scope |
| US-08 | See a generic error for unclassified upstream failures | Low | Page/state inventory #5; Out of scope |
| US-09 | Recover the composer after any error to retry | Medium | Page/state inventory #4, #5 |
| US-10 | Check backend/model health | Low | Page/state inventory #6 |
| US-11 | Consult the backend API contract | Low | Page/state inventory #6 |
| US-12 | Use the chat on a mobile-sized screen | Medium | Page/state inventory #7 |

## User Stories

### US-01 — Send a message and receive a bot reply
- **As a** visitor of the chatbot app
- **I want** to type a message and submit it
- **So that** I can get a response from the bot

**Acceptance criteria**
- Given the input contains non-empty trimmed text, when I submit (click "Send" or press Enter), then my message is appended to the conversation as a "You" bubble immediately.
- Given a successful backend response (`200`), then a "Bot" bubble with the reply text is appended below my message.
- Given the response succeeds, then the input field is cleared and ready for a new message.

**INVEST notes**: Independent of other stories (core happy path); Negotiable on exact bubble styling; Valuable (primary feature); Estimable/Small (single flow); Testable via UI assertions on bubbles.

---

### US-02 — See visual feedback while waiting for a reply
- **As a** user who just sent a message
- **I want** to see an explicit "thinking" indicator
- **So that** I know the app is processing and hasn't frozen

**Acceptance criteria**
- Given a message was just submitted, when the backend call is in flight, then a status element with text "Bot is thinking…" (`role="status"`) is visible.
- Given the loader is visible, then the input field and Send button are disabled.
- Given the response arrives (success or error), then the loader is removed and input/Send return to their appropriate enabled/disabled state.

**INVEST notes**: Small, testable by asserting loader appearance/disappearance and disabled attributes.

---

### US-03 — Prevent submitting an empty message
- **As a** user
- **I want** the Send button disabled when the input is empty or whitespace-only
- **So that** I cannot trigger pointless requests

**Acceptance criteria**
- Given the input is empty, then Send is disabled.
- Given the input contains only whitespace, then Send is disabled.
- Given the input contains at least one non-whitespace character, then Send is enabled (unless a request is already loading).

**INVEST notes**: Testable purely through UI state (no backend call involved); this is a client-side-only guard, not a validation message.

---

### US-04 — See a clear error when a message is too long
- **As a** user who typed an overly long message
- **I want** to see a specific error explaining the limit
- **So that** I understand why my message was rejected and can correct it

**Acceptance criteria**
- Given a message longer than 2000 characters is submitted, when the backend returns `400`, then an alert banner (`role="alert"`) shows the server's message (e.g. "message must be at most 2000 characters").
- Given the error is shown, then my original (over-long) message remains visible as a "You" bubble.

**INVEST notes**: Testable end-to-end (API + UI). Traceable defect noted in blueprint: the long bubble overflows its container instead of wrapping — flagged separately as a bug, not a new story, since the blueprint documents it as an observed UI defect rather than an intended behavior.

---

### US-05 — See a clear error when the model is rate-limited
- **As a** user
- **I want** to see a specific message when the model's rate limit is reached
- **So that** I know to wait before retrying instead of assuming the app is broken

**Acceptance criteria**
- Given the backend maps an upstream failure to `429`, when the response reaches the frontend, then the error banner shows "The model rate limit was reached. Wait a moment and try again." (or the server-provided `error` text, if present).

**INVEST notes**: Documented in the blueprint from source code/Swagger only, not reproduced live. Testable via a mocked/stubbed backend response; **not verifiable against the live app without deliberately throttling Ollama** (see open assumptions).

---

### US-06 — See a clear error when the local model service is unavailable
- **As a** user
- **I want** to see a specific message when Ollama is unreachable
- **So that** I know the issue is with the local service, not my input

**Acceptance criteria**
- Given the backend maps an upstream failure to `503`, when the response reaches the frontend, then the error banner shows "The local model service is unavailable. Confirm Ollama is running and try again." (or the server-provided `error` text, if present).

**INVEST notes**: Same caveat as US-05 — documented, not live-reproduced.

---

### US-07 — See a clear error when the model times out
- **As a** user
- **I want** to see a specific message when the model takes too long
- **So that** I understand the request expired rather than silently failed

**Acceptance criteria**
- Given the backend request exceeds its timeout budget, when it returns `504`, then the error banner shows "The model took too long to respond. Please try again." (or the server-provided `error` text, if present).

**INVEST notes**: Same caveat as US-05 — documented, not live-reproduced.

---

### US-08 — See a generic error for unclassified upstream failures
- **As a** user
- **I want** a fallback error message for failures that aren't otherwise classified
- **So that** I always get feedback instead of a silently stuck UI

**Acceptance criteria**
- Given the backend returns `502` (or any non-`400/429/503/504` failure status), when the response reaches the frontend, then the error banner shows "The model could not generate a response right now. Please try again." (or the server-provided `error` text, if present).

**INVEST notes**: Lowest priority; edge-case catch-all. Same live-reproduction caveat as US-05.

---

### US-09 — Recover the composer after any error to retry
- **As a** user who just saw an error
- **I want** the input and Send button to return to a usable state
- **So that** I can immediately retry without reloading the page

**Acceptance criteria**
- Given any error response (`400/429/502/503/504`), when the error banner is shown, then the input field is re-enabled and not cleared/disabled indefinitely.
- Given the input has valid text, then Send is enabled again per US-03's rule.

**INVEST notes**: Derived from the blueprint's general "loading/error re-enable" behavior (page/state #3–#5); testable by asserting field state after each documented error path.

---

### US-10 — Check backend/model health
- **As an** operator or automated monitor
- **I want** to query a health endpoint
- **So that** I can confirm the backend is up and see which model is configured

**Acceptance criteria**
- Given `GET /api/health` is called, then it returns `200` with `{ "status": "ok", "model": "<configured-model>" }`.

**INVEST notes**: Independent of the chat UI flow; small, directly testable via API call; no UI representation exists for this (documented only via Swagger).

---

### US-11 — Consult the backend API contract
- **As a** developer or tester integrating with the backend
- **I want** interactive, browsable API documentation
- **So that** I can understand request/response shapes and try calls without writing code

**Acceptance criteria**
- Given `http://localhost:3001/api/docs` is opened, then Swagger UI renders "Local LLM Chatbot Backend API" (v1.0.0, OAS 3.1) with a `Backend` tag containing `GET /api/health` and `POST /api/chat`.
- Given an operation is expanded, then its parameters, example request body (for `POST /api/chat`), and all documented response codes with example payloads are visible.
- Given `GET /api/openapi.json` is called, then the raw OpenAPI spec is returned as JSON.

**INVEST notes**: Purely documentation-facing; testable by asserting presence of both operations and their example payloads.

---

### US-12 — Use the chat on a mobile-sized screen
- **As a** mobile user
- **I want** the chat layout to remain usable at small viewport widths
- **So that** I can read and send messages comfortably on a phone

**Acceptance criteria**
- Given a 390×844 viewport, when the app loads, then the header, message list, and composer are all visible without horizontal scrolling.
- Given the same viewport, then the composer (input + Send) stays fixed to the bottom of the screen.

**INVEST notes**: Testable via responsive/visual snapshot at the documented viewport; only the empty state was captured, so success/loading/error states at mobile width are **not yet covered** (see open assumptions).

## Open assumptions and missing business rules

- **Message length feedback**: the blueprint notes there is no client-side max-length guard or character counter before hitting the 2000-char server limit. Is a proactive client-side limit/counter a desired requirement, or is showing the error after submission acceptable?
- **Retry affordance**: after an error, the user must retype/resubmit manually — there is no dedicated "Retry" button. Confirm whether this is intended, or a retry action is a missing requirement.
- **Conversation persistence**: history is lost on reload/navigation (in-memory state only). Confirm whether persistence (e.g. localStorage, backend-side sessions) is out of scope for this app or a future requirement.
- **`latencyMs` visibility**: returned by the API but never rendered in the UI. Confirm whether it should be surfaced to users (e.g., "responded in Xms") or remains an internal/debug-only field.
- **Non-live-reproduced error states** (`429`, `502`, `503`, `504`): acceptance criteria for US-05–US-08 are derived from source code and Swagger examples, not observed live behavior, since reproducing them requires deliberately degrading the shared local Ollama service. Recommend a stakeholder/QA decision on how these will be verified (e.g., mocked backend in automated tests) before marking them "done".
- **Swagger UI exposure**: `/api/docs` and `/api/openapi.json` have no access control documented. Confirm whether this should be restricted (e.g., disabled in production) or is intentionally open for this local/dev-only app.
- **Accessibility scope**: `role="status"` and `role="alert"` are present, but no broader accessibility audit (contrast, focus management, keyboard-only flow) is in the blueprint. Confirm if accessibility compliance is an explicit requirement for this challenge.
- **Mobile coverage**: only the empty state was captured at the mobile viewport (US-12). Loading, success, and error states at mobile width are unverified and should be confirmed as either low-risk (same responsive CSS applies) or requiring explicit test coverage.
- **Multi-user/session model**: the app has no authentication or session concept; each browser tab/reload is an independent, anonymous conversation. Confirm this single-user, session-less model is intentional for the scope of this app.
