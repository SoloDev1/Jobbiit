/**
 * OpporHub AI Career Operating System — Centralised AI Router
 * Single source of truth for model selection, provider routing, and task configuration.
 * All AI calls across the platform must route through this service.
 *
 * Provider: OpenAI gpt-4o-mini (client-mandated, all tasks)
 */

import OpenAI from 'openai';
import { logger } from '../core/telemetry/logger.service';

// ─── Task Definitions ─────────────────────────────────────────────────────────

export type AITask =
  | 'OPPORTUNITY_EXTRACT'
  | 'INTERVIEW_QUESTION_GENERATE'
  | 'ANSWER_EVALUATE_STAR'
  | 'ANSWER_EVALUATE_LEADERSHIP'
  | 'ANSWER_EVALUATE_TECHNICAL'
  | 'ANSWER_IMPROVE'
  | 'JOB_INTEL_EXTRACT'
  | 'COVER_LETTER_WRITE'
  | 'DOCUMENT_GENERATE'
  | 'GENERIC_COMPLETION'
  | 'INTERVIEW_CLARIFY'
  | 'INTERVIEW_SMALL_TALK'
  | 'ANSWER_EVALUATE_UNIFIED'
  | 'INTERVIEW_STREAM_REPLY'
  | 'INTERVIEW_ROUTE'
  | 'INTERVIEW_RESPOND';

export interface AIRouterOptions {
  task: AITask;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  /** If true, expects a valid JSON object response */
  jsonMode?: boolean;
  /** Zod schema name for structured output (uses openai beta parse) */
  responseFormatName?: string;
}

export interface AIRouterResponse {
  text: string;
  task: AITask;
  model: string;
  provider: 'openai';
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
}

// ─── Task Configuration ───────────────────────────────────────────────────────

const TASK_CONFIG: Record<AITask, { model: string; temperature: number; maxTokens: number; jsonMode: boolean }> = {
  OPPORTUNITY_EXTRACT:          { model: 'gpt-4o-mini', temperature: 0.1, maxTokens: 2048, jsonMode: true  },
  INTERVIEW_QUESTION_GENERATE:  { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 512,  jsonMode: false },
  ANSWER_EVALUATE_STAR:         { model: 'gpt-4o-mini', temperature: 0.1, maxTokens: 1024, jsonMode: true  },
  ANSWER_EVALUATE_LEADERSHIP:   { model: 'gpt-4o-mini', temperature: 0.1, maxTokens: 1024, jsonMode: true  },
  ANSWER_EVALUATE_TECHNICAL:    { model: 'gpt-4o-mini', temperature: 0.1, maxTokens: 1024, jsonMode: true  },
  ANSWER_IMPROVE:               { model: 'gpt-4o-mini', temperature: 0.4, maxTokens: 1024, jsonMode: true  },
  JOB_INTEL_EXTRACT:            { model: 'gpt-4o-mini', temperature: 0.1, maxTokens: 1024, jsonMode: true  },
  COVER_LETTER_WRITE:           { model: 'gpt-4o-mini', temperature: 0.5, maxTokens: 2048, jsonMode: true  },
  DOCUMENT_GENERATE:            { model: 'gpt-4o-mini', temperature: 0.5, maxTokens: 2048, jsonMode: true  },
  GENERIC_COMPLETION:           { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 1024, jsonMode: false },
  INTERVIEW_CLARIFY:            { model: 'gpt-4o-mini', temperature: 0.5, maxTokens: 512,  jsonMode: false },
  INTERVIEW_SMALL_TALK:         { model: 'gpt-4o-mini', temperature: 0.6, maxTokens: 512,  jsonMode: false },
  ANSWER_EVALUATE_UNIFIED:      { model: 'gpt-4o-mini', temperature: 0.1, maxTokens: 1536, jsonMode: true  },
  INTERVIEW_STREAM_REPLY:       { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 512,  jsonMode: false },
  INTERVIEW_ROUTE:              { model: 'gpt-4o-mini', temperature: 0.1, maxTokens: 250,  jsonMode: true  },
  INTERVIEW_RESPOND:            { model: 'gpt-4o-mini', temperature: 0.7, maxTokens: 512,  jsonMode: false },
};

// ─── Router Implementation ────────────────────────────────────────────────────

