import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send, Sparkles } from "lucide-react";
import {
  answerAnalyticsQuestion,
  type AnalyticsActivityRow,
  type AnalyticsReportData,
} from "@/lib/analytics-chat";

type ChatMessage = {
  id: string;
  sender: "user" | "assistant";
  text: string;
};

export function AnalyticsChat({
  report,
  activity,
}: {
  report: AnalyticsReportData;
  activity: AnalyticsActivityRow[];
}) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "analytics-chat-welcome",
      sender: "assistant",
      text: "Hi, I’m AskAiccu. I can help with the figures in this report.",
    },
  ]);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = (rawText: string) => {
    const text = rawText.trim();
    if (!text) return;
    const answer = answerAnalyticsQuestion(text, report, activity);
    const messageId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setMessages((current) => [
      ...current,
      { id: `${messageId}-question`, sender: "user", text },
      { id: `${messageId}-answer`, sender: "assistant", text: answer },
    ]);
    setDraft("");
  };

  const submitQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(draft);
  };

  return (
    <section
      aria-labelledby="analytics-chat-title"
      className="ml-auto w-full max-w-[420px] overflow-hidden rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] shadow-[0_8px_22px_rgba(31,59,54,.04)]"
    >
      <header className="flex items-center gap-2.5 border-b border-[#e8e5dd] px-3.5 py-3">
        <div className="flex items-center gap-3">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-[#eaf1e8] text-[#397462]">
            <Sparkles size={15} />
          </span>
          <div>
            <h2
              id="analytics-chat-title"
              className="text-[12px] font-bold text-[#344d4d]"
            >AskAiccu</h2>
            <p className="mt-0.5 text-[9px] text-[#829087]">
              Ask about this report
            </p>
          </div>
        </div>
      </header>
      <div
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Analytics chat messages"
        className="flex h-[190px] flex-col gap-2.5 overflow-y-auto bg-[#f7f6f0] px-3.5 py-3"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <p
              className={`max-w-[90%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[10px] leading-[1.15rem] ${
                message.sender === "user"
                  ? "rounded-br-md bg-[#205e53] text-white"
                  : "rounded-bl-md border border-[#e5e5dc] bg-white text-[#52655f]"
              }`}
            >
              {message.text}
            </p>
          </div>
        ))}
        <div ref={messageEndRef} />
      </div>
      <form
        onSubmit={submitQuestion}
        className="flex items-end gap-2 border-t border-[#e8e7df] bg-[#fcfbf7] p-3"
      >
        <label className="sr-only" htmlFor="analytics-chat-input">
          Ask a question about this report
        </label>
        <input
          id="analytics-chat-input"
          type="text"
          maxLength={500}
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about these hiring metrics..."
          className="h-9 min-w-0 flex-1 rounded-xl border border-[#dfe5dc] bg-white px-3 text-[10px] text-[#425953] outline-none placeholder:text-[#a1aaa3] focus:border-[#438274] focus:ring-4 focus:ring-[#438274]/10"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          aria-label="Send analytics question"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#205e53] text-white transition hover:bg-[#184d44] disabled:cursor-not-allowed disabled:bg-[#a7b6ad]"
        >
          <Send size={15} />
        </button>
      </form>
      <p className="bg-[#fcfbf7] px-3 pb-2.5 text-[8px] leading-3.5 text-[#929b95]">
        Answers use the figures visible in Reports &amp; Analytics.
      </p>
    </section>
  );
}
