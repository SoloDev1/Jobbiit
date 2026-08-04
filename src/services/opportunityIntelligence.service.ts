import { logger } from "../core/telemetry/logger.service";
import { NotFoundError, ValidationError } from "../core/errors/domain-error";
import { opportunityRepository } from "../repositories/opportunity.repository";
import { OpportunityCleanerService } from "./opportunityCleaner";
import { OpportunityPromptRegistry } from "./opportunityPrompts";
import { AIProviderAdapter } from "./aiProvider.adapter";
import { IntelligenceValidatorService } from "./intelligenceValidator";
import { prisma } from "../config/db";

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
}

export class OpportunityIntelligenceService {
  /**
   * Fetch precomputed opportunity analysis (normalized flat structure).
   * Leverages "Generate Once, Read Many" pattern with dual validation engine.
   */
  static async getOpportunityAnalysis(opportunityId: string): Promise<OpportunityAnalysisResult> {
    try {
      // 1. Check legacy analysis record first
      const existing = await opportunityRepository.findAnalysisByOpportunityId(opportunityId);
      if (existing) {
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

      // 4. Resolve versioned prompt template
      const promptTemplate = OpportunityPromptRegistry.getPrompt(opp.category);
      const userPrompt = promptTemplate.userPromptTemplate(cleaned.cleanedMarkdown);

      // 5. Generate AI Intelligence & Validate with Retry
      let attempts = 0;
      let rawAiResponse: any = null;
      let validation: any = null;

      while (attempts < 2) {
        attempts++;
        const response = await AIProviderAdapter.generateStructuredText(
          promptTemplate.systemPrompt,
          userPrompt
        );

        try {
          rawAiResponse = JSON.parse(response.rawResponseText);
        } catch (e) {
          rawAiResponse = {};
        }

        validation = IntelligenceValidatorService.validate(rawAiResponse, opp.organisation);
        if (validation.isValid) break;
      }

      const summary = rawAiResponse.executiveSummary || rawAiResponse.summary || `${opp.organisation} is seeking a ${opp.title}.`;
      const requiredSkills = rawAiResponse.requiredSkills || opp.skills.map((s) => s.skill.name).filter(Boolean);
      const atsKeywords = rawAiResponse.atsKeywords || [opp.title, opp.organisation, ...requiredSkills];
      const interviewQuestions = rawAiResponse.interviewQuestions || [
        `Why do you want to join ${opp.organisation} as a ${opp.title}?`,
        `Walk me through a project demonstrating your core skills.`,
      ];
      const careerLevel = opp.experienceLevel || 'MID_LEVEL';

      // 6. Save OpportunityIntelligence V2 record in parallel
      await prisma.opportunityIntelligence.upsert({
        where: { opportunityId },
        update: {
          overallHealthScore: validation.overallHealthScore,
          sectionConfidence: validation.sectionConfidence,
        },
        create: {
          opportunityId,
          overview: {
            executiveSummary: summary,
            whoShouldApply: rawAiResponse.whoShouldApply || ['Experienced Professionals'],
            whoShouldNotApply: rawAiResponse.whoShouldNotApply || ['Entry-level without required skills'],
          },
          skills: {
            requiredSkills,
            preferredSkills: rawAiResponse.preferredSkills || [],
          },
          ats: {
            atsKeywords,
          },
          interview: {
            interviewQuestions,
          },
          recommendation: {
            decision: rawAiResponse.recommendation || 'APPLY_IMMEDIATELY',
            reason: 'High compatibility match with requirements.',
          },
          sectionConfidence: validation.sectionConfidence,
          overallHealthScore: validation.overallHealthScore,
          promptVersion: promptTemplate.version,
          promptCategory: opp.category as any,
          generationReason: 'INITIAL',
        },
      }).catch((err) => logger.warn({ err }, 'Failed to save V2 intelligence record'));

      const result: OpportunityAnalysisResult = {
        summary,
        simpleExplanation: `${opp.title} at ${opp.organisation}`,
        requiredSkills,
        preferredSkills: rawAiResponse.preferredSkills || [],
        responsibilities: rawAiResponse.responsibilities || [`Execute core responsibilities for ${opp.title}`],
        benefits: rawAiResponse.benefits || ['Competitive Compensation', 'Professional Network'],
        atsKeywords,
        interviewQuestions,
        careerLevel,
      };

      // 7. Save legacy analysis
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
   * Save precomputed opportunity analysis to PostgreSQL
   */
  static async createAndStoreAnalysis(opportunityId: string, data: OpportunityAnalysisResult) {
    return opportunityRepository.saveAnalysis(opportunityId, data);
  }
}
