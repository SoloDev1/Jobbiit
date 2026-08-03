/**
 * OpporHub OS — Document Repository
 * Isolated Prisma database abstraction for generated documents.
 */

import { prisma } from '../config/db';
import { NotFoundError } from '../core/errors/domain-error';
import { DocumentType, DocumentFormat, DocStatus } from '@prisma/client';

export interface CreateDocumentInput {
  userId: string;
  type: DocumentType;
  format: DocumentFormat;
  metadata?: any;
  pdfUrl?: string;
  docxUrl?: string;
  status?: DocStatus;
}

export class DocumentRepository {
  /**
   * Finds document by ID.
   */
  public async findById(id: string) {
    const doc = await prisma.generatedDocument.findUnique({
      where: { id },
    });

    if (!doc) {
      throw new NotFoundError(`Document not found: ${id}`);
    }

    return doc;
  }

  /**
   * Finds all generated documents for a user.
   */
  public async findByUserId(userId: string) {
    return prisma.generatedDocument.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Creates a generated document record in Prisma DB.
   */
  public async create(data: CreateDocumentInput) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    return prisma.generatedDocument.create({
      data: {
        userId: data.userId,
        type: data.type,
        format: data.format,
        status: data.status || 'PROCESSING',
        metadata: data.metadata || {},
        pdfUrl: data.pdfUrl,
        docxUrl: data.docxUrl,
        expiresAt,
      },
    });
  }

  /**
   * Updates document status or URLs.
   */
  public async update(id: string, data: Partial<CreateDocumentInput>) {
    return prisma.generatedDocument.update({
      where: { id },
      data: {
        ...(data.status ? { status: data.status } : {}),
        ...(data.pdfUrl ? { pdfUrl: data.pdfUrl } : {}),
        ...(data.docxUrl ? { docxUrl: data.docxUrl } : {}),
        ...(data.metadata ? { metadata: data.metadata } : {}),
        lastAccessedAt: new Date(),
      },
    });
  }

  /**
   * Deletes a document by ID.
   */
  public async delete(id: string) {
    return prisma.generatedDocument.delete({
      where: { id },
    });
  }
}

export const documentRepository = new DocumentRepository();
