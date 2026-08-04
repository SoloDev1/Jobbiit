import type { IEvaluator, CareerContext, EvaluationResult } from '../../../types/interview.types';

export class TechnicalEvaluator implements IEvaluator {
  public name = 'TechnicalEvaluator';

  public async evaluate(context: CareerContext, question: string, answer: string): Promise<EvaluationResult> {
    const lower = answer.toLowerCase();

    const techTerms = context.jobIntelligence.requiredSkills.concat(context.jobIntelligence.atsKeywords);
    const matchedTerms = techTerms.filter((term) => lower.includes(term.toLowerCase()));

    const tradeOffMentioned = lower.includes('trade-off') || lower.includes('latency') || lower.includes('scale') || lower.includes('cache') || lower.includes('architecture');

    let score = 55;
    score += Math.min(30, matchedTerms.length * 10);
    if (tradeOffMentioned) score += 15;

    const detectedSignals = matchedTerms.map((t) => `Tech Keyword: ${t}`);
    if (tradeOffMentioned) detectedSignals.push('System Trade-offs & Scalability Mentioned');

    const missingElements: string[] = [];
    if (!tradeOffMentioned) missingElements.push('Architecture Trade-off Justification');

    let feedbackTip = 'Good technical depth.';
    if (!tradeOffMentioned) {
      feedbackTip = 'Include technical trade-offs (e.g. why Redis caching was selected over memory DB).';
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

export const technicalEvaluator = new TechnicalEvaluator();
