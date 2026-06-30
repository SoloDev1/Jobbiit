import OpenAI from 'openai';
import { prisma } from '../../config/db';
import { redisConnection } from '../../config/redis';
import { logger } from '../../config/logger';
import { env } from '../../config/env';
import { ChatSession, ChatMessage } from '@prisma/client';

const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

interface ChatHistoryItem {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Main orchestrator for a single chatbot conversation turn.
 * Manages caching, routing, context loading, OpenAI execution, and DB updates.
 */
export async function handleChatbotTurn(
  userId: string,
  session: ChatSession,
  userMessage: string
): Promise<string> {
  const sessionId = session.id;

  // 1. Persist the User Message to PostgreSQL
  const savedUserMsg = await prisma.chatMessage.create({
    data: {
      sessionId,
      sender: 'USER',
      content: userMessage,
    },
  });

  // 2. Load recent message history from Redis Cache (or fallback to DB)
  let history: ChatHistoryItem[] = await getCachedHistory(sessionId);
  if (history.length === 0) {
    history = await loadHistoryFromDb(sessionId);
  }

  // Add the new user message to the context history array
  history.push({ role: 'user', content: userMessage });

  // 3. Routing: If mode is GENERAL, run a quick classifier to see if it matches another chatbot agent mode
  let currentMode = session.mode;
  if (currentMode === 'GENERAL') {
    const detectedMode = await classifyUserIntent(userMessage);
    if (detectedMode && detectedMode !== 'GENERAL') {
      currentMode = detectedMode;
      // Update session mode in DB
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: { mode: currentMode },
      });
      logger.info({ sessionId, mode: currentMode }, 'Chatbot session mode auto-routed');
    }
  }

  // 4. Load grounded context based on the current active agent mode
  const groundedContext = await loadGroundedContext(userId, currentMode);

  // 5. Construct the final prompt messages array
  const systemPrompt = getSystemPromptForMode(currentMode, groundedContext);

  // Compress message history if it gets too long (over 12 messages) to save tokens
  const finalMessages: ChatHistoryItem[] = [
    { role: 'system', content: systemPrompt },
    ...history.slice(-10), // Take the last 10 messages of the conversation
  ];

  // 6. Select the appropriate model (gpt-4o for complex reviews, gpt-4o-mini for fast responses)
  const isPremiumAction = ['CV_REVIEW', 'COVER_LETTER', 'INTERVIEW_COACH'].includes(currentMode);
  const model = isPremiumAction ? 'gpt-4o' : 'gpt-4o-mini';

  logger.info({ sessionId, mode: currentMode, model }, 'Invoking OpenAI Chat Completion');

  const completion = await openai.chat.completions.create({
    model,
    messages: finalMessages,
    temperature: currentMode === 'INTERVIEW_COACH' ? 0.6 : 0.3,
    max_tokens: 1000,
  });

  const botResponse = completion.choices[0]?.message?.content || "I'm sorry, I encountered an issue processing your request.";

  // 7. Persist bot response asynchronously to PostgreSQL
  prisma.chatMessage.create({
    data: {
      sessionId,
      sender: 'ASSISTANT',
      content: botResponse,
    },
  }).catch((err) => logger.error({ err, sessionId }, 'Failed to persist assistant chat message'));

  // 8. Update Redis memory cache (append the user and assistant turns)
  history.push({ role: 'assistant', content: botResponse });
  await cacheHistory(sessionId, history);

  return botResponse;
}

// ─── UTILS & HELPERS ──────────────────────────────────────────────────────────

/**
 * Loads recent history from VPS Redis.
 */
async function getCachedHistory(sessionId: string): Promise<ChatHistoryItem[]> {
  try {
    const data = await redisConnection.get(`chat:session:${sessionId}:history`);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    logger.error({ error, sessionId }, 'Failed to get chat history cache');
  }
  return [];
}

/**
 * Saves recent history to VPS Redis (1-hour expiry).
 */
async function cacheHistory(sessionId: string, history: ChatHistoryItem[]): Promise<void> {
  try {
    // Keep only the last 15 messages in the cache to avoid large values
    const slice = history.slice(-15);
    await redisConnection.set(`chat:session:${sessionId}:history`, JSON.stringify(slice), 'EX', 3600);
  } catch (error) {
    logger.error({ error, sessionId }, 'Failed to cache chat history');
  }
}

/**
 * Falls back to PostgreSQL to load session history.
 */
async function loadHistoryFromDb(sessionId: string): Promise<ChatHistoryItem[]> {
  const dbMessages = await prisma.chatMessage.findMany({
    where: { sessionId },
    orderBy: { createdAt: 'asc' },
    take: 20,
  });

  return dbMessages.map((m) => ({
    role: m.sender.toLowerCase() as 'user' | 'assistant' | 'system',
    content: m.content,
  }));
}

