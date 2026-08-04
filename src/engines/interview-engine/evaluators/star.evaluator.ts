import type { IEvaluator, CareerContext, EvaluationResult } from '../../../types/interview.types';
import { aiRouter } from '../../../services/aiRouter.service';
import { PromptLibrary } from '../../../services/promptLibrary.service';
import { logger } from '../../../core/telemetry/logger.service';

interface STAREvalResult {
  situationScore: number;
  taskScore: number;
  actionScore: number;
  resultScore: number;
  totalScore: number;
  metricsFound: boolean;
  metricEvidence: string;
  missingElements: string[];
  feedbackTip: string;
  strengthObserved: string;
  improvedAnswerHint: string;
}

export class STAREvaluator implements IEvaluator {
  public name = 'STAREvaluator';

  public async evaluate(context: CareerContext, question: string, answer: string): Promise<EvaluationResult> {
    // Fast-path: skip LLM for very short answers (< 30 words)
    const wordCount = answer.trim().split(/\s+/).length;
    if (wordCount < 30) {
      return {
        evaluatorName: this.name,
        score: 30,
        passed: false,
        feedbackTip: 'Your answer is too brief. Use the STAR framework: describe the Situation, Task, your specific Actions, and quantified Results.',
        detectedSignals: [],
        missingElements: ['Situation', 'Task', 'Action', 'Result', 'Metrics'],
      };
    }

    try {
      const prompt = PromptLibrary.EVAL_STAR_v1;
      const response = await aiRouter.complete({
        task: 'ANSWER_EVALUATE_STAR',
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.buildUserPrompt(question, answer),
        jsonMode: true,
      });

      const result: STAREvalResult = aiRouter.parseJSON(response, this.getFallback(answer));

      const detectedSignals: string[] = [];
      if (result.situationScore >= 15) detectedSignals.push('Situation Defined');
      if (result.taskScore >= 15) detectedSignals.push('Task Goal Outlined');
      if (result.actionScore >= 15) detectedSignals.push('Direct Action Taken');
      if (result.resultScore >= 15) detectedSignals.push('Outcome & Impact');
      if (result.metricsFound) detectedSignals.push('Quantifiable Metrics Found');

      logger.info(
        { score: result.totalScore, signals: detectedSignals, service: 'STAREvaluator' },
        'STAR evaluation completed'
      );

      return {
        evaluatorName: this.name,
        score: Math.min(100, Math.max(0, result.totalScore)),
        passed: result.totalScore >= 70,
        feedbackTip: result.feedbackTip,
        strengthObserved: result.strengthObserved,
        improvedAnswerHint: result.improvedAnswerHint,
        detectedSignals,
        missingElements: result.missingElements,
      };
    } catch (err: any) {
      logger.warn({ error: err.message, service: 'STAREvaluator' }, 'LLM evaluation failed, using regex fast-path');
      return this.regexFallback(answer);
    }
  }

  /** Regex fast-path used only when LLM is unavailable */
  private regexFallback(answer: string): EvaluationResult {
    const lower = answer.toLowerCase();
    const situationOk = /when|project|team|at |during/i.test(lower);
    const taskOk = /goal|needed to|task|responsible|objective/i.test(lower);
    const actionOk = /built|implemented|designed|led|i /i.test(lower);
    const metricsFound = /\d+%|\$\d+|\d+x|\d+ users|\d+ms/i.test(answer);
    const resultOk = metricsFound || /result|outcome|increased|reduced/i.test(lower);

    let score = 40;
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

    return {
      evaluatorName: this.name,
      score,
      passed: score >= 70,
      feedbackTip: !metricsFound
        ? 'Add concrete quantitative metrics (e.g. "reduced latency by 35%").'
        : 'Highlight your specific individual contribution rather than just team effort.',
      detectedSignals,
      missingElements,
    };
  }

  private getFallback(answer: string): STAREvalResult {
    return this.regexFallback(answer) as any;
  }
}

export const starEvaluator = new STAREvaluator();
