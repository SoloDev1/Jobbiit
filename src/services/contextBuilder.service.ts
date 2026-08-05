import { profileRepository } from '../repositories/profile.repository';
import { OpportunityIntelligenceService } from './opportunityIntelligence.service';
import { opportunityRepository } from '../repositories/opportunity.repository';
import { interviewRepository } from '../repositories/interview.repository';
import { jobIntelligenceEngine } from '../engines/interview-engine/job-intelligence.engine';
import { logger } from '../core/telemetry/logger.service';
import { ValidationError } from '../core/errors/domain-error';
import type { CareerContext, CreateSessionInputV3, JobIntelligenceData } from '../types/interview.types';

// ─── Tri-Model Context Interface Types ────────────────────────────────────────

export interface CandidateContext {
  userId: string;
  fullName: string;
  headline: string;
  skills: string[];
  experienceLevel: string;
  savedStories: any[];
  weaknessHistory: string[];
  conversationHistory?: any[];
}

export interface OpportunityContext {
  opportunityId?: string;
  companyName: string;
  roleTitle: string;
  seniorityLevel: string;
  jobDescriptionText?: string;
  requiredSkills: string[];
  atsKeywords: string[];
  companyIntelligence: {
    mission?: string;
    cultureValues?: string[];
    leadershipPrinciples?: string[];
    techStack?: string[];
  };
}

export interface InterviewContextModel {
  sessionId: string;
  sourceType: string;
  currentPhase: 'GREETING' | 'WARMUP' | 'CORE' | 'FOLLOW_UP' | 'CHALLENGE' | 'REFLECTION' | 'WRAP_UP' | 'REPORT';
  activePersona: 'FRIENDLY_HR' | 'HIRING_MANAGER' | 'TECHNICAL_LEAD' | 'FAANG_INTERVIEWER' | 'CEO_FOUNDER';
  difficultyLevel: string;
  activeCompetencyIndex: number;
  activeObjective: string;
}

export interface TriModelContext {
  candidate: CandidateContext;
  opportunity: OpportunityContext;
  interview: InterviewContextModel;
}

// ─── ContextBuilderService ───────────────────────────────────────────────────

export class ContextBuilderService {
  /**
   * Builds Tri-Model Context segregating Candidate, Opportunity, and Interview contexts.
   */
  public async buildTriModelContext(input: {
    userId: string;
    sessionId?: string;
    sourceType?: string;
    opportunityId?: string;
    companyName?: string;
    roleTitle?: string;
    persona?: any;
    conversationHistory?: any[];
  }): Promise<TriModelContext> {
    logger.info({ userId: input.userId, sourceType: input.sourceType, service: 'ContextBuilderService' }, 'Building Tri-Model Context');

    // 1. Candidate Context
    const profile = await profileRepository.findByUserId(input.userId).catch(() => null);
    const fullName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'Candidate';
    const headline = profile?.headline || 'Professional';
    const rawSkills = profile?.skills || ['Problem Solving', 'Engineering Architecture'];
    const skills: string[] = Array.isArray(rawSkills)
      ? rawSkills.map((s: any) => (typeof s === 'string' ? s : s.name || String(s)))
      : ['Problem Solving', 'Engineering Architecture'];

    const candidateContext: CandidateContext = {
      userId: input.userId,
      fullName,
      headline,
      skills,
      experienceLevel: 'SENIOR',
      savedStories: [],
      weaknessHistory: ['Quantifiable Impact Metrics'],
      conversationHistory: input.conversationHistory || [],
    };

    // 2. Opportunity Context
    let companyName = input.companyName;
    let roleTitle = input.roleTitle;
    let requiredSkills = ['System Architecture', 'API Design', 'Distributed Caching'];
    let atsKeywords = ['scalability', 'performance', 'ownership'];

    if (input.opportunityId) {
      const [analysis, oppRecord] = await Promise.all([
        OpportunityIntelligenceService.getOpportunityAnalysis(input.opportunityId).catch(() => null),
        opportunityRepository.findById(input.opportunityId).catch(() => null),
      ]);
      if (oppRecord) {
        companyName = oppRecord.organisation || companyName;
        roleTitle = oppRecord.title || roleTitle;
      }
      if (analysis) {
        if (!oppRecord) {
          companyName = analysis.summary ? analysis.summary.split(' ')[0] : companyName;
        }
        requiredSkills = analysis.requiredSkills?.length > 0 ? analysis.requiredSkills : requiredSkills;
        atsKeywords = analysis.atsKeywords?.length > 0 ? analysis.atsKeywords : atsKeywords;
      }
    }

    if (!companyName || !roleTitle) {
      throw new ValidationError('Could not determine target company or role title for this interview. Please provide them explicitly.');
    }

    const opportunityContext: OpportunityContext = {
      opportunityId: input.opportunityId,
      companyName,
      roleTitle,
      seniorityLevel: 'SENIOR',
      requiredSkills,
      atsKeywords,
      companyIntelligence: {
        mission: `Scale payment & economic infrastructure globally at ${companyName}.`,
        cultureValues: ['Users First', 'Move Fast with Quality', 'Ownership'],
        leadershipPrinciples: ['Customer Obsession', 'Bias for Action', 'Technical Excellence'],
        techStack: requiredSkills,
      },
    };

    // 3. Interview Context
    const interviewContext: InterviewContextModel = {
      sessionId: input.sessionId || 'session_draft',
      sourceType: input.sourceType || 'CUSTOM_TEXT',
      currentPhase: 'CORE',
      activePersona: input.persona || 'TECHNICAL_LEAD',
      difficultyLevel: 'INTERMEDIATE',
      activeCompetencyIndex: 0,
      activeObjective: 'Evaluate distributed systems caching & STAR metrics',
    };

    return {
      candidate: candidateContext,
      opportunity: opportunityContext,
      interview: interviewContext,
    };
  }
}

