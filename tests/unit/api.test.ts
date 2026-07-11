import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { sendChat } from "../../src/frontend/api";

// Unit-tests the frontend's own error-message fallback logic that backs the
// UI scenarios TC-15/TC-17/TC-19/TC-21 (chatBot_TestCases.md, US-05..US-08):
// "...shows <default message> or the server's error text". Runs against a
// mocked `fetch`, no backend involved.

function mockResponse(ok: boolean, status: number, body: unknown): Response {
  return { ok, status, json: async () => body } as Response;
}

describe("sendChat", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs the message to /api/chat and returns the parsed reply on success", async () => {
    fetchMock.mockResolvedValue(mockResponse(true, 200, { reply: "Hello!", latencyMs: 42 }));

    const result = await sendChat("Say hi.");

    expect(fetchMock).toHaveBeenCalledWith("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Say hi." }),
    });
    expect(result).toEqual({ reply: "Hello!", latencyMs: 42 });
  });

  it("throws the server's error message when the response body includes one", async () => {
    fetchMock.mockResolvedValue(mockResponse(false, 400, { error: "message must not be empty" }));

    await expect(sendChat("")).rejects.toThrow("message must not be empty");
  });

  it.each([
    [429, "The model rate limit was reached. Wait a moment and try again."],
    [503, "The local model service is unavailable. Confirm Ollama is running and try again."],
    [504, "The model took too long to respond. Please try again."],
    [502, "The model could not generate a response right now. Please try again."],
    [500, "request failed (500)"],
  ])(
    "falls back to the default message for status %i when the body has no error field",
    async (status, expected) => {
      fetchMock.mockResolvedValue(mockResponse(false, status, {}));

      await expect(sendChat("Say hi.")).rejects.toThrow(expected);
    },
  );
});
