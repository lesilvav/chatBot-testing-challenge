import { test, expect } from "@playwright/test";
import { config } from "../../src/backend/config";

// Feature: Send a message and receive a bot reply
// Source: US-01
//
// Real browser, real frontend (vite dev server), real backend, and the
// real live local Ollama instance — no mocking. Skips gracefully if Ollama
// is unreachable instead of failing the whole suite (see tests/api's
// chat-success.spec.ts for the same rationale).

let ollamaAvailable = false;

test.beforeAll(async () => {
  try {
    const res = await fetch(`${config.ollamaBaseUrl}/api/tags`, {
      signal: AbortSignal.timeout(2_000),
    });
    ollamaAvailable = res.ok;
  } catch {
    ollamaAvailable = false;
  }
});

test("TC-01 @US-01 @priority-high - Send a valid message via Send button click", async ({ page }) => {
  test.skip(
    !ollamaAvailable,
    `Ollama is not reachable at ${config.ollamaBaseUrl}. Start it locally (and pull ${config.model}) to run this test.`,
  );
  test.slow(); // real model generation can take several seconds.

  await page.goto("/");

  const input = page.getByRole("textbox", { name: "message" });
  await input.fill("Say hi.");
  await page.getByRole("button", { name: "Send" }).click();

  // "You" bubble appears immediately, before the backend responds.
  await expect(page.getByText("Say hi.")).toBeVisible();
  await expect(input).toHaveValue("");

  // "Bot" bubble appears once the real Ollama reply arrives.
  const botBubble = page.locator(".msg-bot p");
  await expect(botBubble).toBeVisible({ timeout: 30_000 });
  await expect(botBubble).not.toHaveText("");
});
