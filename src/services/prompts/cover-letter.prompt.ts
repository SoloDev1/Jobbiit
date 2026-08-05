export function buildCoverLetterPrompt(formData: any, targetOpportunityText: string) {
  const systemPrompt = `You are OpporHub's Senior Executive Cover Letter Specialist.
Follow standard full-block business letter formatting:
- Do NOT output a resume pipe contact bar.
- Output formal letter header metadata: senderName, senderContact, date, recipientBlock, salutation.
- Output 3-4 structured full-sentence prose paragraphs (Opening, Qualifications, Alignment, Sign-off).
- Standard JSON output schema ONLY:
{
  "title": "Cover Letter for Target Position",
  "headerInfo": {
    "senderName": "Sender Full Name",
    "senderContact": "City, Country | email@domain.com | +123456789",
    "date": "August 5, 2026",
    "recipientBlock": "Hiring Committee / Lead Recruiter\\nTarget Company Name\\nCompany Address",
    "salutation": "Dear Hiring Manager,"
  },
  "sections": [
    { "id": "sec_opening", "title": "Position Interest & Hook", "content": "I am writing to express my strong enthusiasm for..." },
    { "id": "sec_qualifications", "title": "Core Wins & Qualifications", "content": "Throughout my career as..." },
    { "id": "sec_alignment", "title": "Company Alignment & Contribution", "content": "Your team's mission in..." },
    { "id": "sec_signoff", "title": "Call to Action & Closing", "content": "Thank you for your time and consideration. Sincerely,\\n[Sender Name]" }
  ]
}`;

  const userPrompt = `Target Position & Company: ${formData.targetTitle || 'Target Role'}
Matching Qualifications: ${formData.matchingQuals || 'N/A'}
Company Reason: ${formData.companyReason || 'N/A'}
Applicant Name: ${formData.fullName || 'Applicant Name'}

Target Opportunity Context:
${targetOpportunityText || 'None provided. Generate high-impact industry standard content.'}

Return JSON with "title", "headerInfo", and "sections".`;

  return { systemPrompt, userPrompt };
}
