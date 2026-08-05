import { contextBuilderService } from './contextBuilder.service';
import { conversationEngine } from '../engines/interview-engine/conversation.engine';
import { interviewRepository } from '../repositories/interview.repository';
import { aiRouter } from './aiRouter.service';
import { PromptLibrary } from './promptLibrary.service';
import { logger } from '../core/telemetry/logger.service';
import { ForbiddenError, NotFoundError } from '../core/errors/domain-error';
import { routerEngine, RouterDecision } from '../engines/interview-engine/router.engine';
import { unifiedEvaluator } from '../engines/interview-engine/evaluators/unified.evaluator';
import type { InterviewPersona } from '../engines/interview-engine/evaluators/hire-signal.evaluator';

export interface ProcessTurnInput {
  sessionId: string;
  userAnswerText: string;
  userId: string;
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
   * Fast Path: Streams the interviewer persona response and next question back to the client immediately.
   * Emits chunks of the generated response.
   */
  public async *streamReply(input: ProcessTurnInput): AsyncGenerator<string, RouterDecision | null> {
    logger.info({ sessionId: input.sessionId, userId: input.userId, service: 'ConversationRuntimeService' }, 'Streaming conversation turn reply');

    const session = await interviewRepository.findSessionById(input.sessionId, input.userId);
    const persona: InterviewPersona = (session.persona || 'HIRING_MANAGER') as InterviewPersona;

    let state: any = session.conversationState;
    if (typeof state === 'string') {
      try { state = JSON.parse(state); } catch { state = null; }
    }

    const company = session.extractedCompany || 'Target Company';
    const role = session.extractedRole || 'Professional';

    if (!state) {
      state = {
        phase: 'TECHNICAL',
        competency: 'introduction',
        currentDepth: 1,
        targetDepth: 2,
        currentQuestion: (session as any).initialQuestion || `As part of the ${role} interview at ${company}, describe your background.`,
        askedQuestions: (session as any).initialQuestion ? [(session as any).initialQuestion] : [],
        completedCompetencies: [],
        followUpCount: 0,
        objectiveSatisfied: false,
        consecutiveDeflections: 0
      };
    }

    if (state.consecutiveDeflections === undefined) {
      state.consecutiveDeflections = 0;
    }

    const activeQuestion = state.currentQuestion || `As part of the ${role} interview at ${company}, describe your background.`;

    // ─── V2 Router + Responder Pattern (Feature Flag) ──────────────────────────
    if (process.env.INTERVIEW_ROUTER_V2 === 'true') {
      const feedbacks = session.feedbacks || [];
      const historyText = feedbacks.map((f: any) => `Interviewer: ${f.questionText}\nCandidate: ${f.answerText}`).join('\n\n');

      // 1. Router classification
      const decision = await routerEngine.route({
        currentQuestion: activeQuestion,
        candidateMessage: input.userAnswerText,
        recentHistory: historyText
      });

      // 2. Responder streamed response generator
      const prompt = PromptLibrary.RESPOND_IN_CHARACTER_v1;
      const instruction = prompt.instructionFor(decision.intent, activeQuestion, activeQuestion, state.consecutiveDeflections);
      const systemPrompt = prompt.systemPrompt;
      const userPrompt = prompt.buildUserPrompt(
        persona,
        session.extractedRole || 'Interviewer',
        company,
        role,
        historyText,
        input.userAnswerText,
        instruction
      );

      for await (const chunk of aiRouter.stream({ task: 'INTERVIEW_RESPOND', systemPrompt, userPrompt })) {
        yield chunk;
      }

      return decision;
    }

    // ─── V1 Fallback Pattern ──────────────────────────────────────────────────
    const text = input.userAnswerText.trim().toLowerCase();
    
    // Intent Classification (Fast Regex pre-filter)
    let intent: 'INTRO' | 'CLARIFICATION' | 'SMALL_TALK' | 'ANSWER' | 'END_INTERVIEW' = 'ANSWER';

    if (/^(hello|hi|hey|greetings|good morning|good afternoon)/i.test(text) && text.split(/\s+/).length < 4) {
      intent = 'INTRO';
    } else if (/^(stop|end|exit|quit|finish)/i.test(text) && text.split(/\s+/).length < 4) {
      intent = 'END_INTERVIEW';
    } else if (
      /explain|clarify|what do you mean|don't understand|not sure what you|could you repeat|can you repeat/i.test(text) ||
      (text.split(/\s+/).length < 5 && /explain|clarify|repeat|help/i.test(text))
    ) {
      intent = 'CLARIFICATION';
    } else if (/^(thanks|thank you|nice to meet you|glad to be here|my pleasure)/i.test(text) && text.split(/\s+/).length < 6) {
      intent = 'SMALL_TALK';
    }

    if (intent === 'END_INTERVIEW') {
      yield "Understood. Let's finish the interview here. Generating your executive report now...";
      return null;
    }

    if (intent === 'CLARIFICATION') {
      const systemPrompt = `You are an interviewer with persona ${persona}. The candidate asked for clarification on the question: "${activeQuestion}". Explain or clarify the question in a helpful, conversational, and persona-appropriate way. Do not ask a new question. Keep it to 2-3 sentences.`;
      const userPrompt = `Candidate request: "${input.userAnswerText}"`;
      for await (const chunk of aiRouter.stream({ task: 'INTERVIEW_CLARIFY', systemPrompt, userPrompt })) {
        yield chunk;
      }
      return null;
    }

    if (intent === 'SMALL_TALK' || intent === 'INTRO') {
      const systemPrompt = `You are an interviewer with persona ${persona}. The candidate said: "${input.userAnswerText}". Respond naturally in character, then politely prompt them to answer the main question: "${activeQuestion}". Keep it to 2-3 sentences.`;
      const userPrompt = `Candidate: "${input.userAnswerText}"`;
      for await (const chunk of aiRouter.stream({ task: 'INTERVIEW_SMALL_TALK', systemPrompt, userPrompt })) {
        yield chunk;
      }
      return null;
    }

    const feedbacks = session.feedbacks || [];
    const historyText = feedbacks.map((f: any) => `Interviewer: ${f.questionText}\nCandidate: ${f.answerText}`).join('\n\n');

    const systemPrompt = PromptLibrary.INTERVIEW_STREAM_REPLY_v1.systemPrompt;
    const userPrompt = PromptLibrary.INTERVIEW_STREAM_REPLY_v1.buildUserPrompt(
      persona,
      session.extractedRole || 'Interviewer',
      company,
      role,
      historyText,
      input.userAnswerText
    );

    for await (const chunk of aiRouter.stream({ task: 'INTERVIEW_STREAM_REPLY', systemPrompt, userPrompt })) {
      yield chunk;
    }
    return null;
  }

