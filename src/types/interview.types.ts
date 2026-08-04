export type InterviewSourceType = 
  | 'OPPORTUNITY' 
  | 'CUSTOM_TEXT' 
  | 'CUSTOM_URL' 
  | 'CUSTOM_FILE' 
  | 'CUSTOM_EMAIL' 
  | 'PRACTICE';

export type PracticeCategory = 
  | 'BEHAVIORAL' 
  | 'TECHNICAL' 
  | 'SYSTEM_DESIGN' 
  | 'LEADERSHIP' 
  | 'COMMUNICATION' 
  | 'PRODUCT' 
  | 'HR' 
  | 'GRADUATE' 
  | 'VISA' 
  | 'SCHOLARSHIP';

export type InterviewPersona = 
  | 'FRIENDLY_HR' 
  | 'HIRING_MANAGER' 
  | 'TECHNICAL_LEAD' 
  | 'FAANG_INTERVIEWER' 
  | 'CEO_FOUNDER';

export interface CandidateProfileSummary {
  fullName: string;
  headline: string;
  skills: string[];
  experienceLevel: string;
  masterResume?: string;
}

export interface JobIntelligenceData {
  companyName: string;
  roleTitle: string;
  seniorityLevel: string;
  requiredSkills: string[];
  atsKeywords: string[];
  jobDescriptionText?: string;
  rawUrl?: string;
  emailDetails?: {
    sender?: string;
    interviewDate?: string;
    interviewFormat?: string;
  };
}

export interface CompanyIntelligenceData {
  mission?: string;
  cultureValues?: string[];
  interviewTopics?: string[];
  techStack?: string[];
  leadershipPrinciples?: string[];
}

export interface CareerStory {
  id: string;
  userId: string;
  title: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  metrics: string[];
  technologies: string[];
  tags: string[];
  createdAt?: Date;
}

export interface CandidateCareerMemory {
  totalSessionsCompleted: number;
  averageStarScore: number;
  frequentlyMissedSections: Array<'SITUATION' | 'TASK' | 'ACTION' | 'RESULT' | 'METRICS'>;
  recurringWeaknesses: string[];
  savedStories: CareerStory[];
}

export interface CareerContext {
  sessionId: string;
  userId: string;
  sourceType: InterviewSourceType;
  candidate: CandidateProfileSummary;
  jobIntelligence: JobIntelligenceData;
  companyIntelligence?: CompanyIntelligenceData;
  practiceCategory?: PracticeCategory;
  persona: InterviewPersona;
  difficulty: 'JUNIOR' | 'INTERMEDIATE' | 'SENIOR' | 'STAFF' | 'EXECUTIVE';
  pastMemory?: CandidateCareerMemory;
}

export interface EvaluationResult {
  evaluatorName: string;
  score: number; // 0 - 100
  passed: boolean;
  feedbackTip: string;
  detectedSignals: string[];
  missingElements: string[];
}

export interface IEvaluator {
  name: string;
  evaluate(context: CareerContext, question: string, answer: string): Promise<EvaluationResult>;
}

export interface IngestJobInput {
  userId: string;
  sourceType: InterviewSourceType;
  inputText?: string;
  jobUrl?: string;
  fileBufferName?: string;
  emailText?: string;
  company?: string;
  role?: string;
}

export interface CreateSessionInputV3 {
  userId: string;
  sourceType: InterviewSourceType;
  opportunityId?: string;
  rawInputText?: string;
  sourceUrl?: string;
  extractedCompany?: string;
  extractedRole?: string;
  extractedLevel?: string;
  practiceCategory?: PracticeCategory;
  persona?: InterviewPersona;
  difficulty?: string;
}
