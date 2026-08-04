import { OpportunityIntelligenceService } from './opportunityIntelligence.service';
import { profileRepository } from '../repositories/profile.repository';
import { interviewRepository } from '../repositories/interview.repository';
import { jobIntelligenceEngine } from '../engines/interview-engine/job-intelligence.engine';
import { logger } from '../core/telemetry/logger.service';
import type { CareerContext, CreateSessionInputV3, JobIntelligenceData } from '../types/interview.types';

export class InterviewContextBuilderService {
  /**
   * Aggregates profile, job intelligence, and memory into unified CareerContext.
   */
  public async buildContext(input: CreateSessionInputV3): Promise<CareerContext> {
    logger.info({ userId: input.userId, sourceType: input.sourceType, service: 'InterviewContextBuilderService' }, 'Building Unified CareerContext');

    // 1. Fetch Candidate Profile Summary
    const profile = await profileRepository.findByUserId(input.userId).catch(() => null);
    const candidateName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'Candidate';
    const candidateHeadline = profile?.headline || 'Software Specialist';
    const rawSkills = profile?.skills || ['Software Engineering', 'Problem Solving'];
    const candidateSkills: string[] = Array.isArray(rawSkills)
      ? rawSkills.map((s: any) => (typeof s === 'string' ? s : s.name || String(s)))
      : ['Software Engineering', 'Problem Solving'];

    // 2. Fetch or Extract Job Intelligence
    let jobIntel: JobIntelligenceData = {
      companyName: input.extractedCompany || 'Target Organization',
      roleTitle: input.extractedRole || 'Software Role',
      seniorityLevel: input.extractedLevel || 'MID_LEVEL',
      requiredSkills: ['System Design', 'Communication', 'STAR Storytelling'],
      atsKeywords: ['leadership', 'impact', 'scalability'],
      jobDescriptionText: input.rawInputText || undefined,
    };

    if (input.sourceType === 'OPPORTUNITY' && input.opportunityId) {
      const oppAnalysis = await OpportunityIntelligenceService.getOpportunityAnalysis(input.opportunityId);
      jobIntel = {
        companyName: oppAnalysis.summary ? oppAnalysis.summary.split(' ')[0] : 'Target Company',
        roleTitle: 'Target Position',
        seniorityLevel: oppAnalysis.careerLevel || 'INTERMEDIATE',
        requiredSkills: oppAnalysis.requiredSkills || ['Problem Solving'],
        atsKeywords: oppAnalysis.atsKeywords || ['STAR Framework'],
        jobDescriptionText: oppAnalysis.summary,
      };
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

    // 3. Fetch Candidate Past Memory & Stories
    const pastSessions = await interviewRepository.listUserSessions(input.userId).catch(() => []);
    const totalSessionsCompleted = pastSessions.length;
    const avgScore = pastSessions.length > 0
      ? Math.round(pastSessions.reduce((acc, s) => acc + (s.readinessScore || 70), 0) / pastSessions.length)
      : 75;

    return {
      sessionId: '', // Will be assigned upon session creation
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
        mission: `Innovate and build high-impact solutions at ${jobIntel.companyName}.`,
        cultureValues: ['Customer Obsession', 'Ownership', 'Bias for Action', 'Technical Rigor'],
        techStack: jobIntel.requiredSkills,
      },
      practiceCategory: input.practiceCategory,
      persona: input.persona || 'HIRING_MANAGER',
      difficulty: (input.difficulty as any) || 'INTERMEDIATE',
      pastMemory: {
        totalSessionsCompleted,
        averageStarScore: avgScore,
        frequentlyMissedSections: ['METRICS', 'RESULT'],
        recurringWeaknesses: ['Quantifiable Impact Metrics'],
        savedStories: [],
      },
    };
  }
}

export const interviewContextBuilderService = new InterviewContextBuilderService();
