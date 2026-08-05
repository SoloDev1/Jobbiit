import { Request, Response } from 'express';
import { InterviewStudioService } from '../services/interview-studio.service';

const parseStringParam = (param: any): string => {
  if (Array.isArray(param)) return param[0] || '';
  return typeof param === 'string' ? param : String(param || '');
};

export async function startInterviewSession(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { category, targetOpportunityText } = req.body;

    if (!category) {
      return res.status(400).json({ success: false, message: 'category is required' });
    }

    const session = await InterviewStudioService.startSession(
      userId,
      parseStringParam(category),
      targetOpportunityText ? parseStringParam(targetOpportunityText) : undefined
    );
    return res.status(201).json({ success: true, data: session });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function respondToInterviewTurn(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const id = parseStringParam(req.params.id);
    const { userResponse } = req.body;

    if (!userResponse) {
      return res.status(400).json({ success: false, message: 'userResponse is required' });
    }

    const result = await InterviewStudioService.respondToSession(
      userId,
      id,
      parseStringParam(userResponse)
    );
    return res.status(200).json({ success: true, data: result });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

export async function getInterviewSession(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const id = parseStringParam(req.params.id);

    const session = await InterviewStudioService.getSession(userId, id);
    return res.status(200).json({ success: true, data: session });
  } catch (error: any) {
    return res.status(404).json({ success: false, message: error.message });
  }
}
