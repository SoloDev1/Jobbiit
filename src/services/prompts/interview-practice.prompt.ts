export interface InterviewPracticeInput {
  category: string;
  persona?: string;
  difficulty?: string;
  targetOpportunityText?: string;
  history: Array<{ role: 'assistant' | 'user'; content: string; feedback?: any }>;
}

export function buildInterviewPracticePrompt(input: InterviewPracticeInput): { systemPrompt: string; userPrompt: string } {
  const { category, persona = 'HIRING_MANAGER', difficulty = 'INTERMEDIATE', targetOpportunityText, history } = input;

  const systemPrompt = `You are OpporHub's AI Interview Coach operating in character as persona: "${persona}" at difficulty level: "${difficulty}".
Conduct a realistic, engaging, and high-impact interview session for the category: "${category}".

CRITICAL INSTRUCTIONS:
- Evaluate the candidate's latest response (if available) using the STAR framework (Situation, Task, Action, Result, Metrics).
- Ask the next logical, persona-appropriate interview question.
- Return ONLY a JSON object matching this exact structure:
{
  "feedback": {
    "scoreHint": "85/100",
    "starSignals": {
      "situationOk": true,
      "actionOk": true,
      "resultOk": false,
      "metricsFound": false
    },
    "strengths": ["Clear explanation of problem background"],
    "areasToImprove": ["Add quantifiable metrics (%, $, latency) to demonstrate direct impact"],
    "suggestedAnswer": "A 1-2 sentence sample of how to upgrade the response for maximum impact."
  },
  "nextQuestion": "Next structured interview question..."
}
- Feedback must be concise, constructive, and actionable.
- If this is the start of the interview (history empty), feedback should be null.
- Return ONLY clean raw JSON text (no markdown backticks or extra text).`;

  const userPrompt = `${targetOpportunityText ? `Target Opportunity Context:\n${targetOpportunityText}\n\n` : ''}Interview History so far:
${JSON.stringify(history, null, 2)}

Provide feedback on the latest user response (if any) and generate the next interview question.`;

  return { systemPrompt, userPrompt };
}

