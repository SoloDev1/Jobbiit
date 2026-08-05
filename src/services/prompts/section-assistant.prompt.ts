export interface SectionAssistantInput {
  documentType: string;
  sectionTitle: string;
  content: string;
  action: 'improve' | 'rewrite' | 'shorten' | 'expand' | 'ats_optimize';
  targetOpportunityText?: string;
}

export function buildSectionAssistantPrompt(input: SectionAssistantInput): { systemPrompt: string; userPrompt: string } {
  const { documentType, sectionTitle, content, action, targetOpportunityText } = input;

  const systemPrompt = `You are OpporHub's elite AI Career Document Assistant.
Your task is to refine a specific section of a ${documentType} document.
Maintain high professional quality, active voice, quantifiable impact, and ATS alignment.

CRITICAL INSTRUCTIONS:
- Return ONLY a JSON object matching this structure:
{
  "updatedContent": string (or array of strings if bullet list)
}
- Do NOT wrap in markdown markdown backticks (no \`\`\`json). Return clean JSON text.`;

  let actionInstruction = '';
  switch (action) {
    case 'improve':
      actionInstruction = 'Improve clarity, impact, active verbs, and tone without changing length significantly.';
      break;
    case 'rewrite':
      actionInstruction = 'Rewrite with a fresh, highly compelling professional narrative.';
      break;
    case 'shorten':
      actionInstruction = 'Make more concise, removing fluff while preserving core facts, skills, and metrics.';
      break;
    case 'expand':
      actionInstruction = 'Expand with additional professional depth, context, and actionable detail.';
      break;
    case 'ats_optimize':
      actionInstruction = 'Optimize for ATS parsers by seamlessly incorporating relevant industry keywords and action-oriented formatting.';
      break;
  }

  const userPrompt = `Section Title: ${sectionTitle}
Action Requested: ${action.toUpperCase()}
Action Details: ${actionInstruction}

${targetOpportunityText ? `Target Opportunity Context:\n${targetOpportunityText}\n` : ''}
Current Section Content:
${typeof content === 'string' ? content : JSON.stringify(content, null, 2)}

Provide the updated content in JSON format.`;

  return { systemPrompt, userPrompt };
}
