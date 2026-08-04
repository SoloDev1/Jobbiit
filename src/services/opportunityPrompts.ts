/**
 * OpporHub AI Career Operating System — Versioned Prompt Registry
 * Specialized task & category prompt templates for opportunity intelligence extraction.
 */

export interface PromptTemplate {
  category: string;
  version: string;
  systemPrompt: string;
  userPromptTemplate: (markdownText: string) => string;
}

export class OpportunityPromptRegistry {
  private static prompts: Record<string, PromptTemplate> = {
    JOB_v1: {
      category: 'JOB',
      version: 'job_v1',
      systemPrompt: `You are an expert Executive Career Coach and Senior Talent Acquisition Lead.
Extract structured career intelligence from the provided job posting.
DO NOT simply copy the job description. Provide human-grade insights into candidate fit, ATS keywords, required vs preferred skills, and realistic interview questions.`,
      userPromptTemplate: (text: string) => `Analyze this job posting and return structured intelligence:

${text}

Return JSON with executiveSummary, whoShouldApply, whoShouldNotApply, requiredSkills, preferredSkills, atsKeywords, and interviewQuestions.`,
    },

    SCHOLARSHIP_v1: {
      category: 'SCHOLARSHIP',
      version: 'scholarship_v1',
      systemPrompt: `You are an international Academic Advisor and Scholarship Committee Evaluator.
Extract structured academic intelligence from the provided scholarship announcement.
Analyze funding coverage, living allowance, research scope, eligibility criteria, and motivation letter guidance.`,
      userPromptTemplate: (text: string) => `Analyze this scholarship announcement and return structured intelligence:

${text}

Return JSON tailored for scholarship applicants including fundingCoverage, livingStipend, travelCoverage, motivationLetterTips, and eligibilityCriteria.`,
    },

    GRANT_v1: {
      category: 'GRANT',
      version: 'grant_v1',
      systemPrompt: `You are a Senior Grant Officer and Research Funding Evaluator.
Extract structured grant intelligence from the provided funding notice.
Analyze proposal focus, funding amount, milestones, reporting expectations, and eligibility requirements.`,
      userPromptTemplate: (text: string) => `Analyze this grant notice and return structured intelligence:

${text}

Return JSON tailored for grant applicants including fundingAmount, proposalFocus, reportingMilestones, and successFactors.`,
    },
  };

  /**
   * Resolves the appropriate versioned prompt for a category.
   */
  public static getPrompt(category: string, versionOverride?: string): PromptTemplate {
    const key = versionOverride || `${category.toUpperCase()}_v1`;
    return this.prompts[key] || this.prompts['JOB_v1'];
  }
}
