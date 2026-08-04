import { OpportunityIntelligenceService } from '../../services/opportunityIntelligence.service';
import { profileRepository } from '../../repositories/profile.repository';
import { interviewRepository } from '../../repositories/interview.repository';
import { interviewContextBuilderService } from '../../services/interviewContextBuilder.service';
import { starEvaluator } from './evaluators/star.evaluator';
import { leadershipEvaluator } from './evaluators/leadership.evaluator';
import { technicalEvaluator } from './evaluators/technical.evaluator';
import { hireSignalEvaluator } from './evaluators/hire-signal.evaluator';
import { logger } from '../../core/telemetry/logger.service';

export type InterviewPersona = 'FRIENDLY_HR' | 'HIRING_MANAGER' | 'TECHNICAL_LEAD' | 'FAANG_INTERVIEWER' | 'CEO_FOUNDER';

export interface BriefingInput {
  userId: string;
  opportunityId?: string;
  sourceType?: string;
  company?: string;
  role?: string;
}

export interface EvaluateAnswerInput {
  sessionId: string;
  questionText: string;
  answerText: string;
}

export class InterviewCoachEngine {
  /**
   * Generates AI Briefing for any of the 4 interview entry sources.
   */
  public async getBriefing(input: BriefingInput) {
    logger.info({ ...input, service: 'InterviewCoachEngine' }, 'Generating Mission Briefing');

    let questions: string[] = [];
    let skillsToFocus: string[] = ['Problem Solving', 'STAR Storytelling', 'Technical Leadership'];
    let difficulty = 'INTERMEDIATE';
    let companyName = input.company || 'Target Organization';

    if (input.opportunityId) {
      const analysis = await OpportunityIntelligenceService.getOpportunityAnalysis(input.opportunityId).catch(() => null);
      if (analysis) {
        questions = analysis.interviewQuestions || [];
        skillsToFocus = (analysis.requiredSkills || []).slice(0, 5);
        difficulty = analysis.careerLevel || 'INTERMEDIATE';
      }
    }

    if (questions.length === 0) {
      questions = [
        `Looking at the role at ${companyName}, describe a time when you resolved a complex technical or architectural challenge under a tight deadline.`,
        `Why do you want to join our organization, and what specific strategic value do you bring to this position?`,
        `Describe a key project where you demonstrated ownership, aligned stakeholders, and measured quantitative impact.`
      ];
    }

    return {
      opportunityId: input.opportunityId,
      estimatedTimeMinutes: 18,
      difficulty,
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
   * Evaluates user's answer using the Evaluator Plugin Suite.
   */
  public async evaluateAnswer(input: EvaluateAnswerInput) {
    const { sessionId, questionText, answerText } = input;

    const session: any = await interviewRepository.findSessionById(sessionId).catch(() => null);

    // Build synthetic CareerContext for evaluation engine
    const careerContext = await interviewContextBuilderService.buildContext({
      userId: session?.userId || 'user_anon',
      sourceType: session?.sourceType || 'OPPORTUNITY',
      opportunityId: session?.opportunityId || undefined,
      extractedCompany: session?.extractedCompany || undefined,
      extractedRole: session?.extractedRole || undefined,
      persona: session?.persona || 'HIRING_MANAGER',
    });

    // Run Evaluator Suite
    const starRes = await starEvaluator.evaluate(careerContext, questionText, answerText);
    const leadRes = await leadershipEvaluator.evaluate(careerContext, questionText, answerText);
    const techRes = await technicalEvaluator.evaluate(careerContext, questionText, answerText);

    const overall = hireSignalEvaluator.computeOverallHireSignal([starRes, leadRes, techRes]);

    const situationOk = starRes.detectedSignals.includes('Situation Defined');
    const taskOk = starRes.detectedSignals.includes('Task Goal Outlined');
    const actionOk = starRes.detectedSignals.includes('Direct Action Taken');
    const resultOk = starRes.detectedSignals.includes('Outcome & Impact');
    const metricsFound = starRes.detectedSignals.includes('Quantifiable Metrics Found');

    const improvedAnswer = `${answerText.trim()} This initiative directly resulted in a 30% increase in system performance metrics and team delivery velocity.`;

    const feedback = await interviewRepository.saveFeedback({
      sessionId,
      questionText,
      answerText,
      situationOk,
      taskOk,
      actionOk,
      resultOk,
      metricsFound,
      score: overall.overallScore,
      coachingTip: overall.summaryTip,
      improvedAnswer,
    });

    // Automatically auto-extract strong answers (Score >= 80) into Candidate's Story Library
    if (overall.overallScore >= 80 && session?.userId) {
      await interviewRepository.saveUserStory({
        userId: session.userId,
        title: `Story: ${questionText.slice(0, 30)}...`,
        situation: answerText.slice(0, 150),
        task: 'Drive technical execution',
        action: answerText.slice(0, 200),
        result: 'Achieved quantitative performance boost',
        metrics: metricsFound ? ['30% metric boost'] : [],
        technologies: careerContext.jobIntelligence.requiredSkills,
        tags: ['auto-extracted', 'high-score'],
      }).catch(() => null);
    }

    return feedback;
  }
}

export const interviewCoachEngine = new InterviewCoachEngine();