/**
 * Classifies user message intent to automatically switch modes.
 */
async function classifyUserIntent(message: string): Promise<any> {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `Analyze the user's chat input and determine if they are requesting a specialized counseling mode.
Return ONLY a JSON object: { "mode": "VALUE" }
Valid values:
- "CV_REVIEW": if they want their CV reviewed or resume analyzed.
- "COVER_LETTER": if they want to write a cover letter.
- "INTERVIEW_COACH": if they want mock interviews or prep.
- "CAREER_ADVISER": if they want career path advice or roadmaps.
- "SKILLS_GAP": if they ask what skills they need or need gap analysis.
- "OPPORTUNITY_INTEL": if they ask about global opportunities statistics or salaries.
- "JOB_MATCHER": if they want to find matched jobs.
- "SCHOLARSHIP_FINDER": if they want to find scholarships.
- "GRANT_FINDER": if they want to find funding or grant opportunities.
- "VISA_ADVISER": if they ask about visas or travel documents.
- "MENTORSHIP_RECOMMENDATION": if they want a mentor.
- "GENERAL": if it doesn't clearly match any of the above.`,
        },
        { role: 'user', content: message },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 50,
      temperature: 0.0,
    });

    const parsed = JSON.parse(response.choices[0]?.message?.content || '{}');
    return parsed.mode;
  } catch (error) {
    logger.error({ error }, 'Failed to classify user intent');
    return 'GENERAL';
  }
}

/**
 * Loads grounding database records based on the active agent mode.
 */
async function loadGroundedContext(userId: string, mode: string): Promise<string> {
  try {
    // 1. Profile-Based Grounding
    if (['CV_REVIEW', 'CAREER_ADVISER', 'SKILLS_GAP', 'COVER_LETTER', 'MENTORSHIP_RECOMMENDATION'].includes(mode)) {
      const profile = await prisma.profile.findUnique({
        where: { userId },
        include: {
          experiences: true,
          educations: true,
          skills: { include: { skill: true } },
        },
      });

      if (!profile) return 'No user profile exists. Advise the user to fill out their profile details first.';

      return `User Background Profile:
Name: ${profile.firstName} ${profile.lastName}
Headline: ${profile.headline || 'None'}
Bio: ${profile.bio || 'None'}
Skills: ${profile.skills.map((s) => s.skill.name).join(', ')}
Experiences:
${profile.experiences
  .map((e) => `- ${e.title} at ${e.company} (${e.startDate.getFullYear()} - ${e.endDate?.getFullYear() || 'Present'}): ${e.description || ''}`)
  .join('\n')}
Educations:
${profile.educations
  .map((ed) => `- ${ed.school}: ${ed.degree || ''} in ${ed.field || ''}`)
  .join('\n')}`;
    }

    // 2. Job Matcher Grounding
    if (mode === 'JOB_MATCHER') {
      const jobs = await prisma.job.findMany({
        where: { status: 'OPEN' },
        take: 3,
        orderBy: { createdAt: 'desc' },
      });

      if (jobs.length === 0) return 'There are currently no active job postings in the database.';

      return `Active Database Job Opportunities:
${jobs
  .map((j) => `- [Job ID: ${j.id}] ${j.title} at ${j.company} (${j.location || 'Remote'}): ${j.description.substring(0, 150)}...`)
  .join('\n')}`;
    }

    // 3. Scholarship Finder Grounding
    if (mode === 'SCHOLARSHIP_FINDER') {
      const scholarships = await prisma.opportunity.findMany({
        where: { category: 'SCHOLARSHIP', status: 'ACTIVE' },
        take: 3,
        orderBy: { createdAt: 'desc' },
      });

      if (scholarships.length === 0) return 'There are currently no active scholarships in the database.';

      return `Active Database Scholarship Opportunities:
${scholarships
  .map((s) => `- [Scholarship ID: ${s.id}] ${s.title} at ${s.organisation} (Deadline: ${s.deadline.toLocaleDateString()}): ${s.description.substring(0, 150)}...`)
  .join('\n')}`;
    }

    // 4. Grant Finder Grounding
    if (mode === 'GRANT_FINDER') {
      const grants = await prisma.opportunity.findMany({
        where: { category: 'GRANT', status: 'ACTIVE' },
        take: 3,
        orderBy: { createdAt: 'desc' },
      });

      if (grants.length === 0) return 'There are currently no active grant opportunities in the database.';

      return `Active Database Grant Opportunities:
${grants
  .map((g) => `- [Grant ID: ${g.id}] ${g.title} at ${g.organisation} (Deadline: ${g.deadline.toLocaleDateString()}): ${g.description.substring(0, 150)}...`)
  .join('\n')}`;
    }

    // 5. Mentorship Recommendation Grounding
    if (mode === 'MENTORSHIP_RECOMMENDATION') {
      // Find opportunities of type MENTORSHIP
      const mentors = await prisma.opportunity.findMany({
        where: { category: 'MENTORSHIP', status: 'ACTIVE' },
        take: 3,
      });

      if (mentors.length === 0) return 'There are currently no active mentors or mentorship programs listed in the database.';

      return `Active Database Mentorship Programs:
${mentors
  .map((m) => `- [Mentorship ID: ${m.id}] ${m.title} organized by ${m.organisation}: ${m.description.substring(0, 150)}...`)
  .join('\n')}`;
    }
  } catch (error) {
    logger.error({ error, mode }, 'Failed to load grounding context for chatbot');
  }

  return 'No specific database context loaded.';
}

