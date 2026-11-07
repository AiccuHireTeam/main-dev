export type CandidateChatApplication = {
  id: string;
  title: string;
  company: string;
  location: string;
  date: string;
  status: string;
  detail: string;
  next: string;
};

export function answerCandidateApplicationQuestion(
  question: string,
  applications: CandidateChatApplication[],
  followUpSubmitted = false,
): string {
  const query = question.trim().toLowerCase();
  if (!query) {
    return "Ask me about an application, its status, your next steps, your resume, or an interview.";
  }

  if (/\b(interviewer|recruiter|contact person|hiring manager name)\b/.test(query)) {
    return "The demo application records don’t include interviewer or recruiter names.";
  }

  if (/\b(deadline|due date|due by|when is (?:the )?(?:follow.?up|it) due)\b/.test(query)) {
    const nextSteps = applications
      .filter((application) => application.status === "Follow-up Requested")
      .map((application) => `${application.title}: ${application.next}`);
    return nextSteps.length
      ? `The demo doesn’t show a follow-up due date. ${nextSteps.join(" ")}`
      : "The demo application records don’t include a due date. Check the Next step shown on each application card.";
  }

  const matchingApplication = applications.find((application) =>
    [application.title, application.company].some((value) =>
      query.includes(value.toLowerCase()),
    ),
  );
  if (matchingApplication) {
    const application = matchingApplication;
    const followUpNote =
      application.status === "Follow-up Requested"
        ? followUpSubmitted
          ? " Your follow-up answers are submitted; you can still review or update them."
          : " Use Update resume and Answer questions on this application card to respond."
        : "";
    return `${application.title} at ${application.company} is marked “${application.status}.” ${application.detail} Next: ${application.next}${followUpNote}`;
  }

  if (/\b(follow.?up|questionnaire|questions)\b/.test(query)) {
    const followUp = applications.find(
      (application) => application.status === "Follow-up Requested",
    );
    if (!followUp) {
      return "There isn’t a Follow-up Requested application in the records shown here.";
    }
    return followUpSubmitted
      ? `Your follow-up for ${followUp.title} at ${followUp.company} has been submitted. You can select Review answers on that application to update your responses.`
      : `The team requested an updated resume and four role-specific questions for ${followUp.title} at ${followUp.company}. Use Update resume and Answer questions on that application card.`;
  }

  if (/\b(resume|cv)\b/.test(query)) {
    const updateable = applications.filter(
      (application) =>
        application.status === "Application received" ||
        application.status === "Follow-up Requested",
    );
    return updateable.length
      ? `You can update your resume from these application cards: ${updateable
          .map((application) => `${application.title} (${application.status})`)
          .join(", ")}. Select Update resume on the card.`
      : "No application currently has a resume-update action.";
  }

  if (/\b(interview|interviewing|schedule)\b/.test(query)) {
    const interview = applications.find(
      (application) => application.status === "Interviewing",
    );
    return interview
      ? `${interview.title} at ${interview.company} is marked Interviewing. ${interview.next} Select Interview on that application to continue; recording consent is required before entering the demo interview.`
      : "No application is currently marked Interviewing, so there is no interview action shown.";
  }

  if (/\b(next|action|need to do|what should i do)\b/.test(query)) {
    const followUp = applications.find(
      (application) => application.status === "Follow-up Requested",
    );
    if (followUp) {
      return followUpSubmitted
        ? `You’ve submitted the follow-up for ${followUp.title}. Your other application cards show their current next steps.`
        : `Your next step is for ${followUp.title} at ${followUp.company}: ${followUp.next}`;
    }
    const interview = applications.find(
      (application) => application.status === "Interviewing",
    );
    if (interview) return `${interview.title}: ${interview.next}`;
  }

  if (/\b(status|stage|progress|application)\b/.test(query)) {
    return applications
      .map(
        (application) =>
          `${application.title} at ${application.company}: ${application.status}.`,
      )
      .join(" ");
  }

  return "I can help with the application statuses and next steps shown in your portal, including resume updates, follow-up questions, and interviews. I don’t have other hiring-team information in this demo.";
}
