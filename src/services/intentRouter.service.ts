export type SupportedIntent =
  | "RESUME_CREATE"
  | "RESUME_TAILOR"
  | "RESUME_IMPROVE"
  | "COVER_LETTER_WRITE"
  | "SCHOLARSHIP_CREATE"
  | "GRANT_CREATE"
  | "RECOMMENDATION_LETTER"
  | "LINKEDIN_PROFILE"
  | "OUTREACH_EMAIL"
  | "PORTFOLIO_BIO"
  | "INTERVIEW_PREP"
  | "OPPORTUNITY_EXPLAIN"
  | "CAREER_ADVICE"
  | "UNSUPPORTED";

export interface IntentClassificationResult {
  intent: SupportedIntent;
  isSupported: boolean;
  mode: "context_aware" | "free_create";
  requiresClarification?: boolean;
  clarifyingQuestion?: string;
  refusalMessage?: string;
}

export class IntentRouterService {
  private static CAREER_KEYWORDS = [
    "cv", "resume", "cover letter", "interview", "job", "career",
    "scholarship", "grant", "internship", "ats", "qualification",
    "experience", "skill", "salary", "portfolio", "application",
    "recommendation", "linkedin", "essay", "proposal", "outreach", "bio"
  ];

  private static UNSUPPORTED_TRIGGERS = [
    "recipe", "pasta", "cook", "travel to", "hotel", "python scraper",
    "code a game", "write a poem about cats", "joke", "movie recommendation"
  ];

  /**
   * Evaluates user query before triggering LLM calls
   */
  static classifyIntent(message: string, hasOpportunityAttached: boolean = false): IntentClassificationResult {
    const text = message.toLowerCase().trim();
    const mode = hasOpportunityAttached ? "context_aware" : "free_create";

    // Check for explicit unsupported triggers
    const isExplicitUnsupported = this.UNSUPPORTED_TRIGGERS.some((trigger) =>
      text.includes(trigger)
    );

    if (isExplicitUnsupported) {
      return {
        intent: "UNSUPPORTED",
        isSupported: false,
        mode,
        refusalMessage:
          "I'm designed specifically as your Universal Career Copilot within OpporHub. I can't assist with that request, but I can generate CVs, cover letters, scholarship essays, grant proposals, recommendation letters, outreach emails, or LinkedIn profiles for you!",
      };
    }

    // Free Create / Document Creation Intents
    if (text.includes("scholarship") || text.includes("fellowship")) {
      return { intent: "SCHOLARSHIP_CREATE", isSupported: true, mode };
    }
    if (text.includes("grant") || text.includes("funding proposal")) {
      return { intent: "GRANT_CREATE", isSupported: true, mode };
    }
    if (text.includes("recommendation letter") || text.includes("reference letter")) {
      return { intent: "RECOMMENDATION_LETTER", isSupported: true, mode };
    }
    if (text.includes("linkedin")) {
      return { intent: "LINKEDIN_PROFILE", isSupported: true, mode };
    }
    if (text.includes("email") || text.includes("outreach") || text.includes("networking letter")) {
      return { intent: "OUTREACH_EMAIL", isSupported: true, mode };
    }
    if (text.includes("portfolio") || text.includes("bio")) {
      return { intent: "PORTFOLIO_BIO", isSupported: true, mode };
    }

    // Resume / CV Intents
    if (text.includes("tailor") && hasOpportunityAttached) {
      return { intent: "RESUME_TAILOR", isSupported: true, mode: "context_aware" };
    }
    if (text.includes("create cv") || text.includes("create resume") || text.includes("make a cv") || text.includes("generate cv")) {
      const isMissingRole = !text.includes("for") && !text.includes("engineer") && !text.includes("designer") && !text.includes("manager") && !text.includes("developer");
      return {
        intent: "RESUME_CREATE",
        isSupported: true,
        mode,
        requiresClarification: isMissingRole && !hasOpportunityAttached,
        clarifyingQuestion: isMissingRole && !hasOpportunityAttached ? "What role or target industry is this resume for?" : undefined
      };
    }
    if (text.includes("resume") || text.includes("cv") || text.includes("summary")) {
      return { intent: "RESUME_IMPROVE", isSupported: true, mode };
    }

    // Cover Letter Intents
    if (text.includes("cover letter") || text.includes("application letter")) {
      return { intent: "COVER_LETTER_WRITE", isSupported: true, mode };
    }

    // Advice & Interview
    if (text.includes("interview") || text.includes("q&a") || text.includes("practice")) {
      return { intent: "INTERVIEW_PREP", isSupported: true, mode };
    }
    if (text.includes("explain") || text.includes("opportunity") || text.includes("role")) {
      return { intent: "OPPORTUNITY_EXPLAIN", isSupported: true, mode };
    }
    if (text.includes("advice") || text.includes("recommend") || text.includes("path")) {
      return { intent: "CAREER_ADVICE", isSupported: true, mode };
    }

    // Default check against career keyword domain
    const matchesDomain = this.CAREER_KEYWORDS.some((kw) => text.includes(kw));

    if (!matchesDomain && text.length > 20) {
      return {
        intent: "UNSUPPORTED",
        isSupported: false,
        mode,
        refusalMessage:
          "I'm designed specifically as your Universal Career Copilot within OpporHub. I can't assist with that request, but I can generate CVs, cover letters, scholarship essays, grant proposals, recommendation letters, outreach emails, or LinkedIn profiles for you!",
      };
    }

    return { intent: "CAREER_ADVICE", isSupported: true, mode };
  }
}

