import { OpportunityIntelligenceService } from './opportunityIntelligence.service';
import { profileRepository } from '../repositories/profile.repository';
import { interviewRepository } from '../repositories/interview.repository';
import { opportunityRepository } from '../repositories/opportunity.repository';
import { jobIntelligenceEngine } from '../engines/interview-engine/job-intelligence.engine';
import { logger } from '../core/telemetry/logger.service';
import type { CareerContext, CreateSessionInputV3, JobIntelligenceData } from '../types/interview.types';

export class InterviewContextBuilderService {
  /**
   * Aggregates profile, job intelligence, and memory into unified CareerContext.
   * Correctly maps opportunity data to company name and role title.
   */
  public async buildContext(input: CreateSessionInputV3): Promise<CareerContext> {
    logger.info({ userId: input.userId, sourceType: input.sourceType, service: 'InterviewContextBuilderService' }, 'Building Unified CareerContext');

    // 1. Fetch Candidate Profile Summary
    const profile = await profileRepository.findByUserId(input.userId).catch(() => null);
    const candidateName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'Candidate';
    const candidateHeadline = profile?.headline || 'Professional';
    const rawSkills = profile?.skills || [];
    const candidateSkills: string[] = Array.isArray(rawSkills)
      ? rawSkills.map((s: any) => (typeof s === 'string' ? s : s.name || String(s))).filter(Boolean)
      : [];

    if (candidateSkills.length === 0) candidateSkills.push('Software Engineering', 'Problem Solving');

    // 2. Fetch or Extract Job Intelligence
    let jobIntel: JobIntelligenceData = {
      companyName: input.extractedCompany || 'Target Organization',
      roleTitle: input.extractedRole || 'Professional',
      seniorityLevel: input.extractedLevel || 'MID_LEVEL',
      requiredSkills: ['System Design', 'Communication', 'STAR Storytelling'],
      atsKeywords: ['leadership', 'impact', 'scalability'],
      jobDescriptionText: input.rawInputText || undefined,
    };

    if (input.sourceType === 'OPPORTUNITY' && input.opportunityId) {
      // Use the opportunity record directly for company + role — never parse from summary
      const [oppAnalysis, oppRecord] = await Promise.all([
        OpportunityIntelligenceService.getOpportunityAnalysis(input.opportunityId).catch(() => null),
        // Attempt to fetch the raw opportunity for accurate title/org
        this.getOpportunityRecord(input.opportunityId),
      ]);

      if (oppAnalysis) {
        jobIntel = {
          companyName: oppRecord?.organisation || input.extractedCompany || 'Target Company',
          roleTitle: oppRecord?.title || input.extractedRole || 'Target Position',
          seniorityLevel: oppAnalysis.careerLevel || 'INTERMEDIATE',
          requiredSkills: oppAnalysis.requiredSkills?.length > 0 ? oppAnalysis.requiredSkills : ['Problem Solving'],
          atsKeywords: oppAnalysis.atsKeywords?.length > 0 ? oppAnalysis.atsKeywords : ['STAR Framework', 'Impact'],
          jobDescriptionText: oppAnalysis.summary,
        };
      }
    } else if (input.sourceType !== 'PRACTICE' && (input.rawInputText || input.sourceUrl)) {
      jobIntel = await jobIntelligenceEngine.ingestJob({
        userId: input.userId,
        sourceType: input.sourceType,
        inputText: input.rawInputText,
        jobUrl: input.sourceUrl,
        company: input.extractedCompany,
        role: input.extractedRole,
      });
    }

    // 3. Fetch Candidate Past Memory & Compute Real Signals
    const pastSessions = await interviewRepository.listUserSessions(input.userId).catch(() => []);
    const totalSessionsCompleted = pastSessions.length;
    const avgScore = pastSessions.length > 0
      ? Math.round(pastSessions.reduce((acc, s: any) => acc + (s.readinessScore || s.avgScore || 70), 0) / pastSessions.length)
      : 70;

    // Compute frequently missed sections from real feedback history
    const { frequentlyMissed, recurringWeaknesses } = await this.computePastMemorySignals(input.userId);

    return {
      sessionId: '',
      userId: input.userId,
      sourceType: input.sourceType,
      candidate: {
        fullName: candidateName,
        headline: candidateHeadline,
        skills: candidateSkills,
        experienceLevel: jobIntel.seniorityLevel,
      },
      jobIntelligence: jobIntel,
      companyIntelligence: {
        mission: `Build high-impact solutions at ${jobIntel.companyName}.`,
        cultureValues: ['Customer Obsession', 'Ownership', 'Bias for Action', 'Technical Rigor'],
        techStack: jobIntel.requiredSkills,
      },
      practiceCategory: input.practiceCategory,
      persona: input.persona || 'HIRING_MANAGER',
      difficulty: (input.difficulty as any) || 'INTERMEDIATE',
      pastMemory: {
        totalSessionsCompleted,
        averageStarScore: avgScore,
        frequentlyMissedSections: frequentlyMissed,
        recurringWeaknesses,
        savedStories: [],
      },
    };
  }

