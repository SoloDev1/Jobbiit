import type { Request, Response } from 'express';
import { interviewCoachEngine } from '../engines/interview-engine/interview-coach.engine';
import { jobIntelligenceEngine } from '../engines/interview-engine/job-intelligence.engine';
import { interviewRepository } from '../repositories/interview.repository';
import { interviewRequestFactoryService } from '../services/interviewRequestFactory.service';
import { interviewContextBuilderService } from '../services/interviewContextBuilder.service';
import { interviewPlannerService } from '../services/interviewPlanner.service';
import { competencyGraphService } from '../services/competencyGraph.service';
import { conversationRuntimeService } from '../services/conversationRuntime.service';
import { sendSuccess, sendCreated, sendError } from '../utils/apiResponse';

export async function getBriefing(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.query.userId as string);
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
    sendError(res, error.message || 'Failed to generate briefing', 500);
  }
}

export async function getPreBriefingPlan(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    const opportunityId = req.query.opportunityId as string;
    const company = (req.query.company as string) || 'Stripe';
    const role = (req.query.role as string) || 'Senior Backend Engineer';

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
    sendError(res, error.message || 'Failed to generate pre-interview plan', 500);
  }
}

export async function processTurn(req: Request, res: Response): Promise<void> {
  try {
    const { sessionId, userAnswerText } = req.body;
    if (!sessionId || !userAnswerText) {
      sendError(res, 'sessionId and userAnswerText are required', 400);
      return;
    }

    const turnResult = await conversationRuntimeService.processTurn({
      sessionId,
      userAnswerText,
    });

    sendSuccess(res, turnResult, 'Conversation turn processed');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to process turn', 500);
  }
}

export async function getCompetencyGraph(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    if (!userId) {
      sendError(res, 'userId is required', 400);
      return;
    }

    const graph = await competencyGraphService.getCompetencyGraph(userId);
    sendSuccess(res, graph, 'Candidate competency graph loaded');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch competency graph', 500);
  }
}

export async function ingestJob(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || req.body.userId;
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
    sendError(res, error.message || 'Failed to ingest job', 500);
  }
}

export async function createSession(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || req.body.userId;
    const input = interviewRequestFactoryService.createInputFromRequest(req.body, userId);

    const session = await interviewRepository.createSession(input);

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

export async function getUserStories(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    if (!userId) {
      sendError(res, 'userId is required', 400);
      return;
    }

    const stories = await interviewRepository.getUserStories(userId);
    sendSuccess(res, stories, 'Candidate stories retrieved');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch stories', 500);
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
