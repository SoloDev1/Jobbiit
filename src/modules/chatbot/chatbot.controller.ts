import type { Request, Response } from 'express';
import { prisma } from '../../config/db';
import { logger } from '../../config/logger';
import { sendCreated, sendError, sendSuccess } from '../../utils/apiResponse';
import { handleChatbotTurn } from './chatbot.service';
import xss from 'xss';
import { z } from 'zod';

const createSessionSchema = z.object({
  mode: z.enum([
    'GENERAL',
    'CV_REVIEW',
    'COVER_LETTER',
    'INTERVIEW_COACH',
    'CAREER_ADVISER',
    'SKILLS_GAP',
    'OPPORTUNITY_INTEL',
    'JOB_MATCHER',
    'SCHOLARSHIP_FINDER',
    'GRANT_FINDER',
    'VISA_ADVISER',
    'MENTORSHIP_RECOMMENDATION'
  ] as const).optional(),
});

const sendMessageSchema = z.object({
  sessionId: z.string().uuid(),
  message: z.string().min(1, 'Message cannot be empty'),
});

export async function createOrGetSession(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const validation = createSessionSchema.safeParse(req.body);

  if (!validation.success) {
    sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', validation.error.flatten().fieldErrors);
    return;
  }

  const { mode = 'GENERAL' } = req.body;

  try {
    // Try to find an existing active session for this mode, or create a new one
    let session = await prisma.chatSession.findFirst({
      where: { userId, mode },
      orderBy: { updatedAt: 'desc' },
    });

    if (!session) {
      session = await prisma.chatSession.create({
        data: {
          userId,
          mode,
        },
      });
    }

    sendSuccess(res, session, 'Chat session retrieved successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to create/get chat session');
    sendError(res, 'Failed to initialize session', 500, 'INTERNAL_SERVER_ERROR');
  }
}

export async function getSessionHistory(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const sessionId = req.params.sessionId as string;

  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!session) {
      sendError(res, 'Chat session not found', 404, 'NOT_FOUND');
      return;
    }

    if (session.userId !== userId) {
      sendError(res, 'Unauthorized to view this session', 403, 'FORBIDDEN');
      return;
    }

    sendSuccess(res, (session as any).messages, 'Chat history retrieved');
  } catch (error) {
    logger.error({ error, sessionId }, 'Failed to retrieve chat history');
    sendError(res, 'Failed to retrieve history', 500, 'INTERNAL_SERVER_ERROR');
  }
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const validation = sendMessageSchema.safeParse(req.body);

  if (!validation.success) {
    sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', validation.error.flatten().fieldErrors);
    return;
  }

  const { sessionId, message } = req.body;
  const sanitizedMessage = xss(message);

  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      sendError(res, 'Chat session not found', 404, 'NOT_FOUND');
      return;
    }

    if (session.userId !== userId) {
      sendError(res, 'Unauthorized to post to this session', 403, 'FORBIDDEN');
      return;
    }

    // Process turn asynchronously using AI agent matching logic
    const botResponse = await handleChatbotTurn(userId, session, sanitizedMessage);

    sendSuccess(res, {
      response: botResponse,
      mode: session.mode,
    }, 'Response generated successfully');

  } catch (error: any) {
    logger.error({ error, sessionId }, 'Error in chatbot turn processing');
    sendError(res, error.message || 'Failed to process message', 500, 'INTERNAL_SERVER_ERROR');
  }
}

export async function listUserSessions(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  try {
    const sessions = await prisma.chatSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });
    sendSuccess(res, sessions, 'Chat sessions retrieved successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to list chat sessions');
    sendError(res, 'Failed to list sessions', 500, 'INTERNAL_SERVER_ERROR');
  }
}

