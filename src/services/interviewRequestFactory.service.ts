import type { CreateSessionInputV3, InterviewSourceType, PracticeCategory, InterviewPersona } from '../types/interview.types';

export class InterviewRequestFactoryService {
  /**
   * Factory method creating typed CreateSessionInputV3 from raw HTTP request payload.
   */
  public createInputFromRequest(body: any, userId: string): CreateSessionInputV3 {
    const sourceType: InterviewSourceType = body.sourceType || (body.opportunityId ? 'OPPORTUNITY' : 'CUSTOM_TEXT');
    
    return {
      userId,
      sourceType,
      opportunityId: body.opportunityId || undefined,
      rawInputText: body.rawInputText || body.inputText || body.emailText || undefined,
      sourceUrl: body.sourceUrl || body.jobUrl || undefined,
      extractedCompany: body.extractedCompany || body.company || undefined,
      extractedRole: body.extractedRole || body.role || undefined,
      extractedLevel: body.extractedLevel || body.level || undefined,
      practiceCategory: body.practiceCategory as PracticeCategory || undefined,
      persona: (body.persona as InterviewPersona) || 'HIRING_MANAGER',
      difficulty: body.difficulty || 'INTERMEDIATE',
    };
  }
}

export const interviewRequestFactoryService = new InterviewRequestFactoryService();
