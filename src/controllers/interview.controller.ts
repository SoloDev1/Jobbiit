import type { Request, Response } from 'express';
import { interviewCoachEngine } from '../engines/interview-engine/interview-coach.engine';
import { interviewRepository } from '../repositories/interview.repository';
import { sendSuccess, sendCreated, sendError } from '../utils/apiResponse';

export async function getBriefing(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    const opportunityId = (req.query.opportunityId as string) || (req.params.opportunityId as string);

    if (!userId || !opportunityId) {
      sendError(res, 'userId and opportunityId are required', 400);
      return;
    }

    const briefing = await interviewCoachEngine.getBriefing({ userId, opportunityId });
    sendSuccess(res, briefing, 'Interview briefing generated');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to generate briefing', 500);
  }
}

export async function createSession(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || req.body.userId;
    const { opportunityId, persona, difficulty } = req.body;

    const session = await interviewRepository.createSession({
      userId,
      opportunityId,
      persona: persona || 'HIRING_MANAGER',
      difficulty: difficulty || 'INTERMEDIATE',
    });

    sendCreated(res, session, 'Interview session initialized');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to create session', 500);
  }
}

export async function evaluateAnswer(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId, questionText, answerText } = req.body;
    if (!sessionId || !questionText || !answerText) {
      sendError(res, 'sessionId, questionText, and answerText are required', 400);
      return;
    }

    const feedback = await interviewCoachEngine.evaluateAnswer({ sessionId, questionText, answerText });
    sendSuccess(res, feedback, 'STAR feedback evaluated');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to evaluate answer', 500);
  }
}

export async function getFlashcards(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    const opportunityId = req.query.opportunityId as string;

    const cards = await interviewRepository.findFlashcards(userId, opportunityId);
    sendSuccess(res, cards, 'Personalized flashcards loaded');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch flashcards', 500);
  }
}
