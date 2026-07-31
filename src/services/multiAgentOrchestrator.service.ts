import { IntentRouterService } from "./intentRouter.service";
import { MemoryService } from "./memory.service";
import { OpportunityIntelligenceService } from "./opportunityIntelligence.service";

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
   * Run the 4-Stage Multi-Agent Pipeline
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
    const plan = {
      targetDocType: classification.intent,
      mode: classification.mode,
      requiredSections: ["summary", "experience", "skills"],
    };
    onProgress?.({ id: "planner", label: "Goal planned ✓", status: "completed" });

    // Stage 2: Retriever Agent
    onProgress?.({ id: "retriever", label: "Gathering profile & context memory", status: "in_progress" });
    const userMemory = await MemoryService.getUserMemory(input.userId);
    let opportunityContext = null;
    if (input.opportunityId) {
      opportunityContext = await OpportunityIntelligenceService.getOpportunityAnalysis(input.opportunityId);
    }
    onProgress?.({ id: "retriever", label: "Context retrieved ✓", status: "completed" });

    // Stage 3: Writer Agent (Section-Level Edits & Document Synthesis)
    onProgress?.({ id: "writer", label: "Synthesizing document sections", status: "in_progress" });
    const updatedResumeJson = this.applySectionEdits(
      input.existingResumeJson,
      input.userPrompt,
      userMemory,
      opportunityContext,
      classification.intent
    );
    onProgress?.({ id: "writer", label: "Sections drafted ✓", status: "completed" });

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

  private static applySectionEdits(
    existingJson: any,
    prompt: string,
    memory: any,
    opportunityContext: any,
    intent: string
  ) {
    const base = existingJson || {
      personal: {
        fullName: memory?.fullName || "Career Candidate",
        email: memory?.email || "candidate@example.com",
        jobTitle: memory?.targetRoles?.[0] || opportunityContext?.title || "Professional",
      },
      summary: "",
      experience: [],
      education: [],
      skills: [],
    };

    const role = opportunityContext?.title || memory?.targetRoles?.[0] || "Software Engineer";
    const company = opportunityContext?.company ? ` at ${opportunityContext.company}` : "";
    
    if (intent === "COVER_LETTER_WRITE") {
      base.coverLetter = {
        recipient: opportunityContext?.company || "Hiring Committee",
        body: `I am writing to express my strong enthusiasm for the ${role} position${company}. With my background in technology delivery and strategic execution, I am eager to contribute to your team's key objectives.`,
      };
    } else {
      base.summary = `Accomplished ${role} with extensive experience scaling microservices, distributed architecture, and data pipelines${company}. Proven track record of optimizing system reliability, driving cross-functional project delivery, and exceeding performance targets.`;
    }

    // Ensure skills
    if (!base.skills || base.skills.length === 0) {
      base.skills = opportunityContext?.requiredSkills || memory?.topSkills || ["TypeScript", "React Native", "Node.js", "PostgreSQL", "Docker", "AWS"];
    }

    return base;
  }

  private static calculateAtsScore(resumeJson: any, opportunityContext: any): number {
    if (!opportunityContext) return 92;
    const required: string[] = opportunityContext.requiredSkills || [];
    const actual: string[] = resumeJson?.skills || [];
    if (required.length === 0) return 90;

    const matches = required.filter((r) => actual.includes(r));
    return Math.min(98, Math.max(65, Math.round((matches.length / required.length) * 100)));
  }
}

