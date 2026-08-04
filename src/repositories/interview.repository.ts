import { prisma } from '../config/db';
import { NotFoundError } from '../core/errors/domain-error';
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

  public async findSessionById(id: string) {
    const session = await prisma.interviewSession.findUnique({
      where: { id },
      include: {
        feedbacks: true,
        opportunity: true,
      },
    });

    if (!session) {
      throw new NotFoundError(`Interview session not found: ${id}`);
    }

    return session;
  }

  public async saveFeedback(data: SaveFeedbackInput) {
    const feedback = await prisma.interviewFeedback.create({
      data,
    });

    // Update overall session readiness and STAR score
    const feedbacks = await prisma.interviewFeedback.findMany({
      where: { sessionId: data.sessionId },
    });

    const avgScore = Math.round(
      feedbacks.reduce((acc: number, curr: { score: number }) => acc + curr.score, 0) / (feedbacks.length || 1)
    );

    await prisma.interviewSession.update({
      where: { id: data.sessionId },
      data: {
        readinessScore: avgScore,
        starScore: avgScore,
      },
    });

    return feedback;
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
        feedbacks: true,
        opportunity: true,
      },
    });
  }
}

export const interviewRepository = new InterviewRepository();
