import { config, assertOllamaConfig } from "./config";

interface OllamaGenerateResponse {
  response?: string;
}

interface HttpError extends Error {
  status?: number;
}

function createHttpError(status: number, message: string): HttpError {
  const err = new Error(message) as HttpError;
  err.status = status;
  return err;
}

export async function generateResponse(prompt: string): Promise<string> {
  assertOllamaConfig();

  let res: Response;
  try {
    res = await fetch(`${config.ollamaBaseUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: config.model,
        prompt,
        stream: false,
      }),
    });
  } catch (err) {
    throw createHttpError(
      503,
      `failed to connect to Ollama at ${config.ollamaBaseUrl}. Is Ollama running?`,
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw createHttpError(
      res.status,
      `ollama request failed (${res.status} ${res.statusText})${body ? `: ${body}` : ""}`,
    );
  }

  const data = (await res.json()) as OllamaGenerateResponse;
  const reply = data.response?.trim();
  if (!reply) {
    throw createHttpError(502, "ollama returned an empty response");
  }

  return reply;
}
