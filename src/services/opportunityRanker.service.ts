/**
 * OpporHub AI Career Operating System — Personalized Opportunity Priority Ranker
 * Evaluates a user's UserMemory against an opportunity to determine action priority.
 */

import { prisma } from "../config/db";

export type PriorityDecision = 'APPLY_NOW' | 'PREPARE_FIRST' | 'EASY_WIN' | 'SKIP';

export interface OpportunityRankingResult {
  decision: PriorityDecision;
  priorityScore: number; // 0 - 100
  decisionLabel: string;
  reason: string;
  keyAction: string;
}

export class OpportunityRankerService {
  /**
   * Ranks an opportunity specifically for a given user.
   */
  public static async rankForUser(userId: string, opportunityId: string): Promise<OpportunityRankingResult> {
    const [userMemory, opp] = await Promise.all([
      prisma.userMemory.findUnique({ where: { userId } }),
      prisma.opportunity.findUnique({
        where: { id: opportunityId },
        include: { skills: { include: { skill: true } } },
      }),
    ]);

    if (!opp) {
      return {
        decision: 'PREPARE_FIRST',
        priorityScore: 70,
        decisionLabel: 'Prepare First ⚠',
        reason: 'Opportunity context incomplete.',
        keyAction: 'Review description and required skills.',
      };
    }

    const oppSkills = opp.skills.map((s) => s.skill.name.toLowerCase());
    const userSkills = (userMemory?.skillsSummary || []).map((s) => s.toLowerCase());

    const matched = oppSkills.filter((sk) => userSkills.some((us) => us.includes(sk) || sk.includes(us)));
    const missing = oppSkills.filter((sk) => !matched.includes(sk));

    const coverage = oppSkills.length > 0 ? matched.length / oppSkills.length : 0.8;
    const priorityScore = Math.min(99, Math.max(50, Math.round(coverage * 100)));

    if (priorityScore >= 85) {
      return {
        decision: 'APPLY_NOW',
        priorityScore,
        decisionLabel: 'Apply Now 🚀',
        reason: `Strong background match with ${matched.length} verified key skill(s).`,
        keyAction: 'Tailor resume bullets and submit application.',
      };
    }

    if (priorityScore >= 65 || missing.length <= 2) {
      return {
        decision: 'PREPARE_FIRST',
        priorityScore,
        decisionLabel: 'Prepare First ⚠',
        reason: missing.length > 0 ? `Missing ${missing.slice(0, 2).join(', ')}. Quick prep recommended.` : 'Good match requiring minor resume tailoring.',
        keyAction: `Highlight related experience for ${missing.slice(0, 2).join(', ') || 'key skills'}.`,
      };
    }

    return {
      decision: 'SKIP',
      priorityScore,
      decisionLabel: 'Consider Alternatives 💡',
      reason: `Significant skill gap (${missing.length} missing skill(s)).`,
      keyAction: 'Focus on higher-compatibility opportunities.',
    };
  }
}
