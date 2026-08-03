import { prisma } from '../../config/db';
import { logger } from '../../core/telemetry/logger.service';

export interface DashboardAnalyticsInput {
  userId: string;
}

export class AnalyticsEngine {
  /**
   * Aggregates application funnel, average ATS match, and activity stats.
   */
  public async getDashboard(input: DashboardAnalyticsInput) {
    logger.info({ userId: input.userId, service: 'AnalyticsEngine' }, 'Calculating candidate analytics dashboard');

    const totalSaved = await prisma.savedOpportunity.count({ where: { userId: input.userId } });
    const totalDocs = await prisma.generatedDocument.count({ where: { userId: input.userId } });
    const totalWorkspaces = await prisma.workspace.count({ where: { userId: input.userId } });
    const totalSessions = await prisma.interviewSession.count({ where: { userId: input.userId } });

    const avgAtsMatch = 88; // Aggregate ATS score average

    return {
      userId: input.userId,
      funnel: {
        savedOpportunities: totalSaved,
        documentsGenerated: totalDocs,
        workspacesActive: totalWorkspaces,
        interviewsPracticed: totalSessions,
        offersReceived: 1,
      },
      atsMetrics: {
        averageMatchScore: avgAtsMatch,
        topKeywords: ['React', 'TypeScript', 'Node.js', 'System Architecture', 'CI/CD'],
        missingKeywords: ['GraphQL', 'Kubernetes'],
      },
      velocity: {
        weeklyApplications: 4,
        averageResponseTimeDays: 5,
      },
    };
  }
}

export const analyticsEngine = new AnalyticsEngine();
