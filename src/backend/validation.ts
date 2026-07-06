/** Input validation for the chat endpoint. */

export const MAX_MESSAGE_LENGTH = 2000;

export type ValidationResult =
  | { ok: true; value: string }
  | { ok: false; error: string };

export function validateMessage(input: unknown): ValidationResult {
  if (typeof input !== "string") {
    return { ok: false, error: "message must be a string" };
  }
  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ok: false, error: "message must not be empty" };
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      ok: false,
      error: `message must be at most ${MAX_MESSAGE_LENGTH} characters`,
    };
  }
  return { ok: true, value: trimmed };
}
