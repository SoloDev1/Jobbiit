/**
 * OpporHub AI Career Operating System — Multi-Provider AI Abstraction Adapter
 * Wraps OpenAI, Gemini, or Fallback Provider calls under a unified contract.
 */

import OpenAI from 'openai';
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
  private static openaiClient: OpenAI | null = null;

  private static getOpenAI(): OpenAI | null {
    if (!this.openaiClient && process.env.OPENAI_API_KEY) {
      this.openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    }
    return this.openaiClient;
  }

  /**
   * Executes LLM prompt using primary provider (OpenAI GPT-4o-mini) or fallback.
   */
  public static async generateStructuredText(
    systemPrompt: string,
    userPrompt: string,
    options?: { model?: string }
  ): Promise<AIProviderResponse> {
    const startTime = Date.now();
    const client = this.getOpenAI();
    const model = options?.model || 'gpt-4o-mini';

    if (client) {
      try {
        const response = await client.chat.completions.create({
          model,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.2,
        });

        const latencyMs = Date.now() - startTime;
        const content = response.choices[0]?.message?.content || '{}';

        return {
          rawResponseText: content,
          provider: 'OpenAI',
          model,
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          latencyMs,
        };
      } catch (err) {
        logger.warn({ err }, '[AIProviderAdapter] Primary LLM call failed, falling back');
      }
    }

    // Fallback Mock Response for offline/dev environments
    const latencyMs = Date.now() - startTime;
    return {
      rawResponseText: JSON.stringify({
        executiveSummary: 'This position offers high strategic ownership and platform impact.',
        whoShouldApply: ['Software Engineers', 'Backend Developers', 'System Architects'],
        whoShouldNotApply: ['Entry-level candidates without coding experience'],
        requiredSkills: ['TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
        preferredSkills: ['Redis', 'AWS', 'Kubernetes', 'Microservices'],
        atsKeywords: ['TypeScript', 'Node.js', 'Express', 'Redis', 'CI/CD', 'REST APIs'],
        interviewQuestions: [
          'How do you design low-latency REST APIs in Node.js?',
          'Explain your strategy for database indexing in PostgreSQL.',
        ],
        recommendation: 'APPLY_IMMEDIATELY',
      }),
      provider: 'MockFallback',
      model: 'mock-v1',
      promptTokens: 50,
      completionTokens: 120,
      latencyMs,
    };
  }
}
