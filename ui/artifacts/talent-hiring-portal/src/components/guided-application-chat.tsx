import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageSquareText, Send, Sparkles, X } from "lucide-react";
import type { HiringPosition } from "./job-portal-pages";
import { applicationGuideIntent } from "@/lib/application-guide";
import {
  answerPublishedRoleQuestion,
  type ApplicationDraft,
} from "@/lib/self-application";

type Msg = { id: string; sender: "candidate" | "assistant"; text: string };
type Step = "resume" | "review";
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;

export type GuidedApplicationChatProps = {
  role: HiringPosition;
  draft: Pick<ApplicationDraft, "files">;
  onFocusResume(): void;
  onRequestReview(): boolean;
};

export function GuidedApplicationChat({ role, draft, onFocusResume, onRequestReview }: GuidedApplicationChatProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [step, setStep] = useState<Step | null>(null);
  const [messages, setMessages] = useState<Msg[]>([{
    id: "welcome", sender: "assistant",
    text: `Hi, I'm AskAiccu. Ask about the published details for ${role.position}, or say "guide me" for help with the application steps. Upload resume versions, add contact details, then review before submitting.`,
  }]);
  const endRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open]);

  const prompt = (s: Step): string => {
    if (s === "resume") {
      onFocusResume();
      return draft.files.length
        ? `You have ${draft.files.length} resume version${draft.files.length === 1 ? "" : "s"} selected. Add or remove PDF, DOC, or DOCX versions (up to five, 15 MB each). Say "review" when ready.`
        : `Upload one or more resume versions using the file picker in the form. You can add up to five PDF, DOC, or DOCX files, 15 MB each. Say "review" when ready.`;
    }
    return `Review your resume versions, then confirm and submit. Nothing is sent until you press Confirm and submit.`;
  };

  const advanceToReview = () => {
    setStep("review");
    return prompt("review");
  };

  const respond = (text: string): string => {
    const lower = text.toLowerCase().trim();
    const intent = applicationGuideIntent(text);
    if (intent.kind === "correction") return "This application only asks for resume versions. Include updated contact details in your resume, then upload it here.";
    if (intent.kind === "start") { setStep("resume"); return prompt("resume"); }
    if (intent.kind === "review") {
      setStep(null);
      if (!onRequestReview()) {
        setOpen(false);
        return "A resume version is missing or still being read. The form shows what needs attention. Nothing has been submitted.";
      }
      setOpen(false);
      return "I've moved you to My Information. Add your phone and address, answer the non-compete question, and choose SMS opt-in if you want it. Nothing has been submitted.";
    }
    if (intent.kind === "pause") { setStep(null); return "Guide paused. Your uploaded resume versions are kept."; }
    if (intent.kind === "question") return answerPublishedRoleQuestion(text, role) + (step ? "\n\n" + prompt(step) : "");
    if (step === "resume") {
      if (/^(next|done|ok|continue|review)\b/.test(lower)) return advanceToReview();
      return answerPublishedRoleQuestion(text, role) + "\n\n" + prompt("resume");
    }
    return answerPublishedRoleQuestion(text, role);
  };

  const send = (raw: string) => {
    const text = raw.trim();
    if (!text) return;
    const demographic = applicationGuideIntent(text).kind === "private";
    const reply = demographic
      ? answerPublishedRoleQuestion("demographic", role)
      : respond(text);
    const id = uid();
    setMessages((m) => [...m,
      { id: id + "q", sender: "candidate", text: demographic ? "[Message not kept: self-identification is not collected in chat]" : text },
      { id: id + "a", sender: "assistant", text: reply }]);
    setInput("");
  };

  const submit = (e: FormEvent<HTMLFormElement>) => { e.preventDefault(); send(input); };
  const chips = step ? ["review", "What is the salary?"] : ["guide me", "What is the salary?", "What skills are needed?"];

  return (
    <>
      {open && (
        <section role="dialog" aria-label="AskAiccu application guide" data-testid="panel-guided-chat"
          className="fixed bottom-[84px] right-4 z-[60] flex h-[min(630px,calc(100dvh-112px))] w-[min(390px,calc(100vw-32px))] flex-col overflow-hidden rounded-2xl border border-[#dce4da] bg-[#fcfbf7] shadow-[0_24px_80px_-24px_rgba(23,59,53,.35)]">
          <header className="flex items-center justify-between gap-3 bg-[#174b43] px-4 py-3.5 text-[#f7f4eb]">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e8a568] text-[#173e38]"><Sparkles size={17} /></span>
              <div className="min-w-0">
                <h2 className="text-[13px] font-bold">AskAiccu</h2>
                <p className="mt-0.5 truncate text-[9px] text-[#d1e0d8]">{step ? `Guiding: ${step}` : `Published details for ${role.position}`}</p>
              </div>
            </div>
            <button type="button" aria-label="Close AskAiccu" data-testid="button-close-guided-chat" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/10"><X size={16} /></button>
          </header>
          <div role="log" aria-live="polite" data-testid="list-guided-chat-messages" className="flex-1 space-y-3 overflow-y-auto bg-[#f6f5ef] px-3.5 py-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.sender === "candidate" ? "justify-end" : "justify-start"}`}>
                <p className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[11px] leading-5 ${m.sender === "candidate" ? "rounded-br-md bg-[#205e53] text-white" : "rounded-bl-md border border-[#e5e5dc] bg-white text-[#52655f]"}`}>{m.text}</p>
              </div>
            ))}
            <div ref={endRef} />
          </div>
          <div className="flex flex-wrap gap-1.5 border-t border-[#ecebe3] px-3.5 py-2.5">
            {chips.map((c) => (
              <button key={c} type="button" data-testid={`chip-guided-${c.replace(/\W+/g, "-")}`} onClick={() => send(c)} className="rounded-full border border-[#dce5dc] bg-[#f5f7f1] px-2.5 py-1.5 text-[9px] font-semibold text-[#527066] hover:bg-[#edf3eb]">{c}</button>
            ))}
          </div>
          <form onSubmit={submit} className="flex items-end gap-2 border-t border-[#e8e7df] p-3">
            <label className="sr-only" htmlFor="guided-chat-input">Message AskAiccu</label>
             <input id="guided-chat-input" maxLength={500} value={input} onChange={(e) => setInput(e.target.value)} placeholder={step ? "Ask about the role or say review..." : "Ask about this role..."} data-testid="input-guided-chat"
              className="h-10 min-w-0 flex-1 rounded-xl border border-[#dfe5dc] bg-white px-3 text-[11px] text-[#425953] outline-none focus:border-[#438274] focus:ring-4 focus:ring-[#438274]/10" />
            <button type="submit" disabled={!input.trim()} aria-label="Send" data-testid="button-send-guided-chat" className="grid h-10 w-10 place-items-center rounded-xl bg-[#205e53] text-white hover:bg-[#184d44] disabled:bg-[#a7b6ad]"><Send size={15} /></button>
          </form>
          <p className="px-3 pb-3 text-[9px] leading-4 text-[#929b95]">Uses published role details. Application details stay in the browser demo until you review and submit.</p>
        </section>
      )}
      <button type="button" aria-expanded={open} data-testid="button-guided-chat" onClick={() => setOpen((o) => !o)}
        className="fixed bottom-4 right-4 z-[60] inline-flex h-12 items-center gap-2 rounded-full bg-[#205e53] px-4 text-[11px] font-bold text-white shadow-[0_12px_30px_-12px_rgba(23,59,53,.6)] hover:-translate-y-0.5 hover:bg-[#184d44]">
        <MessageSquareText size={16} /> AskAiccu
      </button>
    </>
  );
}
