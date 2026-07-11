import { test, expect, request, type APIRequestContext } from "@playwright/test";
import { startTestServer, type TestServer } from "./helpers/testServer";

// Feature: Consult the backend API contract
// Source: US-11

test.describe("@US-11 @type-api", () => {
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

  test("TC-27 @priority-low - GET /api/openapi.json returns the raw OpenAPI spec", async () => {
    const response = await api.get("/api/openapi.json");

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.openapi).toMatch(/^3\.1/);
    expect(body.info).toMatchObject({ title: "Local LLM Chatbot Backend API", version: "1.0.0" });
    expect(body.paths).toHaveProperty("/api/health");
    expect(body.paths).toHaveProperty("/api/chat");
  });
});
