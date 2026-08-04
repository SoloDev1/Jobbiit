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
   * Executes LLM prompt using primary provider (OpenAI GPT-4o-mini) or dynamic category-aware fallback.
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
        logger.warn({ err }, '[AIProviderAdapter] Primary LLM call failed, generating dynamic fallback');
      }
    }

    // Dynamic Category-Aware Fallback for offline / dev environments
    const title = options?.context?.title || extractFromPrompt(userPrompt, 'Title') || 'Target Position';
    const org = options?.context?.organisation || extractFromPrompt(userPrompt, 'Company') || 'Target Organization';
    const category = (options?.context?.category || extractFromPrompt(userPrompt, 'Category') || 'JOB').toUpperCase();
    const desc = options?.context?.description || userPrompt;

    const dynamicFallback = buildCategoryAwareFallback(title, org, category, desc);
    const latencyMs = Date.now() - startTime;

    return {
      rawResponseText: JSON.stringify(dynamicFallback),
      provider: 'DynamicFallback',
      model: 'fallback-v2',
      promptTokens: 50,
      completionTokens: 120,
      latencyMs,
    };
  }
}

function extractFromPrompt(prompt: string, key: string): string | null {
  const match = prompt.match(new RegExp(`${key}:\\s*(.+)`, 'i'));
  return match ? match[1].trim() : null;
}

function buildCategoryAwareFallback(title: string, org: string, category: string, desc: string) {
  const isScholarship = category === 'SCHOLARSHIP';
  const isGrant = category === 'GRANT';
  const isFellowship = category === 'FELLOWSHIP';
  const isInternship = category === 'INTERNSHIP';

  // Extract candidate keywords from title & description text
  const extractedKeywords = extractKeywords(title, desc);

  if (isScholarship) {
    return {
      executiveSummary: `The ${title} offered by ${org} provides financial backing and academic recognition for high-achieving candidates demonstrating research excellence and community leadership.`,
      whoShouldApply: ['Academic Scholars', 'Research Candidates', 'Graduate Applicants'],
      whoShouldNotApply: ['Applicants not meeting minimum GPA or degree prerequisites'],
      requiredSkills: extractedKeywords.length > 0 ? extractedKeywords : ['Academic Merit', 'Statement of Purpose', 'Research Proposal'],
      preferredSkills: ['Faculty Recommendation', 'Publication Record', 'Community Impact'],
      atsKeywords: [title, org, 'Scholarship', 'Grant', 'Academic Excellence', 'Statement of Purpose', ...extractedKeywords].slice(0, 8),
      interviewQuestions: [
        `Why are you applying for the ${title} at ${org}?`,
        `How does your research focus align with the mission of ${org}?`,
        `Describe how this financial support will advance your long-term academic goals.`,
      ],
      recommendation: 'APPLY_IMMEDIATELY',
    };
  }

  if (isGrant) {
    return {
      executiveSummary: `The ${title} by ${org} is targeted at innovative research initiatives and project proposals with measurable societal or technical impact.`,
      whoShouldApply: ['Principal Investigators', 'Research Project Leads', 'Innovators'],
      whoShouldNotApply: ['Unregistered entities or proposals without budget breakdowns'],
      requiredSkills: extractedKeywords.length > 0 ? extractedKeywords : ['Grant Writing', 'Budget Allocation', 'Project Methodology'],
      preferredSkills: ['Milestone Reporting', 'Stakeholder Engagement', 'Risk Assessment'],
      atsKeywords: [title, org, 'Grant', 'Research Grant', 'Project Budget', 'Impact Measurement', ...extractedKeywords].slice(0, 8),
      interviewQuestions: [
        `Walk us through the core methodology and budget breakdown for your ${title} proposal.`,
        `How will ${org}'s funding enable milestones that otherwise would not be achieved?`,
      ],
      recommendation: 'APPLY_IMMEDIATELY',
    };
  }

  return {
    executiveSummary: `${org} is seeking a qualified candidate for ${title}. Key focus includes technical execution, cross-functional collaboration, and delivering measurable results.`,
    whoShouldApply: [`${title} Professionals`, 'Qualified Candidates with Core Domain Skills'],
    whoShouldNotApply: ['Candidates lacking fundamental required qualifications'],
    requiredSkills: extractedKeywords.length > 0 ? extractedKeywords : ['Problem Solving', 'Strategic Execution', 'Domain Knowledge'],
    preferredSkills: ['Leadership', 'Cross-Functional Collaboration', 'Process Optimization'],
    atsKeywords: [title, org, category, ...extractedKeywords].slice(0, 8),
    interviewQuestions: [
      `Why do you want to join ${org} as a ${title}?`,
      `Describe a complex challenge you solved relevant to the ${title} role.`,
      `How do you prioritize deliverables under tight deadlines at ${org}?`,
    ],
    recommendation: 'APPLY_IMMEDIATELY',
  };
}

function extractKeywords(title: string, desc: string): string[] {
  const text = `${title} ${desc}`.toLowerCase();
  const candidates = [
    'Python', 'JavaScript', 'TypeScript', 'React', 'Node.js', 'SQL', 'PostgreSQL',
    'Docker', 'AWS', 'Data Analysis', 'Project Management', 'Financial Modeling',
    'Research', 'Grant Writing', 'Graphic Design', 'Marketing', 'Sales Strategy',
    'Machine Learning', 'AI', 'Product Design', 'UI/UX', 'Operations', 'Leadership',
    'Customer Relations', 'Strategic Planning', 'Public Speaking', 'Curriculum Design'
  ];

  const matched = candidates.filter((word) => text.includes(word.toLowerCase()));
  if (matched.length > 0) return matched.slice(0, 6);

  // Fallback to title words if no candidate matched
  return title
    .split(/\s+/)
    .filter((w) => w.length > 3 && !['with', 'from', 'that', 'this', 'for'].includes(w.toLowerCase()))
    .slice(0, 4);
}
