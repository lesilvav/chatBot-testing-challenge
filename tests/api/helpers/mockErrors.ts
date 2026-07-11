/** Builds an Error carrying an upstream-style `.status`, matching the shape
 * produced by `src/backend/ollama.ts`'s `createHttpError`, so `app.ts`'s
 * `getUpstreamStatus()` can classify it the same way a real Ollama failure
 * would be classified. */
export function createUpstreamError(status: number, message: string): Error & { status: number } {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}
