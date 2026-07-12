import { request, type APIRequestContext } from "@playwright/test";
import { startTestServer, type TestServer } from "../../api/helpers/testServer";
import { config } from "../../../src/backend/config";

/**
 * Shared, module-scoped chat client for the non-deterministic suite. Spins
 * up its own isolated backend instance (same as tests/api/helpers/testServer.ts)
 * against the real Ollama client — no mocking, since these checks are
 * specifically about real model output quality.
 */
let server: TestServer | null = null;
let api: APIRequestContext | null = null;

export async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${config.ollamaBaseUrl}/api/tags`, {
      signal: AbortSignal.timeout(2_000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function startChatClient(): Promise<void> {
  if (server) return;
  server = await startTestServer();
  api = await request.newContext({ baseURL: server.baseURL });
}

export async function stopChatClient(): Promise<void> {
  await api?.dispose();
  await server?.close();
  server = null;
  api = null;
}

const DEFAULT_CHAT_TIMEOUT_MS = 45_000;

/**
 * A bounded client-side timeout is deliberate: on CPU-only local hardware,
 * a few of the longer golden-set prompts have been observed to occasionally
 * stall well past the backend's own `REQUEST_TIMEOUT_MS` (event-loop /
 * thermal contention from running many sequential generations back to
 * back). Capping the wait here — rather than relying on Playwright's own
 * (much longer) test timeout — lets callers treat a slow/failed call as a
 * normal, catchable advisory failure instead of a hard test crash.
 */
export async function chat(message: string, timeoutMs = DEFAULT_CHAT_TIMEOUT_MS): Promise<string> {
  if (!api) {
    throw new Error("chat client not started - call startChatClient() in a beforeAll first");
  }
  const res = await api.post("/api/chat", { data: { message }, timeout: timeoutMs });
  if (!res.ok()) {
    throw new Error(`chat request failed with status ${res.status()}: ${await res.text()}`);
  }
  const body = await res.json();
  return body.reply as string;
}
