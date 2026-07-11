import { test, expect } from "@playwright/test";

// Feature: Use the chat on a mobile-sized screen
// Source: US-12
//
// Real CSS layout at a real viewport size — not reproducible in the jsdom
// unit suite, since jsdom performs no layout at all.

test.use({ viewport: { width: 390, height: 844 } });

test("TC-28 @US-12 @priority-medium - Chat UI has no horizontal scrolling at mobile viewport", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("heading", { name: "Gemini Chatbot" })).toBeVisible();
  // Empty by default (no messages sent yet), so it has zero height and
  // won't pass toBeVisible() — just assert it's rendered in the DOM.
  await expect(page.locator("ul.messages")).toBeAttached();
  await expect(page.getByRole("textbox", { name: "message" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Send" })).toBeVisible();

  const { scrollWidth, clientWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
});
