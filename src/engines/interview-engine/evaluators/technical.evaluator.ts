import type { IEvaluator, CareerContext, EvaluationResult } from '../../../types/interview.types';
import { aiRouter } from '../../../services/aiRouter.service';
import { PromptLibrary } from '../../../services/promptLibrary.service';
import { logger } from '../../../core/telemetry/logger.service';

interface TechnicalEvalResult {
  technicalDepthScore: number;
  tradeoffScore: number;
  scalabilityScore: number;
  totalScore: number;
  relevantSkillsDetected: string[];
  missingTechnicalDepth: string[];
  feedbackTip: string;
  strengthObserved: string;
}

export class TechnicalEvaluator implements IEvaluator {
  public name = 'TechnicalEvaluator';

  public async evaluate(context: CareerContext, question: string, answer: string): Promise<EvaluationResult> {
    const wordCount = answer.trim().split(/\s+/).length;
    if (wordCount < 20) {
      return {
        evaluatorName: this.name,
        score: 35,
        passed: false,
        feedbackTip: 'Provide more technical depth — describe the architecture, tools, and trade-offs you considered.',
        detectedSignals: [],
        missingElements: ['Technical Depth', 'Architecture Trade-offs', 'Scalability Thinking'],
      };
    }

    // Build role-specific context for the evaluator
    const requiredSkills = context.jobIntelligence.requiredSkills.slice(0, 8).join(', ') || 'Software Engineering';
    const seniorityLevel = context.jobIntelligence.seniorityLevel || 'MID_LEVEL';

    try {
      const prompt = PromptLibrary.EVAL_TECHNICAL_v1;
      const historyText = context.conversationHistory && context.conversationHistory.length > 0
        ? context.conversationHistory.map((h: any) => `${h.speaker}: ${h.text}`).join('\n')
        : '';
      const userPrompt = prompt.buildUserPrompt(question, answer, requiredSkills, seniorityLevel) +
        (historyText ? `\n\nConversation history for context:\n${historyText}` : '');

      const response = await aiRouter.complete({
        task: 'ANSWER_EVALUATE_TECHNICAL',
        systemPrompt: prompt.systemPrompt,
        userPrompt,
        jsonMode: true,
      });

      const result: TechnicalEvalResult = aiRouter.parseJSON(response, this.regexFallback(context, answer) as any);

      const detectedSignals = result.relevantSkillsDetected.map((s) => `Tech Keyword: ${s}`);
      if (result.tradeoffScore >= 20) detectedSignals.push('System Trade-offs & Scalability Mentioned');

      logger.info(
        { score: result.totalScore, skillsDetected: result.relevantSkillsDetected, service: 'TechnicalEvaluator' },
        'Technical evaluation completed'
      );

      return {
        evaluatorName: this.name,
        score: Math.min(100, Math.max(0, result.totalScore)),
        passed: result.totalScore >= 70,
        feedbackTip: result.feedbackTip,
        strengthObserved: result.strengthObserved,
        detectedSignals,
        missingElements: result.missingTechnicalDepth,
      };
    } catch (err: any) {
      logger.warn({ error: err.message, service: 'TechnicalEvaluator' }, 'LLM evaluation failed, using regex fast-path');
      return this.regexFallback(context, answer);
    }
  }

  private regexFallback(context: CareerContext, answer: string): EvaluationResult {
    const lower = answer.toLowerCase();
    const techTerms = [
      ...context.jobIntelligence.requiredSkills,
      ...context.jobIntelligence.atsKeywords,
    ];
    const matchedTerms = techTerms.filter((term) => lower.includes(term.toLowerCase()));
    const tradeOffMentioned = /trade-off|latency|scale|cache|architecture|distributed|reliability|throughput/i.test(lower);

    let score = 45;
    score += Math.min(30, matchedTerms.length * 8);
    if (tradeOffMentioned) score += 20;

    const detectedSignals = matchedTerms.slice(0, 6).map((t) => `Tech Keyword: ${t}`);
    if (tradeOffMentioned) detectedSignals.push('System Trade-offs & Scalability Mentioned');

    return {
      evaluatorName: this.name,
      score: Math.min(100, score),
      passed: score >= 70,
      feedbackTip: !tradeOffMentioned
        ? 'Include technical trade-offs — explain why you chose a particular approach over alternatives.'
        : 'Good technical depth. Consider also discussing operational implications like monitoring and alerting.',
      detectedSignals,
      missingElements: !tradeOffMentioned ? ['Architecture Trade-off Justification'] : [],
    };
  }
}

export const technicalEvaluator = new TechnicalEvaluator();
