import { competencyGraphService } from './competencyGraph.service';
import { logger } from '../core/telemetry/logger.service';
import type { CareerContext } from '../types/interview.types';

export interface InterviewPlan {
  sessionId: string;
  targetRole: string;
  targetCompany: string;
  prioritizedCompetencies: string[];
  recommendedStoriesToPrepare: string[];
  pastWeaknessAlerts: string[];
  predictedCategoryBreakdown: Array<{ category: string; percentage: number }>;
  dailyPreparationGoal: string;
}

export class InterviewPlannerService {
  /**
   * Evaluates context and competency graph to build the pre-interview strategy.
   */
  public async planInterview(context: CareerContext): Promise<InterviewPlan> {
    logger.info({ userId: context.userId, company: context.jobIntelligence.companyName, service: 'InterviewPlannerService' }, 'Planning Interview Strategy');

    const graph = await competencyGraphService.getCompetencyGraph(context.userId);

    // Identify weak competencies (mastery < 70%) to prioritize
    const weakCompetencies = Object.values(graph.vectors)
      .filter((v) => v.masteryPercentage < 75)
      .map((v) => v.name);

    const competenciesToTest = weakCompetencies.length > 0
      ? weakCompetencies
      : ['System Architecture Trade-offs', 'STAR Impact Storytelling', 'Conflict Resolution'];

    return {
      sessionId: context.sessionId || 'session_preview',
      targetRole: context.jobIntelligence.roleTitle,
      targetCompany: context.jobIntelligence.companyName,
      prioritizedCompetencies: competenciesToTest,
      recommendedStoriesToPrepare: [
        'Redis Migration & Distributed Cache Project',
        'Cross-functional Microservices Scale Initiative',
      ],
      pastWeaknessAlerts: [
        'Remember to mention quantitative impact metrics (e.g. latency, %, $).',
        'Highlight your direct personal actions rather than just team actions.',
      ],
      predictedCategoryBreakdown: [
        { category: 'Technical Architecture', percentage: 40 },
        { category: 'Behavioral & STAR', percentage: 30 },
        { category: 'Leadership & Scaling', percentage: 20 },
        { category: 'Culture & Fit', percentage: 10 },
      ],
      dailyPreparationGoal: 'Quantify your past achievements and articulate trade-offs clearly.',
    };
  }
}

export const interviewPlannerService = new InterviewPlannerService();
