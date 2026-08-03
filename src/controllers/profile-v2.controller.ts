/**
 * OpporHub OS — Profile V2 Express Controller
 * Delegates HTTP requests to ManageProfileHandler.
 */

import type { Request, Response } from 'express';
import { manageProfileHandler } from '../use-cases/manage-profile/manage-profile.handler';
import { sendSuccess, sendError } from '../utils/apiResponse';

export async function getProfileV2(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    if (!userId) {
      sendError(res, 'User ID is required', 400);
      return;
    }

    const profile = await manageProfileHandler.execute({
      id: `cmd-${Date.now()}`,
      type: 'profile.get',
      timestamp: new Date(),
      payload: { userId, action: 'get' },
    });

    sendSuccess(res, profile, 'Profile memory retrieved successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to retrieve profile', error.statusCode || 500);
  }
}
