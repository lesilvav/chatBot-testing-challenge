import "dotenv/config";

/** Centralized runtime configuration. */
export const config = {
  ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434",
  // The default model can be overridden through OLLAMA_MODEL in .env.
  model: process.env.OLLAMA_MODEL ?? "qwen2.5:3b-instruct",
  port: Number(process.env.PORT ?? 3001),
  // Hard ceiling for a single generation.
  requestTimeoutMs: Number(process.env.REQUEST_TIMEOUT_MS ?? 10_000),
};

export function assertOllamaConfig(): void {
  if (!config.ollamaBaseUrl) {
    throw new Error(
      "OLLAMA_BASE_URL is not set. Copy .env.example to .env and review its values.",
    );
  }

  if (!config.model) {
    throw new Error(
      "OLLAMA_MODEL is not set. Copy .env.example to .env and review its values.",
    );
  }
}
