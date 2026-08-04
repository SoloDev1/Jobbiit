import type { IEvaluator, CareerContext, EvaluationResult } from '../../../types/interview.types';
import { aiRouter } from '../../../services/aiRouter.service';
import { PromptLibrary } from '../../../services/promptLibrary.service';
import { logger } from '../../../core/telemetry/logger.service';

interface LeadershipEvalResult {
  ownershipScore: number;
  alignmentScore: number;
  influenceScore: number;
  conflictResolutionScore: number;
  totalScore: number;
  detectedSignals: string[];
  missingSignals: string[];
  feedbackTip: string;
  strengthObserved: string;
}

export class LeadershipEvaluator implements IEvaluator {
  public name = 'LeadershipEvaluator';

  public async evaluate(context: CareerContext, question: string, answer: string): Promise<EvaluationResult> {
    const wordCount = answer.trim().split(/\s+/).length;
    if (wordCount < 20) {
      return {
        evaluatorName: this.name,
        score: 35,
        passed: false,
        feedbackTip: 'Provide more context about your leadership role, decision-making, and the impact you drove.',
        detectedSignals: [],
        missingElements: ['Ownership Mindset', 'Cross-Functional Alignment', 'Influence Without Authority'],
      };
    }

    try {
      const prompt = PromptLibrary.EVAL_LEADERSHIP_v1;
      const response = await aiRouter.complete({
        task: 'ANSWER_EVALUATE_LEADERSHIP',
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.buildUserPrompt(question, answer),
        jsonMode: true,
      });

      const result: LeadershipEvalResult = aiRouter.parseJSON(response, this.regexFallback(answer) as any);

      logger.info(
        { score: result.totalScore, signals: result.detectedSignals, service: 'LeadershipEvaluator' },
        'Leadership evaluation completed'
      );

      return {
        evaluatorName: this.name,
        score: Math.min(100, Math.max(0, result.totalScore)),
        passed: result.totalScore >= 70,
        feedbackTip: result.feedbackTip,
        strengthObserved: result.strengthObserved,
        detectedSignals: result.detectedSignals,
        missingElements: result.missingSignals,
      };
    } catch (err: any) {
      logger.warn({ error: err.message, service: 'LeadershipEvaluator' }, 'LLM evaluation failed, using regex fast-path');
      return this.regexFallback(answer);
    }
  }

  private regexFallback(answer: string): EvaluationResult {
    const lower = answer.toLowerCase();
    const ownershipOk = /i took ownership|decided|spearheaded|led|i initiated|i drove/i.test(lower);
    const alignmentOk = /stakeholder|alignment|collaborate|team|cross-functional/i.test(lower);
    const influenceOk = /persuaded|convinced|influenced|without authority|buy-in/i.test(lower);
    const problemSolvingOk = /trade-off|challenge|solution|resolved|navigated/i.test(lower);

    let score = 50;
    if (ownershipOk) score += 15;
    if (alignmentOk) score += 12;
    if (influenceOk) score += 13;
    if (problemSolvingOk) score += 10;

    const detectedSignals: string[] = [];
    if (ownershipOk) detectedSignals.push('Ownership Mindset');
    if (alignmentOk) detectedSignals.push('Cross-Functional Alignment');
    if (influenceOk) detectedSignals.push('Influence Without Authority');
    if (problemSolvingOk) detectedSignals.push('Strategic Problem Solving');

    const missingElements: string[] = [];
    if (!ownershipOk) missingElements.push('Explicit Ownership Verbs');
    if (!alignmentOk) missingElements.push('Stakeholder Alignment');
    if (!influenceOk) missingElements.push('Influence Without Authority');

    return {
      evaluatorName: this.name,
      score: Math.min(100, score),
      passed: score >= 70,
      feedbackTip: !ownershipOk
        ? 'Use first-person ownership language: "I decided", "I led", "I initiated" to demonstrate personal accountability.'
        : !influenceOk
          ? 'Describe a situation where you influenced others without direct authority — this is a top leadership signal.'
          : 'Strong leadership signals detected.',
      detectedSignals,
      missingElements,
    };
  }
}

export const leadershipEvaluator = new LeadershipEvaluator();
