/**
 * OpporHub AI Career Operating System — Cross-Opportunity Skill Gap Roadmap
 * Identifies top missing skills across all user saved/viewed opportunities and produces a learning roadmap.
 */

import { prisma } from "../config/db";

export interface SkillGapRoadmapItem {
  skill: string;
  frequency: number;
  estimatedLearningDays: number;
  recommendedAction: string;
}

export interface SkillGapRoadmapResult {
  totalTargetOpportunities: number;
  topMissingSkills: SkillGapRoadmapItem[];
  estimatedTotalLearningWeeks: number;
  roadmapSummary: string;
}

export class SkillGapRoadmapService {
  /**
   * Generates a cross-opportunity skill gap roadmap for a user.
   */
  public static async generateRoadmapForUser(userId: string): Promise<SkillGapRoadmapResult> {
    const [userMemory, savedOpps] = await Promise.all([
      prisma.userMemory.findUnique({ where: { userId } }),
      prisma.savedOpportunity.findMany({
        where: { userId },
        include: { opportunity: { include: { skills: { include: { skill: true } } } } },
      }),
    ]);

    const userSkills = (userMemory?.skillsSummary || []).map((s) => s.toLowerCase());
    const missingSkillCounts: Record<string, number> = {};

    savedOpps.forEach((so) => {
      so.opportunity.skills.forEach((os) => {
        const name = os.skill.name;
        const lower = name.toLowerCase();
        if (!userSkills.some((us) => us.includes(lower) || lower.includes(us))) {
          missingSkillCounts[name] = (missingSkillCounts[name] || 0) + 1;
        }
      });
    });

    const topMissing: SkillGapRoadmapItem[] = Object.entries(missingSkillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([skill, frequency]) => ({
        skill,
        frequency,
        estimatedLearningDays: 7,
        recommendedAction: `Complete a practical project highlighting ${skill} integration.`,
      }));

    const totalDays = topMissing.reduce((acc, item) => acc + item.estimatedLearningDays, 0);
    const estimatedTotalLearningWeeks = Math.max(1, Math.ceil(totalDays / 7));

    return {
      totalTargetOpportunities: savedOpps.length,
      topMissingSkills: topMissing,
      estimatedTotalLearningWeeks,
      roadmapSummary: topMissing.length > 0
        ? `Focusing on ${topMissing.slice(0, 2).map((m) => m.skill).join(' & ')} will unlock ${topMissing[0]?.frequency || 1}+ of your saved target opportunities.`
        : 'Your current skill profile matches all key requirements across your saved opportunities!',
    };
  }
}
