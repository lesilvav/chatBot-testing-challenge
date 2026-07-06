import express, { type Request, type Response } from "express";
import cors from "cors";
import swaggerUi from "swagger-ui-express";
import { validateMessage } from "./validation";
import { withTimeout, TimeoutError } from "./timeout";
import { generateResponse as defaultGenerate } from "./ollama";
import { config } from "./config";
import { createOpenApiSpec } from "./openapi";

export type Generator = (prompt: string) => Promise<string>;

interface UpstreamError {
  status?: number;
}

interface ErrorResponse {
  error: string;
}

function getUpstreamStatus(err: unknown): number | null {
  if (typeof err !== "object" || err === null) {
    return null;
  }

  const maybeError = err as UpstreamError;
  return typeof maybeError.status === "number" ? maybeError.status : null;
}

function sendError(res: Response, status: number, error: string) {
  return res.status(status).json({ error } satisfies ErrorResponse);
}

export interface AppOptions {
  /** Allows overriding the LLM call when composing the app. */
  generate?: Generator;
  timeoutMs?: number;
}

interface ChatSuccessResponse {
  reply: string;
  latencyMs: number;
}

export function createApp(options: AppOptions = {}) {
  const generate = options.generate ?? defaultGenerate;
  const timeoutMs = options.timeoutMs ?? config.requestTimeoutMs;
  const openApiSpec = createOpenApiSpec();

  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "32kb" }));

  app.get("/api/openapi.json", (_req: Request, res: Response) => {
    res.json(openApiSpec);
  });

  app.use(
    "/api/docs",
    swaggerUi.serve,
    swaggerUi.setup(openApiSpec, {
      explorer: true,
    }),
  );

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", model: config.model });
  });

  app.post("/api/chat", async (req: Request, res: Response) => {
    const started = Date.now();
    const result = validateMessage(req.body?.message);
    if (!result.ok) {
      console.warn(`[chat] 400 invalid request: ${result.error}`);
      return sendError(res, 400, result.error);
    }

    try {
      const reply = await withTimeout(generate(result.value), timeoutMs);
      const latencyMs = Date.now() - started;
      console.info(`[chat] 200 latency=${latencyMs}ms len=${reply.length}`);
      return res.json({ reply, latencyMs } satisfies ChatSuccessResponse);
    } catch (err) {
      const latencyMs = Date.now() - started;
      if (err instanceof TimeoutError) {
        console.error(`[chat] 504 timeout latency=${latencyMs}ms`);
        return sendError(res, 504, "the model took too long to respond");
      }

      const upstreamStatus = getUpstreamStatus(err);
      if (upstreamStatus === 429) {
        console.error(`[chat] 429 upstream rate limited latency=${latencyMs}ms`, err);
        return sendError(
          res,
          429,
          "the model rate limit was reached, please wait a moment and try again",
        );
      }

      if (upstreamStatus === 503) {
        console.error(`[chat] 503 upstream unavailable latency=${latencyMs}ms`, err);
        return sendError(
          res,
          503,
          "the local model service is temporarily unavailable, please try again later",
        );
      }

      console.error(`[chat] 502 upstream error`, err);
      return sendError(res, 502, "failed to generate a response");
    }
  });

  return app;
}
