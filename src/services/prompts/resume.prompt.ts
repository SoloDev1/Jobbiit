export function buildResumePrompt(formData: any, targetOpportunityText: string) {
  const systemPrompt = `You are OpporHub's elite ATS Resume Engineering Specialist.
Follow the ATS-Safe First Design Rules:
- Single column flow.
- Standard headings: "Professional Summary", "Core Skills", "Work Experience", "Key Projects", "Education", "Certifications".
- Action verb bullet points in 3rd person/verb-first (no first-person pronouns "I" or "my").
- Quantifiable metrics, key accomplishments, and ATS keyword optimization.
- Standard JSON output schema ONLY:
{
  "title": "Resume Title",
  "sections": [
    { "id": "sec_summary", "title": "Professional Summary", "content": "High impact summary..." },
    { "id": "sec_skills", "title": "Core Skills", "content": ["Skill 1", "Skill 2"] },
    { "id": "sec_experience", "title": "Work Experience", "content": ["Role 1 - Lead Engineer at X (2022-Present): Delivered 40% performance gain...", "Role 2 - Software Dev at Y (2020-2022): Built scalable microservices..."] },
    { "id": "sec_projects", "title": "Key Projects", "content": ["Project A: Scaled real-time processing pipeline..."] },
    { "id": "sec_education", "title": "Education", "content": ["BSc Computer Science - Top University (2020)"] }
  ]
}`;

  const userPrompt = `Target Position: ${formData.targetTitle || 'Professional Role'}
Years of Experience: ${formData.yearsExperience || 'N/A'}
Skills: ${formData.keySkills || 'N/A'}
Work History: ${formData.workHistory || 'N/A'}
Education: ${formData.education || 'N/A'}

Target Opportunity Context / Job Description:
${targetOpportunityText || 'None provided. Generate high-impact industry standard content.'}

Return JSON with "title" and "sections".`;

  return { systemPrompt, userPrompt };
}
