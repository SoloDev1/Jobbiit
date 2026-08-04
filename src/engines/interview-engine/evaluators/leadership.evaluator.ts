import type { IEvaluator, CareerContext, EvaluationResult } from '../../../types/interview.types';

export class LeadershipEvaluator implements IEvaluator {
  public name = 'LeadershipEvaluator';

  public async evaluate(context: CareerContext, question: string, answer: string): Promise<EvaluationResult> {
    const lower = answer.toLowerCase();

    const ownershipOk = lower.includes('i took ownership') || lower.includes('decided') || lower.includes('spearheaded') || lower.includes('led');
    const alignmentOk = lower.includes('stakeholder') || lower.includes('alignment') || lower.includes('collaborate') || lower.includes('team');
    const problemSolvingOk = lower.includes('trade-off') || lower.includes('challenge') || lower.includes('solution') || lower.includes('resolved');

    let score = 60;
    if (ownershipOk) score += 15;
    if (alignmentOk) score += 15;
    if (problemSolvingOk) score += 10;

    const detectedSignals: string[] = [];
    if (ownershipOk) detectedSignals.push('Ownership Mindset');
    if (alignmentOk) detectedSignals.push('Cross-Functional Alignment');
    if (problemSolvingOk) detectedSignals.push('Strategic Problem Solving');

    const missingElements: string[] = [];
    if (!ownershipOk) missingElements.push('Explicit Ownership Verbs');
    if (!alignmentOk) missingElements.push('Stakeholder Alignment');

    let feedbackTip = 'Strong leadership signals detected.';
    if (!ownershipOk) {
      feedbackTip = 'Emphasize your personal initiative and ownership in guiding the project.';
    }

    return {
      evaluatorName: this.name,
      score: Math.min(100, score),
      passed: score >= 70,
      feedbackTip,
      detectedSignals,
      missingElements,
    };
  }
}

export const leadershipEvaluator = new LeadershipEvaluator();
