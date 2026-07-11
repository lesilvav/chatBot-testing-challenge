import { test, expect, request, type APIRequestContext } from "@playwright/test";
import { startTestServer, type TestServer } from "./helpers/testServer";
import { MAX_MESSAGE_LENGTH } from "../../src/backend/validation";

// Feature: See a clear error when a message is too long
// Source: US-04

test.describe("@US-04 @type-api", () => {
  let server: TestServer;
  let api: APIRequestContext;
  let generateCalled = false;

  test.beforeAll(async () => {
    server = await startTestServer({
      // Validation must short-circuit before the model is ever invoked.
      generate: async () => {
        generateCalled = true;
        throw new Error("generate() should not be called for an invalid request");
      },
    });
    api = await request.newContext({ baseURL: server.baseURL });
  });

  test.afterAll(async () => {
    await api.dispose();
    await server.close();
  });

  test.beforeEach(() => {
    generateCalled = false;
  });

  test("TC-11 @priority-medium - POST /api/chat rejects a message longer than 2000 characters", async () => {
    const overLongMessage = "a".repeat(MAX_MESSAGE_LENGTH + 1);

    const response = await api.post("/api/chat", { data: { message: overLongMessage } });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain(String(MAX_MESSAGE_LENGTH));
    expect(generateCalled).toBe(false);
  });
});
