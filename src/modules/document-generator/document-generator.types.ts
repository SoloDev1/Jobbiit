export interface ExperienceInput {
  title: string;
  company: string;
  startDate: string;
  endDate?: string;
  description?: string;
}

export interface EducationInput {
  school: string;
  degree?: string;
  field?: string;
  startDate: string;
  endDate?: string;
}

export interface CVInput {
  type: 'cv';
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  summary?: string;
  experience: ExperienceInput[];
  education: EducationInput[];
  skills: string[];
}

export interface GrantInput {
  type: 'grant';
  applicantName: string;
  organisation?: string;
  grantName: string;
  amount?: string;
  objective: string;
  background: string;
  methodology?: string;
  impact?: string;
}

export interface ScholarshipInput {
  type: 'scholarship';
  applicantName: string;
  scholarshipName: string;
  institution?: string;
  personalStatement: string;
  achievements?: string[];
  financialNeed?: string;
  careerGoals?: string;
}

export type DocumentDataInput = CVInput | GrantInput | ScholarshipInput;

export interface DocumentGenerateJobPayload {
  documentId: string;
  userId: string;
  type: 'cv' | 'grant' | 'scholarship';
  format: 'pdf' | 'docx' | 'both';
  data: DocumentDataInput;
}

// AI Service Outputs
export interface CVEnhancedData {
  summary: string;
  experience: Array<{
    title: string;
    company: string;
    startDate: string;
    endDate?: string;
    description: string;
  }>;
  skills: string[];
}

export interface GrantEnhancedData {
  objective: string;
  background: string;
  methodology?: string;
  impact?: string;
}

export interface ScholarshipEnhancedData {
  personalStatement: string;
  financialNeed?: string;
  careerGoals?: string;
  achievements?: string[];
}

export type AIEnhancedOutput = CVEnhancedData | GrantEnhancedData | ScholarshipEnhancedData;
