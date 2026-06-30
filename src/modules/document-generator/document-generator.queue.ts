import { Queue, Worker } from 'bullmq';
import { redisConnection } from '../../config/redis';
import { prisma } from '../../config/db';
import { logger } from '../../config/logger';
import { getCachedDocUrls, setCachedDocUrls } from './utils/cache';
import { enhanceContent } from './services/ai.service';
import { generatePDF } from './services/pdf.service';
import { generateDOCX } from './services/docx.service';
import { uploadDocument, deleteDocument, generatePresignedUrl } from './services/storage.service';
import { DocumentGenerateJobPayload } from './document-generator.types';

export const documentQueue = new Queue<DocumentGenerateJobPayload>('document-generation', {
  connection: redisConnection,
});

const cronQueue = new Queue('document-crons', {
  connection: redisConnection,
});

/**
 * Worker logic for processing a single document generation job.
 */
async function processDocumentJob(jobData: DocumentGenerateJobPayload) {
  const { documentId, userId, type, format, data } = jobData;

  // 1. Fetch document from DB
  const docRecord = await prisma.generatedDocument.findUnique({
    where: { id: documentId },
  });

  if (!docRecord) {
    throw new Error(`Document record with ID ${documentId} not found`);
  }

  // Cost-saving check: If already marked DONE, skip regeneration
  if (docRecord.status === 'DONE') {
    logger.info({ documentId }, 'Document already completed. Skipping regeneration.');
    return;
  }

  // 2. Check local VPS Redis cache
  const cached = await getCachedDocUrls(userId, type, data);
  if (cached) {
    logger.info({ documentId }, 'VPS Redis Cache hit. Reusing generated document URLs.');
    await prisma.generatedDocument.update({
      where: { id: documentId },
      data: {
        status: 'DONE',
        pdfUrl: cached.pdfUrl || null,
        docxUrl: cached.docxUrl || null,
        r2PdfKey: cached.r2PdfKey || null,
        r2DocxKey: cached.r2DocxKey || null,
      },
    });
    return;
  }

  // 3. Call AI Service (OpenAI) to enhance content
  const enhanced = await enhanceContent(type, data);

  // 4. Generate & upload requested formats
  let pdfUrl: string | null = null;
  let docxUrl: string | null = null;
  let r2PdfKey: string | null = null;
  let r2DocxKey: string | null = null;

  const timestamp = Math.floor(Date.now() / 1000);

  if (format === 'pdf' || format === 'both') {
    logger.info({ documentId }, 'Generating PDF format');
    const pdfBuffer = await generatePDF(type, data, enhanced);
    r2PdfKey = `documents/${userId}/${type}/${timestamp}-${type}.pdf`;
    pdfUrl = await uploadDocument(pdfBuffer, r2PdfKey, 'application/pdf');
  }

  if (format === 'docx' || format === 'both') {
    logger.info({ documentId }, 'Generating DOCX format');
    const docxBuffer = await generateDOCX(type, data, enhanced);
    r2DocxKey = `documents/${userId}/${type}/${timestamp}-${type}.docx`;
    docxUrl = await uploadDocument(
      docxBuffer,
      r2DocxKey,
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    );
  }

  // 5. Update cache in VPS Redis
  await setCachedDocUrls(userId, type, data, {
    pdfUrl: pdfUrl || undefined,
    docxUrl: docxUrl || undefined,
    r2PdfKey: r2PdfKey || undefined,
    r2DocxKey: r2DocxKey || undefined,
  });

  // 6. Update database record
  await prisma.generatedDocument.update({
    where: { id: documentId },
    data: {
      status: 'DONE',
      pdfUrl,
      docxUrl,
      r2PdfKey,
      r2DocxKey,
    },
  });

  logger.info({ documentId }, 'Document generated successfully');
}

/**
 * Initializes workers for document generation and maintenance cron jobs.
 */
export function initWorker() {
  const documentWorker = new Worker(
    'document-generation',
    async (job) => {
      const { documentId } = job.data;
      try {
        await processDocumentJob(job.data);
      } catch (error: any) {
        logger.error({ error, documentId }, 'Document generation job failed');
        await prisma.generatedDocument.update({
          where: { id: documentId },
          data: {
            status: 'FAILED',
            errorMessage: error.message || 'Internal processing error',
          },
        });
        throw error;
      }
    },
    { connection: redisConnection }
  );

  documentWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Document worker job failed');
  });

  // Cron Job Worker
  const cronWorker = new Worker(
    'document-crons',
    async (job) => {
      logger.info({ jobName: job.name }, 'Cron job picked up by worker');
      switch (job.name) {
        case 'cleanup-expired-documents':
          return cleanupExpiredDocuments();
        case 'recover-stale-jobs':
          return recoverStaleJobs();
        case 'refresh-presigned-urls':
          return refreshPresignedUrls();
        default:
          logger.warn({ jobName: job.name }, 'Unknown cron job name received');
      }
    },
    { connection: redisConnection }
  );

  cronWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Cron worker job failed');
  });

  logger.info('BullMQ workers successfully initialized');
}

