/**
 * OpporHub AI Career Operating System — Multi-Provider AI Abstraction Adapter
 * Unified contract for all structured-output AI calls.
 * Provider: OpenAI gpt-4o-mini (client-mandated).
 * Delegates to AIRouterService for execution with retry/backoff.
 */

import { aiRouter } from './aiRouter.service';
import { logger } from '../config/logger';

export interface AIProviderResponse {
  rawResponseText: string;
  provider: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

export class AIProviderAdapter {
  /**
   * Executes a structured-JSON LLM prompt via the unified AIRouter.
   * No fabricated fallbacks — throws on failure so callers can handle errors correctly.
   */
  public static async generateStructuredText(
    systemPrompt: string,
    userPrompt: string,
    options?: {
      model?: string;
      context?: {
        title?: string;
        organisation?: string;
        category?: string;
        description?: string;
      };
    }
  ): Promise<AIProviderResponse> {
    logger.info(
      {
        service: 'AIProviderAdapter',
        context: options?.context,
      },
      'Generating structured text'
    );

    const result = await aiRouter.complete({
      task: 'OPPORTUNITY_EXTRACT',
      systemPrompt,
      userPrompt,
      jsonMode: true,
    });

    return {
      rawResponseText: result.text,
      provider: result.provider,
      model: result.model,
      promptTokens: result.promptTokens,
      completionTokens: result.completionTokens,
      latencyMs: result.latencyMs,
    };
  }
}
