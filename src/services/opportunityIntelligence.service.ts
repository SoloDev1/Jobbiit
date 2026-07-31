import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
   * Leverages "Generate Once, Read Many" pattern: $0 AI tokens spent when analysis exists.
   */
  static async getOpportunityAnalysis(opportunityId: string) {
    try {
      const existing = await prisma.opportunityAnalysis.findUnique({
        where: { opportunityId },
      });

      if (existing) {
        return existing;
      }

      // Fetch raw opportunity
      const opp = await prisma.opportunity.findUnique({
        where: { id: opportunityId },
        include: { skills: { include: { skill: true } } },
      });

      if (!opp) {
        throw new Error(`Opportunity not found: ${opportunityId}`);
      }

      // Generate fallback pre-parsed structure from opportunity fields
      const fallbackSkills = opp.skills.map((s) => s.skill.name);
      const generatedAnalysis = await this.createAndStoreAnalysis(opportunityId, {
        summary: opp.description.slice(0, 200) + "...",
        simpleExplanation: `This ${opp.category.toLowerCase()} role at ${opp.organisation} focuses on ${opp.title}. Key skills required include ${fallbackSkills.slice(0, 3).join(", ") || "relevant experience"}.`,
        requiredSkills: fallbackSkills.length > 0 ? fallbackSkills : ["Communication", "Problem Solving"],
        preferredSkills: ["Team Leadership", "Project Management"],
        responsibilities: [
          `Execute core responsibilities for ${opp.title} at ${opp.organisation}`,
          "Collaborate across multi-disciplinary teams",
          "Deliver high-quality outcomes within given deadlines",
        ],
        benefits: ["Competitive Compensation", "Career Growth", "Professional Network"],
        atsKeywords: [opp.title, opp.organisation, ...fallbackSkills],
        interviewQuestions: [
          `Why do you want to join ${opp.organisation} as a ${opp.title}?`,
          `Walk me through a project where you demonstrated ${fallbackSkills[0] || "key technical skills"}.`,
          "How do you prioritize work under tight deadlines?",
        ],
        careerLevel: opp.experienceLevel || "MID_LEVEL",
      });

      return generatedAnalysis;
    } catch (error) {
      console.error(`[OpportunityIntelligenceService] Error fetching analysis for ${opportunityId}:`, error);
      throw error;
    }
  }

  /**
   * Save precomputed opportunity analysis to PostgreSQL
   */
  static async createAndStoreAnalysis(opportunityId: string, data: OpportunityAnalysisResult) {
    return prisma.opportunityAnalysis.upsert({
      where: { opportunityId },
      update: {
        summary: data.summary,
        simpleExplanation: data.simpleExplanation,
        requiredSkills: data.requiredSkills,
        preferredSkills: data.preferredSkills,
        responsibilities: data.responsibilities,
        benefits: data.benefits,
        atsKeywords: data.atsKeywords,
        interviewQuestions: data.interviewQuestions,
        careerLevel: data.careerLevel,
      },
      create: {
        opportunityId,
        summary: data.summary,
        simpleExplanation: data.simpleExplanation,
        requiredSkills: data.requiredSkills,
        preferredSkills: data.preferredSkills,
        responsibilities: data.responsibilities,
        benefits: data.benefits,
        atsKeywords: data.atsKeywords,
        interviewQuestions: data.interviewQuestions,
        careerLevel: data.careerLevel,
      },
    });
  }
}
