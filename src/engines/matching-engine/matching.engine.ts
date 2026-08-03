/**
 * OpporHub OS — Matching Engine
 * Rich ATS Match scoring model evaluating keywords, experience, skills, action verbs, and section diagnostics.
 */

import { DocumentDomainEntity } from '../../domain/document/document.entity';
import { OpportunityIntelligenceResult } from '../opportunity-engine/opportunity-ai.engine';

export interface AtsSectionDiagnostics {
  summaryScore: number;
  skillsScore: number;
  experienceScore: number;
  educationScore: number;
}

export interface AtsMatchBreakdown {
  overallScore: number; // 0 - 100
  keywordScore: number;
  skillCoverageScore: number;
  experienceScore: number;
  actionVerbScore: number;
  sections: AtsSectionDiagnostics;
  matchedKeywords: string[];
  missingKeywords: string[];
  weakBullets: string[];
  suggestions: string[];
}

export class MatchingEngine {
  /**
   * Computes comprehensive ATS match analysis between document and opportunity context.
   */
  public calculateMatch(
    document: DocumentDomainEntity,
    opportunityContext?: OpportunityIntelligenceResult
  ): AtsMatchBreakdown {
    const requiredSkills = opportunityContext?.requiredSkills || [];
    const documentSkills = document.content.skills || [];

    // 1. Skill Coverage
    const matchedSkills = requiredSkills.filter((s) =>
      documentSkills.some((ds) => ds.toLowerCase().includes(s.toLowerCase()))
    );
    const missingSkills = requiredSkills.filter((s) => !matchedSkills.includes(s));
    const skillCoverageScore =
      requiredSkills.length > 0 ? Math.round((matchedSkills.length / requiredSkills.length) * 100) : 90;

    // 2. Action Verbs & Weak Bullets Audit
    const strongActionVerbs = ['architected', 'engineered', 'spearheaded', 'accelerated', 'built', 'scaled', 'optimized', 'led'];
    const bullets = document.content.experience.flatMap((e) => e.bullets || []);
    const weakBullets = bullets.filter(
      (b) => !strongActionVerbs.some((v) => b.toLowerCase().startsWith(v))
    );
    const actionVerbScore =
      bullets.length > 0 ? Math.min(100, Math.round(((bullets.length - weakBullets.length) / bullets.length) * 100) + 20) : 75;

    // 3. Keyword Match
    const atsKeywords = opportunityContext?.atsKeywords || [];
    const matchedKeywords = atsKeywords.filter((k) =>
      JSON.stringify(document.content).toLowerCase().includes(k.toLowerCase())
    );
    const missingKeywords = atsKeywords.filter((k) => !matchedKeywords.includes(k));
    const keywordScore = atsKeywords.length > 0 ? Math.round((matchedKeywords.length / atsKeywords.length) * 100) : 85;

    // 4. Section Diagnostics
    const hasSummary = Boolean(document.content.summary && document.content.summary.length > 30);
    const hasExperience = document.content.experience.length > 0;
    const hasEducation = document.content.education.length > 0;

    const sections: AtsSectionDiagnostics = {
      summaryScore: hasSummary ? 95 : 60,
      skillsScore: skillCoverageScore,
      experienceScore: hasExperience ? actionVerbScore : 50,
      educationScore: hasEducation ? 100 : 70,
    };

    // 5. Overall Weighted Score
    const overallScore = Math.min(
      98,
      Math.max(50, Math.round(sections.skillsScore * 0.35 + keywordScore * 0.35 + sections.experienceScore * 0.3))
    );

    const suggestions: string[] = [];
    if (missingSkills.length > 0) {
      suggestions.push(`Add missing key skills: ${missingSkills.slice(0, 3).join(', ')}.`);
    }
    if (weakBullets.length > 0) {
      suggestions.push(`Refactor ${weakBullets.length} experience bullet(s) to start with strong action verbs.`);
    }

    return {
      overallScore,
      keywordScore,
      skillCoverageScore,
      experienceScore: sections.experienceScore,
      actionVerbScore,
      sections,
      matchedKeywords,
      missingKeywords,
      weakBullets,
      suggestions,
    };
  }
}

export const matchingEngine = new MatchingEngine();
