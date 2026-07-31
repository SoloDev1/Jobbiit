export type SupportedIntent =
  | "RESUME_IMPROVE"
  | "COVER_LETTER_WRITE"
  | "INTERVIEW_PREP"
  | "OPPORTUNITY_EXPLAIN"
  | "CAREER_ADVICE"
  | "UNSUPPORTED";

export interface IntentClassificationResult {
  intent: SupportedIntent;
  isSupported: boolean;
  refusalMessage?: string;
}

export class IntentRouterService {
  private static CAREER_KEYWORDS = [
    "cv", "resume", "cover letter", "interview", "job", "career",
    "scholarship", "grant", "internship", "ats", "qualification",
    "experience", "skill", "salary", "portfolio", "application"
  ];

  private static UNSUPPORTED_TRIGGERS = [
    "recipe", "pasta", "cook", "travel to", "hotel", "python scraper",
    "code a game", "write a poem about cats", "joke", "movie recommendation"
  ];

  /**
   * Evaluates user query before triggering LLM calls
   */
  static classifyIntent(message: string): IntentClassificationResult {
    const text = message.toLowerCase().trim();

    // Check for explicit unsupported triggers
    const isExplicitUnsupported = this.UNSUPPORTED_TRIGGERS.some((trigger) =>
      text.includes(trigger)
    );

    if (isExplicitUnsupported) {
      return {
        intent: "UNSUPPORTED",
        isSupported: false,
        refusalMessage:
          "I'm designed specifically to help with careers and opportunities within OpporHub. I can't assist with that request, but I'd be happy to help you review a job posting, improve your resume, prepare for an interview, or answer career-related questions.",
      };
    }

    // Determine intent
    if (text.includes("resume") || text.includes("cv") || text.includes("summary")) {
      return { intent: "RESUME_IMPROVE", isSupported: true };
    }
    if (text.includes("cover letter") || text.includes("application letter")) {
      return { intent: "COVER_LETTER_WRITE", isSupported: true };
    }
    if (text.includes("interview") || text.includes("q&a") || text.includes("practice")) {
      return { intent: "INTERVIEW_PREP", isSupported: true };
    }
    if (text.includes("explain") || text.includes("opportunity") || text.includes("role")) {
      return { intent: "OPPORTUNITY_EXPLAIN", isSupported: true };
    }
    if (text.includes("advice") || text.includes("recommend") || text.includes("path")) {
      return { intent: "CAREER_ADVICE", isSupported: true };
    }

    // Default check against career keyword domain
    const matchesDomain = this.CAREER_KEYWORDS.some((kw) => text.includes(kw));

    if (!matchesDomain && text.length > 20) {
      return {
        intent: "UNSUPPORTED",
        isSupported: false,
        refusalMessage:
          "I'm designed specifically to help with careers and opportunities within OpporHub. I can't assist with that request, but I'd be happy to help you review a job posting, improve your resume, prepare for an interview, or answer career-related questions.",
      };
    }

    return { intent: "CAREER_ADVICE", isSupported: true };
  }
}
