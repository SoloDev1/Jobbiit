import type { Request, Response } from 'express';
import { prisma } from '../../config/db';
import { logger } from '../../config/logger';
import { sendCreated, sendError, sendSuccess, sendNoContent } from '../../utils/apiResponse';
import { generateDocumentSchema } from './document-generator.schema';
import { documentQueue } from './document-generator.queue';
import { generatePresignedUrl, deleteDocument } from './services/storage.service';
import xss from 'xss';
import { audit } from '../../models/AuditLog';


/**
 * Helper to recursively sanitize all string values in an object using xss().
 */
function sanitize(value: any): any {
  if (typeof value === 'string') {
    return xss(value);
  }
  if (Array.isArray(value)) {
    return value.map(sanitize);
  }
  if (value !== null && typeof value === 'object') {
    const res: Record<string, any> = {};
    for (const key of Object.keys(value)) {
      res[key] = sanitize(value[key]);
    }
    return res;
  }
  return value;
}

/**
 * POST /api/v1/documents/generate
 * Starts the document generation flow.
 */
export async function generateDocument(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  // Validate request body
  const validation = generateDocumentSchema.safeParse(req.body);
  if (!validation.success) {
    sendError(res, 'Validation failed', 400, 'VALIDATION_ERROR', validation.error.flatten().fieldErrors);
    return;
  }

  const { format, data, type } = req.body;

  // Sanitize the inputs with xss() before queuing
  const sanitizedData = sanitize(data);

  // Set expiresAt to 30 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);

  // Create the record in DB (status: PROCESSING)
  const doc = await prisma.generatedDocument.create({
    data: {
      userId,
      type: type.toUpperCase() as any,
      format: format.toUpperCase() as any,
      status: 'PROCESSING',
      metadata: sanitizedData,
      expiresAt,
    },
  });

  // Push job to BullMQ queue
  const job = await documentQueue.add('generate-document', {
    documentId: doc.id,
    userId,
    type,
    format,
    data: sanitizedData,
  });

  logger.info({ documentId: doc.id, jobId: job.id, userId }, 'Document generation job queued');

  await audit(req, 'DOCUMENT_GENERATED', {
    entityId:   doc.id,
    entityType: 'GeneratedDocument',
    metadata:   { type, format },
  });

  sendCreated(res, {
    jobId: doc.id,
    status: 'queued',
  }, 'Document generation job successfully queued');
}

/**
 * GET /api/v1/documents/status/:jobId
 * Polls for the generation status and returns R2 URLs when completed.
 */
export async function getStatus(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const jobId = req.params.jobId as string;

  const doc = await prisma.generatedDocument.findUnique({
    where: { id: jobId },
  });

  if (!doc) {
    sendError(res, 'Job or document not found', 404, 'NOT_FOUND');
    return;
  }

  // Security: Check if document belongs to the requesting user
  if (doc.userId !== userId) {
    sendError(res, 'Unauthorized to view this document', 403, 'UNAUTHORIZED');
    return;
  }

  let pdfUrl = doc.pdfUrl;
  let docxUrl = doc.docxUrl;
  let needsUpdate = false;

  // Cost saving: If the document is done, verify if presigned URLs have expired (1-hour window, refresh if > 55 minutes)
  if (doc.status === 'DONE') {
    const isExpired = doc.updatedAt.getTime() + 55 * 60 * 1000 < Date.now();
    if (isExpired) {
      logger.info({ docId: doc.id }, 'Presigned URLs expired. Regenerating from R2.');
      try {
        if (doc.r2PdfKey) {
          pdfUrl = await generatePresignedUrl(doc.r2PdfKey);
          needsUpdate = true;
        }
        if (doc.r2DocxKey) {
          docxUrl = await generatePresignedUrl(doc.r2DocxKey);
          needsUpdate = true;
        }
      } catch (error) {
        logger.error({ error, docId: doc.id }, 'Failed to regenerate presigned URLs on status check');
      }
    }
  }

  // Update lastAccessedAt and URLs if they were refreshed
  await prisma.generatedDocument.update({
    where: { id: doc.id },
    data: {
      lastAccessedAt: new Date(),
      ...(needsUpdate ? { pdfUrl, docxUrl } : {}),
    },
  });

  const responseUrls: Record<string, string> = {};
  if (pdfUrl) responseUrls.pdf = pdfUrl;
  if (docxUrl) responseUrls.docx = docxUrl;

  sendSuccess(res, {
    status: doc.status.toLowerCase(),
    ...(doc.status === 'DONE' ? { urls: responseUrls } : {}),
    ...(doc.status === 'FAILED' ? { error: doc.errorMessage || 'Generation failed' } : {}),
  });
}

/**
 * GET /api/v1/documents/history
 * Returns the history of generated documents for the authenticated user.
 */
export async function getHistory(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;

  const docs = await prisma.generatedDocument.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  sendSuccess(res, docs, 'User document generation history');
}

/**
 * DELETE /api/v1/documents/:id
 * Deletes a document from database and Cloudflare R2 bucket.
 */
export async function deleteGeneratedDocument(req: Request, res: Response): Promise<void> {
  const userId = req.user!.id;
  const id = req.params.id as string;

  const doc = await prisma.generatedDocument.findUnique({
    where: { id },
  });

  if (!doc) {
    sendError(res, 'Document not found', 404, 'NOT_FOUND');
    return;
  }

  // Security: Check ownership
  if (doc.userId !== userId) {
    sendError(res, 'Unauthorized to delete this document', 403, 'UNAUTHORIZED');
    return;
  }

  // Delete files from R2
  try {
    if (doc.r2PdfKey) {
      await deleteDocument(doc.r2PdfKey);
    }
    if (doc.r2DocxKey) {
      await deleteDocument(doc.r2DocxKey);
    }
  } catch (error) {
    logger.error({ error, docId: doc.id }, 'Error during storage cleanup on deletion');
  }

  // Delete from DB
  await prisma.generatedDocument.delete({
    where: { id },
  });

  sendNoContent(res);
}
