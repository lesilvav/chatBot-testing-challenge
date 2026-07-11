import { test, expect } from "@playwright/test";
import { MAX_MESSAGE_LENGTH } from "../../src/backend/validation";

// Feature: See a clear error when a message is too long
// Source: US-04
//
// Real browser + real backend (validation runs before generate() is ever
// invoked, so no Ollama dependency here).

test("TC-12 @US-04 @priority-medium - UI shows the server's validation error for an over-length message", async ({
  page,
}) => {
  await page.goto("/");

  const overLongMessage = "a".repeat(MAX_MESSAGE_LENGTH + 1);
  await page.getByRole("textbox", { name: "message" }).fill(overLongMessage);
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByRole("alert")).toContainText(String(MAX_MESSAGE_LENGTH));
});
