/**
 * OpporHub OS — Opportunity Intelligence Service
 * Zero UI engine that extracts skills, requirements, ATS keywords, and metadata.
 * Strictly adheres to Production AI Reliability Rules: No fabricated fallbacks in production.
 */

import OpenAI from 'openai';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { OpportunityRequirementsSchema } from '../../domain/opportunity/opportunity.entity';
import { CacheEngine } from '../../core/cache/redis.service';
import { logger } from '../../core/telemetry/logger.service';
import { ConfigurationError, ServiceUnavailableError } from '../../core/errors/domain-error';

export const ExtractedOpportunityAnalysisSchema = z.object({
  title: z.string(),
  company: z.string(),
  location: z.string().optional(),
  opportunityType: z.enum(['job', 'scholarship', 'grant', 'internship', 'freelance']),
  requirements: OpportunityRequirementsSchema,
  salaryRange: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
      currency: z.string().default('USD'),
    })
    .optional(),
  summary: z.string(),
});

export type ExtractedOpportunityAnalysis = z.infer<typeof ExtractedOpportunityAnalysisSchema>;

export class OpportunityIntelligenceService {
  private getOpenAIClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY;
    const isDevMock = process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DATA === 'true';

    if (!apiKey && !isDevMock) {
      logger.error({ service: 'OpportunityIntelligence', operation: 'getOpenAIClient' }, 'OPENAI_API_KEY configuration missing');
      throw new ConfigurationError('AI Provider API key configuration is missing');
    }

    return new OpenAI({ apiKey: apiKey || 'dev-mock-key' });
  }

  /**
   * Analyzes raw opportunity text and extracts structured intelligence.
   */
  public async analyzeText(rawText: string, cacheKey?: string): Promise<ExtractedOpportunityAnalysis> {
    // 1. Check Redis Cache
    if (cacheKey) {
      try {
        const cached = await CacheEngine.get<ExtractedOpportunityAnalysis>(`opp:intel:${cacheKey}`);
        if (cached) {
          logger.info({ cacheKey, service: 'OpportunityIntelligence' }, 'Returning cached analysis');
          return cached;
        }
      } catch (error) {
        logger.error({ error, cacheKey, service: 'OpportunityIntelligence' }, 'Redis cache read error, continuing to AI service');
      }
    }

    // 2. Controlled Development-Only Mock Guard
    const isDevMock = process.env.NODE_ENV === 'development' && process.env.USE_MOCK_DATA === 'true';
    if (isDevMock && !process.env.OPENAI_API_KEY) {
      logger.warn({ service: 'OpportunityIntelligence' }, 'Using DEV-ONLY mock data (USE_MOCK_DATA=true)');
      return {
        title: 'Senior Software Engineer',
        company: 'Tech Organization',
        location: 'Remote / San Francisco',
        opportunityType: 'job',
        requirements: {
          requiredSkills: ['TypeScript', 'React Native', 'Node.js', 'PostgreSQL'],
          preferredSkills: ['Docker', 'AWS', 'GraphQL'],
          minimumYearsExperience: 5,
          educationRequirement: 'Bachelor in Computer Science or equivalent',
          keyPhrases: ['microservices', 'high throughput', 'scalable architecture'],
        },
        salaryRange: { min: 140000, max: 180000, currency: 'USD' },
        summary: 'Target engineering role focused on building resilient distributed systems.',
      };
    }

    // 3. Execute OpenAI gpt-4o-mini structured output
    const openai = this.getOpenAIClient();

    try {
      logger.info({ service: 'OpportunityIntelligence', operation: 'analyzeText' }, 'Calling OpenAI API for opportunity parsing');
      const completion = await openai.beta.chat.completions.parse({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert Opportunity Intelligence Analyzer at Apple. Extract role details, skills, and ATS keywords into structured JSON.',
          },
          { role: 'user', content: rawText },
        ],
        response_format: zodResponseFormat(ExtractedOpportunityAnalysisSchema, 'opportunity_analysis'),
        temperature: 0.1,
      });

      const parsed = completion.choices[0]?.message?.parsed;
      if (!parsed) {
        throw new ServiceUnavailableError('AI service returned an empty response. Please try again.');
      }

      // Cache valid response
      if (cacheKey) {
        await CacheEngine.set(`opp:intel:${cacheKey}`, parsed, 86400).catch((err) => {
          logger.error({ err, cacheKey }, 'Failed to cache opportunity analysis');
        });
      }

      return parsed;
    } catch (error: any) {
      logger.error(
        {
          error: error.message || error,
          stack: error.stack,
          service: 'OpportunityIntelligence',
          operation: 'analyzeText',
        },
        'OpenAI opportunity analysis execution failed'
      );

      if (error instanceof ConfigurationError || error instanceof ServiceUnavailableError) {
        throw error;
      }

      throw new ServiceUnavailableError('Opportunity analysis service is temporarily unavailable. Please try again later.');
    }
  }
}

export const OpportunityIntelligence = new OpportunityIntelligenceService();
