import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageSquareText, Send, Sparkles, X } from "lucide-react";
import {
  answerCandidateApplicationQuestion,
  type CandidateChatApplication,
} from "@/lib/candidate-chat";

type ChatMessage = {
  id: string;
  sender: "candidate" | "assistant";
  text: string;
};

const suggestedQuestions = [
  "What should I do next?",
  "How do I update my resume?",
  "What is my interview status?",
];

export function CandidateApplicationChat({
  applications,
  followUpSubmitted,
}: {
  applications: CandidateChatApplication[];
  followUpSubmitted: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "ask-aiccu-welcome",
      sender: "assistant",
      text: "Hi, I’m AskAiccu. Ask me about your application statuses, next steps, resume updates, or interviews.",
    },
  ]);
  const messageEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open]);

  const sendMessage = (rawText: string) => {
    const text = rawText.trim();
    if (!text) return;
    const answer = answerCandidateApplicationQuestion(
      text,
      applications,
      followUpSubmitted,
    );
    const messageId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setMessages((current) => [
      ...current,
      { id: `${messageId}-question`, sender: "candidate", text },
      { id: `${messageId}-answer`, sender: "assistant", text: answer },
    ]);
    setDraft("");
  };

  const submitQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(draft);
  };

  return (
    <>
      {open && (
        <section
          id="ask-aiccu-panel"
          role="dialog"
          aria-label="AskAiccu candidate application assistant"
          data-testid="panel-ask-aiccu"
          className="fixed bottom-[84px] right-4 z-[60] flex h-[min(630px,calc(100dvh-112px))] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-[#dce4da] bg-[#fcfbf7] shadow-[0_24px_80px_-24px_rgba(23,59,53,.35)]"
        >
          <header className="flex items-center justify-between gap-3 bg-[#174b43] px-4 py-3.5 text-[#f7f4eb]">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e8a568] text-[#173e38]">
                <Sparkles size={17} />
              </span>
              <div className="min-w-0">
                <h2 className="text-[13px] font-bold">AskAiccu</h2>
                <p className="mt-0.5 truncate text-[9px] text-[#d1e0d8]">
                  Answers from your application details
                </p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close AskAiccu"
              data-testid="button-close-ask-aiccu"
              onClick={() => setOpen(false)}
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[#e7eee8] hover:bg-white/10"
            >
              <X size={16} />
            </button>
          </header>

          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            data-testid="list-ask-aiccu-messages"
            className="flex-1 space-y-3 overflow-y-auto bg-[#f6f5ef] px-3.5 py-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === "candidate" ? "justify-end" : "justify-start"}`}
              >
                <p
                  className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[11px] leading-5 ${
                    message.sender === "candidate"
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

          {messages.length === 1 && (
            <div className="border-t border-[#ecebe3] bg-[#fcfbf7] px-3.5 py-3">
              <p className="mb-2 text-[9px] font-bold uppercase tracking-[.1em] text-[#87938c]">
                Try asking
              </p>
              <div className="flex flex-wrap gap-1.5">
                {suggestedQuestions.map((question) => (
                  <button
                    key={question}
                    type="button"
                    onClick={() => sendMessage(question)}
                    className="rounded-full border border-[#dce5dc] bg-[#f5f7f1] px-2.5 py-1.5 text-[9px] font-semibold text-[#527066] hover:border-[#a9c1b1] hover:bg-[#edf3eb]"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={submitQuestion}
            className="flex items-end gap-2 border-t border-[#e8e7df] bg-[#fcfbf7] p-3"
          >
            <label className="sr-only" htmlFor="ask-aiccu-input">
              Ask a question about your applications
            </label>
            <input
              id="ask-aiccu-input"
              type="text"
              maxLength={500}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Ask about an application..."
              data-testid="input-ask-aiccu"
              className="h-10 min-w-0 flex-1 rounded-xl border border-[#dfe5dc] bg-white px-3 text-[11px] text-[#425953] outline-none placeholder:text-[#a1aaa3] focus:border-[#438274] focus:ring-4 focus:ring-[#438274]/10"
            />
            <button
              type="submit"
              disabled={!draft.trim()}
              aria-label="Send question"
              data-testid="button-send-ask-aiccu"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#205e53] text-white transition hover:bg-[#184d44] disabled:cursor-not-allowed disabled:bg-[#a7b6ad]"
            >
              <Send size={15} />
            </button>
          </form>
          <p className="bg-[#fcfbf7] px-3 pb-3 text-[9px] leading-4 text-[#929b95]">
            AskAiccu only uses the application details shown in this demo.
          </p>
        </section>
      )}

      <button
        type="button"
        aria-expanded={open}
        aria-controls="ask-aiccu-panel"
        data-testid="button-ask-aiccu"
        onClick={() => setOpen((current) => !current)}
        className="fixed bottom-4 right-4 z-[60] inline-flex h-12 items-center gap-2 rounded-full bg-[#205e53] px-4 text-[11px] font-bold text-white shadow-[0_12px_30px_-12px_rgba(23,59,53,.6)] transition hover:-translate-y-0.5 hover:bg-[#184d44]"
      >
        <MessageSquareText size={16} />
        AskAiccu
      </button>
    </>
  );
}
