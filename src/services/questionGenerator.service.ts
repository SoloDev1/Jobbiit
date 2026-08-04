import { aiGatewayService } from './aiGateway.service';
import { getQuestionPrompt } from './promptLibrary.service';
import { logger } from '../core/telemetry/logger.service';
import type { TriModelContext } from './contextBuilder.service';

export class QuestionGeneratorService {
  /**
   * Generates a candidate-tailored, persona-aligned interview question via LLM.
   * Uses proper system/user message separation and persona-specific prompt templates.
   */
  public async generateQuestion(context: TriModelContext, topic = 'Core Competency'): Promise<string> {
    const persona = context.interview.activePersona || 'HIRING_MANAGER';
    const company = context.opportunity.companyName || 'Target Company';
    const role = context.opportunity.roleTitle || 'Professional';
    const primarySkill = context.candidate.skills[0] || 'Software Engineering';
    const difficulty = (context.interview as any).difficulty || 'INTERMEDIATE';

    logger.info(
      { persona, company, role, topic, difficulty, service: 'QuestionGeneratorService' },
      'Generating persona-tailored interview question'
    );

    try {
      const promptTemplate = getQuestionPrompt(persona);

      const question = await aiGatewayService.complete(
        promptTemplate.systemPrompt,
        promptTemplate.buildUserPrompt(company, role, primarySkill, topic, difficulty),
        { task: 'INTERVIEW_QUESTION_GENERATE' }
      );

      const cleaned = question?.trim()?.replace(/^["']|["']$/g, '');
      if (cleaned && cleaned.length > 15) {
        return cleaned;
      }
    } catch (err: any) {
      logger.warn({ error: err.message, service: 'QuestionGeneratorService' }, 'AI question generation failed, using persona template');
    }

    // Persona-specific static fallback (never generic)
    return this.getPersonaFallback(persona, company, role, primarySkill);
  }

  private getPersonaFallback(persona: string, company: string, role: string, skill: string): string {
    switch (persona.toUpperCase()) {
      case 'TECHNICAL_LEAD':
        return `Walk me through the most complex distributed system you've designed. What were the core trade-offs and how did you validate your architectural decisions?`;
      case 'FAANG_INTERVIEWER':
        return `Describe a production incident you owned end-to-end. What was your detection-to-resolution timeline and what systemic changes did you make to prevent recurrence?`;
      case 'CEO_FOUNDER':
        return `If you joined ${company} as ${role} tomorrow, what is the single highest-leverage initiative you would pursue in the first 90 days, and why?`;
      case 'FRIENDLY_HR':
        return `What drew you specifically to ${company}, and how does this ${role} role fit into the career trajectory you are building?`;
      case 'HIRING_MANAGER':
      default:
        return `Tell me about a time when you had to deliver a high-stakes project with ambiguous requirements. How did you align your team and what was the measurable outcome?`;
    }
  }
}

export const questionGeneratorService = new QuestionGeneratorService();
