import { logger } from '../core/telemetry/logger.service';

export interface PromptTemplate {
  id: string;
  version: string;
  template: string;
}

export class PromptRegistryService {
  private templates: Map<string, PromptTemplate> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    this.register({
      id: 'INTERVIEW_BRIEFING',
      version: 'v1',
      template: `Generate a pre-interview briefing prediction for role {{role}} at company {{company}}.
Provide:
1. Predicted category breakdown percentages (Behavioral, Technical, System Design, Leadership).
2. 3 likely questions.
3. Top 3 skills to prepare.
4. Key preparation objective.`,
    });

    this.register({
      id: 'STAR_EVALUATION',
      version: 'v1',
      template: `Evaluate the candidate's answer for question "{{question}}" using the STAR framework.
Candidate Answer: "{{answer}}"
Required Skills: {{skills}}
Check Situation, Task, Action, Result, and quantitative metrics.`,
    });

    this.register({
      id: 'FOLLOW_UP_PROBE',
      version: 'v1',
      template: `Generate a natural conversational follow-up probe challenging candidate claim "{{answer}}".
Persona: {{persona}}. Focus on metrics and technical trade-offs.`,
    });
  }

  public register(template: PromptTemplate): void {
    const key = `${template.id}:${template.version}`;
    this.templates.set(key, template);
    logger.info({ id: template.id, version: template.version }, 'Registered prompt template');
  }

  public get(id: string, version = 'v1'): string {
    const key = `${id}:${version}`;
    const prompt = this.templates.get(key);
    if (!prompt) {
      logger.warn({ id, version }, 'Prompt template not found, fallback to default');
      return `Evaluate response for {{role}} at {{company}}.`;
    }
    return prompt.template;
  }
}

export const promptRegistryService = new PromptRegistryService();
