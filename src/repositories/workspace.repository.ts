/**
 * OpporHub OS — Workspace Repository
 * Prisma database abstraction for workspaces and workspace-document links.
 */

import { prisma } from '../config/db';
import { WorkspaceStatus } from '@prisma/client';
import { NotFoundError } from '../core/errors/domain-error';

export interface CreateWorkspaceInput {
  userId: string;
  title: string;
  status?: WorkspaceStatus;
  opportunityContext?: any;
  intelligence?: any;
  preferences?: any;
}

export class WorkspaceRepository {
  /**
   * Creates a new workspace.
   */
  public async create(data: CreateWorkspaceInput) {
    return prisma.workspace.create({
      data: {
        userId: data.userId,
        title: data.title,
        status: data.status || 'DRAFT',
        opportunityContext: data.opportunityContext || undefined,
        intelligence: data.intelligence || undefined,
        preferences: data.preferences || undefined,
      },
      include: {
        documents: { include: { document: true } },
      },
    });
  }

  /**
   * Finds a workspace by ID including document links.
   */
  public async findById(id: string) {
    const workspace = await prisma.workspace.findUnique({
      where: { id },
      include: {
        documents: { include: { document: true } },
      },
    });

    if (!workspace) {
      throw new NotFoundError(`Workspace not found: ${id}`);
    }

    return workspace;
  }

  /**
   * Lists all workspaces for a user.
   */
  public async findByUserId(userId: string) {
    return prisma.workspace.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        documents: { include: { document: true } },
      },
    });
  }

  /**
   * Updates workspace fields.
   */
  public async update(id: string, data: Partial<CreateWorkspaceInput> & { status?: WorkspaceStatus }) {
    return prisma.workspace.update({
      where: { id },
      data: {
        ...(data.title ? { title: data.title } : {}),
        ...(data.status ? { status: data.status } : {}),
        ...(data.opportunityContext !== undefined ? { opportunityContext: data.opportunityContext } : {}),
        ...(data.intelligence !== undefined ? { intelligence: data.intelligence } : {}),
        ...(data.preferences !== undefined ? { preferences: data.preferences } : {}),
      },
      include: {
        documents: { include: { document: true } },
      },
    });
  }

  /**
   * Links a document to a workspace.
   */
  public async addDocument(workspaceId: string, documentId: string) {
    return prisma.workspaceDocument.create({
      data: { workspaceId, documentId },
    });
  }

  /**
   * Deletes a workspace by ID.
   */
  public async delete(id: string) {
    return prisma.workspace.delete({
      where: { id },
    });
  }
}

export const workspaceRepository = new WorkspaceRepository();
