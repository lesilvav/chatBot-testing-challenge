import type { Server } from "node:http";
import { createApp, type AppOptions } from "../../../src/backend/app";

export interface TestServer {
  baseURL: string;
  close: () => Promise<void>;
}

/**
 * Starts an isolated instance of the backend Express app on an ephemeral
 * port for a single test/spec. Pass `generate` and/or `timeoutMs` via
 * `AppOptions` to simulate upstream failures without touching the real
 * Ollama service.
 */
export async function startTestServer(options: AppOptions = {}): Promise<TestServer> {
  const app = createApp(options);

  const server: Server = await new Promise((resolve, reject) => {
    const s = app.listen(0);
    s.once("listening", () => resolve(s));
    s.once("error", reject);
  });

  const address = server.address();
  if (address === null || typeof address === "string") {
    throw new Error("failed to determine the test server's ephemeral port");
  }

  return {
    baseURL: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
