import { contextBuilderService } from './contextBuilder.service';
import { starEvaluator } from '../engines/interview-engine/evaluators/star.evaluator';
import { leadershipEvaluator } from '../engines/interview-engine/evaluators/leadership.evaluator';
import { technicalEvaluator } from '../engines/interview-engine/evaluators/technical.evaluator';
import { hireSignalEvaluator } from '../engines/interview-engine/evaluators/hire-signal.evaluator';
import { conversationEngine } from '../engines/interview-engine/conversation.engine';
import { interviewRepository } from '../repositories/interview.repository';
import { aiRouter } from './aiRouter.service';
import { PromptLibrary } from './promptLibrary.service';
import { logger } from '../core/telemetry/logger.service';
import type { InterviewPersona } from '../engines/interview-engine/evaluators/hire-signal.evaluator';

export interface ProcessTurnInput {
  sessionId: string;
  userAnswerText: string;
}

export interface ProcessTurnResult {
  personaMessage: string;
  nextQuestion: string;
  isFollowUp: boolean;
  score: number;
  signals: {
    situationOk: boolean;
    taskOk: boolean;
    actionOk: boolean;
    resultOk: boolean;
    metricsFound: boolean;
  };
  coachingTip: string;
  strengthSummary: string;
  improvedAnswer: string;
  hireRecommendation: string;
}

export class ConversationRuntimeService {
  /**
   * Processes candidate answer turn:
   * — LLM-grades the answer via 3 evaluators run in parallel
   * — Generates an LLM-powered next question via the ConversationEngine
   * — Produces a real AI-improved answer
   */
  public async processTurn(input: ProcessTurnInput): Promise<ProcessTurnResult> {
    logger.info({ sessionId: input.sessionId, service: 'ConversationRuntimeService' }, 'Processing conversation turn');

    const session: any = await interviewRepository.findSessionById(input.sessionId).catch(() => null);
    const persona: InterviewPersona = (session?.persona || 'HIRING_MANAGER') as InterviewPersona;

    const triContext = await contextBuilderService.buildTriModelContext({
      userId: session?.userId || 'user_anon',
      sessionId: input.sessionId,
      sourceType: session?.sourceType || 'OPPORTUNITY',
      opportunityId: session?.opportunityId || undefined,
      companyName: session?.extractedCompany || 'Target Company',
      roleTitle: session?.extractedRole || 'Professional',
      persona,
    });

    const company = triContext.opportunity.companyName || 'Target Company';
    const role = triContext.opportunity.roleTitle || 'Professional';
    const activeQuestion = session?.currentQuestion ||
      `As part of the ${role} interview at ${company}, describe a high-impact initiative you led and the measurable outcome you achieved.`;

    // Build CareerContext for evaluators
    const careerContext = {
      sessionId: input.sessionId,
      userId: triContext.candidate.userId,
      sourceType: (session?.sourceType as any) || 'OPPORTUNITY',
      candidate: {
        fullName: triContext.candidate.fullName,
        headline: triContext.candidate.headline,
        skills: triContext.candidate.skills,
        experienceLevel: triContext.candidate.experienceLevel,
      },
      jobIntelligence: {
        companyName: triContext.opportunity.companyName,
        roleTitle: triContext.opportunity.roleTitle,
        seniorityLevel: triContext.opportunity.seniorityLevel,
        requiredSkills: triContext.opportunity.requiredSkills,
        atsKeywords: triContext.opportunity.atsKeywords,
      },
      persona,
      difficulty: (session?.difficulty as any) || 'INTERMEDIATE',
    };

    // 1. Run LLM-graded Evaluator Suite in parallel
    const [starRes, leadRes, techRes] = await Promise.all([
      starEvaluator.evaluate(careerContext as any, activeQuestion, input.userAnswerText),
      leadershipEvaluator.evaluate(careerContext as any, activeQuestion, input.userAnswerText),
      technicalEvaluator.evaluate(careerContext as any, activeQuestion, input.userAnswerText),
    ]);

    const overall = hireSignalEvaluator.computeOverallHireSignal([starRes, leadRes, techRes], persona);

    // 2. Generate next question via LLM ConversationEngine (now async)
    const nextStep = await conversationEngine.generateNextStep(
      careerContext as any,
      input.userAnswerText,
      starRes,
      {
        competency: 'Core Problem Solving',
        targetDepth: 2,
        currentDepth: session?.questionDepth || 1,
        satisfied: false,
        askedQuestions: session?.askedQuestions || [],
      }
    );

    const situationOk = starRes.detectedSignals.includes('Situation Defined');
    const taskOk = starRes.detectedSignals.includes('Task Goal Outlined');
    const actionOk = starRes.detectedSignals.includes('Direct Action Taken');
    const resultOk = starRes.detectedSignals.includes('Outcome & Impact');
    const metricsFound = starRes.detectedSignals.includes('Quantifiable Metrics Found');

    // 3. Generate real LLM-improved answer
    const improvedAnswer = await this.generateImprovedAnswer(activeQuestion, input.userAnswerText);

    // 4. Persist feedback turn
    await interviewRepository.saveFeedback({
      sessionId: input.sessionId,
      questionText: activeQuestion,
      answerText: input.userAnswerText,
      situationOk,
      taskOk,
      actionOk,
      resultOk,
      metricsFound,
      score: overall.overallScore,
      coachingTip: overall.summaryTip,
      improvedAnswer,
    });

    // Compose persona-appropriate acknowledgment
    const getPersonaAck = (p: string): string => {
      if (p === 'FRIENDLY_HR') return `Thank you for sharing that. ${overall.strengthSummary}`;
      if (p === 'HIRING_MANAGER') return `Appreciated. ${overall.strengthSummary} Here is my next question.`;
      if (p === 'TECHNICAL_LEAD') return `Good. ${overall.summaryTip || 'I noted the technical approach. Let us dig deeper.'}`;
      if (p === 'FAANG_INTERVIEWER') return `Understood. ${overall.summaryTip || 'Let us continue.'}`;
      if (p === 'CEO_FOUNDER') return `Interesting perspective. ${overall.strengthSummary} Let us explore that further.`;
      return `Thank you. ${overall.summaryTip || overall.strengthSummary}`;
    };
    const personaMessage = getPersonaAck(persona);

    return {
      personaMessage,
      nextQuestion: nextStep.nextQuestion,
      isFollowUp: nextStep.isFollowUp,
      score: overall.overallScore,
      signals: { situationOk, taskOk, actionOk, resultOk, metricsFound },
      coachingTip: overall.summaryTip,
      strengthSummary: overall.strengthSummary,
      improvedAnswer,
      hireRecommendation: overall.hireRecommendation,
    };
  }

  private async generateImprovedAnswer(question: string, answer: string): Promise<string> {
    try {
      const prompt = PromptLibrary.ANSWER_IMPROVE_v1;
      const response = await aiRouter.complete({
        task: 'ANSWER_IMPROVE',
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.buildUserPrompt(question, answer),
        jsonMode: true,
      });
      const result = aiRouter.parseJSON<{ improvedAnswer: string }>(response, { improvedAnswer: answer });
      return result.improvedAnswer || answer;
    } catch {
      return answer;
    }
  }
}

export const conversationRuntimeService = new ConversationRuntimeService();
