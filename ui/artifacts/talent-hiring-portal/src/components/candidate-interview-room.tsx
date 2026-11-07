import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Camera, CheckCircle2, Clock3, Mic, Send, Sparkles } from 'lucide-react';

type CandidateInterviewRoomProps = {
  jobTitle: string;
  onReturnToApplications: () => void;
};

type CompletionReason = 'manual' | 'timeout' | null;

const initialCandidateTranscript = [
  'Interviewer: How would you make a complex onboarding flow easier to understand?',
  'You: I would start by identifying the first point where new users hesitate, then test a simpler sequence.',
];

const interviewerTranscript = [
  'Interviewer: Tell me about a time you simplified a complex product experience.',
  'Interviewer: What signals would you use to measure whether your solution worked?',
];

function ParticipantPlaceholder({ interviewer = false }: { interviewer?: boolean }) {
  const id = interviewer ? 'interviewer' : 'candidate';
  return (
    <div role="img" aria-label={`${interviewer ? 'Interviewer' : 'Candidate'} video preview placeholder`} className="relative aspect-video overflow-hidden rounded-xl bg-[#e7eee8]">
      <svg viewBox="0 0 640 360" className="h-full w-full" aria-hidden="true" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id={`${id}-background`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={interviewer ? '#e7e8dc' : '#dcebe2'} />
            <stop offset="1" stopColor={interviewer ? '#cdded8' : '#c9dbd1'} />
          </linearGradient>
          <linearGradient id={`${id}-shirt`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={interviewer ? '#597b70' : '#496d63'} />
            <stop offset="1" stopColor={interviewer ? '#35584f' : '#294f47'} />
          </linearGradient>
        </defs>
        <rect width="640" height="360" fill={`url(#${id}-background)`} />
        <circle cx={interviewer ? '498' : '134'} cy="82" r="104" fill="#ffffff" opacity=".22" />
        <rect x="30" y="28" width="580" height="304" rx="20" fill="#ffffff" opacity=".16" />
        <path d="M163 360c16-87 81-133 157-133s141 46 157 133" fill={`url(#${id}-shirt)`} />
        <ellipse cx="320" cy="150" rx="85" ry="100" fill={interviewer ? '#bd8767' : '#d59b77'} />
        <path d={interviewer ? 'M233 145c-9-89 38-119 91-119 61 0 95 46 80 127-17-7-32-23-43-50-24 29-68 43-128 42z' : 'M232 150c-14-88 29-128 92-128 67 0 99 48 84 131-19-9-39-28-52-55-24 34-68 52-124 52z'} fill={interviewer ? '#443a35' : '#302e30'} />
        <path d="M262 160c12 8 26 8 38 0M340 160c12 8 26 8 38 0" fill="none" stroke="#473a35" strokeWidth="6" strokeLinecap="round" />
        <path d="M299 198c13 11 29 11 42 0" fill="none" stroke="#8b5149" strokeWidth="5" strokeLinecap="round" />
        <path d="M272 252c18 19 77 19 96 0" fill="none" stroke="#e9c7ad" strokeWidth="10" strokeLinecap="round" opacity=".7" />
      </svg>
      <div className="absolute bottom-2 left-2 rounded-lg bg-[#173b35]/80 px-2.5 py-1.5 text-[10px] font-semibold text-white">
        {interviewer ? 'Interviewer · video preview' : 'Maya Chen · video preview'}
      </div>
      <div className="absolute right-2 top-2 flex items-center gap-1.5 rounded-full bg-[#173b35]/75 px-2 py-1 text-[9px] font-semibold text-white">
        <Camera size={11} /> Demo image
      </div>
    </div>
  );
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export function CandidateInterviewRoom({ jobTitle, onReturnToApplications }: CandidateInterviewRoomProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(90 * 60);
  const [completionReason, setCompletionReason] = useState<CompletionReason>(null);
  const [answerDraft, setAnswerDraft] = useState('');
  const [candidateTranscript, setCandidateTranscript] = useState(initialCandidateTranscript);
  const [answerMessage, setAnswerMessage] = useState('');
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (completionReason) return;
    const timerId = window.setInterval(() => {
      setSecondsRemaining((remaining) => {
        if (remaining <= 1) {
          setCompletionReason('timeout');
          return 0;
        }
        return remaining - 1;
      });
    }, 1000);
    return () => window.clearInterval(timerId);
  }, [completionReason]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [candidateTranscript]);

  const addAnswer = () => {
    const answer = answerDraft.trim();
    if (!answer) {
      setAnswerMessage('Enter an answer before adding it to your transcript.');
      return;
    }
    setCandidateTranscript((current) => [...current, `You: ${answer}`]);
    setAnswerDraft('');
    setAnswerMessage('Your response was added to the demo transcript.');
  };

  if (completionReason) {
    return (
      <section data-testid="panel-interview-complete" className="mx-auto max-w-[640px] rounded-3xl border border-[#dce5db] bg-[#fcfbf7] px-6 py-12 text-center shadow-[0_24px_80px_-46px_rgba(31,59,54,.34)] sm:px-10">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e2eee2] text-[#347364]"><CheckCircle2 size={26} /></div>
        <div className="mt-5 text-[10px] font-bold uppercase tracking-[.16em] text-[#68857a]">Interview ended</div>
        <h1 className="serif mt-2 text-[32px] font-bold tracking-[-.05em] text-[#2d4446]">{completionReason === 'manual' ? 'You completed the interview.' : 'The time limit has ended.'}</h1>
        <p className="mx-auto mt-3 max-w-[440px] text-[13px] leading-6 text-[#73817b]">This demo session is complete. Your responses are not sent to a hiring team.</p>
        <button type="button" data-testid="button-return-to-applications" onClick={onReturnToApplications} className="mt-7 inline-flex items-center gap-2 rounded-xl bg-[#205e53] px-5 py-3 text-[12px] font-bold text-white hover:bg-[#184d44]">
          <ArrowLeft size={15} />Return to applications
        </button>
      </section>
    );
  }

  return (
    <section data-testid="page-candidate-interview" className="space-y-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <div className="mb-2 text-[10px] font-bold uppercase tracking-[.16em] text-[#68857a]">Candidate interview</div>
          <h1 className="serif text-[clamp(28px,4vw,38px)] font-bold tracking-[-.05em] text-[#2d4446]">{jobTitle}</h1>
          <p className="mt-1 text-[12px] text-[#75827e]">Interview room · Candidate: Maya Chen</p>
        </div>
        <div className="flex items-center gap-3 self-start rounded-xl border border-[#e7dfd2] bg-[#fff9ec] px-4 py-2.5 sm:self-auto">
          <Clock3 size={17} className="text-[#a97843]" />
          <div><div className="text-[9px] font-bold uppercase tracking-[.12em] text-[#8b795e]">Time remaining · max 90 min</div><div data-testid="text-interview-timer" className="mt-0.5 font-mono text-[18px] font-bold tabular-nums text-[#594c39]">{formatTime(secondsRemaining)}</div></div>
        </div>
      </div>

      <div role="note" className="rounded-xl border border-[#e5e5d9] bg-[#f8f7f0] px-4 py-3 text-[10px] leading-5 text-[#77837c]">
        Demo preview only: the participant videos are illustrations, and camera, microphone recording, and live transcription are not connected.
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,.95fr)_minmax(340px,1.15fr)_minmax(0,.95fr)]">
        <section aria-labelledby="candidate-video-heading" className="rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-4 shadow-[0_6px_25px_-22px_rgba(31,59,54,.3)]">
          <div className="mb-3 flex items-center justify-between gap-3"><h2 id="candidate-video-heading" className="text-[12px] font-bold text-[#3d5550]">Your video</h2><span className="flex items-center gap-1.5 text-[9px] font-semibold text-[#73817b]"><Mic size={12} />Transcript preview</span></div>
          <ParticipantPlaceholder />
          <div className="mt-4 border-t border-[#eeece4] pt-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#819087]">Your audio transcript</div>
            <div data-testid="list-candidate-transcript" aria-live="polite" className="max-h-[270px] space-y-2 overflow-y-auto rounded-xl bg-[#f5f6ef] p-3">
              {candidateTranscript.map((line, index) => <p key={`${index}-${line}`} className="rounded-lg bg-white/75 px-3 py-2 text-[10px] leading-5 text-[#5f716b]">{line}</p>)}
              <div ref={transcriptEndRef} />
            </div>
            <p className="mt-2 text-[9px] leading-4 text-[#9aa29b]">In a live interview, candidate speech would appear here.</p>
          </div>
        </section>

        <section aria-labelledby="problem-heading" className="rounded-2xl border border-[#dce4da] bg-[#f1f5ed] p-4 shadow-[0_6px_25px_-22px_rgba(31,59,54,.3)] sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div><div className="mb-1 text-[9px] font-bold uppercase tracking-[.13em] text-[#6b877a]">Problem to solve</div><h2 id="problem-heading" className="serif text-[19px] font-bold tracking-[-.035em] text-[#2d4446]">Make onboarding feel effortless</h2></div>
            <span className="shrink-0 rounded-full bg-white/80 px-2.5 py-1 text-[9px] font-bold text-[#6e8077]">Case prompt</span>
          </div>
          <div className="rounded-xl border border-[#e0e7dc] bg-white/80 p-4">
            <p className="text-[11px] leading-6 text-[#586d65]">A mobile banking app has a high drop-off rate during account setup. New customers say the process feels long and they are unsure why certain information is needed.</p>
            <div className="mt-4 border-t border-[#e9eee6] pt-3">
              <h3 className="text-[10px] font-bold text-[#536b61]">Your challenge</h3>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-[10px] leading-5 text-[#6a7b73]">
                <li>Describe how you would identify the biggest point of friction.</li>
                <li>Propose one change that builds clarity and trust.</li>
                <li>Explain how you would measure the result.</li>
              </ul>
            </div>
          </div>
          <label htmlFor="candidate-interview-answer" className="mt-4 block text-[10px] font-bold text-[#536b61]">Your answer</label>
          <textarea id="candidate-interview-answer" data-testid="input-interview-answer" value={answerDraft} onChange={(event) => { setAnswerDraft(event.target.value); setAnswerMessage(''); }} placeholder="Type your answer to the case prompt…" rows={7} className="mt-2 w-full resize-y rounded-xl border border-[#dfe5dc] bg-white px-3.5 py-3 text-[11px] leading-5 text-[#4f655e] outline-none placeholder:text-[#a1aaa3] focus:border-[#438274] focus:ring-4 focus:ring-[#438274]/10" />
          <div className="mt-2 flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <span role="status" data-testid="status-interview-answer" className="text-[9px] leading-4 text-[#79877f]">{answerMessage || 'Your submitted answer is added to the transcript preview.'}</span>
            <button type="button" data-testid="button-add-interview-answer" onClick={addAnswer} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-[#205e53] px-3.5 py-2.5 text-[10px] font-bold text-white hover:bg-[#184d44]"><Send size={13} />Add answer</button>
          </div>
        </section>

        <section aria-labelledby="interviewer-video-heading" className="rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-4 shadow-[0_6px_25px_-22px_rgba(31,59,54,.3)]">
          <div className="mb-3 flex items-center justify-between gap-3"><h2 id="interviewer-video-heading" className="text-[12px] font-bold text-[#3d5550]">Interviewer</h2><span className="flex items-center gap-1.5 text-[9px] font-semibold text-[#73817b]"><Sparkles size={12} />Interview team</span></div>
          <ParticipantPlaceholder interviewer />
          <div className="mt-4 border-t border-[#eeece4] pt-3">
            <div className="mb-2 text-[10px] font-bold uppercase tracking-[.1em] text-[#819087]">Interviewer transcript</div>
            <div data-testid="list-interviewer-transcript" aria-live="polite" className="max-h-[270px] space-y-2 overflow-y-auto rounded-xl bg-[#f5f6ef] p-3">
              {interviewerTranscript.map((line) => <p key={line} className="rounded-lg bg-white/75 px-3 py-2 text-[10px] leading-5 text-[#5f716b]">{line}</p>)}
            </div>
            <p className="mt-2 text-[9px] leading-4 text-[#9aa29b]">Sample interviewer prompts · live transcription is not connected.</p>
          </div>
        </section>
      </div>

      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-4 sm:flex-row sm:items-center sm:px-5">
        <p className="text-[10px] leading-5 text-[#87928b]">You can end the interview at any time. Your text response remains in this demo session only.</p>
        <button type="button" data-testid="button-complete-interview" onClick={() => setCompletionReason('manual')} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-[#cfaaa0] bg-[#fff8f5] px-4 py-3 text-[11px] font-bold text-[#8a5046] hover:bg-[#ffefea]">
          <CheckCircle2 size={15} />Complete Interview
        </button>
      </div>
    </section>
  );
}
