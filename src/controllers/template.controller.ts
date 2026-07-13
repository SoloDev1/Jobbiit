import type { Request, Response } from 'express';
import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { sendSuccess, sendError } from '../utils/apiResponse';
import * as DocumentTemplateModel from '../models/DocumentTemplate';
import { createTemplateSchema, updateTemplateSchema } from '../schemas/template.schema';
import * as UploadService from '../services/upload.service';
import { logger } from '../config/logger';

const uuidParam = z.string().uuid();

export async function getTemplates(req: Request, res: Response): Promise<void> {
  const templates = await DocumentTemplateModel.findAll(false);
  sendSuccess(res, { templates }, 'Templates loaded successfully');
}

export async function getTemplateById(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.id);
  if (!parsed.success) {
    sendError(res, 'Invalid template ID', 400, 'INVALID_ID');
    return;
  }

  const template = await DocumentTemplateModel.findById(parsed.data);
  if (!template) {
    sendError(res, 'Template not found', 404, 'NOT_FOUND');
    return;
  }

  sendSuccess(res, { template }, 'Template loaded successfully');
}

// ADMIN ENDPOINTS

export async function adminGetAllTemplates(req: Request, res: Response): Promise<void> {
  const templates = await DocumentTemplateModel.findAll(true); // Include inactive ones for admins
  sendSuccess(res, { templates }, 'All templates loaded for admin');
}

export async function adminCreateTemplate(req: Request, res: Response): Promise<void> {
  const parsed = createTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 422, 'VALIDATION_ERROR', parsed.error.flatten());
    return;
  }

  const createdBy = req.user?.id || null;
  const template = await DocumentTemplateModel.create({
    ...parsed.data,
    createdBy,
  });

  logger.info({ templateId: template.id, adminId: req.user?.id }, 'Document template created');
  sendSuccess(res, { template }, 'Template created successfully');
}

export async function adminUpdateTemplate(req: Request, res: Response): Promise<void> {
  const idParsed = uuidParam.safeParse(req.params.id);
  if (!idParsed.success) {
    sendError(res, 'Invalid template ID', 400, 'INVALID_ID');
    return;
  }

  const parsed = updateTemplateSchema.safeParse(req.body);
  if (!parsed.success) {
    sendError(res, 'Validation failed', 422, 'VALIDATION_ERROR', parsed.error.flatten());
    return;
  }

  const exists = await DocumentTemplateModel.findById(idParsed.data);
  if (!exists) {
    sendError(res, 'Template not found', 404, 'NOT_FOUND');
    return;
  }

  const template = await DocumentTemplateModel.update(idParsed.data, parsed.data);
  logger.info({ templateId: template.id, adminId: req.user?.id }, 'Document template updated');
  sendSuccess(res, { template }, 'Template updated successfully');
}

export async function adminDeleteTemplate(req: Request, res: Response): Promise<void> {
  const parsed = uuidParam.safeParse(req.params.id);
  if (!parsed.success) {
    sendError(res, 'Invalid template ID', 400, 'INVALID_ID');
    return;
  }

  const exists = await DocumentTemplateModel.findById(parsed.data);
  if (!exists) {
    sendError(res, 'Template not found', 404, 'NOT_FOUND');
    return;
  }

  await DocumentTemplateModel.remove(parsed.data, false); // Hard delete for template deletion in admin
  logger.info({ templateId: parsed.data, adminId: req.user?.id }, 'Document template deleted');
  sendSuccess(res, null, 'Template deleted successfully');
}

export async function adminUploadThumbnail(req: Request, res: Response): Promise<void> {
  const idParsed = uuidParam.safeParse(req.params.id);
  if (!idParsed.success) {
    sendError(res, 'Invalid template ID', 400, 'INVALID_ID');
    return;
  }

  const file = req.file;
  if (!file) {
    sendError(res, 'Thumbnail file is required', 400, 'FILE_REQUIRED');
    return;
  }

  const exists = await DocumentTemplateModel.findById(idParsed.data);
  if (!exists) {
    sendError(res, 'Template not found', 404, 'NOT_FOUND');
    return;
  }

  const publicId = `template-${idParsed.data}-${randomUUID()}`;
  const url = await UploadService.uploadImage(
    file.buffer,
    'opporlink/templates',
    publicId,
    file.mimetype
  );

  const template = await DocumentTemplateModel.update(idParsed.data, {
    thumbnailUrl: url,
  });

  logger.info({ templateId: template.id, adminId: req.user?.id }, 'Template thumbnail uploaded');
  sendSuccess(res, { template }, 'Template thumbnail updated successfully');
}
