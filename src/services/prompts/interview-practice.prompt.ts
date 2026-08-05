export interface InterviewPracticeInput {
  category: string;
  targetOpportunityText?: string;
  history: Array<{ role: 'assistant' | 'user'; content: string; feedback?: any }>;
}

export function buildInterviewPracticePrompt(input: InterviewPracticeInput): { systemPrompt: string; userPrompt: string } {
  const { category, targetOpportunityText, history } = input;

  const systemPrompt = `You are OpporHub's AI Interview Coach.
Conduct a realistic, engaging, and high-impact interview session for the category: "${category}".

CRITICAL INSTRUCTIONS:
- You must evaluate the user's latest response (if available) and ask the next logical interview question.
- Return ONLY a JSON object matching this structure:
{
  "feedback": {
    "strengths": string[],
    "areasToImprove": string[],
    "scoreHint": string (e.g. "8/10")
  },
  "nextQuestion": string
}
- Feedback must be encouraging, constructive, and concise.
- If this is the start of the interview (history empty), feedback can be null.
- Return clean raw JSON text (no markdown backticks).`;

  const userPrompt = `${targetOpportunityText ? `Target Opportunity Context:\n${targetOpportunityText}\n\n` : ''}Interview History so far:
${JSON.stringify(history, null, 2)}

Provide feedback on the latest user response (if any) and generate the next interview question.`;

  return { systemPrompt, userPrompt };
}
