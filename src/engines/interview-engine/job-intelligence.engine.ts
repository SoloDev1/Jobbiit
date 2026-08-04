import { logger } from '../../core/telemetry/logger.service';
import { aiRouter } from '../../services/aiRouter.service';
import type { IngestJobInput, JobIntelligenceData } from '../../types/interview.types';

export class JobIntelligenceEngine {
  /**
   * Ingests any input source and extracts structured Job Intelligence via LLM.
   */
  public async ingestJob(input: IngestJobInput): Promise<JobIntelligenceData> {
    logger.info({ userId: input.userId, sourceType: input.sourceType, service: 'JobIntelligenceEngine' }, 'Ingesting raw job data');

    if (input.sourceType === 'CUSTOM_EMAIL' && input.emailText) {
      return this.parseRecruiterEmail(input.emailText, input);
    }

    if (input.sourceType === 'CUSTOM_URL' && input.jobUrl) {
      return this.parseJobUrl(input.jobUrl, input);
    }

    if (input.sourceType === 'CUSTOM_TEXT' && input.inputText) {
      return this.parseJobText(input.inputText, input);
    }

    // Manual Form Input — use provided fields directly
    return {
      companyName: input.company || 'Target Company',
      roleTitle: input.role || 'Target Role',
      seniorityLevel: 'MID_LEVEL',
      requiredSkills: ['Problem Solving', 'Communication', 'Execution'],
      atsKeywords: ['leadership', 'impact', 'architecture', 'strategy'],
      jobDescriptionText: input.inputText || undefined,
    };
  }

  /**
   * Parses recruiter email to extract Company, Role, Interview Date, and required skills via LLM.
   */
  private async parseRecruiterEmail(emailText: string, input: IngestJobInput): Promise<JobIntelligenceData> {
    try {
      const response = await aiRouter.complete({
        task: 'JOB_INTEL_EXTRACT',
        systemPrompt: `You are an expert career assistant. Extract structured job intelligence from a recruiter email.
Return a JSON object with: companyName, roleTitle, seniorityLevel (ENTRY_LEVEL|MID_LEVEL|SENIOR|STAFF|PRINCIPAL), requiredSkills (array), preferredSkills (array), atsKeywords (array), interviewFormat (string or null), interviewDate (string or null).
Extract only what is explicitly stated. Use "Unknown" for missing fields, not invented data.`,
        userPrompt: `Recruiter Email:\n${emailText}`,
        jsonMode: true,
      });

      const data = aiRouter.parseJSON<{
        companyName: string;
        roleTitle: string;
        seniorityLevel: string;
        requiredSkills: string[];
        preferredSkills: string[];
        atsKeywords: string[];
        interviewFormat: string | null;
        interviewDate: string | null;
      }>(response, this.regexEmailFallback(emailText, input) as any);

      logger.info({ company: data.companyName, role: data.roleTitle, service: 'JobIntelligenceEngine' }, 'Email parsed by LLM');

      return {
        companyName: data.companyName || input.company || 'Partner Company',
        roleTitle: data.roleTitle || input.role || 'Specialist Role',
        seniorityLevel: data.seniorityLevel || 'SENIOR',
        requiredSkills: data.requiredSkills?.length > 0 ? data.requiredSkills : ['Technical Leadership'],
        atsKeywords: data.atsKeywords?.length > 0 ? data.atsKeywords : [...(data.requiredSkills || []), 'STAR Framework'],
        jobDescriptionText: emailText,
        emailDetails: {
          interviewFormat: data.interviewFormat || 'Recruiter Screening',
          interviewDate: data.interviewDate || undefined,
        },
      };
    } catch (err: any) {
      logger.warn({ error: err.message, service: 'JobIntelligenceEngine' }, 'LLM email parse failed, using regex fallback');
      return this.regexEmailFallback(emailText, input);
    }
  }

