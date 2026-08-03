/**
 * OpporHub OS — Career Intelligence Engine
 * Computes skill gaps, career roadmaps, resume health scores, and success probability.
 */

import { ProfileEntity } from '../../domain/profile/profile.entity';
import { OpportunityIntelligenceResult } from '../opportunity-engine/opportunity-ai.engine';

export interface SkillGapAnalysis {
  matchedSkills: string[];
  missingSkills: string[];
  skillCoveragePercent: number;
  learningRoadmap: string[];
}

export interface CareerIntelligenceSummary {
  matchScore: number;
  skillGap: SkillGapAnalysis;
  resumeHealthScore: number;
  estimatedSuccessRate: number;
  recommendedActions: string[];
}

export class CareerIntelligenceEngine {
  /**
   * Computes comprehensive career intelligence for a profile against an opportunity.
   */
  public analyzeCareerFit(
    profile: ProfileEntity | null,
    opportunityContext?: OpportunityIntelligenceResult
  ): CareerIntelligenceSummary {
    const profileSkills = profile?.skillsGraph?.map((s) => s.name) || [];
    const requiredSkills = opportunityContext?.requiredSkills || [];

    const matchedSkills = requiredSkills.filter((s) =>
      profileSkills.some((ps) => ps.toLowerCase().includes(s.toLowerCase()))
    );
    const missingSkills = requiredSkills.filter((s) => !matchedSkills.includes(s));

    const skillCoveragePercent =
      requiredSkills.length > 0 ? Math.round((matchedSkills.length / requiredSkills.length) * 100) : 85;

    const learningRoadmap = missingSkills.map(
      (skill) => `Complete a hands-on project demonstrating advanced proficiency in ${skill}.`
    );

    const matchScore = Math.min(98, Math.max(55, skillCoveragePercent));
    const resumeHealthScore = profileSkills.length >= 5 ? 90 : 65;
    const estimatedSuccessRate = Math.round(matchScore * 0.8 + resumeHealthScore * 0.2);

    const recommendedActions: string[] = [];
    if (missingSkills.length > 0) {
      recommendedActions.push(`Address top missing skill: ${missingSkills[0]}`);
    }
    if (resumeHealthScore < 80) {
      recommendedActions.push('Expand your profile skills inventory with at least 5 core competencies.');
    }

    return {
      matchScore,
      skillGap: {
        matchedSkills,
        missingSkills,
        skillCoveragePercent,
        learningRoadmap,
      },
      resumeHealthScore,
      estimatedSuccessRate,
      recommendedActions,
    };
  }
}

export const careerIntelligenceEngine = new CareerIntelligenceEngine();
