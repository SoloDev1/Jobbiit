/**
 * OpporHub AI Career Operating System — Career Memory Sync Service
 * Automatically synchronizes opportunity interactions into UserMemory and logs telemetry events.
 */

import { prisma } from "../config/db";
import { logger } from "../core/telemetry/logger.service";

export class CareerMemorySyncService {
  /**
   * Updates user career memory based on opportunity interaction (view, save, apply).
   */
  public static async syncOpportunityInteraction(
    userId: string,
    opportunityId: string,
    actionType: 'VIEW_OPPORTUNITY' | 'SAVE_OPPORTUNITY' | 'APPLY_OPPORTUNITY',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      // 1. Fetch opportunity details
      const opp = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
        include: { skills: { include: { skill: true } } },
      });

      if (!opp) return;

      const oppSkills = opp.skills.map((s) => s.skill.name).filter(Boolean);

      // 2. Log UserEvent telemetry
      await prisma.userEvent.create({
        data: {
          userId,
          opportunityId,
          type: actionType,
          metadata: {
            title: opp.title,
            organisation: opp.organisation,
            category: opp.category,
            ...metadata,
          },
        },
      });

      // 3. Upsert UserMemory target roles, industries, and skills
      const existingMemory = await prisma.userMemory.findUnique({
        where: { userId },
      });

      const currentRoles = new Set(existingMemory?.targetRoles || []);
      const currentIndustries = new Set(existingMemory?.targetIndustries || []);
      const currentSkills = new Set(existingMemory?.skillsSummary || []);

      if (opp.title) currentRoles.add(opp.title);
      if (opp.category) currentIndustries.add(opp.category);
      oppSkills.forEach((sk) => currentSkills.add(sk));

      await prisma.userMemory.upsert({
        where: { userId },
        update: {
          targetRoles: Array.from(currentRoles).slice(0, 10),
          targetIndustries: Array.from(currentIndustries).slice(0, 10),
          skillsSummary: Array.from(currentSkills).slice(0, 20),
        },
        create: {
          userId,
          targetRoles: [opp.title],
          targetIndustries: [opp.category],
          skillsSummary: oppSkills.slice(0, 20),
        },
      });

      logger.info({ userId, opportunityId, actionType }, '[CareerMemorySyncService] Career memory synced');
    } catch (err) {
      logger.warn({ err, userId, opportunityId }, '[CareerMemorySyncService] Failed to sync career memory');
    }
  }
}
