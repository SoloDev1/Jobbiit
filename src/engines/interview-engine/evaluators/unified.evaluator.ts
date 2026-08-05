import { aiRouter } from '../../../services/aiRouter.service';
import { PromptLibrary } from '../../../services/promptLibrary.service';
import { interviewRepository } from '../../../repositories/interview.repository';
import { contextBuilderService } from '../../../services/contextBuilder.service';
import { logger } from '../../../core/telemetry/logger.service';

export class UnifiedEvaluator {
  /**
   * Performs unified grading of user answer across STAR, Leadership, and Technical dimensions,
   * saving findings and aggregates atomically.
   */
  public async evaluateAndSave(input: {
    sessionId: string;
    userId: string;
    questionText: string;
    answerText: string;
    company: string;
    role: string;
  }): Promise<any> {
    logger.info({ sessionId: input.sessionId, service: 'UnifiedEvaluator' }, 'Running consolidated out-of-band grading');

    try {
      const session = await interviewRepository.findSessionById(input.sessionId, input.userId);
      const feedbacks = session.feedbacks || [];
      const historyText = feedbacks.map((f: any) => `Interviewer: ${f.questionText}\nCandidate: ${f.answerText}`).join('\n\n');

      const response = await aiRouter.complete({
        task: 'ANSWER_EVALUATE_UNIFIED',
        systemPrompt: PromptLibrary.EVAL_UNIFIED_v1.systemPrompt,
        userPrompt: PromptLibrary.EVAL_UNIFIED_v1.buildUserPrompt(input.questionText, input.answerText, historyText),
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
      const improvedAnswer = evalResult.improvedAnswer || input.answerText;

      // Save feedback (wrapped in database prisma transaction + native averages)
      const feedback = await interviewRepository.saveFeedback({
        sessionId: input.sessionId,
        questionText: input.questionText,
        answerText: input.answerText,
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
        try {
          const context = await contextBuilderService.buildTriModelContext({
            userId: input.userId,
            sessionId: input.sessionId,
            companyName: input.company,
            roleTitle: input.role,
          });

          await interviewRepository.saveUserStory({
            userId: input.userId,
            title: `Story: ${input.questionText.slice(0, 50)}...`,
            situation: input.answerText.slice(0, 200),
            task: 'Deliver measurable technical or business outcome',
            action: input.answerText.slice(0, 300),
            result: coachingTip || 'Achieved measurable positive impact',
            metrics: metricsFound ? ['Quantified impact'] : [],
            technologies: context.opportunity.requiredSkills.slice(0, 4),
            tags: ['auto-extracted', 'high-score', `score-${overallScore}`],
          });
        } catch (storyErr: any) {
          logger.warn({ err: storyErr.message }, 'Failed to auto-extract high-scoring story');
        }
      }

      logger.info({ sessionId: input.sessionId, feedbackId: feedback.id }, 'Out-of-band turn grading completed successfully');
      return feedback;
    } catch (err: any) {
      logger.error({ err, sessionId: input.sessionId }, 'Out-of-band grading pipeline encountered an error');
      throw err;
    }
  }
}

export const unifiedEvaluator = new UnifiedEvaluator();
