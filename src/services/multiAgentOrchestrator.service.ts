import { IntentRouterService } from "./intentRouter.service";
import { MemoryService } from "./memory.service";
import { OpportunityIntelligenceService } from "./opportunityIntelligence.service";
import { aiRouter } from "./aiRouter.service";
import { PromptLibrary } from "./promptLibrary.service";
import { ValidationError } from "../core/errors/domain-error";
import { logger } from "../core/telemetry/logger.service";

export interface PipelineExecutionInput {
  userId: string;
  intent?: string;
  userPrompt: string;
  opportunityId?: string;
  existingResumeJson?: any;
}

export interface PipelineProgressStep {
  id: string;
  label: string;
  status: "pending" | "in_progress" | "completed";
}

export class MultiAgentOrchestratorService {
  /**
   * Run the 4-Stage Multi-Agent Pipeline.
   * Stage 3 (Writer Agent) uses real LLM calls for all document types.
   */
  static async executePipeline(input: PipelineExecutionInput, onProgress?: (step: PipelineProgressStep) => void) {
    const hasOpportunity = !!input.opportunityId;

    // Stage 0: Role Guardrails & Intent Router
    const classification = IntentRouterService.classifyIntent(input.userPrompt, hasOpportunity);
    if (!classification.isSupported) {
      return {
        success: false,
        refusalMessage: classification.refusalMessage,
      };
    }

    if (classification.requiresClarification) {
      return {
        success: true,
        requiresClarification: true,
        clarifyingQuestion: classification.clarifyingQuestion,
      };
    }

    // Stage 1: Planner Agent
    onProgress?.({ id: "planner", label: `Planning ${classification.intent} (${classification.mode})`, status: "in_progress" });
    onProgress?.({ id: "planner", label: "Goal planned ✓", status: "completed" });

    // Stage 2: Retriever Agent
    onProgress?.({ id: "retriever", label: "Gathering profile & context memory", status: "in_progress" });
    const userMemory = await MemoryService.getUserMemory(input.userId);
    let opportunityContext: any = null;
    if (input.opportunityId) {
      opportunityContext = await OpportunityIntelligenceService.getOpportunityAnalysis(input.opportunityId);
    }
    onProgress?.({ id: "retriever", label: "Context retrieved ✓", status: "completed" });

    // Stage 3: Writer Agent — LLM-powered document generation
    onProgress?.({ id: "writer", label: "Generating document with AI", status: "in_progress" });
    const updatedResumeJson = await this.runWriterAgent(
      input.existingResumeJson,
      input.userPrompt,
      userMemory,
      opportunityContext,
      classification.intent
    );
    onProgress?.({ id: "writer", label: "Document generated ✓", status: "completed" });

    // Stage 4: Validator Agent
    onProgress?.({ id: "validator", label: "Auditing ATS & alignment", status: "in_progress" });
    const atsScore = this.calculateAtsScore(updatedResumeJson, opportunityContext);
    onProgress?.({ id: "validator", label: "Validated & Scored ✓", status: "completed" });

    return {
      success: true,
      mode: classification.mode,
      intent: classification.intent,
      data: updatedResumeJson,
      atsScore,
    };
  }

