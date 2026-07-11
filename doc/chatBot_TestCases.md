# ChatBot Test Cases

| LLM used | Date | Summary |
| ---- | ---- | ---- |
| Cascade (Claude) | 2026-07-10 | Test Cases derived exclusively from `chatBot_UserStories.md` (US-01–US-12), expressed in Gherkin format, covering UI and API verification for the happy path, loading/error states, health check, Swagger docs, and mobile viewport. Includes traceability to source user stories via tags. |

## Traceability legend

Each scenario carries a `@TC-xx` tag (unique Test Case ID) and a `@US-xx` tag referencing the user story it was derived from in `./chatBot_UserStories.md`, plus `@priority-*` and `@type-(ui|api)` tags. No scenario is introduced beyond what the acceptance criteria describe.

## Notes on backend mocking

- `US-05`–`US-08` (`429/502/503/504`) describe backend behaviors that cannot be safely reproduced against the live, shared local Ollama instance (see `chatBot_SystemBlueprint.md` → *Out of scope*). Their scenarios assume a **mocked/stubbed backend or LLM client** (e.g. overriding `generate()` in `src/backend/app.ts`'s `AppOptions`, or intercepting `/api/chat` at the frontend level), marked with an additional `@mocked-backend` tag.

## Test Cases (Gherkin)

Scenarios are grouped by **Type** (`UI` vs `API`) as tagged (`@type-ui` / `@type-api`). Within each group, scenarios are organized by `Feature` (matching the source user story).

### UI Test Cases

```gherkin
Feature: Send a message and receive a bot reply
  # Source: US-01

  @TC-01 @US-01 @priority-high @type-ui
  Scenario: Send a valid message via Send button click
    Given the chatbot app is loaded
    When I type "Say hi." into the message input
    And I click the "Send" button
    Then a "You" bubble with "Say hi." appears immediately
    And a "Bot" bubble with the reply appears after the backend responds

  @TC-02 @US-01 @priority-medium @type-ui
  Scenario: Send a valid message via Enter key
    Given the chatbot app is loaded
    When I type a valid message into the message input
    And I press "Enter"
    Then a "You" bubble with the message appears immediately
    And a "Bot" bubble with the reply appears after the backend responds

  @TC-04 @US-01 @priority-medium @type-ui
  Scenario: Input is cleared after a successful send
    Given I have typed and submitted a valid message
    When the bot reply is rendered
    Then the message input field is empty

Feature: See visual feedback while waiting for a reply
  # Source: US-02

  @TC-05 @US-02 @priority-high @type-ui
  Scenario: Loading indicator appears while waiting for a reply
    Given I have submitted a valid message
    When the backend response has not yet resolved
    Then an element with role "status" and text "Bot is thinking…" is visible

  @TC-06 @US-02 @priority-high @type-ui
  Scenario: Input and Send are disabled during loading
    Given I have submitted a valid message
    When the loading indicator is visible
    Then the message input is disabled
    And the "Send" button is disabled

  @TC-07 @US-02 @priority-medium @type-ui
  Scenario: Loading indicator is removed and controls re-enabled after response
    Given I have submitted a valid message
    When the backend response arrives
    Then the loading indicator disappears
    And the message input becomes enabled
    And the "Send" button becomes enabled only if the input contains text

Feature: Prevent submitting an empty message
  # Source: US-03

  @TC-08 @US-03 @priority-medium @type-ui
  Scenario: Send button is disabled with an empty input
    Given the chatbot app is loaded
    When the message input is empty
    Then the "Send" button is disabled

  @TC-09 @US-03 @priority-medium @type-ui
  Scenario: Send button is disabled with whitespace-only input
    Given the chatbot app is loaded
    When I type only spaces into the message input
    Then the "Send" button is disabled

  @TC-10 @US-03 @priority-medium @type-ui
  Scenario: Send button is enabled with valid non-whitespace input
    Given the chatbot app is loaded
    When I type at least one non-whitespace character into the message input
    Then the "Send" button is enabled

Feature: See a clear error when a message is too long
  # Source: US-04

  @TC-12 @US-04 @priority-medium @type-ui
  Scenario: UI shows the server's validation error for an over-length message
    Given the chatbot app is loaded
    When I type a message longer than 2000 characters into the message input
    And I submit the message
    Then an alert element with role "alert" appears showing the server's error text

  @TC-13 @US-04 @priority-low @type-ui
  Scenario: Over-length user message remains visible after the validation error
    Given I have submitted a message longer than 2000 characters
    When the error banner appears
    Then the original over-long message is still rendered as a "You" bubble

Feature: See a clear error when the model is rate-limited
  # Source: US-05

  @TC-15 @US-05 @priority-medium @type-ui @mocked-backend
  Scenario: UI shows the rate-limit error message
    Given "/api/chat" is stubbed to respond with status 429
    When I submit a valid message
    Then the error banner shows "The model rate limit was reached. Wait a moment and try again." or the server's error text

Feature: See a clear error when the local model service is unavailable
  # Source: US-06

  @TC-17 @US-06 @priority-medium @type-ui @mocked-backend
  Scenario: UI shows the service-unavailable error message
    Given "/api/chat" is stubbed to respond with status 503
    When I submit a valid message
    Then the error banner shows "The local model service is unavailable. Confirm Ollama is running and try again." or the server's error text

Feature: See a clear error when the model times out
  # Source: US-07

  @TC-19 @US-07 @priority-medium @type-ui @mocked-backend
  Scenario: UI shows the timeout error message
    Given "/api/chat" is stubbed to respond with status 504
    When I submit a valid message
    Then the error banner shows "The model took too long to respond. Please try again." or the server's error text

Feature: See a generic error for unclassified upstream failures
  # Source: US-08

  @TC-21 @US-08 @priority-low @type-ui @mocked-backend
  Scenario: UI shows the generic fallback error message
    Given "/api/chat" is stubbed to respond with status 502
    When I submit a valid message
    Then the error banner shows "The model could not generate a response right now. Please try again." or the server's error text

Feature: Recover the composer after any error to retry
  # Source: US-09

  @TC-22 @US-09 @priority-medium @type-ui
  Scenario: Input is re-enabled after any error response
    Given an error response has just been returned for a submitted message
    When the error banner renders
    Then the message input is enabled and not cleared

  @TC-23 @US-09 @priority-medium @type-ui
  Scenario: Send re-enables after typing valid text following an error
    Given an error banner is currently displayed
    When I type a new non-whitespace message into the input
    Then the "Send" button becomes enabled

Feature: Consult the backend API contract
  # Source: US-11

  @TC-25 @US-11 @priority-low @type-ui
  Scenario: Swagger UI renders the API title and endpoint list
    Given the backend is running
    When I navigate to "http://localhost:3001/api/docs"
    Then the page shows "Local LLM Chatbot Backend API" version "1.0.0" with OAS "3.1"
    And a "Backend" tag lists "GET /api/health" and "POST /api/chat"

  @TC-26 @US-11 @priority-low @type-ui
  Scenario: Swagger UI shows full operation details when expanded
    Given I am on the Swagger UI page
    When I expand "GET /api/health"
    And I expand "POST /api/chat"
    Then both operations show their parameters, example request body, and all documented response codes 200, 400, 429, 502, 503, 504 with example payloads

Feature: Use the chat on a mobile-sized screen
  # Source: US-12

  @TC-28 @US-12 @priority-medium @type-ui
  Scenario: Chat UI has no horizontal scrolling at mobile viewport
    Given the viewport is set to 390x844
    When the chatbot app is loaded
    Then the header, message list, and composer render fully within the viewport width
    And no horizontal scrollbar is present

  @TC-29 @US-12 @priority-low @type-ui
  Scenario: Composer stays fixed to the bottom at mobile viewport
    Given the viewport is set to 390x844
    When the chatbot app is loaded
    Then the composer containing the input and "Send" button remains fixed to the bottom of the screen
```

### API Test Cases

```gherkin
Feature: Send a message and receive a bot reply
  # Source: US-01

  @TC-03 @US-01 @priority-high @type-api
  Scenario: POST /api/chat returns a successful reply for a valid message
    Given the backend is running
    When I send a POST request to "/api/chat" with body { "message": "Say hi." }
    Then the response status is 200
    And the response body contains a "reply" string and a "latencyMs" number

Feature: See a clear error when a message is too long
  # Source: US-04

  @TC-11 @US-04 @priority-medium @type-api
  Scenario: POST /api/chat rejects a message longer than 2000 characters
    Given the backend is running
    When I send a POST request to "/api/chat" with a message longer than 2000 characters
    Then the response status is 400
    And the response body contains an "error" field stating the 2000-character limit

Feature: See a clear error when the model is rate-limited
  # Source: US-05

  @TC-14 @US-05 @priority-medium @type-api @mocked-backend
  Scenario: Backend maps an upstream rate-limit failure to 429
    Given the model client is stubbed to reject with an upstream 429 status
    When I send a POST request to "/api/chat" with a valid message
    Then the response status is 429
    And the response body contains an "error" field equivalent to "the model rate limit was reached, please wait a moment and try again"

Feature: See a clear error when the local model service is unavailable
  # Source: US-06

  @TC-16 @US-06 @priority-medium @type-api @mocked-backend
  Scenario: Backend maps an unreachable Ollama service to 503
    Given the model client is stubbed to reject with an upstream 503 status
    When I send a POST request to "/api/chat" with a valid message
    Then the response status is 503
    And the response body contains an "error" field equivalent to "the local model service is temporarily unavailable, please try again later"

Feature: See a clear error when the model times out
  # Source: US-07

  @TC-18 @US-07 @priority-medium @type-api @mocked-backend
  Scenario: Backend returns 504 when the model exceeds the timeout budget
    Given the model client is stubbed to exceed the configured request timeout
    When I send a POST request to "/api/chat" with a valid message
    Then the response status is 504
    And the response body contains an "error" field equal to "the model took too long to respond"

Feature: See a generic error for unclassified upstream failures
  # Source: US-08

  @TC-20 @US-08 @priority-low @type-api @mocked-backend
  Scenario: Backend returns 502 for an unclassified upstream failure
    Given the model client is stubbed to reject with a generic unclassified error
    When I send a POST request to "/api/chat" with a valid message
    Then the response status is 502
    And the response body contains an "error" field equal to "failed to generate a response"

Feature: Check backend/model health
  # Source: US-10

  @TC-24 @US-10 @priority-low @type-api
  Scenario: GET /api/health reports backend status and configured model
    Given the backend is running
    When I send a GET request to "/api/health"
    Then the response status is 200
    And the response body is { "status": "ok", "model": "<configured-model>" }

Feature: Consult the backend API contract
  # Source: US-11

  @TC-27 @US-11 @priority-low @type-api
  Scenario: GET /api/openapi.json returns the raw OpenAPI spec
    Given the backend is running
    When I send a GET request to "/api/openapi.json"
    Then the response status is 200
    And the response body is a valid OpenAPI 3.1 JSON document
```

## Coverage summary

| User Story | Test Cases |
| ---- | ---- |
| US-01 | TC-01, TC-02, TC-03, TC-04 |
| US-02 | TC-05, TC-06, TC-07 |
| US-03 | TC-08, TC-09, TC-10 |
| US-04 | TC-11, TC-12, TC-13 |
| US-05 | TC-14, TC-15 |
| US-06 | TC-16, TC-17 |
| US-07 | TC-18, TC-19 |
| US-08 | TC-20, TC-21 |
| US-09 | TC-22, TC-23 |
| US-10 | TC-24 |
| US-11 | TC-25, TC-26, TC-27 |
| US-12 | TC-28, TC-29 |
