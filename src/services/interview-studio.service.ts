import OpenAI from 'openai';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { buildInterviewPracticePrompt } from './prompts';

const getOpenAIClient = (): OpenAI | null => {
  if (process.env.NODE_ENV === 'test' || !env.OPENAI_API_KEY || env.OPENAI_API_KEY === 'dummy-key' || env.OPENAI_API_KEY === 'mock-key') {
    return null;
  }
  try {
    return new OpenAI({ apiKey: env.OPENAI_API_KEY });
  } catch {
    return null;
  }
};

export class InterviewStudioService {
  /**
   * Starts a new Interview Session
   */
  static async startSession(
    userId: string,
    category: string,
    targetOpportunityText?: string,
    persona: string = 'HIRING_MANAGER',
    difficulty: string = 'INTERMEDIATE'
  ) {
    const { systemPrompt, userPrompt } = buildInterviewPracticePrompt({
      category,
      persona,
      difficulty,
      targetOpportunityText,
      history: [],
    });

    let firstQuestion = `Welcome to your ${category} practice session! To get started, please introduce yourself and outline your background.`;

    const client = getOpenAIClient();
    if (client) {
      try {
        const completion = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        });

        const rawContent = completion.choices[0]?.message?.content || '{}';
        const parsed = JSON.parse(rawContent);
        if (parsed.nextQuestion) {
          firstQuestion = parsed.nextQuestion;
        }
      } catch (err) {
        // Fallback to default introductory question
      }
    }

    const initialHistory = [{ role: 'assistant', content: firstQuestion }];

    const session = await prisma.studioInterviewSession.create({
      data: {
        userId,
        category,
        targetOpportunityText: targetOpportunityText || null,
        history: initialHistory as any,
      },
    });

    return {
      ...session,
      persona,
      difficulty,
    };
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

    let parsed: any = null;
    let promptTokens = 0;
    let completionTokens = 0;

    const client = getOpenAIClient();
    if (client) {
      try {
        const completion = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.7,
        });

        promptTokens = completion.usage?.prompt_tokens || 0;
        completionTokens = completion.usage?.completion_tokens || 0;
        const rawContent = completion.choices[0]?.message?.content || '{}';
        parsed = JSON.parse(rawContent);
      } catch {
        parsed = null;
      }
    }

    if (!parsed) {
      parsed = {
        feedback: {
          scoreHint: '80/100',
          starSignals: { situationOk: true, actionOk: true, resultOk: true, metricsFound: false },
          strengths: ['Clear structure and good overview of experience'],
          areasToImprove: ['Quantify your impact with numerical metrics (e.g. latency, %, revenues)'],
          suggestedAnswer: 'Briefly mention the scale of your project and quantitative outcomes to demonstrate maximum impact.',
        },
        nextQuestion: 'Can you describe a challenging technical or team situation you resolved recently?',
      };
    }

    const durationMs = Date.now() - startTime;
    const feedback = parsed.feedback || {
      scoreHint: '75/100',
      starSignals: { situationOk: true, actionOk: true, resultOk: false, metricsFound: false },
      strengths: ['Good communication'],
      areasToImprove: ['Elaborate on specific personal actions'],
      suggestedAnswer: 'Highlight your specific role and contributions.',
    };
    const nextQuestion = parsed.nextQuestion || 'Could you walk me through another key project from your career?';

    const finalHistory = [
      ...updatedHistory,
      { role: 'assistant', content: nextQuestion, feedback },
    ];

    const updatedSession = await prisma.studioInterviewSession.update({
      where: { id: sessionId },
      data: { history: finalHistory as any },
    });

    // Telemetry log (ignore failure in tests/environments without table)
    try {
      await prisma.aiGenerationLog.create({
        data: {
          userId,
          action: 'INTERVIEW_TURN',
          promptTokens,
          completionTokens,
          durationMs,
          status: 'SUCCESS',
        },
      });
    } catch {
      // Telemetry log error ignored
    }

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

