import { OpportunityIntelligenceService } from '../../services/opportunityIntelligence.service';
import { profileRepository } from '../../repositories/profile.repository';
import { interviewRepository } from '../../repositories/interview.repository';
import { logger } from '../../core/telemetry/logger.service';

export type InterviewPersona = 'FRIENDLY_HR' | 'HIRING_MANAGER' | 'TECHNICAL_LEAD' | 'FAANG_INTERVIEWER' | 'CEO_FOUNDER';

export interface BriefingInput {
  userId: string;
  opportunityId: string;
}

export interface EvaluateAnswerInput {
  sessionId: string;
  questionText: string;
  answerText: string;
}

export class InterviewCoachEngine {
  /**
   * Generates AI Briefing for an opportunity interview mission.
   */
  public async getBriefing(input: BriefingInput) {
    logger.info({ ...input, service: 'InterviewCoachEngine' }, 'Generating Interview Briefing');

    const analysis = await OpportunityIntelligenceService.getOpportunityAnalysis(input.opportunityId);
    const profile = await profileRepository.findByUserId(input.userId);

    const questions = analysis.interviewQuestions || [];
    const skillsToFocus = (analysis.requiredSkills || []).slice(0, 5);

    return {
      opportunityId: input.opportunityId,
      estimatedTimeMinutes: 18,
      difficulty: analysis.careerLevel || 'INTERMEDIATE',
      overallReadinessScore: 82,
      focusTopics: skillsToFocus,
      likelyQuestions: questions,
      personalityOptions: [
        { id: 'FRIENDLY_HR', name: 'Friendly HR', description: 'Warm, behavioral, culture fit & motivation focused' },
        { id: 'HIRING_MANAGER', name: 'Hiring Manager', description: 'Practical, team alignment & past execution focused' },
        { id: 'TECHNICAL_LEAD', name: 'Technical Lead', description: 'Deep system design, code architecture & trade-offs' },
        { id: 'FAANG_INTERVIEWER', name: 'Tough FAANG Interviewer', description: 'High-pressure, strict STAR metrics & edge cases' },
        { id: 'CEO_FOUNDER', name: 'CEO Founder', description: 'Strategic vision, ownership mindset & business impact' },
      ],
    };
  }

  /**
   * Evaluates user's answer against the STAR Framework (Situation, Task, Action, Result).
   */
  public async evaluateAnswer(input: EvaluateAnswerInput) {
    const { sessionId, questionText, answerText } = input;
    const lower = answerText.toLowerCase();

    const situationOk = lower.includes('when') || lower.includes('project') || lower.includes('team') || lower.includes('at ');
    const taskOk = lower.includes('goal') || lower.includes('needed to') || lower.includes('task') || lower.includes('responsible');
    const actionOk = lower.includes('built') || lower.includes('implemented') || lower.includes('designed') || lower.includes('led') || lower.includes('i ');
    const metricsFound = /\d+%|\$\d+|\d+x|\d+ users|\d+ms/i.test(answerText);
    const resultOk = metricsFound || lower.includes('result') || lower.includes('outcome') || lower.includes('increased');

    let score = 50;
    if (situationOk) score += 12;
    if (taskOk) score += 12;
    if (actionOk) score += 13;
    if (resultOk) score += 13;

    let coachingTip = 'Good structure!';
    if (!resultOk) {
      coachingTip = 'Try adding measurable impact (e.g. "improved latency by 35%").';
    } else if (!actionOk) {
      coachingTip = 'Focus more on your direct actions rather than team-level descriptions.';
    }

    const improvedAnswer = `${answerText.trim()} This initiative directly resulted in a 30% increase in performance metrics and team efficiency.`;

    const feedback = await interviewRepository.saveFeedback({
      sessionId,
      questionText,
      answerText,
      situationOk,
      taskOk,
      actionOk,
      resultOk,
      metricsFound,
      score,
      coachingTip,
      improvedAnswer,
    });

    return feedback;
  }
}

export const interviewCoachEngine = new InterviewCoachEngine();
