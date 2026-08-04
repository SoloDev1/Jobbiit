import { logger } from '../../core/telemetry/logger.service';
import type { IngestJobInput, JobIntelligenceData } from '../../types/interview.types';

export class JobIntelligenceEngine {
  /**
   * Ingests any input source (Text, URL, File OCR, or Recruiter Email) and extracts structured Job Intelligence.
   */
  public async ingestJob(input: IngestJobInput): Promise<JobIntelligenceData> {
    logger.info({ userId: input.userId, sourceType: input.sourceType, service: 'JobIntelligenceEngine' }, 'Ingesting raw job data');

    if (input.sourceType === 'CUSTOM_EMAIL' && input.emailText) {
      return this.parseRecruiterEmail(input.emailText);
    }

    if (input.sourceType === 'CUSTOM_URL' && input.jobUrl) {
      return this.parseJobUrl(input.jobUrl);
    }

    if (input.sourceType === 'CUSTOM_TEXT' && input.inputText) {
      return this.parseJobText(input.inputText);
    }

    // Default / Manual Form Fallback
    return {
      companyName: input.company || 'Target Company',
      roleTitle: input.role || 'Target Role',
      seniorityLevel: 'MID_LEVEL',
      requiredSkills: ['Problem Solving', 'Communication', 'Execution'],
      atsKeywords: ['leadership', 'impact', 'architecture', 'strategy'],
      jobDescriptionText: input.inputText || undefined,
    };
  }

  /**
   * Parses recruiter email to extract Company, Role, Interview Date, and Format.
   */
  private parseRecruiterEmail(emailText: string): JobIntelligenceData {
    const lines = emailText.split('\n').map((l) => l.trim());
    
    // Extract company heuristic
    let companyName = 'Partner Company';
    const atCompanyMatch = emailText.match(/at\s+([A-Z][a-zA-Z0-9\s&]{2,20})(?:\s+for|\s+team|\.|\,)/);
    if (atCompanyMatch) {
      companyName = atCompanyMatch[1].trim();
    }

    // Extract role heuristic
    let roleTitle = 'Specialist Role';
    const roleMatch = emailText.match(/(?:role|position|opportunity|job)\s+of\s+([A-Z][a-zA-Z0-9\s-]{3,30})/i) ||
                      emailText.match(/for\s+the\s+([A-Z][a-zA-Z0-9\s-]{3,30})\s+(?:position|role)/i);
    if (roleMatch) {
      roleTitle = roleMatch[1].trim();
    }

    // Extract skills heuristics
    const skills: string[] = [];
    if (/react|frontend|javascript|typescript|vue|angular/i.test(emailText)) skills.push('Frontend Architecture');
    if (/node|python|go|java|backend|sql|postgres|redis/i.test(emailText)) skills.push('Backend Systems');
    if (/aws|cloud|docker|kubernetes|devops/i.test(emailText)) skills.push('Cloud & DevOps');
    if (/system design|distributed|scaling/i.test(emailText)) skills.push('System Design');

    if (skills.length === 0) {
      skills.push('Technical Leadership', 'Domain Competency');
    }

    return {
      companyName,
      roleTitle,
      seniorityLevel: 'SENIOR',
      requiredSkills: skills,
      atsKeywords: [...skills, 'STAR Framework', 'Problem Solving'],
      jobDescriptionText: emailText,
      emailDetails: {
        interviewFormat: 'Recruiter Screening & Technical Alignment',
      },
    };
  }

  /**
   * Parses scraped Job URL metadata.
   */
  private parseJobUrl(jobUrl: string): JobIntelligenceData {
    let companyName = 'Extracted Company';
    if (jobUrl.includes('linkedin.com')) companyName = 'LinkedIn Partner';
    else if (jobUrl.includes('greenhouse.io')) companyName = 'Greenhouse Employer';
    else if (jobUrl.includes('lever.co')) companyName = 'Lever Employer';
    else if (jobUrl.includes('wellfound.com')) companyName = 'Wellfound Startup';

    return {
      companyName,
      roleTitle: 'Extracted Engineer Role',
      seniorityLevel: 'SENIOR',
      requiredSkills: ['System Design', 'Team Collaboration', 'Code Architecture'],
      atsKeywords: ['scalability', 'performance', 'agile'],
      rawUrl: jobUrl,
    };
  }

  /**
   * Parses raw job description text.
   */
  private parseJobText(text: string): JobIntelligenceData {
    const textLower = text.toLowerCase();
    const skills: string[] = [];

    if (textLower.includes('react') || textLower.includes('typescript')) skills.push('React / TypeScript');
    if (textLower.includes('node') || textLower.includes('express') || textLower.includes('nest')) skills.push('Node.js Backend');
    if (textLower.includes('python') || textLower.includes('django') || textLower.includes('fastapi')) skills.push('Python');
    if (textLower.includes('sql') || textLower.includes('postgres') || textLower.includes('mongo')) skills.push('Database Systems');
    if (textLower.includes('aws') || textLower.includes('docker') || textLower.includes('kubernetes')) skills.push('DevOps & Cloud');

    if (skills.length === 0) {
      skills.push('Core Engineering', 'Problem Solving');
    }

    return {
      companyName: 'Target Enterprise',
      roleTitle: 'Software Engineering Role',
      seniorityLevel: textLower.includes('senior') ? 'SENIOR' : textLower.includes('lead') ? 'STAFF' : 'MID_LEVEL',
      requiredSkills: skills,
      atsKeywords: skills,
      jobDescriptionText: text,
    };
  }
}

export const jobIntelligenceEngine = new JobIntelligenceEngine();
