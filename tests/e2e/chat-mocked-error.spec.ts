import { test, expect } from "@playwright/test";

// Feature: See a clear error when the model is rate-limited
// Source: US-05
//
// @mocked-backend: "/api/chat" is intercepted at the browser network layer
// via Playwright routing, per chatBot_TestCases.md's mocking notes (US-05
// cannot be safely reproduced against the live, shared local Ollama
// instance). The stubbed response has no `error` field, so this also
// exercises the frontend's own default-message fallback (src/frontend/api.ts)
// end-to-end, through a real fetch call.

test("TC-15 @US-05 @priority-medium @mocked-backend - UI shows the rate-limit error message", async ({ page }) => {
  await page.route("**/api/chat", (route) => route.fulfill({ status: 429, json: {} }));

  await page.goto("/");
  await page.getByRole("textbox", { name: "message" }).fill("Say hi.");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByRole("alert")).toHaveText(
    "The model rate limit was reached. Wait a moment and try again.",
  );
});
