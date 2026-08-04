import type { EvaluationResult } from '../../../types/interview.types';

export class HireSignalEvaluator {
  public name = 'HireSignalEvaluator';

  public computeOverallHireSignal(evaluations: EvaluationResult[]): {
    overallScore: number;
    hireRecommendation: 'STRONG_HIRE' | 'HIRE' | 'LEAN_NO' | 'STRONG_NO';
    summaryTip: string;
  } {
    if (evaluations.length === 0) {
      return { overallScore: 75, hireRecommendation: 'HIRE', summaryTip: 'Solid response.' };
    }

    const totalScore = evaluations.reduce((acc, curr) => acc + curr.score, 0);
    const overallScore = Math.round(totalScore / evaluations.length);

    let hireRecommendation: 'STRONG_HIRE' | 'HIRE' | 'LEAN_NO' | 'STRONG_NO' = 'HIRE';
    if (overallScore >= 85) hireRecommendation = 'STRONG_HIRE';
    else if (overallScore >= 70) hireRecommendation = 'HIRE';
    else if (overallScore >= 55) hireRecommendation = 'LEAN_NO';
    else hireRecommendation = 'STRONG_NO';

    const mainTip = evaluations.find((e) => !e.passed)?.feedbackTip || 'Excellent STAR structure and quantitative impact!';

    return {
      overallScore,
      hireRecommendation,
      summaryTip: mainTip,
    };
  }
}

export const hireSignalEvaluator = new HireSignalEvaluator();