export class AIRouterService {
  private client: OpenAI | null = null;
  private static readonly MAX_RETRIES = 3;
  private static readonly BASE_DELAY_MS = 500;

  private getClient(): OpenAI {
    if (!this.client) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        throw new Error('OPENAI_API_KEY environment variable is required');
      }
      this.client = new OpenAI({ apiKey });
    }
    return this.client;
  }

  /**
   * Routes an AI task to gpt-4o-mini with automatic retry and exponential backoff.
   * This is the single entry point for ALL AI completions in the platform.
   */
  public async complete(options: AIRouterOptions): Promise<AIRouterResponse> {
    const config = TASK_CONFIG[options.task];
    const model = options.task === 'GENERIC_COMPLETION' ? (options as any).model || config.model : config.model;
    const temperature = options.temperature ?? config.temperature;
    const maxTokens = options.maxTokens ?? config.maxTokens;
    const useJsonMode = options.jsonMode ?? config.jsonMode;

    const startTime = Date.now();
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= AIRouterService.MAX_RETRIES; attempt++) {
      try {
        logger.info(
          { task: options.task, model, attempt, service: 'AIRouterService' },
          'Executing AI completion'
        );

        const client = this.getClient();

        const response = await client.chat.completions.create({
          model,
          messages: [
            { role: 'system', content: options.systemPrompt },
            { role: 'user', content: options.userPrompt },
          ],
          temperature,
          max_tokens: maxTokens,
          response_format: useJsonMode ? { type: 'json_object' } : { type: 'text' },
        });

        const text = response.choices[0]?.message?.content || '';
        const latencyMs = Date.now() - startTime;

        logger.info(
          {
            task: options.task,
            model,
            promptTokens: response.usage?.prompt_tokens,
            completionTokens: response.usage?.completion_tokens,
            latencyMs,
            service: 'AIRouterService',
          },
          'AI completion succeeded'
        );

        return {
          text,
          task: options.task,
          model,
          provider: 'openai',
          promptTokens: response.usage?.prompt_tokens ?? 0,
          completionTokens: response.usage?.completion_tokens ?? 0,
          latencyMs,
        };
      } catch (err: any) {
        lastError = err;
        const isRateLimit = err?.status === 429;
        const isServerError = err?.status >= 500;
        const shouldRetry = (isRateLimit || isServerError) && attempt < AIRouterService.MAX_RETRIES;

        logger.warn(
          { task: options.task, model, attempt, error: err.message, status: err.status, service: 'AIRouterService' },
          shouldRetry ? 'AI completion failed, retrying with backoff' : 'AI completion failed, no more retries'
        );

        if (shouldRetry) {
          const delayMs = AIRouterService.BASE_DELAY_MS * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }
    }

    // All retries exhausted — throw error (no fabricated fallbacks)
    logger.error(
      { task: options.task, model, error: lastError?.message, service: 'AIRouterService' },
      'AI completion failed after all retries'
    );
    throw lastError || new Error(`AI task ${options.task} failed after ${AIRouterService.MAX_RETRIES} retries`);
  }

  /**
   * Parses JSON from an AI response, with error handling.
   */
  public parseJSON<T>(response: AIRouterResponse, fallback?: T): T {
    try {
      return JSON.parse(response.text) as T;
    } catch (err) {
      logger.warn(
        { task: response.task, responseLength: response.text.length, service: 'AIRouterService' },
        'Failed to parse AI JSON response'
      );
      if (fallback !== undefined) return fallback;
      throw new Error(`Failed to parse JSON from AI task ${response.task}`);
    }
  }

  /**
   * Real SSE streaming — yields chunks as the model generates them.
   */
  public async *stream(options: Omit<AIRouterOptions, 'jsonMode'>): AsyncGenerator<string> {
    const config = TASK_CONFIG[options.task];
    const model = config.model;
    const temperature = options.temperature ?? config.temperature;
    const maxTokens = options.maxTokens ?? config.maxTokens;

    logger.info({ task: options.task, model, service: 'AIRouterService' }, 'Starting AI stream');

    const client = this.getClient();
    const stream = await client.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
      ],
      temperature,
      max_tokens: maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content;
      if (delta) yield delta;
    }
  }
}

export const aiRouter = new AIRouterService();
