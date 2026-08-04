import type { EvaluationResult } from '../../../types/interview.types';

export type InterviewPersona = 'FRIENDLY_HR' | 'HIRING_MANAGER' | 'TECHNICAL_LEAD' | 'FAANG_INTERVIEWER' | 'CEO_FOUNDER';

/** Persona-specific weights: which evaluators matter most for each persona */
const PERSONA_WEIGHTS: Record<InterviewPersona, { star: number; leadership: number; technical: number }> = {
  FRIENDLY_HR:       { star: 0.50, leadership: 0.35, technical: 0.15 },
  HIRING_MANAGER:    { star: 0.40, leadership: 0.35, technical: 0.25 },
  TECHNICAL_LEAD:    { star: 0.25, leadership: 0.25, technical: 0.50 },
  FAANG_INTERVIEWER: { star: 0.30, leadership: 0.20, technical: 0.50 },
  CEO_FOUNDER:       { star: 0.35, leadership: 0.45, technical: 0.20 },
};

export interface HireSignalResult {
  overallScore: number;
  hireRecommendation: 'STRONG_HIRE' | 'HIRE' | 'LEAN_NO' | 'STRONG_NO';
  summaryTip: string;
  strengthSummary: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

export class HireSignalEvaluator {
  public name = 'HireSignalEvaluator';

  public computeOverallHireSignal(
    evaluations: EvaluationResult[],
    persona: InterviewPersona = 'HIRING_MANAGER'
  ): HireSignalResult {
    if (evaluations.length === 0) {
      return {
        overallScore: 50,
        hireRecommendation: 'LEAN_NO',
        summaryTip: 'No evaluations available. Please provide a more detailed answer.',
        strengthSummary: 'Answer was too short to assess.',
        confidence: 'LOW',
      };
    }

    const weights = PERSONA_WEIGHTS[persona] || PERSONA_WEIGHTS['HIRING_MANAGER'];
    const [starEval, leadershipEval, techEval] = evaluations;

    // Weighted average — each evaluator contributes by its persona weight
    const weightedScore = Math.round(
      (starEval?.score ?? 50) * weights.star +
      (leadershipEval?.score ?? 50) * weights.leadership +
      (techEval?.score ?? 50) * weights.technical
    );
    const overallScore = Math.min(100, Math.max(0, weightedScore));

    // Hire recommendation thresholds
    let hireRecommendation: HireSignalResult['hireRecommendation'] = 'HIRE';
    if (overallScore >= 85) hireRecommendation = 'STRONG_HIRE';
    else if (overallScore >= 70) hireRecommendation = 'HIRE';
    else if (overallScore >= 55) hireRecommendation = 'LEAN_NO';
    else hireRecommendation = 'STRONG_NO';

    // Confidence based on answer completeness
    const avgWordProxy = evaluations.filter((e) => e.passed).length;
    const confidence: HireSignalResult['confidence'] =
      avgWordProxy >= 3 ? 'HIGH' : avgWordProxy >= 2 ? 'MEDIUM' : 'LOW';

    // Primary coaching tip — from the weakest failing evaluator
    const failingEval = evaluations.find((e) => !e.passed);
    const summaryTip = failingEval?.feedbackTip || 'Excellent response across all evaluation dimensions!';

    // Strength summary — from the highest-scoring evaluator
    const bestEval = evaluations.reduce((best, curr) => (curr.score > best.score ? curr : best), evaluations[0]);
    const strengthSummary =
      (bestEval as any).strengthObserved ||
      bestEval.detectedSignals[0] ||
      'Strong foundational response structure.';

    return {
      overallScore,
      hireRecommendation,
      summaryTip,
      strengthSummary,
      confidence,
    };
  }
}

export const hireSignalEvaluator = new HireSignalEvaluator();
