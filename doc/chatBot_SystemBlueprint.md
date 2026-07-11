# Web Application System Blueprint

| LLM used | Date | Summary |
| ---- | ---- | ---- |
| Cascade (Claude) | 2026-07-10 | Exploration and mapping of the Local LLM Chatbot app (React frontend on `:5173` + Express backend on `:3001`) via Playwright MCP: pages/states, UI elements, data flow, and API contract. |

## Summary table

| Page/State | Description | Screenshot |
| ---- | ---- | ---- |
| Empty chat (initial load) | Default state on `http://localhost:5173`: title, empty message list, empty input, disabled Send button. | `screenshots/01-empty-state.png` |
| Input filled | User has typed text; Send button becomes enabled. | `screenshots/02-input-filled.png` |
| Loading ("Bot is thinking…") | After submit, user bubble appears immediately, input/Send are disabled, and an italic loader line renders below the message list while the backend call is in flight. | `screenshots/03-loading-state.png` |
| Conversation success | Bot reply bubble rendered under the user bubble; loader removed; input/Send re-enabled and cleared. | `screenshots/04-conversation-success.png` |
| Client-visible validation error (400) | Sending a message over 2000 chars returns `400`; the raw over-long message is still rendered as a user bubble and the server's error text is shown in a red `role="alert"` banner below it. | `screenshots/05-validation-error.png` |
| Backend API docs (Swagger UI) | `http://localhost:3001/api/docs`: interactive OpenAPI 3.1 documentation, "Local LLM Chatbot Backend API", listing the `Backend` tag with `GET /api/health` and `POST /api/chat`. | `screenshots/06-swagger-docs.png` |
| Backend API docs, endpoints expanded | Expanded view of both operations showing parameters, example request body, and all documented response codes (200, 400, 429, 502, 503, 504) with example payloads. | `screenshots/07-swagger-expanded.png` |
| Mobile viewport (390x844) — empty state | Chat UI is responsive: fixed bottom composer, centered column, no horizontal scrolling at mobile width. | `screenshots/08-mobile-empty-state.png` |

## Application overview

- **Type**: Single-page React chat application backed by an Express API that proxies a local Ollama LLM.
- **Frontend URL**: `http://localhost:5173` (Vite dev server).
- **Backend URL**: `http://localhost:3001` (Express), proxied under `/api/*` from the frontend origin.
- **Routing**: No client-side router; the entire app is one view rendered by `src/frontend/App.tsx`. There are no distinct "pages" in the SPA — only UI *states* of the same screen.
- **Persistence**: None. Message history lives only in React state (`useState`) and is lost on reload.

## Page/state inventory

### 1. Empty chat (initial load)
- **URL**: `http://localhost:5173`
- **Elements**:
  - `h1` heading: "Gemini Chatbot".
  - `ul.messages` — empty list, renders nothing.
  - `input[aria-label="message"]` — placeholder "Ask Chatbot something…", empty value.
  - `button[type=submit]` "Send" — **disabled** (guard: `loading || !input.trim()`).
- **Semantics**: Landing state, no prior conversation, cannot submit an empty message (client-side guard only, not a validation message).

### 2. Input filled
- **Trigger**: User types any non-whitespace text into the textbox.
- **Elements**: Same as above, but Send button becomes enabled once `input.trim()` is non-empty.

### 3. Loading state
- **Trigger**: Submit the form (Enter or Send click) with a non-empty message.
- **Data flow**:
  1. `onSubmit` appends `{ role: "user", text }` to `messages` immediately (optimistic render).
  2. Input is cleared, `error` reset to `null`, `loading` set to `true`.
  3. `sendChat(text)` (`src/frontend/api.ts`) issues `POST /api/chat` with `{ message }`.
- **Elements**:
  - New `li.msg.msg-user` bubble with label "You" and the submitted text.
  - `div.loader[role=status]` — text "Bot is thinking…".
  - Input and Send button both **disabled** while `loading` is true.
