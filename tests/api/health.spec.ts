import { test, expect, request, type APIRequestContext } from "@playwright/test";
import { startTestServer, type TestServer } from "./helpers/testServer";
import { config } from "../../src/backend/config";

// Feature: Check backend/model health
// Source: US-10

test.describe("@US-10 @type-api", () => {
  let server: TestServer;
  let api: APIRequestContext;

  test.beforeAll(async () => {
    server = await startTestServer();
    api = await request.newContext({ baseURL: server.baseURL });
  });

  test.afterAll(async () => {
    await api.dispose();
    await server.close();
  });

  test("TC-24 @priority-low - GET /api/health reports backend status and configured model", async () => {
    const response = await api.get("/api/health");

    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: "ok", model: config.model });
  });
});