  /**
   * Fetches and parses a job posting URL, then extracts intelligence via LLM.
   */
  private async parseJobUrl(jobUrl: string, input: IngestJobInput): Promise<JobIntelligenceData> {
    let rawText = '';

    // Attempt to fetch the URL content
    try {
      const res = await fetch(jobUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OpporHub/1.0)' },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const html = await res.text();
        // Strip HTML tags and compress whitespace
        rawText = html
          .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
          .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 6000); // Limit to 6k chars to stay within token budget
      }
    } catch (fetchErr: any) {
      logger.warn({ url: jobUrl, error: fetchErr.message, service: 'JobIntelligenceEngine' }, 'Failed to fetch job URL');
    }

    if (rawText.length > 100) {
      // Parse the fetched content via LLM
      return this.parseJobText(rawText, { ...input, inputText: rawText });
    }

    // Fallback if fetch failed
    const domain = new URL(jobUrl).hostname.replace('www.', '');
    return {
      companyName: input.company || domain,
      roleTitle: input.role || 'Target Role',
      seniorityLevel: 'SENIOR',
      requiredSkills: ['System Design', 'Team Collaboration'],
      atsKeywords: ['scalability', 'performance', 'agile'],
      rawUrl: jobUrl,
    };
  }

  /**
   * Parses raw job description text via LLM.
   */
  private async parseJobText(text: string, input: IngestJobInput): Promise<JobIntelligenceData> {
    try {
      const response = await aiRouter.complete({
        task: 'JOB_INTEL_EXTRACT',
        systemPrompt: `You are an expert career intelligence analyst. Extract structured job intelligence from the provided job description text.
Return a JSON object with: companyName, roleTitle, seniorityLevel (ENTRY_LEVEL|MID_LEVEL|SENIOR|STAFF|PRINCIPAL), requiredSkills (array of strings), preferredSkills (array of strings), atsKeywords (array of 6-10 strings).
Extract only what is explicitly stated. Use null for genuinely missing fields.`,
        userPrompt: `Job Description:\n${text.slice(0, 4000)}`,
        jsonMode: true,
      });

      const data = aiRouter.parseJSON<{
        companyName: string | null;
        roleTitle: string | null;
        seniorityLevel: string;
        requiredSkills: string[];
        preferredSkills: string[];
        atsKeywords: string[];
      }>(response, this.regexTextFallback(text, input) as any);

      logger.info({ company: data.companyName, role: data.roleTitle, service: 'JobIntelligenceEngine' }, 'Job text parsed by LLM');

      return {
        companyName: data.companyName || input.company || 'Target Enterprise',
        roleTitle: data.roleTitle || input.role || 'Software Engineering Role',
        seniorityLevel: data.seniorityLevel || 'MID_LEVEL',
        requiredSkills: data.requiredSkills?.length > 0 ? data.requiredSkills : ['Core Engineering'],
        atsKeywords: data.atsKeywords?.length > 0 ? data.atsKeywords : data.requiredSkills || [],
        jobDescriptionText: text,
      };
    } catch (err: any) {
      logger.warn({ error: err.message, service: 'JobIntelligenceEngine' }, 'LLM text parse failed, using regex fallback');
      return this.regexTextFallback(text, input);
    }
  }

  /** Regex-only fallback for recruiter email when LLM is unavailable */
  private regexEmailFallback(emailText: string, input: IngestJobInput): JobIntelligenceData {
    let companyName = input.company || 'Partner Company';
    const atCompanyMatch = emailText.match(/at\s+([A-Z][a-zA-Z0-9\s&]{2,20})(?:\s+for|\s+team|\.|,)/);
    if (atCompanyMatch) companyName = atCompanyMatch[1].trim();

    let roleTitle = input.role || 'Specialist Role';
    const roleMatch =
      emailText.match(/(?:role|position|opportunity|job)\s+of\s+([A-Z][a-zA-Z0-9\s-]{3,30})/i) ||
      emailText.match(/for\s+the\s+([A-Z][a-zA-Z0-9\s-]{3,30})\s+(?:position|role)/i);
    if (roleMatch) roleTitle = roleMatch[1].trim();

    const skills: string[] = [];
    if (/react|frontend|javascript|typescript|vue|angular/i.test(emailText)) skills.push('Frontend Development');
    if (/node|python|go|java|backend|sql|postgres|redis/i.test(emailText)) skills.push('Backend Systems');
    if (/aws|cloud|docker|kubernetes|devops/i.test(emailText)) skills.push('Cloud & DevOps');
    if (/system design|distributed|scaling/i.test(emailText)) skills.push('System Design');
    if (skills.length === 0) skills.push('Technical Leadership', 'Domain Expertise');

    return {
      companyName,
      roleTitle,
      seniorityLevel: 'SENIOR',
      requiredSkills: skills,
      atsKeywords: [...skills, 'STAR Framework', 'Problem Solving'],
      jobDescriptionText: emailText,
      emailDetails: { interviewFormat: 'Recruiter Screening & Technical Alignment' },
    };
  }

  /** Regex-only fallback for job text when LLM is unavailable */
  private regexTextFallback(text: string, input: IngestJobInput): JobIntelligenceData {
    const lower = text.toLowerCase();
    const skills: string[] = [];

    if (/react|typescript|javascript|vue|angular/i.test(lower)) skills.push('React / TypeScript');
    if (/node|express|nestjs|fastapi|django/i.test(lower)) skills.push('Node.js / Backend');
    if (/python|ml|machine learning|data science/i.test(lower)) skills.push('Python');
    if (/sql|postgres|mongodb|mysql/i.test(lower)) skills.push('Database Systems');
    if (/aws|gcp|azure|docker|kubernetes/i.test(lower)) skills.push('DevOps & Cloud');
    if (skills.length === 0) skills.push('Core Engineering', 'Problem Solving');

    const seniority = lower.includes('principal') ? 'PRINCIPAL'
      : lower.includes('staff') ? 'STAFF'
      : lower.includes('senior') ? 'SENIOR'
      : lower.includes('lead') ? 'STAFF'
      : 'MID_LEVEL';

    return {
      companyName: input.company || 'Target Enterprise',
      roleTitle: input.role || 'Software Engineering Role',
      seniorityLevel: seniority,
      requiredSkills: skills,
      atsKeywords: skills,
      jobDescriptionText: text,
    };
  }
}

export const jobIntelligenceEngine = new JobIntelligenceEngine();
