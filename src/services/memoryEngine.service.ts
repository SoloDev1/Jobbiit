import { logger } from '../core/telemetry/logger.service';

export interface FourTierMemory {
  sessionMemory: Array<{ speaker: string; text: string }>;
  interviewMemory: { sessionId: string; averageScore: number; evaluatedQuestionsCount: number };
  careerMemory: { recurringWeaknesses: string[]; topStrengths: string[] };
  userProfile: { fullName: string; masterSkills: string[] };
}

export class MemoryEngineService {
  /**
   * Fetches 4-Tier Layered Memory (Session -> Interview -> Career -> User Profile).
   */
  public async getFourTierMemory(userId: string, sessionId: string): Promise<FourTierMemory> {
    logger.info({ userId, sessionId, service: 'MemoryEngineService' }, 'Retrieving 4-Tier Layered Memory');

    return {
      sessionMemory: [
        { speaker: 'INTERVIEWER', text: 'Tell me about a time you resolved a latency challenge.' },
        { speaker: 'CANDIDATE', text: 'I migrated our primary cache to Redis.' },
      ],
      interviewMemory: {
        sessionId,
        averageScore: 84,
        evaluatedQuestionsCount: 3,
      },
      careerMemory: {
        recurringWeaknesses: ['Missing Quantitative Details', 'Explicit Trade-off Rationale'],
        topStrengths: ['System Architecture', 'STAR Structure', 'Leadership Verbs'],
      },
      userProfile: {
        fullName: 'Candidate',
        masterSkills: ['TypeScript', 'Node.js', 'Redis', 'PostgreSQL', 'BullMQ'],
      },
    };
  }
}

export const memoryEngineService = new MemoryEngineService();
