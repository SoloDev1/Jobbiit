/**
 * OpporHub OS — Workspace V2 Express Controller
 * Exposes resource-oriented Workspace REST endpoints returning complete Workspace DTOs.
 */

import type { Request, Response } from 'express';
import { workspaceEngine } from '../engines/workspace-engine/workspace.engine';
import { sendSuccess, sendError, sendCreated } from '../utils/apiResponse';

export async function createWorkspaceV2(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || req.body.userId;
    const { title, rawOpportunityText } = req.body;

    if (!userId || !title) {
      sendError(res, 'userId and title are required', 400);
      return;
    }

    const workspaceDto = await workspaceEngine.createWorkspace(userId, title, rawOpportunityText);
    sendCreated(res, workspaceDto, 'Workspace created successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to create workspace', 500);
  }
}

export async function getWorkspaceV2(req: Request, res: Response): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const workspaceDto = await workspaceEngine.getWorkspaceDto(workspaceId);
    sendSuccess(res, workspaceDto, 'Workspace retrieved successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Workspace not found', 404);
  }
}

export async function listWorkspacesV2(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    const workspaces = await workspaceEngine.listUserWorkspaces(userId);
    sendSuccess(res, workspaces, 'User workspaces');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to list workspaces', 500);
  }
}

export async function generateWorkspaceDocumentV2(req: Request, res: Response): Promise<void> {
  try {
    const workspaceId = req.params.id as string;
    const { docType, userPrompt, templateId } = req.body;

    const workspaceDto = await workspaceEngine.generateWorkspaceDocument(
      workspaceId,
      docType || 'cv',
      userPrompt || '',
      templateId
    );

    sendSuccess(res, workspaceDto, 'Workspace document generated');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to generate document in workspace', 500);
  }
}
