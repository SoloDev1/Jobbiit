/**
 * OpporHub OS — Analyze Opportunity Command Handler
 * Clean use case orchestrator: Repository -> AI Engine -> Repository -> EventBus.
 */

import { AnalyzeOpportunityCommand } from './analyze-opportunity.command';
import { OpportunityParser } from '../../engines/opportunity-engine/opportunity-parser.service';
import { opportunityAIEngine, OpportunityIntelligenceResult } from '../../engines/opportunity-engine/opportunity-ai.engine';
import { opportunityRepository } from '../../repositories/opportunity.repository';
import { EventBus } from '../../core/events/event-bus';
import { logger } from '../../core/telemetry/logger.service';

export class AnalyzeOpportunityHandler {
  /**
   * Handles execution of AnalyzeOpportunityCommand.
   */
  public async execute(command: AnalyzeOpportunityCommand): Promise<OpportunityIntelligenceResult> {
    const { userId, rawText, opportunityUrl } = command.payload;
    logger.info({ userId, hasUrl: !!opportunityUrl }, '[AnalyzeOpportunityHandler] Executing use case');

    // 1. Parse and sanitize text
    const cleanText = OpportunityParser.parseRawText(rawText);

    // 2. Execute Opportunity AI Engine (Real LLM extraction, 0 hardcoded templates)
    const analysis = await opportunityAIEngine.extractIntelligence(cleanText);

    // 3. Save analysis to repository if opportunity ID is present
    const opportunityId = `opp-${Date.now()}`;
    await opportunityRepository
      .saveAnalysis(opportunityId, {
        summary: analysis.summary,
        simpleExplanation: analysis.simpleExplanation,
        requiredSkills: analysis.requiredSkills,
        preferredSkills: analysis.preferredSkills,
        responsibilities: analysis.responsibilities,
        benefits: analysis.benefits,
        atsKeywords: analysis.atsKeywords,
        interviewQuestions: analysis.interviewQuestions,
        careerLevel: analysis.careerLevel,
      })
      .catch((err) => {
        logger.error({ err, opportunityId }, '[AnalyzeOpportunityHandler] Error saving analysis to repository');
      });

    // 4. Publish Event to EventBus asynchronously
    await EventBus.publish('opportunity.analyzed', {
      userId,
      opportunityId,
      analysis,
      timestamp: new Date(),
    });

    return analysis;
  }
}

export const analyzeOpportunityHandler = new AnalyzeOpportunityHandler();
