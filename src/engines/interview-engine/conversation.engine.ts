import type { CareerContext, EvaluationResult } from '../../types/interview.types';

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
}

export class ConversationEngine {
  /**
   * Generates next conversational follow-up or transitions to next objective.
   */
  public generateNextStep(
    context: CareerContext,
    lastAnswer: string,
    lastEval: EvaluationResult,
    objective: ObjectiveState
  ): {
    nextQuestion: string;
    isFollowUp: boolean;
    updatedObjective: ObjectiveState;
  } {
    const lower = lastAnswer.toLowerCase();

    // Check if candidate needs a follow-up probe (e.g. missing metrics or missing trade-off)
    if (!lastEval.detectedSignals.includes('Quantifiable Metrics Found') && objective.currentDepth < objective.targetDepth) {
      return {
        nextQuestion: `That's a helpful overview. Could you quantify the impact of that initiative? What specific performance or metric improvements did you achieve?`,
        isFollowUp: true,
        updatedObjective: {
          ...objective,
          currentDepth: objective.currentDepth + 1,
        },
      };
    }

    if (lower.includes('built') || lower.includes('designed') || lower.includes('migrated')) {
      if (!lower.includes('trade-off') && !lower.includes('why') && objective.currentDepth < objective.targetDepth) {
        return {
          nextQuestion: `Interesting technical approach. What key trade-offs did you consider before settling on this architecture, and would you make the same choice today?`,
          isFollowUp: true,
          updatedObjective: {
            ...objective,
            currentDepth: objective.currentDepth + 1,
          },
        };
      }
    }

    // Move to next objective
    const questionsList = [
      `Looking at the role at ${context.jobIntelligence.companyName}, how would your technical background help scale our distributed systems?`,
      `Tell me about a time when you faced a high-pressure deadline or technical disagreement. How did you align the team and drive execution?`,
      `What unique strategic perspective or execution capability do you bring to this specific position?`,
    ];

    const nextIndex = Math.min(questionsList.length - 1, objective.currentDepth);

    return {
      nextQuestion: questionsList[nextIndex] || `What key lesson did you take away from your most challenging past project?`,
      isFollowUp: false,
      updatedObjective: {
        ...objective,
        currentDepth: objective.currentDepth + 1,
        satisfied: true,
      },
    };
  }
}

export const conversationEngine = new ConversationEngine();
