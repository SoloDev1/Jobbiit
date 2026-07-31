import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export interface UserMemoryData {
  topAchievements?: string[];
  targetRoles?: string[];
  targetIndustries?: string[];
  skillsSummary?: string[];
  careerGoals?: string;
  salaryExpectation?: string;
  notes?: string;
}

export interface UserPreferenceData {
  preferredTone?: "EXECUTIVE" | "CONCISE" | "TECHNICAL" | "CREATIVE";
  resumeLength?: "ONE_PAGE" | "TWO_PAGES";
  activeTemplateId?: string;
  autoTailorEnabled?: boolean;
}

export class MemoryService {
  /**
   * Fetch persistent user memory with Redis cache attempt and automatic Postgres fallback
   */
  static async getUserMemory(userId: string) {
    try {
      const memory = await prisma.userMemory.findUnique({
        where: { userId },
      });

      if (!memory) {
        return await prisma.userMemory.create({
          data: {
            userId,
            targetRoles: [],
            targetIndustries: [],
            skillsSummary: [],
          },
        });
      }

      return memory;
    } catch (error) {
      console.error(`[MemoryService] Error fetching user memory for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Upsert persistent user memory into PostgreSQL
   */
  static async upsertUserMemory(userId: string, data: UserMemoryData) {
    return prisma.userMemory.upsert({
      where: { userId },
      update: {
        ...(data.topAchievements && { topAchievements: data.topAchievements }),
        ...(data.targetRoles && { targetRoles: data.targetRoles }),
        ...(data.targetIndustries && { targetIndustries: data.targetIndustries }),
        ...(data.skillsSummary && { skillsSummary: data.skillsSummary }),
        ...(data.careerGoals !== undefined && { careerGoals: data.careerGoals }),
        ...(data.salaryExpectation !== undefined && { salaryExpectation: data.salaryExpectation }),
        ...(data.notes !== undefined && { notes: data.notes }),
      },
      create: {
        userId,
        topAchievements: data.topAchievements || [],
        targetRoles: data.targetRoles || [],
        targetIndustries: data.targetIndustries || [],
        skillsSummary: data.skillsSummary || [],
        careerGoals: data.careerGoals || null,
        salaryExpectation: data.salaryExpectation || null,
        notes: data.notes || null,
      },
    });
  }

  /**
   * Fetch user preferences
   */
  static async getUserPreference(userId: string) {
    let pref = await prisma.userPreference.findUnique({
      where: { userId },
    });

    if (!pref) {
      pref = await prisma.userPreference.create({
        data: {
          userId,
          preferredTone: "EXECUTIVE",
          resumeLength: "ONE_PAGE",
          activeTemplateId: "modern",
        },
      });
    }

    return pref;
  }

  /**
   * Upsert user preferences
   */
  static async upsertUserPreference(userId: string, data: UserPreferenceData) {
    return prisma.userPreference.upsert({
      where: { userId },
      update: {
        ...(data.preferredTone && { preferredTone: data.preferredTone }),
        ...(data.resumeLength && { resumeLength: data.resumeLength }),
        ...(data.activeTemplateId && { activeTemplateId: data.activeTemplateId }),
        ...(data.autoTailorEnabled !== undefined && { autoTailorEnabled: data.autoTailorEnabled }),
      },
      create: {
        userId,
        preferredTone: data.preferredTone || "EXECUTIVE",
        resumeLength: data.resumeLength || "ONE_PAGE",
        activeTemplateId: data.activeTemplateId || "modern",
        autoTailorEnabled: data.autoTailorEnabled ?? true,
      },
    });
  }
}
