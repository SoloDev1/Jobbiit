import { OpportunityIntelligenceService } from '../../services/opportunityIntelligence.service';
import { profileRepository } from '../../repositories/profile.repository';
import { interviewRepository } from '../../repositories/interview.repository';
import { interviewContextBuilderService } from '../../services/contextBuilder.service';
import { starEvaluator } from './evaluators/star.evaluator';
import { leadershipEvaluator } from './evaluators/leadership.evaluator';
import { technicalEvaluator } from './evaluators/technical.evaluator';
import { hireSignalEvaluator } from './evaluators/hire-signal.evaluator';
import { aiRouter } from '../../services/aiRouter.service';
import { PromptLibrary } from '../../services/promptLibrary.service';
import { logger } from '../../core/telemetry/logger.service';
import type { InterviewPersona } from './evaluators/hire-signal.evaluator';

export type { InterviewPersona };

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
  userId: string;
}

export class InterviewCoachEngine {
  /**
   * Generates AI Briefing for any of the interview entry sources.
   * Computes real readiness score and estimated time from candidate history.
   */
  public async getBriefing(input: BriefingInput) {
    logger.info({ ...input, service: 'InterviewCoachEngine' }, 'Generating Mission Briefing');

    let questions: string[] = [];
    let skillsToFocus: string[] = ['Problem Solving', 'STAR Storytelling', 'Technical Leadership'];
    let difficulty = 'INTERMEDIATE';
    let companyName = input.company || 'Target Organization';
    let roleTitle = input.role || 'Target Position';

    // Fetch opportunity-specific intelligence
    if (input.opportunityId) {
      const analysis = await OpportunityIntelligenceService.getOpportunityAnalysis(input.opportunityId).catch(() => null);
      if (analysis) {
        questions = analysis.interviewQuestions || [];
        skillsToFocus = (analysis.requiredSkills || []).slice(0, 5);
        difficulty = analysis.careerLevel || 'INTERMEDIATE';
      }
    }

    // Compute real readiness score from candidate history
    const overallReadinessScore = await this.computeReadinessScore(input.userId, input.opportunityId);

    // Compute estimated time based on difficulty
    const estimatedTimeMinutes = this.computeEstimatedTime(difficulty, questions.length);

    if (questions.length === 0) {
      questions = [
        `Tell me about a time when you resolved a complex technical or architectural challenge at ${companyName} or a similar environment.`,
        `Why do you want to join ${companyName} as a ${roleTitle}, and what specific value do you bring that another candidate might not?`,
        `Describe a key project where you demonstrated ownership, aligned stakeholders, and delivered measurable results.`,
      ];
    }

    return {
      opportunityId: input.opportunityId,
      estimatedTimeMinutes,
      difficulty,
      overallReadinessScore,
      focusTopics: skillsToFocus,
      likelyQuestions: questions,
      personalityOptions: [
        { id: 'FRIENDLY_HR', name: 'Friendly HR', description: 'Warm, behavioural, culture fit & motivation focused' },
        { id: 'HIRING_MANAGER', name: 'Hiring Manager', description: 'Practical, team alignment & past execution focused' },
        { id: 'TECHNICAL_LEAD', name: 'Technical Lead', description: 'Deep system design, code architecture & trade-offs' },
        { id: 'FAANG_INTERVIEWER', name: 'Tough FAANG Interviewer', description: 'High-pressure, strict STAR metrics & edge cases' },
        { id: 'CEO_FOUNDER', name: 'CEO Founder', description: 'Strategic vision, ownership mindset & business impact' },
      ],
    };
  }

