/**
 * OpporHub OS — Resource-Oriented Document V2 Express Controller
 * Supports creation, tailoring, section editing, instant template switching, and export.
 */

import type { Request, Response } from 'express';
import { generateDocumentHandler } from '../use-cases/generate-document/generate-document.handler';
import { tailorDocumentHandler } from '../use-cases/tailor-document/tailor-document.handler';
import { editDocumentSectionHandler } from '../use-cases/edit-document/edit-document.handler';
import { templateEngine, TemplateSkin } from '../engines/template-engine/template.engine';
import { documentRepository } from '../repositories/document.repository';
import { exportEngine } from '../engines/export-engine/export.engine';
import { sendSuccess, sendError, sendCreated } from '../utils/apiResponse';

export async function createDocumentV2(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || req.body.userId;
    const { docType, userPrompt, opportunityId } = req.body;

    const result = await generateDocumentHandler.execute({
      id: `cmd-${Date.now()}`,
      type: 'document.generate',
      timestamp: new Date(),
      payload: { userId, docType, userPrompt: userPrompt || '', opportunityId },
    });

    sendCreated(res, result, 'Document generated successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to generate document', 500);
  }
}

export async function editDocumentSectionV2(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || req.body.userId;
    const documentId = req.params.id as string;
    const { sectionKey, sectionData, aiAction } = req.body;

    const result = await editDocumentSectionHandler.execute({
      id: `cmd-${Date.now()}`,
      type: 'document.editSection',
      timestamp: new Date(),
      payload: { userId, documentId, sectionKey, sectionData, aiAction },
    });

    sendSuccess(res, result, 'Document section updated successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to edit section', 500);
  }
}

export async function switchTemplateV2(req: Request, res: Response): Promise<void> {
  try {
    const documentId = req.params.id as string;
    const { templateId } = req.body;
    const doc = await documentRepository.findById(documentId);

    const rendered = templateEngine.applyTemplate(doc.metadata as any, templateId as TemplateSkin);
    sendSuccess(res, rendered, 'Template skin switched instantly');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to switch template', 500);
  }
}

export async function tailorDocumentV2(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || req.body.userId;
    const documentId = req.params.id as string;
    const { opportunityId } = req.body;

    const result = await tailorDocumentHandler.execute({
      id: `cmd-${Date.now()}`,
      type: 'document.tailor',
      timestamp: new Date(),
      payload: { userId, documentId, opportunityId },
    });

    sendSuccess(res, result, 'Document tailored successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to tailor document', 500);
  }
}

export async function getDocumentV2(req: Request, res: Response): Promise<void> {
  try {
    const documentId = req.params.id as string;
    const doc = await documentRepository.findById(documentId);
    sendSuccess(res, doc, 'Document retrieved successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Document not found', 404);
  }
}

export async function listDocumentsV2(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id || (req.query.userId as string);
    const docs = await documentRepository.findByUserId(userId);
    sendSuccess(res, docs, 'User document history');
  } catch (error: any) {
    sendError(res, error.message || 'Failed to list documents', 500);
  }
}

export async function exportDocumentV2(req: Request, res: Response): Promise<void> {
  try {
    const documentId = req.params.id as string;
    const format = (req.body.format || 'json') as 'pdf' | 'json';
    const doc = await documentRepository.findById(documentId);

    const exportResult = exportEngine.exportToBuffer(doc.metadata as any, format);
    sendSuccess(res, exportResult, 'Document exported successfully');
  } catch (error: any) {
    sendError(res, error.message || 'Export failed', 500);
  }
}
