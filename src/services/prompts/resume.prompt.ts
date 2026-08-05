export function buildResumePrompt(formData: any, targetOpportunityText: string) {
  const systemPrompt = `You are OpporHub's elite ATS Resume Engineering Specialist.
Follow the ATS-Safe First Design Rules:
- Single column flow.
- Header layout: Full Name prominently displayed at top, with pipe-separated contact sub-line below (e.g. "Address | Phone | Email").
- Standard headings: "Summary", "Experience", "Skills", "Accomplishments", "Education", "Certifications".
- Action verb bullet points in 3rd person/verb-first (no first-person pronouns "I" or "my").
- Quantifiable metrics, key accomplishments, and ATS keyword optimization.
- Standard JSON output schema ONLY:
{
  "title": "Resume Title",
  "contactLine": "Address | Phone | Email",
  "sections": [
    { "id": "sec_summary", "title": "Summary", "content": "High impact professional summary..." },
    { "id": "sec_experience", "title": "Experience", "content": ["Digital Marketer / Web Designer (09/2023 to Current) - MG IT Solutions Limited Leicestershire: Designed digital marketing strategies...", "Lead Web Designer (08/2021 to 01/2023) - SilverClick Intl: Spearheaded development..."] },
    { "id": "sec_skills", "title": "Skills", "content": ["HTML5", "SEO Expert", "WordPress", "Digital Content Development", "Google Analytics", "Email Marketing"] },
    { "id": "sec_accomplishments", "title": "Accomplishments", "content": ["SEO EXPERT - Professional Certificate", "Web Planning & Development Lead"] },
    { "id": "sec_education", "title": "Education", "content": ["MSc Artificial Intelligence (2023/2024) - University of Wolverhampton", "BSc Computer Science (2014) - Adekunle Ajasin University"] }
  ]
}`;

  const userPrompt = `Candidate Name: ${formData.fullName || 'ADEBAYO AJAYI'}
Contact Info / Address: ${formData.contactLine || '32 Swancote Drive, Wolverhampton WV4 4RN | 0790-0188-208 | bayointheuk@gmail.com'}
Target Position: ${formData.targetTitle || 'Digital Marketer / Web Designer'}
Years of Experience: ${formData.yearsExperience || '6 years'}
Skills: ${formData.keySkills || 'HTML5, SEO, WordPress, Google Analytics, Digital Marketing'}
Work History: ${formData.workHistory || 'N/A'}
Education: ${formData.education || 'N/A'}

Target Opportunity Context / Job Description:
${targetOpportunityText || 'None provided. Generate high-impact industry standard content.'}

Return JSON with "title", "contactLine", and "sections".`;

  return { systemPrompt, userPrompt };
}