/**
 * Registers repeatable maintenance jobs on app boot.
 */
export async function registerCronJobs() {
  const existingJobs = await cronQueue.getRepeatableJobs();

  const jobs = [
    { name: 'cleanup-expired-documents', cron: '0 2 * * *' }, // every day at 2am
    { name: 'recover-stale-jobs',        cron: '*/15 * * * *' }, // every 15 minutes
    { name: 'refresh-presigned-urls',    cron: '*/50 * * * *' }, // every 50 minutes
  ];

  for (const job of jobs) {
    const exists = existingJobs.find((j) => j.name === job.name);
    if (!exists) {
      await cronQueue.add(job.name, {}, { repeat: { pattern: job.cron } });
      logger.info({ jobName: job.name, cron: job.cron }, 'Registered maintenance cron job');
    }
  }
}

// ─── CRON JOB IMPLEMENTATIONS ──────────────────────────────────────────────────

async function cleanupExpiredDocuments() {
  logger.info('Executing expired documents cleanup');
  const now = new Date();

  const expiredDocs = await prisma.generatedDocument.findMany({
    where: {
      expiresAt: { lt: now },
      status: 'DONE',
    },
  });

  let deletedCount = 0;
  for (const doc of expiredDocs) {
    try {
      if (doc.r2PdfKey) {
        await deleteDocument(doc.r2PdfKey);
      }
      if (doc.r2DocxKey) {
        await deleteDocument(doc.r2DocxKey);
      }
      await prisma.generatedDocument.delete({
        where: { id: doc.id },
      });
      deletedCount++;
    } catch (err) {
      logger.error({ err, docId: doc.id }, 'Failed to delete expired document');
    }
  }

  logger.info(`Cleanup finished. Removed ${deletedCount} expired documents.`);
}

async function recoverStaleJobs() {
  logger.info('Executing stale jobs recovery');
  const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);

  const staleDocs = await prisma.generatedDocument.findMany({
    where: {
      status: 'PROCESSING',
      updatedAt: { lt: tenMinutesAgo },
    },
  });

  for (const doc of staleDocs) {
    try {
      if (doc.retryCount < 1) {
        logger.warn({ docId: doc.id }, 'Requeuing stale document generation job');
        await prisma.generatedDocument.update({
          where: { id: doc.id },
          data: {
            retryCount: { increment: 1 },
            updatedAt: new Date(),
          },
        });
        await documentQueue.add('generate-document', {
          documentId: doc.id,
          userId: doc.userId,
          type: doc.type.toLowerCase() as any,
          format: doc.format.toLowerCase() as any,
          data: doc.metadata as any,
        });
      } else {
        logger.error({ docId: doc.id }, 'Stale job timed out and reached maximum retries');
        await prisma.generatedDocument.update({
          where: { id: doc.id },
          data: {
            status: 'FAILED',
            errorMessage: 'Job timed out',
          },
        });
      }
    } catch (err) {
      logger.error({ err, docId: doc.id }, 'Failed to recover stale job');
    }
  }
}

async function refreshPresignedUrls() {
  logger.info('Executing active document URL refresh');
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

  const activeDocs = await prisma.generatedDocument.findMany({
    where: {
      status: 'DONE',
      lastAccessedAt: { gt: twoHoursAgo },
    },
  });

  let refreshedCount = 0;
  for (const doc of activeDocs) {
    try {
      let pdfUrl = doc.pdfUrl;
      let docxUrl = doc.docxUrl;

      if (doc.r2PdfKey) {
        pdfUrl = await generatePresignedUrl(doc.r2PdfKey);
      }
      if (doc.r2DocxKey) {
        docxUrl = await generatePresignedUrl(doc.r2DocxKey);
      }

      await prisma.generatedDocument.update({
        where: { id: doc.id },
        data: {
          pdfUrl,
          docxUrl,
        },
      });
      refreshedCount++;
    } catch (err) {
      logger.error({ err, docId: doc.id }, 'Failed to refresh document presigned URL');
    }
  }

  logger.info(`URL refresh finished. Refreshed ${refreshedCount} active documents.`);
}