  /**
   * Fetches raw opportunity record for accurate org/title data.
   */
  private async getOpportunityRecord(opportunityId: string): Promise<{ organisation: string; title: string } | null> {
    try {
      const opp = await opportunityRepository.findById(opportunityId);
      return opp ? { organisation: opp.organisation, title: opp.title } : null;
    } catch {
      return null;
    }
  }

  /**
   * Computes frequently missed STAR sections and recurring weaknesses from real feedback history.
   */
  private async computePastMemorySignals(userId: string): Promise<{
    frequentlyMissed: Array<'SITUATION' | 'TASK' | 'ACTION' | 'RESULT' | 'METRICS'>;
    recurringWeaknesses: string[];
  }> {
    try {
      // listUserSessions includes feedbacks via Prisma relation
      const sessions = await interviewRepository.listUserSessions(userId).catch(() => []);
      const feedbackHistory = sessions.flatMap((s: any) => s.feedbacks || []);

      if (!feedbackHistory || feedbackHistory.length === 0) {
        return {
          frequentlyMissed: ['METRICS' as const, 'RESULT' as const],
          recurringWeaknesses: ['Quantifiable Impact Metrics'],
        };
      }

      // Count misses across all past feedback
      let missedMetrics = 0, missedResult = 0, missedAction = 0, missedSituation = 0, missedTask = 0;
      for (const fb of feedbackHistory as any[]) {
        if (!fb.metricsFound) missedMetrics++;
        if (!fb.resultOk) missedResult++;
        if (!fb.actionOk) missedAction++;
        if (!fb.situationOk) missedSituation++;
        if (!fb.taskOk) missedTask++;
      }

      const total = feedbackHistory.length;
      const frequentlyMissed: Array<'SITUATION' | 'TASK' | 'ACTION' | 'RESULT' | 'METRICS'> = [];
      if (missedMetrics / total > 0.5) frequentlyMissed.push('METRICS');
      if (missedResult / total > 0.5) frequentlyMissed.push('RESULT');
      if (missedAction / total > 0.4) frequentlyMissed.push('ACTION');
      if (missedSituation / total > 0.4) frequentlyMissed.push('SITUATION');
      if (missedTask / total > 0.4) frequentlyMissed.push('TASK');

      const recurringWeaknesses: string[] = [];
      if (missedMetrics / total > 0.5) recurringWeaknesses.push('Quantifiable Impact Metrics');
      if (missedAction / total > 0.4) recurringWeaknesses.push('First-Person Ownership Language');
      if (missedResult / total > 0.5) recurringWeaknesses.push('Outcome & Business Impact');

      return {
        frequentlyMissed: frequentlyMissed.length > 0 ? frequentlyMissed : ['METRICS' as const],
        recurringWeaknesses: recurringWeaknesses.length > 0 ? recurringWeaknesses : ['Quantifiable Impact'],
      };
    } catch {
      return {
        frequentlyMissed: ['METRICS' as const, 'RESULT' as const],
        recurringWeaknesses: ['Quantifiable Impact Metrics'],
      };
    }
  }
}

export const interviewContextBuilderService = new InterviewContextBuilderService();