  /**
   * Background Path: Runs unified evaluation and persists turn feedback asynchronously.
   * Does not block user-facing next-question streaming.
   */
  public async gradeAndPersistTurn(input: ProcessTurnInput, streamedResponse: string, decisionInput?: RouterDecision): Promise<any> {
    logger.info({ sessionId: input.sessionId, service: 'ConversationRuntimeService' }, 'Background grading and feedback persistence started');

    try {
      const session = await interviewRepository.findSessionById(input.sessionId, input.userId);
      const persona = session.persona || 'HIRING_MANAGER';

      let state: any = session.conversationState;
      if (typeof state === 'string') {
        try { state = JSON.parse(state); } catch { state = null; }
      }

      const company = session.extractedCompany || 'Target Company';
      const role = session.extractedRole || 'Professional';

      if (!state) {
        state = {
          phase: 'TECHNICAL',
          competency: 'introduction',
          currentDepth: 1,
          targetDepth: 2,
          currentQuestion: (session as any).initialQuestion || `As part of the ${role} interview at ${company}, describe your background.`,
          askedQuestions: (session as any).initialQuestion ? [(session as any).initialQuestion] : [],
          completedCompetencies: [],
          followUpCount: 0,
          objectiveSatisfied: false,
          consecutiveDeflections: 0
        };
      }

      if (state.consecutiveDeflections === undefined) {
        state.consecutiveDeflections = 0;
      }

      const activeQuestion = state.currentQuestion || `As part of the ${role} interview at ${company}, describe your background.`;

      // ─── V2 Path ────────────────────────────────────────────────────────────
      if (process.env.INTERVIEW_ROUTER_V2 === 'true') {
        let decision = decisionInput;
        if (!decision) {
          const feedbacks = session.feedbacks || [];
          const historyText = feedbacks.map((f: any) => `Interviewer: ${f.questionText}\nCandidate: ${f.answerText}`).join('\n\n');
          decision = await routerEngine.route({
            currentQuestion: activeQuestion,
            candidateMessage: input.userAnswerText,
            recentHistory: historyText
          });
        }

        // Update consecutive deflection metrics
        if (decision.intent === 'ANSWER' && decision.isSufficientAnswer) {
          state.consecutiveDeflections = 0;
        } else {
          state.consecutiveDeflections += 1;
        }

        let feedback: any;
        let updatedState: any;

        if (decision.intent === 'ANSWER' && decision.isSufficientAnswer) {
          // Guardrail state mutation assertion:
          if (!decision.shouldAdvanceQuestion) {
            throw new Error('State Guardrail Violation: shouldAdvanceQuestion must be true for sufficient answers');
          }

          // Evaluate turn using unified evaluator out-of-band
          feedback = await unifiedEvaluator.evaluateAndSave({
            sessionId: input.sessionId,
            userId: input.userId,
            questionText: activeQuestion,
            answerText: input.userAnswerText,
            company,
            role
          });

          // State Machine Progression: Call generateNextStep
          const triContext = await contextBuilderService.buildTriModelContext({
            userId: input.userId,
            sessionId: input.sessionId,
            sourceType: session.sourceType,
            opportunityId: session.opportunityId || undefined,
            companyName: company,
            roleTitle: role,
            persona,
          });

          const nextStep = await conversationEngine.generateNextStep(
            triContext as any,
            input.userAnswerText,
            { detectedSignals: [] } as any,
            state
          );

          updatedState = {
            ...nextStep.updatedObjective,
            currentQuestion: streamedResponse,
            askedQuestions: [...(state.askedQuestions || []), streamedResponse],
            consecutiveDeflections: state.consecutiveDeflections
          };
        } else {
          // Non-ANSWER or insufficient ANSWER: Guardrail state mutation assertion
          if (decision.shouldAdvanceQuestion) {
            throw new Error('State Guardrail Violation: shouldAdvanceQuestion cannot be true for non-ANSWER/insufficient paths');
          }

          // Log minimal skipped feedback record
          feedback = await interviewRepository.saveFeedback({
            sessionId: input.sessionId,
            questionText: activeQuestion,
            answerText: input.userAnswerText,
            situationOk: false,
            taskOk: false,
            actionOk: false,
            resultOk: false,
            metricsFound: false,
            score: session.readinessScore || 70,
            coachingTip: decision.intent === 'CLARIFY_REQUEST' ? 'Clarification requested.' : 'Small talk or deflection.',
            improvedAnswer: '',
          });

          // Structurally guarantee no state mutations to competency/depth/phase
          updatedState = {
            ...state,
            currentQuestion: streamedResponse,
            askedQuestions: [...(state.askedQuestions || []), streamedResponse],
            consecutiveDeflections: state.consecutiveDeflections
          };
        }

        await interviewRepository.updateSessionState(input.sessionId, updatedState);
        return feedback;
      }

      // ─── V1 Path ────────────────────────────────────────────────────────────
      const text = input.userAnswerText.trim().toLowerCase();

      // Detect Intent
      let intent: 'INTRO' | 'CLARIFICATION' | 'SMALL_TALK' | 'ANSWER' | 'END_INTERVIEW' = 'ANSWER';
      if (/^(hello|hi|hey|greetings|good morning|good afternoon)/i.test(text) && text.split(/\s+/).length < 4) {
        intent = 'INTRO';
      } else if (/^(stop|end|exit|quit|finish)/i.test(text) && text.split(/\s+/).length < 4) {
        intent = 'END_INTERVIEW';
      } else if (
        /explain|clarify|what do you mean|don't understand|not sure what you|could you repeat|can you repeat/i.test(text) ||
        (text.split(/\s+/).length < 5 && /explain|clarify|repeat|help/i.test(text))
      ) {
        intent = 'CLARIFICATION';
      } else if (/^(thanks|thank you|nice to meet you|glad to be here|my pleasure)/i.test(text) && text.split(/\s+/).length < 6) {
        intent = 'SMALL_TALK';
      }

      if (intent !== 'ANSWER') {
        const feedback = await interviewRepository.saveFeedback({
          sessionId: input.sessionId,
          questionText: activeQuestion,
          answerText: input.userAnswerText,
          situationOk: false,
          taskOk: false,
          actionOk: false,
          resultOk: false,
          metricsFound: false,
          score: session.readinessScore || 70,
          coachingTip: intent === 'CLARIFICATION' ? 'Explanations provided.' : 'Small talk / greeting.',
          improvedAnswer: '',
        });

        if (intent === 'END_INTERVIEW') {
          const updatedState = { ...state, currentQuestion: 'Interview completed.' };
          await interviewRepository.updateSessionState(input.sessionId, updatedState);
        }
        return feedback;
      }

      const feedbacks = session.feedbacks || [];
      const historyText = feedbacks.map((f: any) => `Interviewer: ${f.questionText}\nCandidate: ${f.answerText}`).join('\n\n');

      const response = await aiRouter.complete({
        task: 'ANSWER_EVALUATE_UNIFIED',
        systemPrompt: PromptLibrary.EVAL_UNIFIED_v1.systemPrompt,
        userPrompt: PromptLibrary.EVAL_UNIFIED_v1.buildUserPrompt(activeQuestion, input.userAnswerText, historyText),
        jsonMode: true,
      });

      const evalResult = aiRouter.parseJSON<any>(response);

      const situationOk = evalResult.star?.situationOk || false;
      const taskOk = evalResult.star?.taskOk || false;
      const actionOk = evalResult.star?.actionOk || false;
      const resultOk = evalResult.star?.resultOk || false;
      const metricsFound = evalResult.star?.metricsFound || false;
      const overallScore = evalResult.overallScore || 70;
      const coachingTip = evalResult.coachingTip || 'Refine your STAR response.';
      const improvedAnswer = evalResult.improvedAnswer || input.userAnswerText;

      const feedback = await interviewRepository.saveFeedback({
        sessionId: input.sessionId,
        questionText: activeQuestion,
        answerText: input.userAnswerText,
        situationOk,
        taskOk,
        actionOk,
        resultOk,
        metricsFound,
        score: overallScore,
        coachingTip,
        improvedAnswer,
      });

      const triContext = await contextBuilderService.buildTriModelContext({
        userId: input.userId,
        sessionId: input.sessionId,
        sourceType: session.sourceType,
        opportunityId: session.opportunityId || undefined,
        companyName: company,
        roleTitle: role,
        persona,
      });

      const nextStep = await conversationEngine.generateNextStep(
        triContext as any,
        input.userAnswerText,
        { detectedSignals: [] } as any,
        state
      );

      const updatedState = {
        ...nextStep.updatedObjective,
        currentQuestion: streamedResponse,
        askedQuestions: [...(state.askedQuestions || []), streamedResponse],
      };

      await interviewRepository.updateSessionState(input.sessionId, updatedState);

      logger.info({ sessionId: input.sessionId }, 'Background turn grading successfully completed');
      return feedback;
    } catch (err: any) {
      logger.error({ err, sessionId: input.sessionId }, 'Error in background grading task');
      throw err;
    }
  }

  /**
   * Backward compatible turn processor (non-streaming).
   */
  public async processTurn(input: ProcessTurnInput): Promise<ProcessTurnResult> {
    logger.info({ sessionId: input.sessionId, service: 'ConversationRuntimeService' }, 'Processing standard non-streamed turn');

    let reply = '';
    let finalDecision: RouterDecision | null = null;

    const iterator = this.streamReply(input);
    while (true) {
      const { value, done } = await iterator.next();
      if (done) {
        finalDecision = value;
        break;
      }
      reply += value;
    }

    const feedback = await this.gradeAndPersistTurn(input, reply, finalDecision || undefined);

    return {
      personaMessage: reply,
      nextQuestion: reply,
      isFollowUp: false,
      score: feedback.score,
      signals: {
        situationOk: feedback.situationOk,
        taskOk: feedback.taskOk,
        actionOk: feedback.actionOk,
        resultOk: feedback.resultOk,
        metricsFound: feedback.metricsFound,
      },
      coachingTip: feedback.coachingTip,
      strengthSummary: '',
      improvedAnswer: feedback.improvedAnswer,
      hireRecommendation: 'PENDING',
    };
  }
}

export const conversationRuntimeService = new ConversationRuntimeService();
