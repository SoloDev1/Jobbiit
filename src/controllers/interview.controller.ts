import type { Request, Response } from 'express';
import { interviewCoachEngine } from '../engines/interview-engine/interview-coach.engine';
import { jobIntelligenceEngine } from '../engines/interview-engine/job-intelligence.engine';
import { interviewRepository } from '../repositories/interview.repository';
import { interviewRequestFactoryService } from '../services/interviewRequestFactory.service';
import { interviewContextBuilderService } from '../services/contextBuilder.service';
import { interviewPlannerService } from '../services/interviewPlanner.service';
import { competencyGraphService } from '../services/competencyGraph.service';
import { conversationRuntimeService } from '../services/conversationRuntime.service';
import { sendSuccess, sendCreated, sendError } from '../utils/apiResponse';
import { ValidationError, NotFoundError, ForbiddenError } from '../core/errors/domain-error';
import { logger } from '../core/telemetry/logger.service';

function handleError(res: Response, error: any) {
  if (error instanceof ValidationError) {
    sendError(res, error.message, 400);
  } else if (error instanceof ForbiddenError) {
    sendError(res, error.message, 403);
  } else if (error instanceof NotFoundError) {
    sendError(res, error.message, 404);
  } else {
    logger.error({ err: error }, 'Unhandled error in interview controller');
    sendError(res, error.message || 'An internal server error occurred', 500);
  }
}

