export interface ChatResponse {
  reply: string;
  latencyMs: number;
}

function getDefaultErrorMessage(status: number): string {
  switch (status) {
    case 429:
      return "The model rate limit was reached. Wait a moment and try again.";
    case 503:
      return "The local model service is unavailable. Confirm Ollama is running and try again.";
    case 504:
      return "The model took too long to respond. Please try again.";
    case 502:
      return "The model could not generate a response right now. Please try again.";
    default:
      return `request failed (${status})`;
  }
}

export async function sendChat(message: string): Promise<ChatResponse> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? getDefaultErrorMessage(res.status));
  }
  return res.json();
}
