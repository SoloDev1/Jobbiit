/**
 * OpporHub AI Career Operating System — Dual Validation Engine v2
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
    responsibilities: number;
    benefits: number;
  };
  errors: string[];
  warnings: string[];
}

const GENERIC_PHRASES = [
  'seeking a qualified candidate',
  'seeking a',
  'we are looking for',
  'join our team',
  'competitive salary',
  'great opportunity',
  'tell me about yourself',
  'what are your strengths',
  'where do you see yourself',
];

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
        sectionConfidence: { summary: 0, skills: 0, ats: 0, interview: 0, responsibilities: 0, benefits: 0 },
        errors: ['Invalid or empty JSON payload'],
        warnings: [],
      };
    }

    const summary = payload.executiveSummary || payload.summary || '';
    const simpleExplanation = payload.simpleExplanation || '';
    const requiredSkills: string[] = payload.requiredSkills || [];
    const preferredSkills: string[] = payload.preferredSkills || [];
    const responsibilities: string[] = payload.responsibilities || [];
    const benefits: string[] = payload.benefits || [];
    const atsKeywords: string[] = payload.atsKeywords || [];
    const interviewQuestions: string[] = payload.interviewQuestions || [];

    // Required field presence checks
    if (!summary || summary.trim().length < 30) {
      errors.push('Executive summary is missing or too short (< 30 chars)');
    }
    if (!simpleExplanation || simpleExplanation.trim().length < 10) {
      warnings.push('Simple explanation is missing or too short');
    }
    if (!Array.isArray(requiredSkills) || requiredSkills.length === 0) {
      warnings.push('Required skills array is empty');
    }
    if (!Array.isArray(atsKeywords) || atsKeywords.length < 3) {
      warnings.push('ATS keywords array has fewer than 3 entries');
    }
    if (!Array.isArray(interviewQuestions) || interviewQuestions.length < 2) {
      warnings.push('Interview questions array has fewer than 2 entries');
    }
    if (!Array.isArray(responsibilities) || responsibilities.length === 0) {
      warnings.push('Responsibilities array is empty');
    }
    if (!Array.isArray(benefits) || benefits.length === 0) {
      warnings.push('Benefits array is empty');
    }

    // 2. Content Quality Checks

    // Summary boilerplate detection
    const summaryLower = summary.toLowerCase();
    let summaryConfidence = 1.0;
    for (const phrase of GENERIC_PHRASES) {
      if (summaryLower.startsWith(phrase) || summaryLower === phrase) {
        summaryConfidence -= 0.2;
        warnings.push(`Executive summary uses generic boilerplate: "${phrase}"`);
        break;
      }
    }
    // Penalise if org name appears as first word (e.g. "Stripe is seeking a...")
    if (summaryLower.startsWith(organisationName.toLowerCase())) {
      summaryConfidence -= 0.1;
    }
    summaryConfidence = Math.max(0.4, summaryConfidence);

    // ATS keyword quality: uniqueness + minimum count
    const uniqueAts = new Set(atsKeywords.map((k: string) => String(k).toLowerCase()));
    const atsConfidence = atsKeywords.length >= 5
      ? Math.min(1.0, uniqueAts.size / Math.max(1, atsKeywords.length))
      : 0.5;

    // Interview question quality: penalise generic questions
    const genericQuestionPhrases = ['tell me about yourself', 'what are your strengths', 'where do you see yourself'];
    const genericCount = interviewQuestions.filter((q: string) =>
      genericQuestionPhrases.some((p) => q.toLowerCase().includes(p))
    ).length;
    const interviewConfidence = interviewQuestions.length >= 3
      ? Math.max(0.4, 1.0 - genericCount * 0.2)
      : 0.5;
    if (genericCount > 0) {
      warnings.push(`${genericCount} interview question(s) are too generic`);
    }

    // Skills confidence
    const skillsConfidence = requiredSkills.length >= 3 ? 1.0 : requiredSkills.length >= 1 ? 0.75 : 0.4;

    // Responsibilities confidence
    const responsibilitiesConfidence = responsibilities.length >= 3 ? 1.0 : responsibilities.length >= 1 ? 0.7 : 0.4;

    // Benefits confidence
    const benefitsConfidence = benefits.length >= 2 ? 1.0 : benefits.length >= 1 ? 0.7 : 0.5;

    // 3. Health Score Calculation (0 - 100)
    const overallHealthScore = Math.round(
      summaryConfidence * 0.30 +
      skillsConfidence * 0.20 +
      atsConfidence * 0.20 +
      interviewConfidence * 0.15 +
      responsibilitiesConfidence * 0.10 +
      benefitsConfidence * 0.05
    ) * 100;

    const isValid = errors.length === 0 && overallHealthScore >= 55;

    return {
      isValid,
      overallHealthScore,
      sectionConfidence: {
        summary: Number(summaryConfidence.toFixed(2)),
        skills: Number(skillsConfidence.toFixed(2)),
        ats: Number(atsConfidence.toFixed(2)),
        interview: Number(interviewConfidence.toFixed(2)),
        responsibilities: Number(responsibilitiesConfidence.toFixed(2)),
        benefits: Number(benefitsConfidence.toFixed(2)),
      },
      errors,
      warnings,
    };
  }
}