  public async evaluateAnswer(input: EvaluateAnswerInput) {
    logger.info({ sessionId: input.sessionId, service: 'InterviewCoachEngine' }, 'Evaluating Candidate Answer');

    const { sessionId, questionText, answerText, userId } = input;
    const session = await interviewRepository.findSessionById(sessionId, userId);

    const feedbacks = session.feedbacks || [];
    const historyText = feedbacks.map((f: any) => `Interviewer: ${f.questionText}\nCandidate: ${f.answerText}`).join('\n\n');

    const response = await aiRouter.complete({
      task: 'ANSWER_EVALUATE_UNIFIED',
      systemPrompt: PromptLibrary.EVAL_UNIFIED_v1.systemPrompt,
      userPrompt: PromptLibrary.EVAL_UNIFIED_v1.buildUserPrompt(questionText, answerText, historyText),
      jsonMode: true,
    });

    const evalResult = aiRouter.parseJSON<any>(response);

    const situationOk = evalResult.star?.situationOk || false;
    const taskOk = evalResult.star?.taskOk || false;
    const actionOk = evalResult.star?.actionOk || false;
    const resultOk = evalResult.star?.resultOk || false;
    const metricsFound = evalResult.star?.metricsFound || false;
    const overallScore = evalResult.overallScore || 70;
    const coachingTip = evalResult.coachingTip || 'Refine your STAR response.';
    const improvedAnswer = evalResult.improvedAnswer || answerText;

    const feedback = await interviewRepository.saveFeedback({
      sessionId,
      questionText,
      answerText,
      situationOk,
      taskOk,
      actionOk,
      resultOk,
      metricsFound,
      score: overallScore,
      coachingTip,
      improvedAnswer,
    });

    // Auto-extract high-scoring answers (>= 80) into the Candidate Story Library
    if (overallScore >= 80) {
      const careerContext = await interviewContextBuilderService.buildContext({
        userId,
        sourceType: (session.sourceType as any) || 'OPPORTUNITY',
        opportunityId: session.opportunityId || undefined,
        extractedCompany: session.extractedCompany || undefined,
        extractedRole: session.extractedRole || undefined,
      });

      await interviewRepository.saveUserStory({
        userId,
        title: `Story: ${questionText.slice(0, 50)}...`,
        situation: answerText.slice(0, 200),
        task: 'Deliver measurable technical or business outcome',
        action: answerText.slice(0, 300),
        result: coachingTip || 'Achieved measurable positive impact',
        metrics: metricsFound ? ['Quantified impact'] : [],
        technologies: careerContext.jobIntelligence.requiredSkills.slice(0, 4),
        tags: ['auto-extracted', 'high-score', `score-${overallScore}`],
      }).catch(() => null);
    }

    return {
      ...feedback,
      hireRecommendation: evalResult.hireSignal || 'YES',
      strengthSummary: evalResult.strengthObserved || '',
      confidence: 'HIGH',
    };
  }

  /**
   * Computes a real readiness score based on past session performance and profile completeness.
   */
  private async computeReadinessScore(userId: string, opportunityId?: string): Promise<number> {
    const pastSessions = await interviewRepository.listUserSessions(userId).catch(() => []);

    if (pastSessions.length === 0) return 65; // First-time user baseline

    const avgScore = Math.round(
      pastSessions.reduce((acc, s: any) => acc + (s.readinessScore || s.avgScore || 70), 0) / pastSessions.length
    );

    // Recency bonus: sessions in last 7 days
    const recentSessions = pastSessions.filter((s: any) => {
      const date = new Date(s.createdAt || 0);
      return Date.now() - date.getTime() < 7 * 24 * 60 * 60 * 1000;
    });
    const recencyBonus = Math.min(10, recentSessions.length * 2);

    // Volume bonus: more practice = higher readiness
    const volumeBonus = Math.min(10, pastSessions.length * 2);

    return Math.min(98, avgScore + recencyBonus + volumeBonus);
  }

  /**
   * Computes estimated interview duration based on difficulty and question count.
   */
  private computeEstimatedTime(difficulty: string, questionCount: number): number {
    const baseMinutes: Record<string, number> = {
      ENTRY_LEVEL: 12,
      MID_LEVEL: 18,
      INTERMEDIATE: 18,
      SENIOR: 22,
      STAFF: 28,
      PRINCIPAL: 30,
      EXECUTIVE: 35,
    };
    const base = baseMinutes[difficulty] || 18;
    const perQuestion = Math.max(0, questionCount - 3) * 2;
    return base + perQuestion;
  }

  /**
   * Generates an LLM-powered improved version of the candidate's answer.
   */
  private async generateImprovedAnswer(question: string, answer: string): Promise<string> {
    try {
      const prompt = PromptLibrary.ANSWER_IMPROVE_v1;
      const response = await aiRouter.complete({
        task: 'ANSWER_IMPROVE',
        systemPrompt: prompt.systemPrompt,
        userPrompt: prompt.buildUserPrompt(question, answer),
        jsonMode: true,
      });

      const result = aiRouter.parseJSON<{ improvedAnswer: string; keyImprovements: string[] }>(response, {
        improvedAnswer: answer,
        keyImprovements: [],
      });

      return result.improvedAnswer || answer;
    } catch {
      // Safe fallback — return original answer rather than fabricated content
      return answer;
    }
  }
}

export const interviewCoachEngine = new InterviewCoachEngine();
