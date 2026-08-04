/**
 * OpporHub AI Career Operating System — Company Intelligence Graph Service
 * Extracts, caches, and reuses company-specific hiring culture, technical stack, and recruiter tips.
 */

import { AIProviderAdapter } from "./aiProvider.adapter";

export interface CompanyIntelligenceProfile {
  companyName: string;
  cultureSummary: string;
  hiringStyle: string;
  techStackHighlights: string[];
  recruiterTips: string[];
  workModeDefault: string;
  interviewProcess: string;
}

export class CompanyIntelligenceService {
  private static cache: Record<string, CompanyIntelligenceProfile> = {};

  /**
   * Returns company intelligence profile for a given company name.
   */
  public static async getCompanyProfile(companyName: string): Promise<CompanyIntelligenceProfile> {
    const key = companyName.trim().toLowerCase();
    if (this.cache[key]) {
      return this.cache[key];
    }

    const systemPrompt = `You are a Senior Tech Recruiter and Corporate Hiring Analyst.
Provide structured company intelligence for the specified company. Focus on hiring culture, interview style, recruiter preferences, and technical stack.`;

    const userPrompt = `Generate hiring intelligence for company: "${companyName}".
Return JSON with cultureSummary, hiringStyle, techStackHighlights, recruiterTips, workModeDefault, and interviewProcess.`;

    try {
      const response = await AIProviderAdapter.generateStructuredText(systemPrompt, userPrompt);
      const parsed = JSON.parse(response.rawResponseText);

      const profile: CompanyIntelligenceProfile = {
        companyName,
        cultureSummary: parsed.cultureSummary || `${companyName} focuses on innovation, ownership, and technical excellence.`,
        hiringStyle: parsed.hiringStyle || 'Structured multi-round technical and behavioral interviews.',
        techStackHighlights: parsed.techStackHighlights || ['Cloud Infrastructure', 'Microservices', 'Modern Frameworks'],
        recruiterTips: parsed.recruiterTips || [
          'Quantify your impact with concrete metrics',
          'Demonstrate technical ownership and system design clarity',
        ],
        workModeDefault: parsed.workModeDefault || 'Hybrid / Remote Friendly',
        interviewProcess: parsed.interviewProcess || 'Recruiter Screen ➔ Technical Assessment ➔ Onsite / System Design',
      };

      this.cache[key] = profile;
      return profile;
    } catch (err) {
      const defaultProfile: CompanyIntelligenceProfile = {
        companyName,
        cultureSummary: `${companyName} prioritizes ownership, collaboration, and high-impact delivery.`,
        hiringStyle: 'Rigorous behavioral and technical evaluation.',
        techStackHighlights: ['Scalable Systems', 'Cloud Services', 'Full-stack Engineering'],
        recruiterTips: ['Highlight measurable achievements', 'Show clear problem-solving methodology'],
        workModeDefault: 'Hybrid / Remote',
        interviewProcess: 'Initial Screen ➔ Technical Evaluation ➔ Final Interview',
      };
      this.cache[key] = defaultProfile;
      return defaultProfile;
    }
  }
}
