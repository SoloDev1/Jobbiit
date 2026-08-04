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
  phase?: 'INTRO' | 'TECHNICAL' | 'BEHAVIORAL' | 'WRAP_UP';
  competency: string;
  targetDepth: number;
  currentDepth: number;
  satisfied: boolean;
  askedQuestions?: string[];
  completedCompetencies?: string[];
  followUpCount?: number;
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
    const completedCompetencies = objective.completedCompetencies || [];

    // Resolve dynamic competencies from opportunity intelligence
    const opCompetencies = context.jobIntelligence.requiredSkills || [];
    const competencies = opCompetencies.length > 0 
      ? opCompetencies.map(s => s.trim())
      : [
          'system design and scalability',
          'stakeholder alignment and cross-functional collaboration',
          'navigating ambiguity and delivering under pressure',
          `technical depth specific to ${primarySkill}`,
          'measuring and communicating business impact',
        ];

    // Determine topic based on what is missing in the last evaluation
    const needsMetrics = !lastEval.detectedSignals.includes('Quantifiable Metrics Found');
    const needsTradeoff = !lastEval.detectedSignals.some((s) => s.includes('Trade-off'));
    const needsOwnership = !lastEval.detectedSignals.includes('Ownership Mindset');

    // Is this a follow-up probe or a new objective question?
    let shouldProbe = (needsMetrics || needsTradeoff) && (objective.currentDepth < objective.targetDepth);
    let currentCompetency = objective.competency || competencies[0];
    let currentDepth = objective.currentDepth || 1;
    let followUpCount = objective.followUpCount || 0;
    let phase = objective.phase || 'TECHNICAL';

    if (shouldProbe) {
      followUpCount += 1;
    } else {
      // Competency is satisfied, progress to the next competency
      if (!completedCompetencies.includes(currentCompetency)) {
        completedCompetencies.push(currentCompetency);
      }
      const nextComp = competencies.find((c) => !completedCompetencies.includes(c));
      if (nextComp) {
        currentCompetency = nextComp;
        currentDepth = 1;
        followUpCount = 0;
        shouldProbe = false;
      } else {
        // All competencies tested! Transition to wrap up
        phase = 'WRAP_UP';
        currentCompetency = 'wrap_up';
        currentDepth = 1;
        shouldProbe = false;
      }
    }

    let topic: string;
    if (phase === 'WRAP_UP') {
      topic = 'final reflections, candidate questions, and interview wrap-up';
    } else if (shouldProbe && needsMetrics) {
      topic = `quantifying impact with specific metrics for the competency: ${currentCompetency}`;
    } else if (shouldProbe && needsTradeoff) {
      topic = `technical trade-offs and architectural decisions for the competency: ${currentCompetency}`;
    } else if (needsOwnership) {
      topic = `personal ownership and leadership at ${company} regarding ${currentCompetency}`;
    } else {
      topic = `demonstrating depth in: ${currentCompetency}`;
    }

    try {
      const promptTemplate = getQuestionPrompt(persona);
      const difficulty = context.difficulty || 'INTERMEDIATE';
      const questionPrompt = promptTemplate.buildUserPrompt(company, role, primarySkill, topic, difficulty);

      let nextQuestion = '';
      let attempts = 0;
      while (attempts < 3) {
        const response = await aiRouter.complete({
          task: 'INTERVIEW_QUESTION_GENERATE',
          systemPrompt: promptTemplate.systemPrompt,
          userPrompt: questionPrompt,
          jsonMode: false,
        });

        nextQuestion = response.text.trim().replace(/^["']|["']$/g, '');

        // Prevent duplicates
        const isDuplicate = askedQuestions.some((q) => {
          const cleanQ = q.toLowerCase().replace(/[^a-z0-9]/g, '');
          const cleanNext = nextQuestion.toLowerCase().replace(/[^a-z0-9]/g, '');
          return cleanQ.includes(cleanNext) || cleanNext.includes(cleanQ) || cleanQ === cleanNext;
        });

        if (!isDuplicate || askedQuestions.length === 0) {
          break;
        }
        attempts++;
      }

      if (!nextQuestion) {
        nextQuestion = this.getStaticFallback(company, role, currentDepth, competencies);
      }

      logger.info(
        { persona, topic, isFollowUp: shouldProbe, company, role, service: 'ConversationEngine' },
        'Generated next interview question'
      );

      return {
        nextQuestion,
        isFollowUp: shouldProbe,
        updatedObjective: {
          phase,
          competency: currentCompetency,
          targetDepth: objective.targetDepth,
          currentDepth: shouldProbe ? currentDepth + 1 : 1,
          satisfied: phase === 'WRAP_UP' || (!shouldProbe && !competencies.find((c) => !completedCompetencies.includes(c))),
          askedQuestions: [...askedQuestions, nextQuestion],
          completedCompetencies,
          followUpCount,
        },
      };
    } catch (err: any) {
      logger.warn({ error: err.message, service: 'ConversationEngine' }, 'LLM question generation failed, using static fallback');
      const fallbackQuestion = this.getStaticFallback(company, role, currentDepth, competencies);
      return {
        nextQuestion: fallbackQuestion,
        isFollowUp: shouldProbe,
        updatedObjective: {
          phase,
          competency: currentCompetency,
          targetDepth: objective.targetDepth,
          currentDepth: shouldProbe ? currentDepth + 1 : 1,
          satisfied: phase === 'WRAP_UP' || (!shouldProbe && !competencies.find((c) => !completedCompetencies.includes(c))),
          askedQuestions: [...askedQuestions, fallbackQuestion],
          completedCompetencies,
          followUpCount,
        },
      };
    }
  }

  private getStaticFallback(company: string, role: string, depth: number, competencies: string[]): string {
    const activeCompetency = competencies[depth % competencies.length] || 'professional experience';
    const questions = [
      `Tell me about a time you had to deliver a critical project under significant time pressure at a company similar to ${company}, specifically related to ${activeCompetency}. What decisions did you make and what was the result?`,
      `As a ${role}, how would you approach building alignment between engineering and business stakeholders on a high-priority initiative regarding ${activeCompetency}?`,
      `Describe the most complex system you've designed involving ${activeCompetency}. What were the key trade-offs, and what would you do differently today?`,
      `Tell me about a time you disagreed with a key decision about ${activeCompetency} and how you handled it constructively.`,
      `What unique perspective or capability would you bring to ${company} that is specifically needed for ${activeCompetency}?`,
    ];
    return questions[depth % questions.length];
  }
}

export const conversationEngine = new ConversationEngine();
