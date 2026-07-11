import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { App } from "../../src/frontend/App";
import { sendChat, type ChatResponse } from "../../src/frontend/api";

// Component-level unit tests derived from the UI Test Cases in
// chatBot_TestCases.md. `sendChat` is mocked so these run without a
// backend; the backend contract itself is covered by tests/api/*.spec.ts.
vi.mock("../../src/frontend/api", () => ({
  sendChat: vi.fn(),
}));

const sendChatMock = vi.mocked(sendChat);

function getInput() {
  return screen.getByRole("textbox", { name: "message" });
}

function getSendButton() {
  return screen.getByRole("button", { name: "Send" });
}

describe("App", () => {
  beforeEach(() => {
    sendChatMock.mockReset();
  });

  // TC-08
  it("disables Send when the input is empty", () => {
    render(<App />);
    expect(getSendButton()).toBeDisabled();
  });

  // TC-09
  it("disables Send when the input contains only whitespace", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(getInput(), "   ");

    expect(getSendButton()).toBeDisabled();
  });

  // TC-10
  it("enables Send when the input has non-whitespace text", async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(getInput(), "Say hi.");

    expect(getSendButton()).toBeEnabled();
  });

  // TC-01 / TC-04
  it("shows the user's message immediately, clears the input, and renders the bot reply once it resolves", async () => {
    let resolveChat!: (value: ChatResponse) => void;
    sendChatMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveChat = resolve;
        }),
    );

    const user = userEvent.setup();
    render(<App />);
    const input = getInput();

    await user.type(input, "Say hi.");
    await user.click(getSendButton());

    expect(screen.getByText("Say hi.")).toBeInTheDocument();
    expect(input).toHaveValue("");

    await act(async () => {
      resolveChat({ reply: "Hello there!", latencyMs: 10 });
    });

    await waitFor(() => expect(screen.getByText("Hello there!")).toBeInTheDocument());
  });

  // TC-02
  it("submits the same way when Enter is pressed in the input", async () => {
    sendChatMock.mockResolvedValue({ reply: "Hi!", latencyMs: 5 });
    const user = userEvent.setup();
    render(<App />);

    await user.type(getInput(), "Hello there{Enter}");

    expect(screen.getByText("Hello there")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText("Hi!")).toBeInTheDocument());
  });

  // TC-05 / TC-06
  it("shows the loading indicator and disables the input and Send while waiting for a reply", async () => {
    let resolveChat!: (value: ChatResponse) => void;
    sendChatMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveChat = resolve;
        }),
    );

    const user = userEvent.setup();
    render(<App />);
    const input = getInput();

    await user.type(input, "Say hi.");
    await user.click(getSendButton());

    expect(screen.getByRole("status")).toHaveTextContent("Bot is thinking…");
    expect(input).toBeDisabled();
    expect(getSendButton()).toBeDisabled();

    await act(async () => {
      resolveChat({ reply: "Hi!", latencyMs: 5 });
    });
  });

  // TC-07
  it("hides the loading indicator and re-enables the input after the reply arrives, keeping Send disabled on an empty input", async () => {
    let resolveChat!: (value: ChatResponse) => void;
    sendChatMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveChat = resolve;
        }),
    );

    const user = userEvent.setup();
    render(<App />);
    const input = getInput();

    await user.type(input, "Say hi.");
    await user.click(getSendButton());

    await act(async () => {
      resolveChat({ reply: "Hi!", latencyMs: 5 });
    });
    await waitFor(() => expect(screen.queryByRole("status")).not.toBeInTheDocument());

    expect(input).toBeEnabled();
    expect(getSendButton()).toBeDisabled();
  });

  // TC-22 (partial - see chat summary note on the "not cleared" wording)
  it("shows the error alert and re-enables the input when the backend call fails", async () => {
    sendChatMock.mockRejectedValue(new Error("the model took too long to respond"));
    const user = userEvent.setup();
    render(<App />);
    const input = getInput();

    await user.type(input, "Say hi.");
    await user.click(getSendButton());

    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("the model took too long to respond"),
    );
    expect(input).toBeEnabled();
  });

  // TC-23
  it("re-enables Send after typing a new message following an error", async () => {
    sendChatMock.mockRejectedValue(new Error("boom"));
    const user = userEvent.setup();
    render(<App />);
    const input = getInput();

    await user.type(input, "Say hi.");
    await user.click(getSendButton());
    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());

    expect(getSendButton()).toBeDisabled();

    await user.type(input, "Try again");

    expect(getSendButton()).toBeEnabled();
  });
});
