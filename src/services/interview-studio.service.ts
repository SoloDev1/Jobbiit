import OpenAI from 'openai';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { buildInterviewPracticePrompt } from './prompts';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export class InterviewStudioService {
  /**
   * Starts a new Interview Session
   */
  static async startSession(
    userId: string,
    category: string,
    targetOpportunityText?: string
  ) {
    const { systemPrompt, userPrompt } = buildInterviewPracticePrompt({
      category,
      targetOpportunityText,
      history: [],
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = { nextQuestion: `Welcome to your ${category} practice session! Tell me about yourself and your background.` };
    }

    const firstQuestion = parsed.nextQuestion || `Tell me about your experience related to ${category}.`;
    const initialHistory = [{ role: 'assistant', content: firstQuestion }];

    const session = await prisma.studioInterviewSession.create({
      data: {
        userId,
        category,
        targetOpportunityText: targetOpportunityText || null,
        history: initialHistory as any,
      },
    });

    return session;
  }

  /**
   * Responds to an existing Interview Session turn
   */
  static async respondToSession(
    userId: string,
    sessionId: string,
    userResponse: string
  ) {
    const session = await prisma.studioInterviewSession.findFirst({
      where: { id: sessionId, userId },
    });

    if (!session) throw new Error('Interview session not found');

    const history = (session.history as any[]) || [];
    const updatedHistory = [...history, { role: 'user', content: userResponse }];

    const startTime = Date.now();
    const { systemPrompt, userPrompt } = buildInterviewPracticePrompt({
      category: session.category,
      targetOpportunityText: session.targetOpportunityText || undefined,
      history: updatedHistory,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    });

    const durationMs = Date.now() - startTime;
    const rawContent = completion.choices[0]?.message?.content || '{}';
    let parsed: any = {};
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = {
        feedback: { strengths: ['Clear communication'], areasToImprove: ['Add specific metrics'], scoreHint: '7/10' },
        nextQuestion: 'Can you describe a challenging situation you handled in a project?',
      };
    }

    const feedback = parsed.feedback || null;
    const nextQuestion = parsed.nextQuestion || 'What is your greatest strength?';

    const finalHistory = [
      ...updatedHistory,
      { role: 'assistant', content: nextQuestion, feedback },
    ];

    const updatedSession = await prisma.studioInterviewSession.update({
      where: { id: sessionId },
      data: { history: finalHistory as any },
    });

    // Telemetry log
    await prisma.aiGenerationLog.create({
      data: {
        userId,
        action: 'INTERVIEW_TURN',
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        durationMs,
        status: 'SUCCESS',
      },
    });

    return {
      session: updatedSession,
      feedback,
      nextQuestion,
    };
  }

  /**
   * Returns a user's interview session history
   */
  static async getSession(userId: string, sessionId: string) {
    const session = await prisma.studioInterviewSession.findFirst({
      where: { id: sessionId, userId },
    });
    if (!session) throw new Error('Interview session not found');
    return session;
  }
}
