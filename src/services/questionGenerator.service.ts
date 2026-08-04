import { aiGatewayService } from './aiGateway.service';
import { promptRegistryService } from './promptRegistry.service';
import { logger } from '../core/telemetry/logger.service';
import type { TriModelContext } from './contextBuilder.service';

export class QuestionGeneratorService {
  /**
   * Generates a candidate-tailored, persona-aligned interview question.
   */
  public async generateQuestion(context: TriModelContext, topic = 'System Architecture'): Promise<string> {
    logger.info({ persona: context.interview.activePersona, company: context.opportunity.companyName, service: 'QuestionGeneratorService' }, 'Generating LLM Question');

    const company = context.opportunity.companyName || 'Target Company';
    const role = context.opportunity.roleTitle || 'Software Engineer';
    const persona = context.interview.activePersona || 'TECHNICAL_LEAD';
    const primarySkill = context.candidate.skills[0] || 'Software Engineering';

    const systemPrompt = `You are an interviewer with persona ${persona} conducting a professional job interview for the position of ${role} at ${company}. Generate one clear, engaging, realistic interview question focusing on ${topic} and candidate background in ${primarySkill}. Keep the question direct and conversational (1-2 sentences). Do not include introductory conversational fluff or quotation marks.`;

    try {
      const aiResult = await aiGatewayService.complete(systemPrompt, { provider: 'GEMINI' });
      const cleaned = aiResult?.trim()?.replace(/^["']|["']$/g, '');
      if (cleaned && cleaned.length > 20) {
        return cleaned;
      }
    } catch (err: any) {
      logger.warn({ error: err.message }, 'AI Gateway call failed in QuestionGeneratorService, using dynamic persona template');
    }

    return `Welcome to your interview for ${role} at ${company}. To begin, could you describe a challenging project where you utilized ${primarySkill} to solve a key technical or operational problem?`;
  }
}

export const questionGeneratorService = new QuestionGeneratorService();
