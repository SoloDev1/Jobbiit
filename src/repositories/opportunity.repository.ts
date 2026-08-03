import { prisma } from '../config/db';
import { NotFoundError } from '../core/errors/domain-error';
import type { Prisma } from '@prisma/client';

export interface OpportunityAnalysisData {
  summary: string;
  simpleExplanation: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  benefits: string[];
  atsKeywords: string[];
  interviewQuestions: string[];
  careerLevel: string;
}

export class OpportunityRepository {
  /**
   * Finds opportunities with pagination, filtering, and sorting.
   */
  public async findMany(params: {
    skip?: number;
    take?: number;
    category?: string;
    search?: string;
  }) {
    const where: Prisma.OpportunityWhereInput = {
      status: 'ACTIVE',
      ...(params.category ? { category: params.category as any } : {}),
      ...(params.search
        ? {
            OR: [
              { title: { contains: params.search, mode: 'insensitive' } },
              { organisation: { contains: params.search, mode: 'insensitive' } },
              { description: { contains: params.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        skip: params.skip || 0,
        take: params.take || 20,
        orderBy: { createdAt: 'desc' },
        include: { skills: { include: { skill: true } } },
      }),
      prisma.opportunity.count({ where }),
    ]);

    return { items, total };
  }

  /**
   * Finds an opportunity by ID including skills graph.
   */
  public async findById(id: string) {
    const opportunity = await prisma.opportunity.findUnique({
      where: { id },
      include: { skills: { include: { skill: true } } },
    });

    if (!opportunity) {
      throw new NotFoundError(`Opportunity not found: ${id}`);
    }

    return opportunity;
  }

  /**
   * Finds precomputed analysis by opportunity ID.
   */
  public async findAnalysisByOpportunityId(opportunityId: string) {
    return prisma.opportunityAnalysis.findUnique({
      where: { opportunityId },
    });
  }

  /**
   * Creates or updates precomputed analysis in database.
   */
  public async saveAnalysis(opportunityId: string, data: OpportunityAnalysisData) {
    return prisma.opportunityAnalysis.upsert({
      where: { opportunityId },
      update: data,
      create: {
        opportunityId,
        ...data,
      },
    });
  }

  /**
   * Toggles bookmark/save state for a user and opportunity.
   */
  public async toggleSave(userId: string, opportunityId: string): Promise<{ saved: boolean }> {
    const existing = await prisma.savedOpportunity.findUnique({
      where: { userId_opportunityId: { userId, opportunityId } },
    });

    if (existing) {
      await prisma.savedOpportunity.delete({
        where: { userId_opportunityId: { userId, opportunityId } },
      });
      return { saved: false };
    }

    await prisma.savedOpportunity.create({
      data: { userId, opportunityId },
    });
    return { saved: true };
  }

  /**
   * Retrieves all saved opportunities for a user.
   */
  public async findSavedByUserId(userId: string) {
    const saved = await prisma.savedOpportunity.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        opportunity: {
          include: { skills: { include: { skill: true } } },
        },
      },
    });
    return saved.map((s) => s.opportunity);
  }
}

export const opportunityRepository = new OpportunityRepository();

