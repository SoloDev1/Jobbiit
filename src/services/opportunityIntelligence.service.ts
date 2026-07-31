import { prisma } from "../config/db";

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
      const cat = opp.category.toUpperCase();

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
          simpleExplanation = `This visa program pathway by ${opp.organisation} facilitates qualification and document verification for ${opp.title}.`;
          responsibilities = [
            "Complete mandatory document verification and background checks",
            "Fulfill program eligibility criteria and regional regulations",
            "Maintain ongoing compliance during the visa sponsorship duration",
          ];
          benefits = ["Official Sponsorship Support", "Legal / Immigration Guidance", "International Career Mobility"];
          interviewQuestions = [
            "What qualifications make you eligible for this visa pathway?",
            "How do your background credentials align with the sponsorship requirements?",
            "What are your immediate relocation and integration plans?",
          ];
          break;
        case "COMPETITION":
        case "ACCELERATOR":
          simpleExplanation = `This competitive initiative by ${opp.organisation} offers mentorship, recognition, and funding for ${opp.title}.`;
          responsibilities = [
            `Develop and submit competitive entry materials for ${opp.title}`,
            "Present pitch/solution to evaluation panel",
            "Collaborate with assigned mentors and advisors",
          ];
          benefits = ["Prize Pool / Seed Funding", "Industry Mentorship", "Investor Exposure"];
          interviewQuestions = [
            `What makes your proposal for ${opp.title} innovative?`,
            "How do you plan to scale or execute your solution?",
            "What traction or validation have you achieved so far?",
          ];
          break;
        case "VOLUNTEER":
          simpleExplanation = `This volunteer program by ${opp.organisation} focuses on community outreach and engagement for ${opp.title}.`;
          responsibilities = [
            `Participate actively in community initiatives for ${opp.title}`,
            "Support team leads in local event organization",
            "Represent program values and community mission",
          ];
          benefits = ["Community Impact", "Certificate of Contribution", "Hands-on Experience"];
          interviewQuestions = [
            `Why are you passionate about volunteering with ${opp.organisation}?`,
            "How have you contributed to community projects in the past?",
            "How do you handle team collaboration under limited resources?",
          ];
          break;
        case "JOB":
        case "INTERNSHIP":
        default:
          simpleExplanation = `This ${opp.category.toLowerCase()} role at ${opp.organisation} focuses on ${opp.title}. Key skills required include ${fallbackSkills.slice(0, 3).join(", ") || "relevant experience"}.`;
          responsibilities = [
            `Execute core responsibilities for ${opp.title} at ${opp.organisation}`,
            "Collaborate across multi-disciplinary teams",
            "Deliver high-quality outcomes within given deadlines",
          ];
          benefits = ["Competitive Compensation", "Career Growth", "Professional Network"];
          interviewQuestions = [
            `Why do you want to join ${opp.organisation} as a ${opp.title}?`,
            `Walk me through a project where you demonstrated ${fallbackSkills[0] || "key technical skills"}.`,
            "How do you prioritize work under tight deadlines?",
          ];
          break;
      }

      const generatedAnalysis = await this.createAndStoreAnalysis(opportunityId, {
        summary: opp.description.slice(0, 200) + "...",
        simpleExplanation,
        requiredSkills: fallbackSkills.length > 0 ? fallbackSkills : ["Communication", "Problem Solving"],
        preferredSkills: ["Leadership", "Project Management"],
        responsibilities,
        benefits,
        atsKeywords: [opp.title, opp.organisation, ...fallbackSkills],
        interviewQuestions,
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
