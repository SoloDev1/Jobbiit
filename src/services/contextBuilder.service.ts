import { profileRepository } from '../repositories/profile.repository';
import { OpportunityIntelligenceService } from './opportunityIntelligence.service';
import { logger } from '../core/telemetry/logger.service';
import type { CandidateProfileSummary } from '../types/interview.types';

export interface CandidateContext {
  userId: string;
  fullName: string;
  headline: string;
  skills: string[];
  experienceLevel: string;
  savedStories: any[];
  weaknessHistory: string[];
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
  }): Promise<TriModelContext> {
    logger.info({ userId: input.userId, sourceType: input.sourceType, service: 'ContextBuilderService' }, 'Building Tri-Model Context');

    // 1. Candidate Context
    const profile = await profileRepository.findByUserId(input.userId).catch(() => null);
    const fullName = profile ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() : 'Candidate';
    const headline = profile?.headline || 'Software Engineer';
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
    };

    // 2. Opportunity Context
    let companyName = input.companyName || 'Stripe';
    let roleTitle = input.roleTitle || 'Senior Backend Engineer';
    let requiredSkills = ['System Architecture', 'API Design', 'Distributed Caching'];
    let atsKeywords = ['scalability', 'performance', 'ownership'];

    if (input.opportunityId) {
      const analysis = await OpportunityIntelligenceService.getOpportunityAnalysis(input.opportunityId).catch(() => null);
      if (analysis) {
        companyName = analysis.summary ? analysis.summary.split(' ')[0] : companyName;
        roleTitle = 'Software Engineer';
        requiredSkills = analysis.requiredSkills || requiredSkills;
        atsKeywords = analysis.atsKeywords || atsKeywords;
      }
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
