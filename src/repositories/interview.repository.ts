import { prisma } from '../config/db';
import { NotFoundError } from '../core/errors/domain-error';

export type InterviewPersona = 'FRIENDLY_HR' | 'HIRING_MANAGER' | 'TECHNICAL_LEAD' | 'FAANG_INTERVIEWER' | 'CEO_FOUNDER';

export interface CreateSessionInput {
  userId: string;
  opportunityId?: string;
  persona: InterviewPersona;
  difficulty?: string;
}

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
  public async createSession(data: CreateSessionInput) {
    return prisma.interviewSession.create({
      data: {
        userId: data.userId,
        opportunityId: data.opportunityId || undefined,
        persona: data.persona,
        difficulty: data.difficulty || 'INTERMEDIATE',
      },
      include: {
        feedbacks: true,
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