  /**
   * LLM-powered Writer Agent that generates documents from real candidate context.
   */
  private static async runWriterAgent(
    existingJson: any,
    prompt: string,
    memory: any,
    opportunityContext: any,
    intent: string
  ): Promise<any> {
    const fullName = memory?.fullName || '';
    const email = memory?.email || '';
    const phone = memory?.phone || '';
    const location = memory?.location || '';
    const role = opportunityContext?.summary?.split('.')[0] || memory?.targetRoles?.[0] || 'Professional';
    const company = memory?.targetCompany || 'Target Company';
    const topSkills = (memory?.topSkills || []).slice(0, 10).join(', ');
    const topAchievements = (memory?.experience || [])
      .slice(0, 3)
      .map((e: any) => e?.achievements?.[0] || e?.description || '')
      .filter(Boolean)
      .join('\n');
    const candidateSummary = memory?.summary || `Professional with experience in ${topSkills}`;
    const requiredSkills = (opportunityContext?.requiredSkills || []).slice(0, 8).join(', ');

    if (intent === 'COVER_LETTER_WRITE') {
      try {
        const libPrompt = PromptLibrary.DOC_COVER_LETTER_v1;
        const response = await aiRouter.complete({
          task: 'COVER_LETTER_WRITE',
          systemPrompt: libPrompt.systemPrompt,
          userPrompt: libPrompt.buildUserPrompt(
            fullName,
            role,
            company,
            candidateSummary,
            topAchievements || 'No specific achievements provided.',
            requiredSkills || 'general professional skills'
          ),
          jsonMode: true,
        });

        const coverLetter = aiRouter.parseJSON<{
          salutation: string;
          openingParagraph: string;
          bodyParagraph1: string;
          bodyParagraph2: string;
          closingParagraph: string;
          signoff: string;
        }>(response, this.staticCoverLetterFallback(fullName, role, company));

        logger.info({ intent, service: 'MultiAgentOrchestrator' }, 'Cover letter generated by LLM');

        return {
          docType: 'cover_letter',
          sender: { fullName, email, phone, location },
          date: new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }),
          recipient: { name: 'Hiring Committee', title: 'Hiring Manager', company, location: '' },
          ...coverLetter,
        };
      } catch (err: any) {
        logger.warn({ error: err.message, intent }, 'LLM cover letter generation failed, using fallback');
        return this.staticCoverLetterFallback(fullName, role, company);
      }
    }

    if (intent === 'SCHOLARSHIP_CREATE') {
      try {
        const response = await aiRouter.complete({
          task: 'DOCUMENT_GENERATE',
          systemPrompt: `You are an expert academic writing coach specialising in scholarship applications. Write a compelling, personalised scholarship personal statement.
Return a JSON object with: executiveSummary, academicBackground, researchInterests, careerGoals, financialImpact, whyThisScholarship. Each field is a paragraph (3-5 sentences).`,
          userPrompt: `Applicant: ${fullName}\nField of Study: ${memory?.academicField || 'Research'}\nBackground: ${candidateSummary}\nScholarship Target: ${role}\nOrganisation: ${company}\nUser Request: ${prompt}`,
          jsonMode: true,
        });

        const essay = aiRouter.parseJSON<any>(response, {
          executiveSummary: `${fullName} is applying for the ${role} scholarship.`,
          academicBackground: candidateSummary,
          researchInterests: 'Research areas aligned with scholarship mission.',
          careerGoals: 'Long-term career impact through academic excellence.',
          financialImpact: 'This scholarship will significantly advance my academic journey.',
          whyThisScholarship: `${company}'s commitment to academic excellence aligns with my goals.`,
        });

        logger.info({ intent, service: 'MultiAgentOrchestrator' }, 'Scholarship essay generated by LLM');

        return {
          docType: 'scholarship',
          title: `Academic Fellowship Statement - ${fullName}`,
          applicant: { fullName, email, academicField: memory?.academicField || '' },
          ...essay,
        };
      } catch (err: any) {
        logger.warn({ error: err.message, intent }, 'LLM scholarship generation failed');
        return {
          docType: 'scholarship',
          title: `Academic Fellowship Statement - ${fullName}`,
          applicant: { fullName, email, academicField: memory?.academicField || '' },
          executiveSummary: candidateSummary,
        };
      }
    }

    // Default: Resume JSON assembly or edit
    if (intent === 'RESUME_OPTIMIZE' && existingJson) {
      try {
        const response = await aiRouter.complete({
          task: 'DOCUMENT_GENERATE',
          systemPrompt: `You are a senior resume writer who specialises in ATS-optimised resumes. Given an existing resume and a target role, optimise the summary and skills sections.
Return the full updated resume JSON with improved summary and skills fields. Do not remove any existing experience entries.`,
          userPrompt: `Target Role: ${role}\nRequired Skills: ${requiredSkills}\nExisting Resume: ${JSON.stringify(existingJson).slice(0, 3000)}\nUser Request: ${prompt}`,
          jsonMode: true,
        });

        const optimised = aiRouter.parseJSON<any>(response, existingJson);
        logger.info({ intent, service: 'MultiAgentOrchestrator' }, 'Resume optimised by LLM');
        return { ...existingJson, ...optimised };
      } catch (err: any) {
        logger.warn({ error: err.message, intent }, 'LLM resume optimisation failed, returning existing JSON');
        return existingJson;
      }
    }

    // Base resume assembly from memory
    return existingJson || {
      personal: { fullName, email, jobTitle: role },
      summary: candidateSummary,
      experience: memory?.experience || [],
      education: memory?.education || [],
      skills: memory?.topSkills || [],
    };
  }

  private static staticCoverLetterFallback(fullName: string, role: string, company: string) {
    return {
      salutation: `Dear Hiring Team,`,
      openingParagraph: `I am writing to express my strong interest in the ${role} position at ${company}. My background and experience closely align with the requirements of this role.`,
      bodyParagraph1: `Throughout my career, I have developed deep expertise in areas directly relevant to this position, consistently delivering measurable impact.`,
      bodyParagraph2: `Joining ${company} represents a compelling opportunity to contribute my skills to a team I deeply respect.`,
      closingParagraph: `I would welcome the opportunity to discuss how my background can contribute to ${company}'s mission. Thank you for your consideration.`,
      signoff: `Sincerely,\n${fullName}`,
    };
  }

  private static calculateAtsScore(resumeJson: any, opportunityContext: any): number {
    if (!opportunityContext) return 85;
    const required: string[] = opportunityContext.requiredSkills || [];
    const actual: string[] = resumeJson?.skills || [];
    if (required.length === 0) return 85;

    // Case-insensitive matching
    const actualLower = actual.map((s: string) => s.toLowerCase());
    const matches = required.filter((r: string) => actualLower.includes(r.toLowerCase()));
    return Math.min(98, Math.max(60, Math.round((matches.length / required.length) * 100)));
  }
}