- **Semantics**: Communicates an in-flight async request; screen-reader accessible via `role="status"`.

### 4. Conversation success
- **Trigger**: Backend responds `200` with `{ reply, latencyMs }`.
- **Elements**: New `li.msg.msg-bot` bubble labeled "Bot" with the reply text; loader removed; input/Send re-enabled.
- **Notes**: `latencyMs` returned by the API is not displayed in the UI (available only in the network response).
- **Non-determinism**: Bot reply content varies between runs (local LLM), tested here with prompts like "Say hi." / "What is TypeScript?".

### 5. Error state (validation, 400)
- **Trigger reproduced**: message longer than `MAX_MESSAGE_LENGTH` (2000 chars, enforced in `src/backend/validation.ts`); there is **no client-side max-length guard**, so the oversized text is sent as-is.
- **Elements**: `div.error[role=alert]` rendered below the message list with the server's `error` string (e.g. "message must be at most 2000 characters").
- **UI defect observed**: the long single-token message bubble (`li.msg-user`) overflows its `max-width: 85%` container horizontally instead of wrapping — `styles.css` sets `white-space: pre-wrap` on `.msg p` but no `overflow-wrap`/`word-break`, so unbroken strings (no spaces) overflow the viewport. See `screenshots/05-validation-error.png`.
- **Other error codes** (documented in backend, not reproduced live to avoid disrupting the running Ollama service): `429` rate limited, `502` generic upstream failure, `503` Ollama unreachable, `504` timeout. Each maps to a distinct user-facing message via `getDefaultErrorMessage()` in `src/frontend/api.ts`, or the server's own `error` field when present.

### 6. Backend API docs (Swagger UI)
- **URL**: `http://localhost:3001/api/docs`
- **Elements**: Swagger UI shell, title "Local LLM Chatbot Backend API" (v1.0.0, OAS 3.1), server selector fixed to `http://localhost:3001`, one tag group "Backend — Core backend endpoints" containing:
  - `GET /api/health` — no params; `200` example `{ "status": "ok", "model": "qwen2.5:3b-instruct" }`.
  - `POST /api/chat` — JSON body `{ "message": string }`; responses `200/400/429/502/503/504` each with example payload.
- **Raw spec**: `GET /api/openapi.json` returns the same spec as JSON (not screenshotted; machine-readable only).

### 7. Mobile viewport
- **Viewport**: 390×844 (e.g. iPhone-class width).
- **Behavior**: `.app` column stays centered and readable, `.composer` remains fixed to the bottom of the viewport, no horizontal scroll, Send button and input remain fully usable.

## Interaction model / data flow (end to end)

1. User types in `input[aria-label="message"]` → local state only.
2. Submit (`Enter` in form or Send click) → `onSubmit` handler in `App.tsx`.
3. `sendChat()` → `fetch('/api/chat', { method: 'POST', body: { message } })`.
4. Vite dev server proxies `/api/*` to `http://localhost:3001`.
5. Express `POST /api/chat` (`src/backend/app.ts`):
   - Validates via `validateMessage()` → `400` on failure.
   - Calls `generate()` (`src/backend/ollama.ts`) wrapped in `withTimeout()` → `504` on timeout budget exceeded (`REQUEST_TIMEOUT_MS`, default 20000ms).
   - Maps upstream error `status` to `429`/`503`, otherwise `502`.
   - On success, returns `{ reply, latencyMs }` (`200`).
6. Frontend appends bot bubble or renders `error` banner.

## Out of scope / not explored

- `429`, `502`, `503`, `504` responses were **not** reproduced against the live app because doing so would require stopping/throttling the local Ollama service, which is a shared, stateful part of the user's environment. They are documented from source code (`src/backend/app.ts`, `src/frontend/api.ts`) and the Swagger spec instead.
- External links: none found in the UI — the app has no anchor tags pointing outside `localhost`.
- No authentication, theming toggle, or settings screens exist in this app.
