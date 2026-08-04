import type { CareerContext, EvaluationResult } from '../../types/interview.types';
import { aiRouter } from '../../services/aiRouter.service';
import { getQuestionPrompt } from '../../services/promptLibrary.service';
import { logger } from '../../core/telemetry/logger.service';

export interface TurnState {
  speaker: 'INTERVIEWER' | 'CANDIDATE';
  text: string;
  timestamp: Date;
  evaluation?: EvaluationResult;
}

export interface ObjectiveState {
  competency: string;
  targetDepth: number;
  currentDepth: number;
  satisfied: boolean;
  askedQuestions?: string[];
}

export class ConversationEngine {
  /**
   * Generates the next conversational follow-up or transitions to the next objective.
   * Fully LLM-powered — questions are contextualised to the company, role, and persona.
   */
  public async generateNextStep(
    context: CareerContext,
    lastAnswer: string,
    lastEval: EvaluationResult,
    objective: ObjectiveState
  ): Promise<{
    nextQuestion: string;
    isFollowUp: boolean;
    updatedObjective: ObjectiveState;
  }> {
    const persona = context.persona || 'HIRING_MANAGER';
    const company = context.jobIntelligence.companyName;
    const role = context.jobIntelligence.roleTitle;
    const primarySkill = context.candidate.skills[0] || 'Software Engineering';
    const askedQuestions = objective.askedQuestions || [];

    // Determine topic based on what is missing in the last evaluation
    const needsMetrics = !lastEval.detectedSignals.includes('Quantifiable Metrics Found');
    const needsTradeoff = !lastEval.detectedSignals.some((s) => s.includes('Trade-off'));
    const needsOwnership = !lastEval.detectedSignals.includes('Ownership Mindset');

    // Is this a follow-up probe or a new objective question?
    const shouldProbe = (needsMetrics || needsTradeoff) && objective.currentDepth < objective.targetDepth;

    let topic: string;
    if (shouldProbe && needsMetrics) {
      topic = 'quantifying impact with specific metrics';
    } else if (shouldProbe && needsTradeoff) {
      topic = 'technical trade-offs and architectural decisions';
    } else if (needsOwnership) {
      topic = `personal ownership and leadership at ${company}`;
    } else {
      // Rotate through competencies — avoid repeating the same topic
      const competencies = [
        'system design and scalability',
        'stakeholder alignment and cross-functional collaboration',
        'navigating ambiguity and delivering under pressure',
        `technical depth specific to ${primarySkill}`,
        'measuring and communicating business impact',
      ];
      const usedTopics = askedQuestions.join(' ').toLowerCase();
      topic = competencies.find((c) => !usedTopics.includes(c.split(' ')[0])) || competencies[objective.currentDepth % competencies.length];
    }

    try {
      const promptTemplate = getQuestionPrompt(persona);
      const difficulty = context.difficulty || 'INTERMEDIATE';
      const questionPrompt = promptTemplate.buildUserPrompt(company, role, primarySkill, topic, difficulty);

      const response = await aiRouter.complete({
        task: 'INTERVIEW_QUESTION_GENERATE',
        systemPrompt: promptTemplate.systemPrompt,
        userPrompt: questionPrompt,
        jsonMode: false,
      });

      const nextQuestion = response.text.trim().replace(/^["']|["']$/g, '');

      logger.info(
        { persona, topic, isFollowUp: shouldProbe, company, role, service: 'ConversationEngine' },
        'Generated next interview question'
      );

      return {
        nextQuestion: nextQuestion || this.getStaticFallback(company, role, objective.currentDepth),
        isFollowUp: shouldProbe,
        updatedObjective: {
          ...objective,
          currentDepth: objective.currentDepth + 1,
          satisfied: !shouldProbe,
          askedQuestions: [...askedQuestions, nextQuestion],
        },
      };
    } catch (err: any) {
      logger.warn({ error: err.message, service: 'ConversationEngine' }, 'LLM question generation failed, using static fallback');
      return {
        nextQuestion: this.getStaticFallback(company, role, objective.currentDepth),
        isFollowUp: shouldProbe,
        updatedObjective: {
          ...objective,
          currentDepth: objective.currentDepth + 1,
          satisfied: !shouldProbe,
        },
      };
    }
  }

  private getStaticFallback(company: string, role: string, depth: number): string {
    const questions = [
      `Tell me about a time you had to deliver a critical project under significant time pressure at a company similar to ${company}. What decisions did you make and what was the result?`,
      `As a ${role}, how would you approach building alignment between engineering and business stakeholders on a high-priority initiative?`,
      `Describe the most technically complex system you've designed. What were the key trade-offs, and what would you do differently today?`,
      `Tell me about a time you disagreed with a key decision and how you handled it constructively.`,
      `What unique perspective or capability would you bring to ${company} that this role specifically needs?`,
    ];
    return questions[depth % questions.length];
  }
}

export const conversationEngine = new ConversationEngine();
