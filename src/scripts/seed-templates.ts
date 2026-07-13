import { prisma } from '../config/db';

const TEMPLATES = [
  {
    id: "default",
    title: "John Doe (Default)",
    description: "Centered blue typography with elegant ruled section dividers. The default, clean and highly readable CV layout.",
    type: "cv",
    style: "default",
    category: "corporate",
    accent: "#0066cc",
    bestFor: "All professionals, executives, managers, and designers.",
    features: ["Centered Blue Name Header", "ATS-Friendly High Formatting", "Solid Color Rulers", "Two-Column Bullets Grid"],
    prefill: {
      personal: {
        fullName: "John Doe",
        jobTitle: "Software Engineer",
        email: "john.doe@email.com",
        phone: "+1 (555) 123-4567",
        location: "123 Oak Avenue, Chicago, IL 60601",
        summary: "Results-oriented software engineer with five years of experience designing and building scalable web applications. Skilled in full-stack development, cloud infrastructure, and agile delivery."
      },
      experience: [
        {
          title: "Senior Software Engineer",
          company: "TechVision Inc.",
          startDate: "01/2022",
          endDate: "Current",
          location: "Chicago, IL",
          description: "Architected and deployed microservices handling 2M+ daily API requests with 99.9% uptime. Led a team of four engineers."
        }
      ],
      education: [
        {
          school: "State University of Illinois",
          degree: "BSC",
          field: "Computer Science",
          startDate: "2015",
          endDate: "2019"
        }
      ],
      skills: "JavaScript / TypeScript, React & Node.js, Python, AWS Cloud Services, SQL & NoSQL Databases",
      projects: ["AWS Certified Developer", "Professional Scrum Master I"],
      certifications: [
        { name: "AWS Certified Developer – Associate", issuer: "Amazon Web Services" }
      ]
    }
  },
  {
    id: "nova",
    title: "Nova",
    description: "Bold dark sidebar with an indigo gradient accent. Perfect for tech, design, and creative roles.",
    type: "cv",
    style: "nova",
    category: "modern",
    accent: "#6366f1",
    bestFor: "Software developers, product managers, and designers.",
    features: ["Dark Indigo Sidebar", "Gradient Skills Progress", "Modern Layout", "Professional Styling"],
    prefill: {
      personal: {
        fullName: "Alex Rivera",
        jobTitle: "Senior Product Designer",
        email: "alex@rivera.dev",
        phone: "+1 (555) 019-9000",
        location: "San Francisco, CA",
        summary: "Innovative product designer with 5+ years of experience building modern user experiences and scalable design systems."
      },
      experience: [
        { title: "Product Designer", company: "Figma", startDate: "Jan 2022", endDate: "Present", description: "Led frontend design library rewrite. Improved task flow metrics by 40%." }
      ],
      education: [
        { school: "Stanford University", degree: "B.S.", field: "Computer Science", startDate: "2016", endDate: "2020" }
      ],
      skills: "Figma, React, Design Systems"
    }
  },
  {
    id: "executive",
    title: "Executive",
    description: "Clean serif typography with elegant ruled section dividers. Ideal for traditional sectors and senior roles.",
    type: "cv",
    style: "executive",
    category: "simple",
    accent: "#1e293b",
    bestFor: "Senior analysts, lawyers, consultants, and executives.",
    features: ["Elegant Georgia Typography", "Traditional Centered Margins", "Ruled Sections", "High Contrast"],
    prefill: {
      personal: {
        fullName: "Alex Rivera",
        jobTitle: "Senior Management Consultant",
        email: "alex@rivera.dev",
        phone: "+1 (555) 019-9000",
        location: "San Francisco, CA",
        summary: "Results-driven consultant specializing in corporate strategy and performance improvement across finance and retail sectors."
      },
      experience: [
        { title: "Engagement Manager", company: "McKinsey & Company", startDate: "Mar 2021", endDate: "Present", description: "Advised Fortune 500 tech firms on structural reorganization. Optimized operations to save $12M annually." }
      ],
      education: [
        { school: "Harvard Business School", degree: "MBA", field: "Business Administration", startDate: "2018", endDate: "2020" }
      ],
      skills: "Corporate Strategy, Financial Modeling"
    }
  },
  {
    id: "classic-formal",
    title: "Classic Formal",
    description: "Traditional cover letter layout following standard business writing formats.",
    type: "cover_letter",
    style: "classic-formal",
    category: "cover_letter",
    accent: "#1f2937",
    bestFor: "Traditional sectors, finance, and executive applications.",
    features: ["Times New Roman Typography", "Structured Header Block", "Traditional Closing Signatures", "Perfect Left AlignmentMargins"],
    prefill: {
      clApplicantName: "Jonathan Patterson",
      clApplicantTitle: "Graphic Designer",
      clApplicantEmail: "hello@reallygreatsite.com",
      clApplicantPhone: "123-456-7890",
      clApplicantAddress: "123 Anywhere St., Any City",
      clRecipientName: "Hiring Manager",
      clRecipientTitle: "Creative Director",
      clRecipientCompany: "Visual Design Group",
      clRecipientAddress: "456 Enterprise Way, NY",
      clJobTitle: "Graphic Designer",
      clBodyParagraph1: "I am writing to express my strong interest in the Graphic Designer position at Visual Design Group.",
      clBodyParagraph2: "Throughout my career, I have successfully delivered over 50 design campaigns, ensuring brand alignment and visual consistency.",
      clBodyParagraph3: "Thank you for your time and consideration."
    }
  },
  {
    id: "modern-accent",
    title: "Modern Accent",
    description: "Clean layout with a bold colored name banner and right-aligned contact details.",
    type: "cover_letter",
    style: "modern-accent",
    category: "cover_letter",
    accent: "#f59e0b",
    bestFor: "Startups, tech roles, and modern visual agencies.",
    features: ["Orange Gold Colored Accent", "Dual Left-Right Header Spacers", "Clean Modern Sans-Serif Font", "High Scannability Dividers"],
    prefill: {
      clApplicantName: "Keelan Ho",
      clApplicantTitle: "Data Analyst",
      clApplicantEmail: "example@example.com",
      clApplicantPhone: "(555) 555-5555",
      clApplicantAddress: "Seattle, WA 98144",
      clRecipientName: "Freddie Stewart",
      clRecipientTitle: "Hiring Manager",
      clRecipientCompany: "CBRE Group Inc.",
      clRecipientAddress: "555 Seattle Blvd, Seattle WA",
      clJobTitle: "Data Analyst",
      clBodyParagraph1: "I am excited to express my interest in the Data Analyst position at CBRE Group Inc.",
      clBodyParagraph2: "During my previous role, I optimized database queries to improve processing efficiency by 30%.",
      clBodyParagraph3: "Thank you for your time and consideration."
    }
  },
  {
    id: "research-grant",
    title: "Global Research Initiative",
    description: "Clean structured proposal template optimized for scientific research and funding applications.",
    type: "grant",
    style: "default",
    category: "corporate",
    accent: "#0066cc",
    bestFor: "Researchers, scientists, and academic organizations.",
    features: ["Formal Corporate Dividers", "Structured Objective Block", "ATS-Friendly Layout"],
    prefill: {
      grantApplicantName: "Dr. Elena Vance",
      grantOrganisation: "Vance Biotech Institute",
      grantName: "NIH Innovation Fellowship",
      grantAmount: "$150,000",
      grantObjective: "Accelerate development of non-invasive diagnostic tools for early stage neurological research.",
      grantBackground: "Neurological conditions affect millions globally. Current diagnostics are invasive and expensive, creating barriers to timely care.",
      grantMethodology: "Phase 1: Lab trials and prototyping. Phase 2: Peer-reviewed validation.",
      grantImpact: "Lower testing cost by 40% and increase early-stage detection rates by 25%."
    }
  },
  {
    id: "academic-fellowship",
    title: "Merit Academic Fellowship",
    description: "Elegant serif design ideal for graduate-level fellowships and study abroad essays.",
    type: "scholarship",
    style: "executive",
    category: "simple",
    accent: "#1e293b",
    bestFor: "Graduate students, research fellows, and PhD candidates.",
    features: ["Classic Georgia Serif Typography", "High Contrast Centered Headers", "Ruled Divider Details"],
    prefill: {
      scholarApplicantName: "David Miller",
      scholarName: "Fulbright Research Fellowship",
      scholarInstitution: "Humboldt University",
      scholarStatement: "My academic objective is to research renewable energy architectures in metropolitan zones.",
      scholarAchievements: "GPA 3.96, Published author in Energy Policy Journal, Departmental Honors",
      scholarFinancialNeed: "Cover academic travel expenses, international residency fees, and research supplies.",
      scholarGoals: "Become a chief policy advisor on international energy infrastructure."
    }
  }
];

async function seed() {
  console.log('Seeding templates...');
  let count = 0;
  for (const t of TEMPLATES) {
    const existing = await prisma.documentTemplate.findFirst({
      where: { title: t.title },
    });

    if (!existing) {
      await prisma.documentTemplate.create({
        data: {
          title: t.title,
          description: t.description,
          type: t.type,
          style: t.style,
          category: t.category,
          accent: t.accent,
          bestFor: t.bestFor,
          features: t.features,
          prefill: t.prefill as any,
          isActive: true,
          sortOrder: count * 10,
        },
      });
      count++;
    }
  }
  console.log(`Successfully seeded ${count} templates!`);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
