import type { Request, Response } from 'express';
import { analyticsEngine } from '../engines/analytics-engine/analytics.engine';
import { sendSuccess, sendError } from '../utils/apiResponse';

export async function getDashboard(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    if (!userId) {
      sendError(res, 'userId is required', 400);
      return;
    }

    const data = await analyticsEngine.getDashboard({ userId });
    sendSuccess(res, data, 'Analytics dashboard fetched successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to fetch analytics dashboard', 500);
  }
}
