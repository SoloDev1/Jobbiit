import { buildResumePrompt } from './resume.prompt';
import { buildSopPrompt } from './sop.prompt';

export function buildDocumentGenerationPrompt(
  documentType: string,
  formData: Record<string, any>,
  targetOpportunityText: string = ''
) {
  if (documentType === 'RESUME') {
    return buildResumePrompt(formData, targetOpportunityText);
  }

  if (documentType === 'SOP') {
    return buildSopPrompt(formData, targetOpportunityText);
  }

  // Universal Fallback Prompt for other document types enforcing hiring manager standards
  const systemPrompt = `You are OpporHub's Senior Professional Document Specialist for ${documentType.replace('_', ' ')}.
Follow the ATS-Safe First Design Rules:
- Clean structure, hiring manager approved tone.
- Standard JSON output schema ONLY:
{
  "title": "Document Title",
  "sections": [
    { "id": "sec_1", "title": "Opening & Context", "content": "..." },
    { "id": "sec_2", "title": "Core Qualifications & Experience", "content": "..." },
    { "id": "sec_3", "title": "Alignment & Future Impact", "content": "..." },
    { "id": "sec_4", "title": "Conclusion & Next Steps", "content": "..." }
  ]
}`;

  const userPrompt = `Document Type: ${documentType}
Target Role/Program/Entity: ${formData.targetTitle || 'Professional Role'}
Details & Highlights: ${JSON.stringify(formData)}

Target Opportunity Context:
${targetOpportunityText || 'None provided. Generate high-impact industry standard content.'}

Return JSON with "title" and "sections".`;

  return { systemPrompt, userPrompt };
}
