import OpenAI from 'openai';
import { env } from '../../../config/env';
import { getCachedAIResponse, setCachedAIResponse } from '../utils/cache';
import { logger } from '../../../config/logger';
import { DocumentDataInput, AIEnhancedOutput } from '../document-generator.types';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

/**
 * Enhances the document content using the OpenAI Chat Completions API.
 * Defaults to gpt-4o-mini for cost efficiency and speed.
 * Enforces a max token limit and checks/writes prompt completions to the VPS Redis cache.
 */
export async function enhanceContent(type: 'cv' | 'grant' | 'scholarship', data: DocumentDataInput): Promise<AIEnhancedOutput> {
  // 1. Check prompt cache in VPS Redis
  try {
    const cached = await getCachedAIResponse(type, data);
    if (cached) {
      return JSON.parse(cached) as AIEnhancedOutput;
    }
  } catch (error) {
    logger.error({ error }, 'Error reading from AI prompt cache');
  }

  // 2. Call OpenAI API
  try {
    let systemPrompt = '';
    if (type === 'cv') {
      systemPrompt = `You are a professional CV optimizer. You will receive a CV JSON object containing the user's current summary, experience, and skills.
Your task is to:
- Write an engaging, modern professional summary.
- Rewrite all experience descriptions to be active, action-verb driven, and outcome-focused (e.g. including metrics or accomplishments where possible). Keep job titles, companies, and dates unchanged.
- Standardize and suggest additional relevant skills based on the experiences.

Return ONLY a valid JSON object matching this structure:
{
  "summary": "enhanced summary text",
  "experience": [
    {
      "title": "job title (unchanged)",
      "company": "company name (unchanged)",
      "startDate": "start date (unchanged)",
      "endDate": "end date (unchanged or omitted)",
      "description": "enhanced and rewritten job description"
    }
  ],
  "skills": ["skill1", "skill2", "suggestedSkill3"]
}`;
    } else if (type === 'grant') {
      systemPrompt = `You are an expert grant proposal writer. You will receive a grant application JSON.
Your task is to:
- Enhance the objective statement to be extremely clear, precise, and aligned with funding priorities.
- Strengthen the background narrative, making it highly persuasive and clearly articulating the core need.
- Polish the methodology and expected impact sections.

Return ONLY a valid JSON object matching this structure:
{
  "objective": "enhanced objective statement",
  "background": "persuasive and structured background narrative",
  "methodology": "clear execution plan",
  "impact": "quantifiable expected impact"
}`;
    } else if (type === 'scholarship') {
      systemPrompt = `You are a professional academic advisor. You will receive a scholarship application JSON.
Your task is to:
- Elevate the personal statement to be compelling, memorable, and clear about the candidate's achievements.
- Refine the explanation of financial need and career goals to be respectful, professional, and clear.
- Refine achievements.

Return ONLY a valid JSON object matching this structure:
{
  "personalStatement": "highly compelling personal statement",
  "financialNeed": "refined explanation of financial need",
  "careerGoals": "polished career goals showing clear future path",
  "achievements": ["achievement 1", "achievement 2"]
}`;
    }

    logger.info({ type }, 'Requesting content enhancement from OpenAI (gpt-4o-mini)');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: JSON.stringify(data) },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 1500,
      temperature: 0.3,
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) {
      throw new Error('OpenAI returned an empty response');
    }

    const parsed = JSON.parse(content);

    // Validate structure of parsed output (simple sanity checks, fallback if keys are missing)
    if (type === 'cv' && (!parsed.summary || !parsed.experience)) {
      throw new Error('Invalid CV response shape from OpenAI');
    }
    if (type === 'grant' && (!parsed.objective || !parsed.background)) {
      throw new Error('Invalid Grant response shape from OpenAI');
    }
    if (type === 'scholarship' && (!parsed.personalStatement)) {
      throw new Error('Invalid Scholarship response shape from OpenAI');
    }

    // 3. Cache response in VPS Redis
    await setCachedAIResponse(type, data, content);

    return parsed as AIEnhancedOutput;

  } catch (error) {
    logger.error({ error, type }, 'OpenAI API call failed, falling back to original data');
    return getFallbackData(type, data);
  }
}

/**
 * Returns a formatted fallback matching the target enhanced structure using the user's original data.
 */
function getFallbackData(type: 'cv' | 'grant' | 'scholarship', data: DocumentDataInput): AIEnhancedOutput {
  if (type === 'cv') {
    const cv = data as any;
    return {
      summary: cv.summary || '',
      experience: (cv.experience || []).map((exp: any) => ({
        title: exp.title,
        company: exp.company,
        startDate: exp.startDate,
        endDate: exp.endDate,
        description: exp.description || '',
      })),
      skills: cv.skills || [],
    };
  } else if (type === 'grant') {
    const grant = data as any;
    return {
      objective: grant.objective || '',
      background: grant.background || '',
      methodology: grant.methodology || '',
      impact: grant.impact || '',
    };
  } else {
    const scholarship = data as any;
    return {
      personalStatement: scholarship.personalStatement || '',
      financialNeed: scholarship.financialNeed || '',
      careerGoals: scholarship.careerGoals || '',
      achievements: scholarship.achievements || [],
    };
  }
}
