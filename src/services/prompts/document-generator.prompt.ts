export interface DocumentGenInput {
  documentType: string;
  formData: Record<string, any>;
  targetOpportunityText?: string;
}

export function buildDocumentGenerationPrompt(input: DocumentGenInput): { systemPrompt: string; userPrompt: string } {
  const { documentType, formData, targetOpportunityText } = input;

  const systemPrompt = `You are OpporHub's Master Career Document Generator.
Your mission is to generate an exceptional, highly tailored, ATS-optimized ${documentType} based on the user's input and target opportunity context.

CRITICAL INSTRUCTIONS:
- You MUST output a strictly valid JSON object matching this structure:
{
  "title": string,
  "sections": [
    {
      "id": string (unique slug like "summary", "experience", "education", "skills", "projects", "why_us", etc.),
      "title": string,
      "type": string ("summary" | "experience" | "education" | "skills" | "projects" | "text" | "bullets"),
      "content": string | string[],
      "isComplete": boolean (true if populated),
      "order": number (1-indexed sequence)
    }
  ]
}
- Do NOT wrap in markdown backticks (no \`\`\`json). Return clean, valid JSON text.
- Section contents MUST directly incorporate key requirements, skills, and terminology from the Target Opportunity Context if provided.
- Provide professional, impact-driven content with no placeholder text (e.g. do not write "[Insert Date Here]").`;

  const userPrompt = `Document Type: ${documentType}

${targetOpportunityText ? `TARGET OPPORTUNITY CONTEXT (JOB / SCHOLARSHIP / GRANT / INTERNSHIP):\n${targetOpportunityText}\n\n` : ''}USER INPUT DATA:
${JSON.stringify(formData, null, 2)}

Generate the complete structured JSON document.`;

  return { systemPrompt, userPrompt };
}
