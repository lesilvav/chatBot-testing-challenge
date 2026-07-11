import { test, expect, request } from "@playwright/test";
import { startTestServer } from "./helpers/testServer";
import { createUpstreamError } from "./helpers/mockErrors";

// Features: rate-limit (US-05), service unavailable (US-06), timeout (US-07),
// and unclassified upstream failure (US-08) mapping.
// All scenarios here use a mocked/stubbed LLM client (@mocked-backend) per
// chatBot_TestCases.md's mocking notes, since these upstream failures
// cannot be safely reproduced against the live, shared local Ollama
// instance. Each test owns its own isolated server instance so mocks never
// leak between tests.

test.describe("@type-api @mocked-backend", () => {
  test("TC-14 @US-05 @priority-medium - Backend maps an upstream rate-limit failure to 429", async () => {
    const server = await startTestServer({
      generate: async () => {
        throw createUpstreamError(429, "simulated upstream rate limit");
      },
    });
    const api = await request.newContext({ baseURL: server.baseURL });

    try {
      const response = await api.post("/api/chat", { data: { message: "Say hi." } });

      expect(response.status()).toBe(429);
      const body = await response.json();
      expect(body.error).toBe(
        "the model rate limit was reached, please wait a moment and try again",
      );
    } finally {
      await api.dispose();
      await server.close();
    }
  });

  test("TC-16 @US-06 @priority-medium - Backend maps an unreachable Ollama service to 503", async () => {
    const server = await startTestServer({
      generate: async () => {
        throw createUpstreamError(503, "simulated upstream unavailable");
      },
    });
    const api = await request.newContext({ baseURL: server.baseURL });

    try {
      const response = await api.post("/api/chat", { data: { message: "Say hi." } });

      expect(response.status()).toBe(503);
      const body = await response.json();
      expect(body.error).toBe(
        "the local model service is temporarily unavailable, please try again later",
      );
    } finally {
      await api.dispose();
      await server.close();
    }
  });

  test("TC-18 @US-07 @priority-medium - Backend returns 504 when the model exceeds the timeout budget", async () => {
    const server = await startTestServer({
      timeoutMs: 50,
      generate: () => new Promise((resolve) => setTimeout(() => resolve("too late"), 300)),
    });
    const api = await request.newContext({ baseURL: server.baseURL });

    try {
      const response = await api.post("/api/chat", { data: { message: "Say hi." } });

      expect(response.status()).toBe(504);
      const body = await response.json();
      expect(body.error).toBe("the model took too long to respond");
    } finally {
      await api.dispose();
      await server.close();
    }
  });

  test("TC-20 @US-08 @priority-low - Backend returns 502 for an unclassified upstream failure", async () => {
    const server = await startTestServer({
      generate: async () => {
        throw new Error("simulated unclassified upstream failure");
      },
    });
    const api = await request.newContext({ baseURL: server.baseURL });

    try {
      const response = await api.post("/api/chat", { data: { message: "Say hi." } });

      expect(response.status()).toBe(502);
      const body = await response.json();
      expect(body.error).toBe("failed to generate a response");
    } finally {
      await api.dispose();
      await server.close();
    }
  });
});
