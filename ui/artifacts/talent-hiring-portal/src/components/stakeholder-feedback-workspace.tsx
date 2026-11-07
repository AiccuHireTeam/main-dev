import { ArrowRight, BriefcaseBusiness, Check, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Form } from '@/components/ui/form';

export type StakeholderAnswerSet = Record<string, string>;
export type StakeholderJobQuestion = { id: string; prompt: string };
export type StakeholderJob = {
  id: string;
  jobId: string;
  title: string;
  team: string;
  time: string;
  jobDetails: string;
  requirements: string[];
  questions: StakeholderJobQuestion[];
};

type StakeholderFeedbackValues = { questionId: string; answer: string };
type StakeholderFeedbackWorkspaceProps = {
  job: StakeholderJob;
  initialAnswers: StakeholderAnswerSet;
  onBack: (draft: StakeholderAnswerSet) => void;
  onSubmit: (answers: StakeholderAnswerSet) => void;
};

export function StakeholderFeedbackWorkspace({
  job,
  initialAnswers,
  onBack,
  onSubmit,
}: StakeholderFeedbackWorkspaceProps) {
  const firstUnansweredId = job.questions.find((question) => !initialAnswers[question.id]?.trim())?.id
    ?? job.questions[0]?.id
    ?? '';
  const [answers, setAnswers] = useState<StakeholderAnswerSet>(initialAnswers);
  const [answerError, setAnswerError] = useState('');
  const form = useForm<StakeholderFeedbackValues>({
    defaultValues: {
      questionId: firstUnansweredId,
      answer: initialAnswers[firstUnansweredId] ?? '',
    },
  });
  const questionId = form.watch('questionId') ?? '';
  const answerDraft = form.watch('answer') ?? '';
  const selectedQuestion = job.questions.find((question) => question.id === questionId);
  const allQuestionsAnswered = job.questions.every((question) => !!answers[question.id]?.trim());
  const hasUnsubmittedChanges = !!questionId
    && answerDraft.trim() !== (answers[questionId] ?? '').trim();
  const canSubmitStakeholderInput = allQuestionsAnswered && !hasUnsubmittedChanges;

  const selectQuestion = (nextQuestionId: string) => {
    if (hasUnsubmittedChanges) {
      setAnswerError('Select Submit Answer to save this response before changing questions.');
      return;
    }
    form.setValue('questionId', nextQuestionId, { shouldDirty: true });
    form.setValue('answer', answers[nextQuestionId] ?? '', { shouldDirty: true });
    setAnswerError('');
  };
  const submitAnswer = () => {
    if (!questionId) {
      setAnswerError('Choose a question before submitting an answer.');
      return;
    }
    const answer = form.getValues('answer').trim();
    if (!answer) {
      setAnswerError('Enter an answer for the selected question.');
      return;
    }
    const nextAnswers = { ...answers, [questionId]: answer };
    setAnswers(nextAnswers);
    setAnswerError('');
    const nextQuestion = job.questions.find((question) =>
      question.id !== questionId && !nextAnswers[question.id]?.trim(),
    );
    if (nextQuestion) {
      form.setValue('questionId', nextQuestion.id, { shouldDirty: true });
      form.setValue('answer', '', { shouldDirty: true });
    }
  };
  const editAnswer = (targetQuestionId: string) => {
    if (hasUnsubmittedChanges) {
      setAnswerError('Select Submit Answer to save this response before editing another question.');
      return;
    }
    form.setValue('questionId', targetQuestionId, { shouldDirty: true });
    form.setValue('answer', answers[targetQuestionId] ?? '', { shouldDirty: true });
    setAnswerError('');
    document.getElementById(`stakeholder-answer-${job.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    document.getElementById(`stakeholder-answer-${job.id}`)?.focus({ preventScroll: true });
  };
  const submitStakeholderInput = () => {
    if (canSubmitStakeholderInput) onSubmit(answers);
  };

  return <>
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
      <button type="button" data-testid="button-back-to-requests" onClick={() => { if (hasUnsubmittedChanges) { setAnswerError('Select Submit Answer to save this response before leaving.'); return; } onBack(answers); }} className="inline-flex items-center gap-2 rounded-lg px-2 py-2 text-[12px] font-semibold text-[#47635b] hover:bg-[#e9eee7]">
        <ArrowRight size={15} className="rotate-180" />Back to requests
      </button>
      <span className="inline-flex items-center gap-1.5 text-[11px] text-[#788781]"><LockKeyhole size={14} className="text-[#4d806d]" />Candidate identity is not shown</span>
    </div>

    <header className="mb-6 flex flex-col justify-between gap-4 rounded-2xl border border-[#e1e3d9] bg-[#fbfaf5] p-5 sm:flex-row sm:items-center sm:p-6">
      <div>
        <div className="mb-2 text-[10px] font-bold uppercase tracking-[.15em] text-[#68857a]">Feedback request · {job.jobId}</div>
        <h1 data-testid="text-feedback-role-title" className="serif text-[clamp(25px,4vw,36px)] font-bold tracking-[-.05em] text-[#2d4446]">{job.title}</h1>
        <p className="mt-1 text-[12px] text-[#75827e]">{job.team} <span className="px-1">·</span> {job.time}</p>
      </div>
      <div className="flex w-fit items-center gap-1.5 rounded-full bg-[#edf1e9] px-3 py-1.5 text-[10px] font-semibold text-[#527264]"><BriefcaseBusiness size={13} />Role-based feedback</div>
    </header>

    <Form {...form}>
      <form onSubmit={form.handleSubmit(submitStakeholderInput)}>
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(220px,.9fr)_minmax(280px,1fr)_minmax(280px,1fr)]">
          <section data-testid="panel-job-description" className="rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-5 xl:sticky xl:top-4">
            <div className="mb-4 flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#e8efe7] text-[#397462]"><BriefcaseBusiness size={17} /></div>
              <div><div className="text-[9px] font-bold uppercase tracking-[.13em] text-[#71867c]">Hiring manager job description · Read only</div><h2 className="serif mt-1 text-[17px] font-bold leading-5 text-[#344d4d]">{job.title}</h2></div>
            </div>
            <div className="max-h-[64vh] space-y-4 overflow-y-auto rounded-xl bg-[#f3f3ec] p-4">
              <div><div className="text-[9px] font-bold uppercase tracking-[.1em] text-[#819087]">Job ID</div><p data-testid="text-feedback-job-id" className="mt-1 text-[12px] font-semibold text-[#435c56]">{job.jobId}</p></div>
              <div><h3 className="text-[11px] font-bold text-[#435c56]">Job details</h3><p data-testid="text-job-description" className="mt-1 whitespace-pre-line text-[11px] leading-5 text-[#60736c]">{job.jobDetails}</p></div>
              <div><h3 className="text-[11px] font-bold text-[#435c56]">Requirements</h3><ul data-testid="list-job-requirements" className="mt-1 list-disc space-y-1 pl-4 text-[11px] leading-5 text-[#60736c]">{job.requirements.map((requirement) => <li key={requirement}>{requirement}</li>)}</ul></div>
            </div>
          </section>

          <section data-testid="panel-stakeholder-questions" className="rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-5">
            <div className="mb-4">
              <div className="text-[10px] font-bold uppercase tracking-[.14em] text-[#68857a]">Stakeholder questions</div>
              <h2 className="serif mt-1 text-[21px] font-bold tracking-[-.04em] text-[#344d4d]">Share your input</h2>
              <p className="mt-2 text-[11px] leading-5 text-[#75827e]">Select a question, write your answer, and submit it to the answer list.</p>
            </div>
            <label htmlFor={`stakeholder-question-${job.id}`} className="mb-1.5 block text-[10px] font-semibold text-[#50635d]">Question to answer</label>
            <select id={`stakeholder-question-${job.id}`} value={questionId} onChange={(event) => selectQuestion(event.target.value)} data-testid="select-stakeholder-question" className="h-11 w-full rounded-xl border border-[#dfe1d8] bg-[#fffefa] px-3 text-[11px] text-[#3f5550] outline-none focus:border-[#438274] focus:ring-4 focus:ring-[#438274]/10">
              {job.questions.map((question, index) => <option key={question.id} value={question.id}>Question {index + 1}: {question.prompt}</option>)}
            </select>
            {selectedQuestion && <p data-testid="text-selected-question" className="mt-3 rounded-xl bg-[#f3f3ec] p-3 text-[11px] font-semibold leading-5 text-[#435c56]">{selectedQuestion.prompt}</p>}
            <label htmlFor={`stakeholder-answer-${job.id}`} className="mb-1.5 mt-4 block text-[10px] font-semibold text-[#50635d]">Answer text</label>
            <textarea id={`stakeholder-answer-${job.id}`} value={answerDraft} onChange={(event) => { form.setValue('answer', event.target.value, { shouldDirty: true }); setAnswerError(''); }} rows={7} maxLength={2000} data-testid="input-stakeholder-answer" placeholder="Enter your answer to the selected question…" className="w-full resize-y rounded-xl border border-[#dfe1d8] bg-[#fffefa] p-3 text-[11px] leading-5 outline-none placeholder:text-[#a0aaa6] focus:border-[#438274] focus:ring-4 focus:ring-[#438274]/10" />
            {answerError && <p role="alert" data-testid="status-answer-error" className="mt-2 text-[10px] leading-4 text-[#a34c41]">{answerError}</p>}
            <button type="button" data-testid="button-submit-question-answer" onClick={submitAnswer} disabled={!questionId || !answerDraft.trim()} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#cbd9ce] bg-[#edf3ec] px-4 py-3 text-[11px] font-bold text-[#315e51] hover:bg-[#e4eee4] disabled:cursor-not-allowed disabled:opacity-45">
              <Check size={14} />Submit Answer
            </button>
          </section>

          <aside data-testid="panel-stakeholder-answers" className="rounded-2xl border border-[#e4e2d9] bg-[#fcfbf7] p-5 xl:sticky xl:top-4">
            <div className="mb-4">
              <div className="text-[10px] font-bold uppercase tracking-[.13em] text-[#71867c]">Question and answer review</div>
              <h2 className="serif mt-1 text-[19px] font-bold tracking-[-.04em] text-[#344d4d]">Stakeholder answers</h2>
            </div>
            <div aria-live="polite" data-testid="list-stakeholder-answers" className="max-h-[64vh] space-y-2 overflow-y-auto pr-1">
              {job.questions.map((question, index) => {
                const answer = answers[question.id];
                return <article key={question.id} data-testid={`review-answer-${question.id}`} className="rounded-xl border border-[#e7e6de] bg-[#f8f7f1] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="text-[10px] font-bold text-[#536a60]">Q{index + 1} · {question.prompt}</div>
                    {answer && <button type="button" aria-label={`Edit answer ${index + 1}`} data-testid={`button-edit-answer-${question.id}`} onClick={() => editAnswer(question.id)} className="shrink-0 rounded-md px-2 py-1 text-[9px] font-bold text-[#39715d] hover:bg-[#e8efe7]">Edit</button>}
                  </div>
                  <p className="mt-2 whitespace-pre-wrap text-[10px] leading-4 text-[#63746d]">A{index + 1}. {answer || 'No answer submitted yet.'}</p>
                </article>;
              })}
            </div>
            <p className="mt-3 text-[10px] leading-4 text-[#8b928b]">Saved answers for this job appear here.</p>
          </aside>
        </div>
        <div className="mt-6 border-t border-[#e8e6de] pt-5 text-center">
          {!allQuestionsAnswered && <p role="status" data-testid="status-questions-incomplete" className="mb-3 text-[10px] leading-4 text-[#8b928b]">Submit an answer for each question before sending the complete stakeholder input.</p>}
          {allQuestionsAnswered && hasUnsubmittedChanges && <p role="status" data-testid="status-answer-unsaved" className="mb-3 text-[10px] leading-4 text-[#8b928b]">Select Submit Answer to save your current response before submitting the full input.</p>}
          <button type="submit" data-testid="button-submit-stakeholder-input" disabled={!canSubmitStakeholderInput} className="inline-flex min-w-[240px] items-center justify-center gap-2 rounded-xl bg-[#205e53] px-6 py-3 text-[12px] font-bold text-white hover:bg-[#184d44] disabled:cursor-not-allowed disabled:opacity-45">
            <Check size={15} />Submit Stakeholder Input
          </button>
        </div>
      </form>
    </Form>
    <p className="mt-6 text-center text-[10px] leading-5 text-[#89948d]">Your input is shared privately with the hiring team.</p>
  </>;
}
