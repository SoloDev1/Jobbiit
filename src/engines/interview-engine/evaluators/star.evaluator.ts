import type { IEvaluator, CareerContext, EvaluationResult } from '../../../types/interview.types';

export class STAREvaluator implements IEvaluator {
  public name = 'STAREvaluator';

  public async evaluate(context: CareerContext, question: string, answer: string): Promise<EvaluationResult> {
    const lower = answer.toLowerCase();

    const situationOk = lower.includes('when') || lower.includes('project') || lower.includes('team') || lower.includes('at ') || lower.includes('during');
    const taskOk = lower.includes('goal') || lower.includes('needed to') || lower.includes('task') || lower.includes('responsible') || lower.includes('objective');
    const actionOk = lower.includes('built') || lower.includes('implemented') || lower.includes('designed') || lower.includes('led') || lower.includes('i ');
    const metricsFound = /\d+%|\$\d+|\d+x|\d+ users|\d+ms/i.test(answer);
    const resultOk = metricsFound || lower.includes('result') || lower.includes('outcome') || lower.includes('increased') || lower.includes('reduced');

    let score = 50;
    if (situationOk) score += 12;
    if (taskOk) score += 12;
    if (actionOk) score += 13;
    if (resultOk) score += 13;

    const detectedSignals: string[] = [];
    if (situationOk) detectedSignals.push('Situation Defined');
    if (taskOk) detectedSignals.push('Task Goal Outlined');
    if (actionOk) detectedSignals.push('Direct Action Taken');
    if (resultOk) detectedSignals.push('Outcome & Impact');
    if (metricsFound) detectedSignals.push('Quantifiable Metrics Found');

    const missingElements: string[] = [];
    if (!situationOk) missingElements.push('Situation');
    if (!taskOk) missingElements.push('Task');
    if (!actionOk) missingElements.push('Action');
    if (!resultOk) missingElements.push('Result');
    if (!metricsFound) missingElements.push('Metrics');

    let feedbackTip = 'Great STAR framework response!';
    if (!metricsFound) {
      feedbackTip = 'Add concrete quantitative metrics (e.g. "reduced latency by 35%").';
    } else if (!actionOk) {
      feedbackTip = 'Highlight your specific individual contribution rather than just team effort.';
    }

    return {
      evaluatorName: this.name,
      score,
      passed: score >= 70,
      feedbackTip,
      detectedSignals,
      missingElements,
    };
  }
}

export const starEvaluator = new STAREvaluator();