/**
 * Resolves the system instructions for each agent mode.
 */
function getSystemPromptForMode(mode: string, context: string): string {
  const baseInstructions = `You are OpporLink's Career & Opportunity Assistant. You are friendly, professional, and clear.
Keep your answers actionable, structuring long blocks with bullet points.
If database records are present in the context, refer to them explicitly (including their titles/organisations). Do not make up opportunities if the database is empty.
Never reference technical identifiers like Database IDs or JSON structures to the user.`;

  switch (mode) {
    case 'CV_REVIEW':
      return `${baseInstructions}
You are the AI CV Reviewer.
Using the following user profile, perform a comprehensive review of their CV:
${context}
Logic:
1. Evaluate their headline, bio, experiences, and skills against modern recruitment standards.
2. Formulate a resume score out of 100.
3. List 3 key strengths and 3 concrete areas of improvement.`;

    case 'COVER_LETTER':
      return `${baseInstructions}
You are the AI Cover Letter Assistant.
Using the user's profile:
${context}
Write a tailored, professionally structured cover letter for the job they specify. If they do not specify a job, ask them to provide the job title and company.`;

    case 'INTERVIEW_COACH':
      return `${baseInstructions}
You are the AI Interview Coach.
You conduct mock interviews step-by-step.
Using the user's experience context:
${context}
Logic:
1. Ask exactly ONE mock interview question at a time.
2. Wait for the user's answer.
3. Once they answer, analyze their response, give constructive feedback (strengths/weaknesses), and ask the next question.`;

    case 'CAREER_ADVISER':
      return `${baseInstructions}
You are the AI Career Adviser.
Based on the user's current background:
${context}
Suggest clear career paths, roadmaps, required certifications, and entry points into industries of interest.`;

    case 'SKILLS_GAP':
      return `${baseInstructions}
You are the AI Skills Gap Analyzer.
Compare the user's current skills against standard requirements for the target role they specify.
User Skills:
${context}
Highlight what competencies they lack and recommend courses, projects, or books to bridge those gaps.`;

    case 'OPPORTUNITY_INTEL':
      return `${baseInstructions}
You are the Opportunity Intelligence Agent.
Provide insights on high-demand skills, global hiring trends, averages salaries, and funding success parameters.`;

    case 'JOB_MATCHER':
      return `${baseInstructions}
You are the AI Job Matcher.
Present the best matching job opportunities from the list of database entries below:
${context}
Explain clearly why each recommended job matches the user's background.`;

    case 'SCHOLARSHIP_FINDER':
      return `${baseInstructions}
You are the AI Scholarship Finder.
Match the user to scholarship opportunities from the database:
${context}
Explain how to apply and highlight eligibility rules.`;

    case 'GRANT_FINDER':
      return `${baseInstructions}
You are the AI Grant Finder.
Match the user to funding grants from the database:
${context}
Provide guidance on how to write a competitive proposal for these grants.`;

    case 'VISA_ADVISER':
      return `${baseInstructions}
You are the AI Visa Opportunities Adviser.
Guide the user on visa pathways, skilled worker sponsorship policies, and education visa criteria for countries they ask about.`;

    case 'MENTORSHIP_RECOMMENDATION':
      return `${baseInstructions}
You are the AI Mentorship Recommendation Agent.
Suggest mentors or mentorship opportunities from our database that align with the user's profile:
${context}
Explain why this mentor is a good match for their learning objectives.`;

    default:
      return `${baseInstructions}
You are the General Assistant. You can answer career questions, guide the user on using the OpporLink platform, or help direct them to one of our specialized chatbot tools (e.g. CV Review, Interview Coach, Job Matcher).`;
  }
}
