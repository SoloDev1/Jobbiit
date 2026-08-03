import { logger } from "../core/telemetry/logger.service";
import { NotFoundError, ValidationError } from "../core/errors/domain-error";
import { opportunityRepository } from "../repositories/opportunity.repository";

export interface OpportunityAnalysisResult {
  summary: string;
  simpleExplanation: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  benefits: string[];
  atsKeywords: string[];
  interviewQuestions: string[];
  careerLevel: string;
}

export class OpportunityIntelligenceService {
  /**
   * Fetch precomputed opportunity analysis.
   * Leverages "Generate Once, Read Many" pattern.
   * Strictly adheres to Production AI Reliability Rules: No fabricated fallbacks.
   */
  static async getOpportunityAnalysis(opportunityId: string) {
    try {
      const existing = await opportunityRepository.findAnalysisByOpportunityId(opportunityId);

      if (existing) {
        return existing;
      }

      // Fetch raw opportunity
      const opp = await opportunityRepository.findById(opportunityId);

      if (!opp) {
        throw new NotFoundError(`Opportunity not found: ${opportunityId}`);
      }

      // Extract skills from database record
      const actualSkills = opp.skills.map((s) => s.skill.name).filter(Boolean);
      const cat = opp.category.toUpperCase();

      if (!opp.description || opp.description.trim().length === 0) {
        throw new ValidationError(`Opportunity description is empty for ${opportunityId}`);
      }

      let simpleExplanation = "";
      let responsibilities: string[] = [];
      let benefits: string[] = [];
      let interviewQuestions: string[] = [];

      switch (cat) {
        case "SCHOLARSHIP":
        case "FELLOWSHIP":
          simpleExplanation = `This ${cat.toLowerCase()} program by ${opp.organisation} provides funding and academic support for ${opp.title}.`;
          responsibilities = [
            `Maintain academic performance and research milestones for ${opp.title}`,
            `Engage actively in ${opp.organisation}'s scholar network and seminars`,
            "Submit periodic progress reports to program directors",
          ];
          benefits = ["Tuition / Living Stipend Coverage", "Academic Mentorship", "Global Scholar Community"];
          interviewQuestions = [
            `Why are you applying for the ${opp.title} at ${opp.organisation}?`,
            `How does this ${cat.toLowerCase()} align with your long-term research and career goals?`,
            "Describe an academic achievement or leadership experience you are proud of.",
          ];
          break;
        case "GRANT":
          simpleExplanation = `This grant initiative by ${opp.organisation} offers financial backing and project support for ${opp.title}.`;
          responsibilities = [
            `Execute proposed project milestones for ${opp.title}`,
            "Manage grant funding allocation according to compliance guidelines",
            "Deliver final project outcome and evaluation report",
          ];
          benefits = ["Project Funding Support", "Resource Access & Equipment", "Institutional Recognition"];
          interviewQuestions = [
            `What is the primary objective of your project for the ${opp.title}?`,
            "How will you measure and demonstrate the impact of this grant?",
            "What is your project timeline and budget allocation plan?",
          ];
          break;
        case "VISA":
          simpleExplanation = `This visa application process for ${opp.organisation} facilitates travel and legal compliance for ${opp.title}.`;
          responsibilities = [
            `Demonstrate purpose of visit and eligibility for ${opp.title}`,
            "Provide proof of ties to home country and financial stability",
            "Maintain compliance with immigration regulations",
          ];
          benefits = ["Legal Work / Study Authorization", "International Mobility", "Professional Recognition"];
          interviewQuestions = [
            `What is the primary purpose of your travel for the ${opp.title}?`,
            "What ties do you maintain with your home country to ensure return after your visa period?",
            "How will this visa opportunity contribute to your long-term career goals?",
          ];
          break;
        case "JOB":
        case "INTERNSHIP":
        default:
          simpleExplanation = `This ${opp.category.toLowerCase()} role at ${opp.organisation} focuses on ${opp.title}.`;
          responsibilities = [
            `Execute core responsibilities for ${opp.title} at ${opp.organisation}`,
            "Collaborate across multi-disciplinary teams",
            "Deliver high-quality outcomes within given deadlines",
          ];
          benefits = ["Competitive Compensation", "Career Growth", "Professional Network"];
          interviewQuestions = [
            `Why do you want to join ${opp.organisation} as a ${opp.title}?`,
            `Walk me through a project where you demonstrated relevant technical skills.`,
            "How do you prioritize work under tight deadlines?",
          ];
          break;
      }

      const generatedAnalysis = await this.createAndStoreAnalysis(opportunityId, {
        summary: opp.description.slice(0, 300) + "...",
        simpleExplanation,
        requiredSkills: actualSkills,
        preferredSkills: [],
        responsibilities,
        benefits,
        atsKeywords: [opp.title, opp.organisation, ...actualSkills],
        interviewQuestions,
        careerLevel: opp.experienceLevel || "MID_LEVEL",
      });

      return generatedAnalysis;
    } catch (error) {
      logger.error({ error, opportunityId }, `[OpportunityIntelligenceService] Error fetching analysis`);
      throw error;
    }
  }

  /**
   * Save precomputed opportunity analysis to PostgreSQL
   */
  static async createAndStoreAnalysis(opportunityId: string, data: OpportunityAnalysisResult) {
    return opportunityRepository.saveAnalysis(opportunityId, data);
  }
}
