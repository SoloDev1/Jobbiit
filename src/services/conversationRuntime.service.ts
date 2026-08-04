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
   * — Produces a real AI-improved answer
   */
  public async processTurn(input: ProcessTurnInput): Promise<ProcessTurnResult> {
    logger.info({ sessionId: input.sessionId, service: 'ConversationRuntimeService' }, 'Processing conversation turn');

    const session: any = await interviewRepository.findSessionById(input.sessionId).catch(() => null);
    const persona: InterviewPersona = (session?.persona || 'HIRING_MANAGER') as InterviewPersona;

    // Load or initialize conversationState JSON
    let state: any = session?.conversationState;
    if (typeof state === 'string') {
      try { state = JSON.parse(state); } catch { state = null; }
    }
    
    const company = session?.extractedCompany || 'Target Company';
    const role = session?.extractedRole || 'Professional';

    if (!state) {
      state = {
        phase: 'TECHNICAL',
        competency: 'Core Skills',
        currentDepth: 1,
        targetDepth: 2,
        currentQuestion: session?.initialQuestion || `As part of the ${role} interview at ${company}, describe a high-impact initiative you led and the measurable outcome you achieved.`,
        askedQuestions: session?.initialQuestion ? [session.initialQuestion] : [],
        completedCompetencies: [],
        followUpCount: 0,
        objectiveSatisfied: false
      };
    }

    const feedbacks = session?.feedbacks || [];
    const conversationHistory = feedbacks.map((f: any) => ([
      { speaker: 'INTERVIEWER' as const, text: f.questionText },
      { speaker: 'CANDIDATE' as const, text: f.answerText }
    ])).flat();

    const triContext = await contextBuilderService.buildTriModelContext({
      userId: session?.userId || 'user_anon',
      sessionId: input.sessionId,
      sourceType: session?.sourceType || 'OPPORTUNITY',
      opportunityId: session?.opportunityId || undefined,
      companyName: session?.extractedCompany || 'Target Company',
      roleTitle: session?.extractedRole || 'Professional',
      persona,
      conversationHistory,
    });

    const activeQuestion = state.currentQuestion ||
      `As part of the ${role} interview at ${company}, describe a high-impact initiative you led and the measurable outcome you achieved.`;

    // Intent Classification Check
    const text = input.userAnswerText.trim().toLowerCase();
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

    if (intent === 'CLARIFICATION') {
      const explanation = await this.generateClarificationResponse(activeQuestion, input.userAnswerText, persona);
      return {
        personaMessage: explanation,
        nextQuestion: activeQuestion,
        isFollowUp: true,
        score: session?.readinessScore || 70,
        signals: { situationOk: false, taskOk: false, actionOk: false, resultOk: false, metricsFound: false },
        coachingTip: "I explained the question. Please provide a STAR response.",
        strengthSummary: "",
        improvedAnswer: "",
        hireRecommendation: "PENDING",
      };
    }

    if (intent === 'SMALL_TALK' || intent === 'INTRO') {
      const reply = await this.generateNaturalReply(input.userAnswerText, activeQuestion, persona);
      return {
        personaMessage: reply,
        nextQuestion: activeQuestion,
        isFollowUp: false,
        score: session?.readinessScore || 70,
        signals: { situationOk: false, taskOk: false, actionOk: false, resultOk: false, metricsFound: false },
        coachingTip: "Awaiting answer to the question.",
        strengthSummary: "",
        improvedAnswer: "",
        hireRecommendation: "PENDING",
      };
    }

    if (intent === 'END_INTERVIEW') {
      return {
        personaMessage: "Understood. Let's finish the interview here. Generating your executive report now...",
        nextQuestion: "Interview completed.",
        isFollowUp: false,
        score: session?.readinessScore || 70,
        signals: { situationOk: false, taskOk: false, actionOk: false, resultOk: false, metricsFound: false },
        coachingTip: "Interview ended by user.",
        strengthSummary: "",
        improvedAnswer: "",
        hireRecommendation: "PENDING",
      };
    }

    // Build CareerContext for evaluators (including history)
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
      conversationHistory,
    };

    // 1. Run LLM-graded Evaluator Suite in parallel
    const [starRes, leadRes, techRes] = await Promise.all([
      starEvaluator.evaluate(careerContext as any, activeQuestion, input.userAnswerText),
      leadershipEvaluator.evaluate(careerContext as any, activeQuestion, input.userAnswerText),
      technicalEvaluator.evaluate(careerContext as any, activeQuestion, input.userAnswerText),
    ]);

    const overall = hireSignalEvaluator.computeOverallHireSignal([starRes, leadRes, techRes], persona);

    // 2. Generate next question via LLM ConversationEngine
    const nextStep = await conversationEngine.generateNextStep(
      careerContext as any,
      input.userAnswerText,
      starRes,
      state
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

    // 5. Update session conversationState JSON in DB
    const updatedState = {
      ...nextStep.updatedObjective,
      currentQuestion: nextStep.nextQuestion,
    };
    await interviewRepository.updateSessionState(input.sessionId, updatedState);

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

  private async generateClarificationResponse(question: string, query: string, persona: string): Promise<string> {
    try {
      const response = await aiRouter.complete({
        task: 'INTERVIEW_CLARIFY',
        systemPrompt: `You are an interviewer with persona ${persona}. The candidate asked for clarification on the question: "${question}". Explain or clarify the question in a helpful, conversational, and persona-appropriate way. Do not ask a new question, just explain the current one so they can answer it. Keep it to 2-3 sentences.`,
        userPrompt: `Candidate request: "${query}"`,
        jsonMode: false,
      });
      return response.text.trim();
    } catch {
      return `Sure, let me clarify. I'm looking for details on: ${question}`;
    }
  }

  private async generateNaturalReply(query: string, question: string, persona: string): Promise<string> {
    try {
      const response = await aiRouter.complete({
        task: 'INTERVIEW_SMALL_TALK',
        systemPrompt: `You are an interviewer with persona ${persona}. The candidate said: "${query}". Respond naturally in character, then politely prompt them to answer the main question: "${question}". Keep it to 2-3 sentences.`,
        userPrompt: `Candidate: "${query}"`,
        jsonMode: false,
      });
      return response.text.trim();
    } catch {
      return `Thanks. Let's get back to the question: ${question}`;
    }
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