export const contextBuilderService = new ContextBuilderService();

// ─── InterviewContextBuilderService ──────────────────────────────────────────

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
    let companyName = input.extractedCompany;
    let roleTitle = input.extractedRole;
    let requiredSkills = ['System Design', 'Communication', 'STAR Storytelling'];
    let atsKeywords = ['leadership', 'impact', 'scalability'];
    let seniorityLevel = input.extractedLevel || 'MID_LEVEL';
    let jobDescriptionText = input.rawInputText || undefined;

    if (input.sourceType === 'OPPORTUNITY' && input.opportunityId) {
      const [oppAnalysis, oppRecord] = await Promise.all([
        OpportunityIntelligenceService.getOpportunityAnalysis(input.opportunityId).catch(() => null),
        this.getOpportunityRecord(input.opportunityId),
      ]);

      if (oppRecord) {
        companyName = oppRecord.organisation;
        roleTitle = oppRecord.title;
      }
      if (oppAnalysis) {
        seniorityLevel = oppAnalysis.careerLevel || 'INTERMEDIATE';
        requiredSkills = oppAnalysis.requiredSkills?.length > 0 ? oppAnalysis.requiredSkills : requiredSkills;
        atsKeywords = oppAnalysis.atsKeywords?.length > 0 ? oppAnalysis.atsKeywords : atsKeywords;
        jobDescriptionText = oppAnalysis.summary;
      }
    } else if (input.sourceType !== 'PRACTICE' && (input.rawInputText || input.sourceUrl)) {
      const jobIntel = await jobIntelligenceEngine.ingestJob({
        userId: input.userId,
        sourceType: input.sourceType,
        inputText: input.rawInputText,
        jobUrl: input.sourceUrl,
        company: input.extractedCompany,
        role: input.extractedRole,
      });
      companyName = jobIntel.companyName;
      roleTitle = jobIntel.roleTitle;
      seniorityLevel = jobIntel.seniorityLevel;
      requiredSkills = jobIntel.requiredSkills;
      atsKeywords = jobIntel.atsKeywords;
      jobDescriptionText = jobIntel.jobDescriptionText;
    }

    if (!companyName || !roleTitle) {
      throw new ValidationError('Could not determine target company or role title for this interview. Please provide them explicitly.');
    }

    const jobIntel: JobIntelligenceData = {
      companyName,
      roleTitle,
      seniorityLevel: seniorityLevel as any,
      requiredSkills,
      atsKeywords,
      jobDescriptionText,
    };

    // 3. Fetch Candidate Past Memory & Compute Real Signals
    const pastSessions = await interviewRepository.listUserSessions(input.userId).catch(() => []);
    const totalSessionsCompleted = pastSessions.length;
    const avgScore = pastSessions.length > 0
      ? Math.round(pastSessions.reduce((acc, s: any) => acc + (s.readinessScore || s.starScore || 70), 0) / pastSessions.length)
      : 70;

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

  private async getOpportunityRecord(opportunityId: string): Promise<{ organisation: string; title: string } | null> {
    try {
      const opp = await opportunityRepository.findById(opportunityId);
      return opp ? { organisation: opp.organisation, title: opp.title } : null;
    } catch {
      return null;
    }
  }

  private async computePastMemorySignals(userId: string): Promise<{
    frequentlyMissed: Array<'SITUATION' | 'TASK' | 'ACTION' | 'RESULT' | 'METRICS'>;
    recurringWeaknesses: string[];
  }> {
    try {
      const sessions = await interviewRepository.listUserSessions(userId).catch(() => []);
      const feedbackHistory = sessions.flatMap((s: any) => s.feedbacks || []);

      if (!feedbackHistory || feedbackHistory.length === 0) {
        return {
          frequentlyMissed: ['METRICS' as const, 'RESULT' as const],
          recurringWeaknesses: ['Quantifiable Impact Metrics'],
        };
      }

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
