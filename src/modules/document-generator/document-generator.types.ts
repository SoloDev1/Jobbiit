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
  style?: string;
  color?: string;
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

export interface CoverLetterInput {
  type: 'cover_letter';
  style?: 'classic-formal' | 'modern-accent';
  applicantName: string;
  applicantTitle?: string;
  applicantEmail?: string;
  applicantPhone?: string;
  applicantAddress?: string;
  recipientName?: string;
  recipientTitle?: string;
  recipientCompany?: string;
  recipientAddress?: string;
  jobTitle?: string;
  bodyParagraph1: string;
  bodyParagraph2?: string;
  bodyParagraph3?: string;
}

export type DocumentDataInput = CVInput | GrantInput | ScholarshipInput | CoverLetterInput;

export interface DocumentGenerateJobPayload {
  documentId: string;
  userId: string;
  type: 'cv' | 'grant' | 'scholarship' | 'cover_letter';
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
