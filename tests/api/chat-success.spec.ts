import { test, expect, request, type APIRequestContext } from "@playwright/test";
import { startTestServer, type TestServer } from "./helpers/testServer";
import { config } from "../../src/backend/config";

// Feature: Send a message and receive a bot reply
// Source: US-01
//
// This scenario is the only one in the API suite that exercises the real,
// live local Ollama instance (per chatBot_TestCases.md's mocking notes,
// only US-05..US-08 are safe to mock; the happy path is meant to run
// against the shared local model). If Ollama is unreachable, the test is
// skipped with a clear reason instead of failing the whole suite.

test.describe("@US-01 @type-api", () => {
  let server: TestServer;
  let api: APIRequestContext;
  let ollamaAvailable = false;

  test.beforeAll(async () => {
    server = await startTestServer();
    api = await request.newContext({ baseURL: server.baseURL });

    try {
      const res = await fetch(`${config.ollamaBaseUrl}/api/tags`, {
        signal: AbortSignal.timeout(2_000),
      });
      ollamaAvailable = res.ok;
    } catch {
      ollamaAvailable = false;
    }
  });

  test.afterAll(async () => {
    await api.dispose();
    await server.close();
  });

  test("TC-03 @priority-high - POST /api/chat returns a successful reply for a valid message", async () => {
    test.skip(
      !ollamaAvailable,
      `Ollama is not reachable at ${config.ollamaBaseUrl}. Start it locally (and pull ${config.model}) to run this test.`,
    );
    test.slow(); // real model generation can take several seconds.

    const response = await api.post("/api/chat", { data: { message: "Say hi." } });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(typeof body.reply).toBe("string");
    expect(body.reply.length).toBeGreaterThan(0);
    expect(typeof body.latencyMs).toBe("number");
    expect(body.latencyMs).toBeGreaterThanOrEqual(0);
  });
});