export async function getBriefing(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const opportunityId = (req.query.opportunityId as string) || (req.params.opportunityId as string);
    const company = req.query.company as string;
    const role = req.query.role as string;

    const briefing = await interviewCoachEngine.getBriefing({
      userId,
      opportunityId,
      company,
      role,
    });
    sendSuccess(res, briefing, 'Interview briefing generated');
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function getPreBriefingPlan(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const opportunityId = req.query.opportunityId as string;
    const company = req.query.company as string;
    const role = req.query.role as string;

    const context = await interviewContextBuilderService.buildContext({
      userId,
      sourceType: opportunityId ? 'OPPORTUNITY' : 'CUSTOM_TEXT',
      opportunityId,
      extractedCompany: company,
      extractedRole: role,
    });

    const plan = await interviewPlannerService.planInterview(context);
    sendSuccess(res, plan, 'Pre-interview preparation plan generated');
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function processTurn(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId, userAnswerText } = req.body;
    if (!sessionId || !userAnswerText) {
      sendError(res, 'sessionId and userAnswerText are required', 400);
      return;
    }

    const userId = req.user!.id;

    const turnResult = await conversationRuntimeService.processTurn({
      sessionId,
      userAnswerText,
      userId,
    });

    sendSuccess(res, turnResult, 'Conversation turn processed');
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function processTurnStream(req: Request, res: Response): Promise<void> {
  const { sessionId, userAnswerText } = req.body;
  if (!sessionId || !userAnswerText) {
    sendError(res, 'sessionId and userAnswerText are required', 400);
    return;
  }

  const userId = req.user!.id;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    let accumulatedText = "";
    let finalDecision: any = undefined;
    const iterator = conversationRuntimeService.streamReply({ sessionId, userAnswerText, userId });

    while (true) {
      const { value, done } = await iterator.next();
      if (done) {
        finalDecision = value;
        break;
      }
      accumulatedText += value;
      res.write(`data: ${JSON.stringify({ delta: value })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();

    conversationRuntimeService.gradeAndPersistTurn(
      { sessionId, userAnswerText, userId },
      accumulatedText,
      finalDecision || undefined
    ).catch((err) => {
      logger.error({ err, sessionId }, 'Background turn grading failed');
    });
  } catch (err: any) {
    logger.error({ err, sessionId }, 'Streamed turn processing failed');
    res.write(`data: ${JSON.stringify({ error: err.message || 'Stream generation failed' })}\n\n`);
    res.end();
  }
}

export async function getCompetencyGraph(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const graph = await competencyGraphService.getCompetencyGraph(userId);
    sendSuccess(res, graph, 'Candidate competency graph loaded');
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function ingestJob(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { sourceType, inputText, jobUrl, emailText, company, role } = req.body;

    const intel = await jobIntelligenceEngine.ingestJob({
      userId,
      sourceType: sourceType || 'CUSTOM_TEXT',
      inputText,
      jobUrl,
      emailText,
      company,
      role,
    });

    sendSuccess(res, intel, 'Job intelligence extracted');
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function createSession(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const input = interviewRequestFactoryService.createInputFromRequest(req.body, userId);

    const session: any = await interviewRepository.createSession(input);

    let initialQuestion = `Welcome to your interview. To start, could you tell me about your background and recent relevant project experience?`;
    try {
      const context = await interviewContextBuilderService.buildContext({
        userId,
        sourceType: input.sourceType,
        opportunityId: input.opportunityId,
        extractedCompany: input.extractedCompany,
        extractedRole: input.extractedRole,
      });

      const companyName = context.jobIntelligence?.companyName || input.extractedCompany;
      const roleTitle = context.jobIntelligence?.roleTitle || input.extractedRole;
      initialQuestion = `Welcome to your interview for ${roleTitle} at ${companyName}. To get started, please tell me about your background and how your key skills align with this position.`;
    } catch (err: any) {}

    session.initialQuestion = initialQuestion;

    const initialState = {
      phase: 'TECHNICAL',
      competency: 'introduction',
      currentDepth: 1,
      targetDepth: 2,
      currentQuestion: initialQuestion,
      askedQuestions: [initialQuestion],
      completedCompetencies: [],
      followUpCount: 0,
      objectiveSatisfied: false
    };

    await interviewRepository.updateSessionState(session.id, initialState);
    session.conversationState = initialState;

    sendCreated(res, session, 'Interview session initialized');
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function evaluateAnswer(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId, questionText, answerText } = req.body;
    if (!sessionId || !questionText || !answerText) {
      sendError(res, 'sessionId, questionText, and answerText are required', 400);
      return;
    }

    const userId = req.user!.id;

    const feedback = await interviewCoachEngine.evaluateAnswer({ sessionId, questionText, answerText, userId });
    sendSuccess(res, feedback, 'STAR feedback evaluated');
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function getUserStories(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const stories = await interviewRepository.getUserStories(userId);
    sendSuccess(res, stories, 'Candidate stories retrieved');
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function getFlashcards(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const opportunityId = req.query.opportunityId as string;

    const cards = await interviewRepository.findFlashcards(userId, opportunityId);
    sendSuccess(res, cards, 'Personalized flashcards loaded');
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function getSessionReport(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = req.params.sessionId as string;
    if (!sessionId) {
      sendError(res, 'sessionId is required', 400);
      return;
    }

    const userId = req.user!.id;
    const session = await interviewRepository.findSessionById(sessionId, userId);

    const feedbacks = session.feedbacks || [];
    const totalTurns = feedbacks.length;

    const situationOkCount = feedbacks.filter((f: any) => f.situationOk).length;
    const taskOkCount = feedbacks.filter((f: any) => f.taskOk).length;
    const actionOkCount = feedbacks.filter((f: any) => f.actionOk).length;
    const resultOkCount = feedbacks.filter((f: any) => f.resultOk).length;
    const metricsFoundCount = feedbacks.filter((f: any) => f.metricsFound).length;

    const overallScore = session.readinessScore || session.starScore || 70;

    const report = {
      sessionId: session.id,
      overallScore,
      totalTurns,
      situationOk: totalTurns ? (situationOkCount / totalTurns) >= 0.5 : false,
      taskOk: totalTurns ? (taskOkCount / totalTurns) >= 0.5 : false,
      actionOk: totalTurns ? (actionOkCount / totalTurns) >= 0.5 : false,
      resultOk: totalTurns ? (resultOkCount / totalTurns) >= 0.5 : false,
      metricsFound: totalTurns ? (metricsFoundCount / totalTurns) >= 0.5 : false,
      situationOkCount,
      taskOkCount,
      actionOkCount,
      resultOkCount,
      metricsFoundCount,
    };

    sendSuccess(res, report, 'Interview report compiled');
  } catch (error: any) {
    handleError(res, error);
  }
}

export async function getSession(req: Request, res: Response): Promise<void> {
  try {
    const sessionId = req.params.sessionId as string;
    const userId = req.user!.id;
    const session = await interviewRepository.findSessionById(sessionId, userId);
    sendSuccess(res, session, 'Interview session retrieved successfully');
  } catch (error: any) {
    handleError(res, error);
  }
}
