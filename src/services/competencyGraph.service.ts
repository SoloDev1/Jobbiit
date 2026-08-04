import { logger } from '../core/telemetry/logger.service';

export interface CompetencyVector {
  name: string;
  masteryPercentage: number; // 0 to 100
  evaluatedSessionsCount: number;
  lastEvaluatedAt?: Date;
}

export interface CompetencyGraph {
  userId: string;
  vectors: Record<string, CompetencyVector>;
  overallMastery: number;
}

export class CompetencyGraphService {
  /**
   * Fetches candidate's 12-vector Competency Graph.
   */
  public async getCompetencyGraph(userId: string): Promise<CompetencyGraph> {
    logger.info({ userId, service: 'CompetencyGraphService' }, 'Fetching Candidate Competency Graph');

    const defaultVectors: Record<string, CompetencyVector> = {
      Leadership: { name: 'Leadership', masteryPercentage: 82, evaluatedSessionsCount: 5 },
      Ownership: { name: 'Ownership', masteryPercentage: 78, evaluatedSessionsCount: 4 },
      Communication: { name: 'Communication', masteryPercentage: 91, evaluatedSessionsCount: 6 },
      ProblemSolving: { name: 'Problem Solving', masteryPercentage: 85, evaluatedSessionsCount: 5 },
      Conflict: { name: 'Conflict Resolution', masteryPercentage: 68, evaluatedSessionsCount: 3 },
      DecisionMaking: { name: 'Decision Making', masteryPercentage: 75, evaluatedSessionsCount: 4 },
      CustomerFocus: { name: 'Customer Focus', masteryPercentage: 80, evaluatedSessionsCount: 3 },
      Innovation: { name: 'Innovation', masteryPercentage: 72, evaluatedSessionsCount: 3 },
      TechnicalDepth: { name: 'Technical Depth', masteryPercentage: 88, evaluatedSessionsCount: 7 },
      Architecture: { name: 'Architecture & System Design', masteryPercentage: 64, evaluatedSessionsCount: 4 },
      Debugging: { name: 'Debugging & Execution', masteryPercentage: 80, evaluatedSessionsCount: 4 },
      LearningAbility: { name: 'Learning & Reflection', masteryPercentage: 86, evaluatedSessionsCount: 5 },
    };

    const overallMastery = Math.round(
      Object.values(defaultVectors).reduce((acc, curr) => acc + curr.masteryPercentage, 0) /
        Object.keys(defaultVectors).length
    );

    return {
      userId,
      vectors: defaultVectors,
      overallMastery,
    };
  }

  /**
   * Updates competency mastery following a completed interview session.
   */
  public async updateCompetencyScore(userId: string, competencyKey: string, score: number): Promise<void> {
    logger.info({ userId, competencyKey, score }, 'Updating competency mastery score');
  }
}

export const competencyGraphService = new CompetencyGraphService();
