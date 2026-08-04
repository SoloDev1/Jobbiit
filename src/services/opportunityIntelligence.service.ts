import { logger } from "../core/telemetry/logger.service";
import { NotFoundError, ValidationError } from "../core/errors/domain-error";
import { opportunityRepository } from "../repositories/opportunity.repository";
import { OpportunityCleanerService } from "./opportunityCleaner";
import { OpportunityPromptRegistry } from "./opportunityPrompts";
import { AIProviderAdapter } from "./aiProvider.adapter";
import { IntelligenceValidatorService } from "./intelligenceValidator";
import { prisma } from "../config/db";

// Current prompt version — bump this when prompts are updated to force cache invalidation
const CURRENT_PROMPT_VERSION = 'job_v2';

export interface OpportunityAnalysisResult {
  summary: string;
  simpleExplanation: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  benefits: string[];
  atsKeywords: string[];
  interviewQuestions: string[];
  careerLevel: string;
  whoShouldApply?: string[];
  whoShouldNotApply?: string[];
  recommendation?: string;
}

export class OpportunityIntelligenceService {
  /**
   * Fetch precomputed opportunity analysis using "Generate Once, Read Many" pattern.
   * Re-generates if the stored prompt version is outdated (ensures fresh AI output on prompt upgrades).
   */
  static async getOpportunityAnalysis(opportunityId: string): Promise<OpportunityAnalysisResult> {
    try {
      // 1. Check existing cached analysis — only serve if prompt version matches current
      const existing = await opportunityRepository.findAnalysisByOpportunityId(opportunityId);
      if (existing) {
        const storedVersion = (existing as any).promptVersion || 'job_v1';
        const isCurrentVersion = storedVersion === CURRENT_PROMPT_VERSION ||
          // Accept any v2 variant as current
          storedVersion.endsWith('_v2');

        if (isCurrentVersion) {
          logger.info({ opportunityId, promptVersion: storedVersion, service: 'OpportunityIntelligenceService' }, 'Returning cached analysis');
          return {
            summary: existing.summary,
            simpleExplanation: existing.simpleExplanation,
            requiredSkills: existing.requiredSkills,
            preferredSkills: existing.preferredSkills,
            responsibilities: existing.responsibilities,
            benefits: existing.benefits,
            atsKeywords: existing.atsKeywords,
            interviewQuestions: existing.interviewQuestions,
            careerLevel: existing.careerLevel || 'MID_LEVEL',
          };
        }
        logger.info({ opportunityId, storedVersion, service: 'OpportunityIntelligenceService' }, 'Prompt version outdated — regenerating analysis');
      }

      // 2. Fetch raw opportunity
      const opp = await opportunityRepository.findById(opportunityId);
      if (!opp) {
        throw new NotFoundError(`Opportunity not found: ${opportunityId}`);
      }
      if (!opp.description || opp.description.trim().length === 0) {
        throw new ValidationError(`Opportunity description is empty for ${opportunityId}`);
      }

      // 3. Preprocess HTML & sanitize text
      const cleaned = OpportunityCleanerService.clean(opp.title, opp.organisation, opp.category, opp.description);

      // 4. Resolve versioned prompt template (now v2 with CoT + few-shot)
      const promptTemplate = OpportunityPromptRegistry.getPrompt(opp.category);
      const userPrompt = promptTemplate.userPromptTemplate(cleaned.cleanedMarkdown);

      // 5. Generate AI Intelligence with up to 3 retries (AIRouter handles backoff)
      let rawAiResponse: any = null;
      let validation: any = null;
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await AIProviderAdapter.generateStructuredText(
            promptTemplate.systemPrompt,
            userPrompt,
            {
              context: {
                title: opp.title,
                organisation: opp.organisation,
                category: opp.category,
                description: opp.description,
              },
            }
          );

          try {
            rawAiResponse = JSON.parse(response.rawResponseText);
          } catch {
            rawAiResponse = {};
          }

          validation = IntelligenceValidatorService.validate(rawAiResponse, opp.organisation);
          if (validation.isValid) break;

          logger.warn(
            { attempt, opportunityId, errors: validation.errors, service: 'OpportunityIntelligenceService' },
            'Intelligence validation failed — retrying'
          );
        } catch (err: any) {
          lastError = err;
          logger.warn({ attempt, error: err.message, service: 'OpportunityIntelligenceService' }, 'AI call failed in attempt');
        }
      }

