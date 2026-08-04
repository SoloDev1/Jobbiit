import { contextBuilderService } from './contextBuilder.service';
import { starEvaluator } from '../engines/interview-engine/evaluators/star.evaluator';
import { leadershipEvaluator } from '../engines/interview-engine/evaluators/leadership.evaluator';
import { technicalEvaluator } from '../engines/interview-engine/evaluators/technical.evaluator';
import { hireSignalEvaluator } from '../engines/interview-engine/evaluators/hire-signal.evaluator';
import { conversationEngine } from '../engines/interview-engine/conversation.engine';
import { interviewRepository } from '../repositories/interview.repository';
import { logger } from '../core/telemetry/logger.service';

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
  improvedAnswer: string;
}

export class ConversationRuntimeService {
  /**
   * Processes candidate answer turn and generates real-time conversational response & next question.
   */
  public async processTurn(input: ProcessTurnInput): Promise<ProcessTurnResult> {
    logger.info({ sessionId: input.sessionId, service: 'ConversationRuntimeService' }, 'Processing conversation turn');

    const session: any = await interviewRepository.findSessionById(input.sessionId).catch(() => null);

    const triContext = await contextBuilderService.buildTriModelContext({
      userId: session?.userId || 'user_anon',
      sessionId: input.sessionId,
      sourceType: session?.sourceType || 'OPPORTUNITY',
      opportunityId: session?.opportunityId || undefined,
      companyName: session?.extractedCompany || 'Stripe',
      roleTitle: session?.extractedRole || 'Senior Backend Engineer',
      persona: session?.persona || 'TECHNICAL_LEAD',
    });

    const company = triContext.opportunity.companyName || 'Target Company';
    const role = triContext.opportunity.roleTitle || 'Software Engineer';
    const activeQuestion = `As part of the ${role} interview at ${company}, describe how you approach complex challenges in your field.`;

    // 1. Run Signal Evaluators
    const starRes = await starEvaluator.evaluate(
      {
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
        persona: session?.persona as any || 'TECHNICAL_LEAD',
        difficulty: 'INTERMEDIATE',
      },
      activeQuestion,
      input.userAnswerText
    );

    const leadRes = await leadershipEvaluator.evaluate(
      {
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
        persona: session?.persona as any || 'TECHNICAL_LEAD',
        difficulty: 'INTERMEDIATE',
      },
      activeQuestion,
      input.userAnswerText
    );

    const techRes = await technicalEvaluator.evaluate(
      {
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
        persona: session?.persona as any || 'TECHNICAL_LEAD',
        difficulty: 'INTERMEDIATE',
      },
      activeQuestion,
      input.userAnswerText
    );

    const overall = hireSignalEvaluator.computeOverallHireSignal([starRes, leadRes, techRes]);

    // 2. Generate Conversation Step & Next Question
    const nextStep = conversationEngine.generateNextStep(
      {
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
        persona: session?.persona as any || 'TECHNICAL_LEAD',
        difficulty: 'INTERMEDIATE',
      },
      input.userAnswerText,
      starRes,
      { competency: 'Core Problem Solving', targetDepth: 2, currentDepth: 1, satisfied: false }
    );

    const situationOk = starRes.detectedSignals.includes('Situation Defined');
    const taskOk = starRes.detectedSignals.includes('Task Goal Outlined');
    const actionOk = starRes.detectedSignals.includes('Direct Action Taken');
    const resultOk = starRes.detectedSignals.includes('Outcome & Impact');
    const metricsFound = starRes.detectedSignals.includes('Quantifiable Metrics Found');

    const improvedAnswer = metricsFound
      ? input.userAnswerText.trim()
      : `${input.userAnswerText.trim()} Specifically, this achieved a measurable efficiency gain and improved overall system performance.`;

    // Persist feedback turn to DB
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

    const personaMessage = overall.summaryTip
      ? `Thank you for sharing. ${overall.summaryTip}`
      : "Thank you for explaining your approach clearly.";

    return {
      personaMessage,
      nextQuestion: nextStep.nextQuestion,
      isFollowUp: nextStep.isFollowUp,
      score: overall.overallScore,
      signals: {
        situationOk,
        taskOk,
        actionOk,
        resultOk,
        metricsFound,
      },
      coachingTip: overall.summaryTip,
      improvedAnswer,
    };
  }
}

export const conversationRuntimeService = new ConversationRuntimeService();
