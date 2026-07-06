import { useState, type FormEvent } from "react";
import { sendChat } from "./api";

interface Message {
  role: "user" | "bot";
  text: string;
}

export function App() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    setMessages((m) => [...m, { role: "user", text }]);
    setInput("");
    setError(null);
    setLoading(true);
    try {
      const { reply } = await sendChat(text);
      setMessages((m) => [...m, { role: "bot", text: reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <h1>Gemini Chatbot</h1>

      <ul className="messages">
        {messages.map((m, i) => (
          <li key={i} className={`msg msg-${m.role}`}>
            <span className="msg-label">{m.role === "user" ? "You" : "Bot"}</span>
            <p>{m.text}</p>
          </li>
        ))}
      </ul>

      {loading && (
        <div className="loader" role="status">
          Bot is thinking…
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}

      <form className="composer" onSubmit={onSubmit}>
        <input
          aria-label="message"
          value={input}
          placeholder="Ask Chatbot something…"
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
        />
        <button type="submit" disabled={loading || !input.trim()}>
          Send
        </button>
      </form>
    </main>
  );
}
