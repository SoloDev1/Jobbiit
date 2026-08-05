import { aiRouter } from '../../services/aiRouter.service';
import { PromptLibrary } from '../../services/promptLibrary.service';
import { logger } from '../../core/telemetry/logger.service';

export interface RouterDecision {
  intent: 'ANSWER' | 'CLARIFY_REQUEST' | 'GREETING' | 'SMALL_TALK'
        | 'OFF_TOPIC_QUESTION' | 'DERAIL_ATTEMPT' | 'END_REQUEST' | 'UNCLEAR';
  isSufficientAnswer: boolean;
  shouldAdvanceQuestion: boolean;
  reasoning: string;
}

export class RouterEngine {
  /**
   * Fast, low-temperature LLM classification call to routing intent.
   * Asserts boundaries to protect against prompt injection derailments.
   */
  public async route(input: {
    currentQuestion: string;
    candidateMessage: string;
    recentHistory: string;
  }): Promise<RouterDecision> {
    logger.info({ service: 'RouterEngine' }, 'Routing candidate message intent');

    try {
      const prompt = PromptLibrary.ROUTE_INTENT_v1;
      const response = await aiRouter.complete({
        task: 'INTERVIEW_ROUTE',
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.buildUserPrompt(input.currentQuestion, input.candidateMessage, input.recentHistory),
        jsonMode: true,
      });

      const decision = aiRouter.parseJSON<RouterDecision>(response);

      // Force boolean sanity checks
      const intent = decision.intent || 'UNCLEAR';
      const isSufficientAnswer = !!decision.isSufficientAnswer;
      
      // Strict state machine guardrail derivation:
      // shouldAdvanceQuestion MUST be true only for sufficient answers.
      const shouldAdvanceQuestion = (intent === 'ANSWER' && isSufficientAnswer);

      logger.info(
        { intent, isSufficientAnswer, shouldAdvanceQuestion, reasoning: decision.reasoning, service: 'RouterEngine' },
        'Routed candidate message successfully'
      );

      return {
        intent,
        isSufficientAnswer,
        shouldAdvanceQuestion,
        reasoning: decision.reasoning || '',
      };
    } catch (err: any) {
      logger.error({ err, service: 'RouterEngine' }, 'Router engine failed, defaulting to UNCLEAR');
      return {
        intent: 'UNCLEAR',
        isSufficientAnswer: false,
        shouldAdvanceQuestion: false,
        reasoning: `Failure: ${err.message}`,
      };
    }
  }
}

export const routerEngine = new RouterEngine();
