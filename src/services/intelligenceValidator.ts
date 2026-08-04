/**
 * OpporHub AI Career Operating System — Dual Validation Engine
 * Performs Structural & Content Validation on generated Opportunity Intelligence.
 */

export interface ValidationResult {
  isValid: boolean;
  overallHealthScore: number; // 0 - 100
  sectionConfidence: {
    summary: number;
    skills: number;
    ats: number;
    interview: number;
  };
  errors: string[];
  warnings: string[];
}

export class IntelligenceValidatorService {
  /**
   * Evaluates structural integrity and content quality of generated intelligence payload.
   */
  public static validate(payload: any, organisationName: string): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Structural Checks
    if (!payload || typeof payload !== 'object') {
      return {
        isValid: false,
        overallHealthScore: 0,
        sectionConfidence: { summary: 0, skills: 0, ats: 0, interview: 0 },
        errors: ['Invalid or empty JSON payload'],
        warnings: [],
      };
    }

    const summary = payload.executiveSummary || payload.summary || '';
    const requiredSkills = payload.requiredSkills || [];
    const atsKeywords = payload.atsKeywords || [];
    const interviewQuestions = payload.interviewQuestions || [];

    if (!summary || summary.length < 20) {
      errors.push('Executive summary is missing or too short');
    }
    if (!Array.isArray(requiredSkills) || requiredSkills.length === 0) {
      warnings.push('Required skills array is empty');
    }
    if (!Array.isArray(atsKeywords) || atsKeywords.length === 0) {
      warnings.push('ATS keywords array is empty');
    }
    if (!Array.isArray(interviewQuestions) || interviewQuestions.length === 0) {
      warnings.push('Interview questions array is empty');
    }

    // 2. Content Checks (Filler text & duplicate keywords audit)
    let summaryConfidence = 0.95;
    if (summary.toLowerCase().startsWith(`${organisationName.toLowerCase()} is seeking`) || summary.toLowerCase().startsWith('seeking a')) {
      summaryConfidence -= 0.15;
      warnings.push('Executive summary uses generic boilerplate phrasing');
    }

    const uniqueAts = new Set(atsKeywords.map((k: string) => String(k).toLowerCase()));
    const atsConfidence = atsKeywords.length > 0 ? Math.min(1.0, uniqueAts.size / Math.max(1, atsKeywords.length)) : 0.6;
    const skillsConfidence = requiredSkills.length >= 3 ? 0.95 : 0.7;
    const interviewConfidence = interviewQuestions.length >= 2 ? 0.9 : 0.65;

    // 3. Health Score Calculation (0 - 100)
    const overallHealthScore = Math.round(
      (summaryConfidence * 0.35 + skillsConfidence * 0.25 + atsConfidence * 0.25 + interviewConfidence * 0.15) * 100
    );

    const isValid = errors.length === 0 && overallHealthScore >= 60;

    return {
      isValid,
      overallHealthScore,
      sectionConfidence: {
        summary: Number(summaryConfidence.toFixed(2)),
        skills: Number(skillsConfidence.toFixed(2)),
        ats: Number(atsConfidence.toFixed(2)),
        interview: Number(interviewConfidence.toFixed(2)),
      },
      errors,
      warnings,
    };
  }
}
