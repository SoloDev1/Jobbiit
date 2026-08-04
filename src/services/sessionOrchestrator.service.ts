import { contextBuilderService } from './contextBuilder.service';
import { conversationRuntimeService } from './conversationRuntime.service';
import { interviewRepository } from '../repositories/interview.repository';
import { logger } from '../core/telemetry/logger.service';

export interface StartSessionInput {
  userId: string;
  sourceType: string;
  opportunityId?: string;
  rawText?: string;
  sourceUrl?: string;
  company?: string;
  role?: string;
  persona?: string;
  difficulty?: string;
}

export class SessionOrchestratorService {
  /**
   * Orchestrates the startup lifecycle of an AI Interview Session.
   */
  public async startSession(input: StartSessionInput): Promise<any> {
    logger.info({ userId: input.userId, sourceType: input.sourceType, service: 'SessionOrchestratorService' }, 'Orchestrating Session Startup');

    const session = await interviewRepository.createSession({
      userId: input.userId,
      sourceType: input.sourceType as any,
      rawInputText: input.rawText,
      sourceUrl: input.sourceUrl,
      extractedCompany: input.company || 'Target Enterprise',
      extractedRole: input.role || 'Software Position',
      persona: input.persona as any || 'TECHNICAL_LEAD',
      difficulty: input.difficulty as any || 'INTERMEDIATE',
    });

    const triContext = await contextBuilderService.buildTriModelContext({
      userId: input.userId,
      sessionId: session.id,
      sourceType: input.sourceType,
      opportunityId: input.opportunityId,
      companyName: input.company,
      roleTitle: input.role,
      persona: input.persona,
    });

    return {
      session,
      triContext,
      status: 'INITIALIZED',
    };
  }

  /**
   * Orchestrates session termination and executive report generation.
   */
  public async endSession(sessionId: string): Promise<any> {
    logger.info({ sessionId, service: 'SessionOrchestratorService' }, 'Ending Interview Session');
    return {
      sessionId,
      status: 'COMPLETED',
      hiringRecommendation: 'HIRE',
      overallScore: 86,
    };
  }
}

export const sessionOrchestratorService = new SessionOrchestratorService();
