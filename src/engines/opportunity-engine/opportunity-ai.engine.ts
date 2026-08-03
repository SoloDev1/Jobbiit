/**
 * OpporHub OS — Opportunity AI Engine
 * Pure zero-UI engine executing GPT-4o-mini structured extraction of real opportunity data.
 * Zero hardcoded fallback templates.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { OpportunityType } from '../../domain/opportunity/opportunity-type.enum';
import { logger } from '../../core/telemetry/logger.service';
import { ConfigurationError, ServiceUnavailableError } from '../../core/errors/domain-error';

export const OpportunityIntelligenceResultSchema = z.object({
  summary: z.string(),
  simpleExplanation: z.string(),
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()).default([]),
  responsibilities: z.array(z.string()),
  benefits: z.array(z.string()),
  atsKeywords: z.array(z.string()),
  interviewQuestions: z.array(z.string()),
  careerLevel: z.string(),
});

export type OpportunityIntelligenceResult = z.infer<typeof OpportunityIntelligenceResultSchema>;

export class OpportunityAIEngine {
  private getOpenAIClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY;
    const isDevMock = process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DATA === 'true';

    if (!apiKey && !isDevMock) {
      throw new ConfigurationError('OPENAI_API_KEY configuration missing');
    }

    return new OpenAI({ apiKey: apiKey || 'dev-mock-key' });
  }

  /**
   * Extracts real, opportunity-specific intelligence using LLM structured output.
   */
  public async extractIntelligence(
    rawText: string,
    opportunityType: OpportunityType = OpportunityType.JOB
  ): Promise<OpportunityIntelligenceResult> {
    const isDevMock = process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DATA === 'true';
    if (isDevMock && !process.env.OPENAI_API_KEY) {
      logger.warn({ service: 'OpportunityAIEngine' }, 'Using DEV-ONLY mock data');
      return {
        summary: 'Target role focused on building resilient distributed microservices.',
        simpleExplanation: 'Senior software role building high-throughput systems.',
        requiredSkills: ['TypeScript', 'React Native', 'Node.js', 'PostgreSQL'],
        preferredSkills: ['Docker', 'AWS', 'GraphQL'],
        responsibilities: ['Architect microservices', 'Optimize data delivery', 'Collaborate across pods'],
        benefits: ['Competitive Salary', 'Remote Flexibility', 'Health Insurance'],
        atsKeywords: ['TypeScript', 'React Native', 'Node.js', 'Microservices'],
        interviewQuestions: ['Walk us through a scalable microservices architecture you designed.'],
        careerLevel: 'SENIOR',
      };
    }

    const openai = this.getOpenAIClient();

    try {
      logger.info({ service: 'OpportunityAIEngine', opportunityType }, 'Analyzing opportunity text via OpenAI');
      const completion = await openai.beta.chat.completions.parse({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert Opportunity Intelligence Analyzer at Apple. Extract actual skills, real benefits, specific responsibilities, ATS keywords, and tailored interview questions for this ${opportunityType} posting. Do not invent generic filler.`,
          },
          { role: 'user', content: rawText },
        ],
        response_format: zodResponseFormat(OpportunityIntelligenceResultSchema, 'opportunity_analysis'),
        temperature: 0.1,
      });

      const parsed = completion.choices[0]?.message?.parsed;
      if (!parsed) {
        throw new ServiceUnavailableError('AI provider returned empty opportunity intelligence');
      }

      return parsed;
    } catch (error: any) {
      logger.error({ error: error.message || error, service: 'OpportunityAIEngine' }, 'Failed to extract opportunity intelligence');
      if (error instanceof ConfigurationError || error instanceof ServiceUnavailableError) {
        throw error;
      }
      throw new ServiceUnavailableError('Opportunity AI analysis is temporarily unavailable.');
    }
  }
}

export const opportunityAIEngine = new OpportunityAIEngine();
