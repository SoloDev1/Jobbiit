import { prisma } from '../config/db';
import { NotFoundError, ForbiddenError } from '../core/errors/domain-error';
import type { CreateSessionInputV3, InterviewPersona, InterviewSourceType, PracticeCategory, CareerStory } from '../types/interview.types';

export interface SaveFeedbackInput {
  sessionId: string;
  questionText: string;
  answerText: string;
  situationOk: boolean;
  taskOk: boolean;
  actionOk: boolean;
  resultOk: boolean;
  metricsFound: boolean;
  score: number;
  coachingTip: string;
  improvedAnswer: string;
}

export interface CreateFlashcardInput {
  userId: string;
  opportunityId?: string;
  question: string;
  expectedAnswer: string;
  commonMistakes: string[];
  strongKeywords: string[];
  previousAnswer?: string;
  improvedAnswer?: string;
}

export class InterviewRepository {
  public async createSession(data: CreateSessionInputV3) {
    return prisma.interviewSession.create({
      data: {
        userId: data.userId,
        sourceType: (data.sourceType as any) || 'OPPORTUNITY',
        opportunityId: data.opportunityId || undefined,
        rawInputText: data.rawInputText || undefined,
        sourceUrl: data.sourceUrl || undefined,
        extractedCompany: data.extractedCompany || undefined,
        extractedRole: data.extractedRole || undefined,
        extractedLevel: data.extractedLevel || undefined,
        practiceCategory: (data.practiceCategory as any) || undefined,
        persona: (data.persona as any) || 'HIRING_MANAGER',
        difficulty: data.difficulty || 'INTERMEDIATE',
        conversationState: (data as any).conversationState || null,
      },
      include: {
        feedbacks: true,
        opportunity: true,
      },
    });
  }

  public async updateSessionState(sessionId: string, state: any) {
    return prisma.interviewSession.update({
      where: { id: sessionId },
      data: {
        conversationState: state,
      },
    });
  }

  public async findSessionById(id: string, userId: string) {
    const session = await prisma.interviewSession.findUnique({
      where: { id },
      include: {
        feedbacks: {
          orderBy: { createdAt: 'asc' },
        },
        opportunity: true,
      },
    });

    if (!session) {
      throw new NotFoundError(`Interview session not found: ${id}`);
    }

    if (session.userId !== userId) {
      throw new ForbiddenError(`Not your session`);
    }

    return session;
  }

  public async saveFeedback(data: SaveFeedbackInput) {
    return prisma.$transaction(async (tx) => {
      const feedback = await tx.interviewFeedback.create({
        data,
      });

      const agg = await tx.interviewFeedback.aggregate({
        where: { sessionId: data.sessionId },
        _avg: { score: true },
      });

      const avgScore = Math.round(agg._avg.score ?? data.score);

      await tx.interviewSession.update({
        where: { id: data.sessionId },
        data: {
          readinessScore: avgScore,
          starScore: avgScore,
        },
      });

      return feedback;
    });
  }

  public async saveUserStory(data: Omit<CareerStory, 'id' | 'createdAt'>) {
    return (prisma as any).userStory.create({
      data: {
        userId: data.userId,
        title: data.title,
        situation: data.situation,
        task: data.task,
        action: data.action,
        result: data.result,
        metrics: data.metrics || [],
        technologies: data.technologies || [],
        tags: data.tags || [],
      },
    });
  }

  public async getUserStories(userId: string) {
    return (prisma as any).userStory.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async saveFlashcard(data: CreateFlashcardInput) {
    return prisma.flashcard.create({
      data,
    });
  }

  public async findFlashcards(userId: string, opportunityId?: string) {
    return prisma.flashcard.findMany({
      where: {
        userId,
        ...(opportunityId ? { opportunityId } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  public async listUserSessions(userId: string) {
    return prisma.interviewSession.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        feedbacks: {
          orderBy: { createdAt: 'asc' },
        },
        opportunity: true,
      },
    });
  }
}

export const interviewRepository = new InterviewRepository();
