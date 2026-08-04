import { logger } from '../core/telemetry/logger.service';

export interface ExplainableSignal {
  signal: string;
  detected: boolean;
  evidence?: string;
  confidence: number;
  reasoning: string;
}

export class EvaluationEngineService {
  /**
   * Generates explainable evaluation signals from candidate answer text.
   */
  public generateExplainableSignals(answerText: string): ExplainableSignal[] {
    logger.info({ answerLength: answerText.length, service: 'EvaluationEngineService' }, 'Generating explainable evaluation signals');

    const hasMetrics = /\d+%|\$\d+|\d+x|\d+ users|\d+ms/i.test(answerText);
    const hasLeadership = /led|spearheaded|decided|coordinated|owned/i.test(answerText);
    const hasTechDepth = /architecture|cache|latency|database|microservices|redis|queue/i.test(answerText);

    return [
      {
        signal: 'Quantifiable Metrics Present',
        detected: hasMetrics,
        evidence: hasMetrics ? answerText.match(/\d+%|\$\d+|\d+x|\d+ users|\d+ms/i)?.[0] : undefined,
        confidence: 0.95,
        reasoning: hasMetrics ? 'Explicit quantitative metric detected.' : 'No latency, cost, or percentage numbers found in response.',
      },
      {
        signal: 'Leadership & Ownership Verbs',
        detected: hasLeadership,
        evidence: hasLeadership ? 'Action verbs identified' : undefined,
        confidence: 0.88,
        reasoning: hasLeadership ? 'Candidate used direct ownership action verbs.' : 'Response relies heavily on team actions ("we") rather than direct personal actions.',
      },
      {
        signal: 'Technical Depth & Trade-offs',
        detected: hasTechDepth,
        evidence: hasTechDepth ? 'Architectural terminology used' : undefined,
        confidence: 0.92,
        reasoning: hasTechDepth ? 'Candidate articulated technical components.' : 'Response lacks specific architectural terms.',
      },
    ];
  }
}

export const evaluationEngineService = new EvaluationEngineService();
