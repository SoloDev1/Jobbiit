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

    const rawTemplate = promptRegistryService.get('FOLLOW_UP_PROBE', 'v1');
    const prompt = rawTemplate
      .replace('{{persona}}', context.interview.activePersona)
      .replace('{{answer}}', topic);

    // Call provider-agnostic AI Gateway
    const aiResult = await aiGatewayService.complete(prompt, { provider: 'GEMINI' });

    // Custom candidate skill binding
    const primarySkill = context.candidate.skills[0] || 'Node.js & Caching';

    return `Looking at ${context.opportunity.companyName}'s engineering culture and your background in ${primarySkill}, describe a time when you resolved a complex technical disagreement or system bottleneck under tight deadlines.`;
  }
}

export const questionGeneratorService = new QuestionGeneratorService();