      if (!rawAiResponse && lastError) {
        throw lastError;
      }

      // 6. Map AI response to structured result
      const summary =
        rawAiResponse?.executiveSummary ||
        rawAiResponse?.summary ||
        `${opp.organisation} is seeking a ${opp.title}.`;

      const simpleExplanation =
        rawAiResponse?.simpleExplanation ||
        `${opp.title} role at ${opp.organisation}.`;

      const requiredSkills: string[] =
        rawAiResponse?.requiredSkills?.length > 0
          ? rawAiResponse.requiredSkills
          : opp.skills?.map((s: any) => s.skill?.name).filter(Boolean) || [];

      const preferredSkills: string[] = rawAiResponse?.preferredSkills || [];
      const responsibilities: string[] = rawAiResponse?.responsibilities || [`Execute core responsibilities for ${opp.title}`];
      const benefits: string[] = rawAiResponse?.benefits || [];
      const atsKeywords: string[] = rawAiResponse?.atsKeywords?.length > 0
        ? rawAiResponse.atsKeywords
        : [opp.title, opp.organisation, ...requiredSkills].slice(0, 8);
      const interviewQuestions: string[] = rawAiResponse?.interviewQuestions?.length > 0
        ? rawAiResponse.interviewQuestions
        : [
            `Why do you want to join ${opp.organisation} as a ${opp.title}?`,
            `Walk me through a project where you demonstrated core skills relevant to this role.`,
          ];
      const careerLevel = rawAiResponse?.careerLevel || opp.experienceLevel || 'MID_LEVEL';
      const whoShouldApply: string[] = rawAiResponse?.whoShouldApply || [];
      const whoShouldNotApply: string[] = rawAiResponse?.whoShouldNotApply || [];
      const recommendation: string = rawAiResponse?.recommendation || 'APPLY_IMMEDIATELY';

      // 7. Upsert full OpportunityIntelligence V2 record
      await prisma.opportunityIntelligence.upsert({
        where: { opportunityId },
        update: {
          overview: {
            executiveSummary: summary,
            whoShouldApply,
            whoShouldNotApply,
          },
          skills: {
            requiredSkills,
            preferredSkills,
          },
          ats: { atsKeywords },
          interview: { interviewQuestions },
          recommendation: {
            decision: recommendation,
            reason: 'AI-generated from opportunity text analysis.',
          },
          overallHealthScore: validation?.overallHealthScore ?? 70,
          sectionConfidence: validation?.sectionConfidence ?? {},
          promptVersion: promptTemplate.version,
          generationReason: 'REGENERATED',
        },
        create: {
          opportunityId,
          overview: {
            executiveSummary: summary,
            whoShouldApply,
            whoShouldNotApply,
          },
          skills: {
            requiredSkills,
            preferredSkills,
          },
          ats: { atsKeywords },
          interview: { interviewQuestions },
          recommendation: {
            decision: recommendation,
            reason: 'AI-generated from opportunity text analysis.',
          },
          sectionConfidence: validation?.sectionConfidence ?? {},
          overallHealthScore: validation?.overallHealthScore ?? 70,
          promptVersion: promptTemplate.version,
          promptCategory: opp.category as any,
          generationReason: 'INITIAL',
        },
      }).catch((err) => logger.warn({ err }, '[OpportunityIntelligenceService] Failed to save V2 intelligence record'));

      const result: OpportunityAnalysisResult = {
        summary,
        simpleExplanation,
        requiredSkills,
        preferredSkills,
        responsibilities,
        benefits,
        atsKeywords,
        interviewQuestions,
        careerLevel,
        whoShouldApply,
        whoShouldNotApply,
        recommendation,
      };

      // 8. Save legacy analysis record
      await this.createAndStoreAnalysis(opportunityId, result);

      return result;
    } catch (error) {
      logger.error({ error, opportunityId }, `[OpportunityIntelligenceService] Error fetching analysis`);
      throw error;
    }
  }

  /**
   * Fetch rich V2 OpportunityIntelligence model.
   */
  static async getOpportunityIntelligence(opportunityId: string) {
    return prisma.opportunityIntelligence.findUnique({
      where: { opportunityId },
    });
  }

  /**
   * Save precomputed opportunity analysis to PostgreSQL.
   */
  static async createAndStoreAnalysis(opportunityId: string, data: OpportunityAnalysisResult) {
    return opportunityRepository.saveAnalysis(opportunityId, data);
  }
}
