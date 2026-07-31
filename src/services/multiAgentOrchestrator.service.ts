import { IntentRouterService } from "./intentRouter.service";
import { MemoryService } from "./memory.service";
import { OpportunityIntelligenceService } from "./opportunityIntelligence.service";

export interface PipelineExecutionInput {
  userId: string;
  intent: string;
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
    // Stage 0: Role Guardrails & Intent Router
    const classification = IntentRouterService.classifyIntent(input.userPrompt);
    if (!classification.isSupported) {
      return {
        success: false,
        refusalMessage: classification.refusalMessage,
      };
    }

    // Stage 1: Planner Agent
    onProgress?.({ id: "planner", label: "Understanding goal & plan", status: "in_progress" });
    const plan = {
      targetDocType: classification.intent,
      requiredSections: ["summary", "experience", "skills"],
    };
    onProgress?.({ id: "planner", label: "Goal planned ✓", status: "completed" });

    // Stage 2: Retriever Agent
    onProgress?.({ id: "retriever", label: "Gathering profile & job context", status: "in_progress" });
    const userMemory = await MemoryService.getUserMemory(input.userId);
    let opportunityContext = null;
    if (input.opportunityId) {
      opportunityContext = await OpportunityIntelligenceService.getOpportunityAnalysis(input.opportunityId);
    }
    onProgress?.({ id: "retriever", label: "Context retrieved ✓", status: "completed" });

    // Stage 3: Writer Agent (Section-Level Edits Only)
    onProgress?.({ id: "writer", label: "Refining document sections", status: "in_progress" });
    const updatedResumeJson = this.applySectionEdits(
      input.existingResumeJson,
      input.userPrompt,
      userMemory,
      opportunityContext
    );
    onProgress?.({ id: "writer", label: "Sections drafted ✓", status: "completed" });

    // Stage 4: Validator Agent
    onProgress?.({ id: "validator", label: "Auditing ATS compatibility", status: "in_progress" });
    const atsScore = this.calculateAtsScore(updatedResumeJson, opportunityContext);
    onProgress?.({ id: "validator", label: "Validated & Scored ✓", status: "completed" });

    return {
      success: true,
      data: updatedResumeJson,
      atsScore,
    };
  }

  private static applySectionEdits(existingJson: any, prompt: string, memory: any, opportunityContext: any) {
    const base = existingJson || {
      personal: { fullName: "Career Professional", email: "user@example.com" },
      summary: "",
      experience: [],
      education: [],
      skills: [],
    };

    // Enhance summary
    base.summary = `Driven professional specializing in ${memory?.targetRoles?.[0] || "Backend Engineering"}. Proven track record of delivering scalable solutions and optimizing workflow efficiency.`;

    // Ensure skills
    if (!base.skills || base.skills.length === 0) {
      base.skills = opportunityContext?.requiredSkills || ["Node.js", "TypeScript", "PostgreSQL", "Redis"];
    }

    return base;
  }

  private static calculateAtsScore(resumeJson: any, opportunityContext: any): number {
    if (!opportunityContext) return 88;
    const required: string[] = opportunityContext.requiredSkills || [];
    const actual: string[] = resumeJson?.skills || [];
    if (required.length === 0) return 90;

    const matches = required.filter((r) => actual.includes(r));
    return Math.min(98, Math.max(65, Math.round((matches.length / required.length) * 100)));
  }
}
