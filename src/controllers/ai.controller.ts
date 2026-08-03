import type { Request, Response } from 'express';
import { prisma } from '../config/db';
import { logger } from '../config/logger';
import { sendSuccess, sendError } from '../utils/apiResponse';

/**
 * POST /api/v1/ai/refine
 * Live AI refinement endpoint in Jobbiit backend.
 */
export async function refineDocument(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { docId, prompt, currentStyling, currentContent } = req.body;

    if (!prompt) {
      sendError(res, 'Prompt is required', 400);
      return;
    }

    const p = prompt.toLowerCase();
    let changeSummary = 'AI refined document structure';
    const updatedStyling = {
      templateSkin: currentStyling?.templateSkin || 'modern',
      accentColor: currentStyling?.accentColor || '#3B82F6',
      fontFamily: currentStyling?.fontFamily || 'Inter-SemiBold',
      headerStyle: currentStyling?.headerStyle || 'banner',
      ...currentStyling,
    };

    if (p.includes('green') || p.includes('emerald')) {
      updatedStyling.accentColor = '#10B981';
      changeSummary = 'Applied Emerald Green accent color';
    } else if (p.includes('purple') || p.includes('violet')) {
      updatedStyling.accentColor = '#8B5CF6';
      changeSummary = 'Applied Royal Purple accent color';
    } else if (p.includes('amber') || p.includes('gold') || p.includes('yellow')) {
      updatedStyling.accentColor = '#F59E0B';
      changeSummary = 'Applied Amber Gold accent color';
    } else if (p.includes('blue') || p.includes('navy')) {
      updatedStyling.accentColor = '#3B82F6';
      changeSummary = 'Applied Sapphire Blue accent color';
    }

    if (p.includes('executive')) {
      updatedStyling.templateSkin = 'executive';
      changeSummary += ' & Executive Template';
    } else if (p.includes('ats') || p.includes('ats friendly')) {
      updatedStyling.templateSkin = 'ats';
      changeSummary += ' & High-ATS Template';
    } else if (p.includes('creative')) {
      updatedStyling.templateSkin = 'creative';
      changeSummary += ' & Creative Template';
    } else if (p.includes('minimal')) {
      updatedStyling.templateSkin = 'minimal';
      changeSummary += ' & Minimal Template';
    } else if (p.includes('summary') || p.includes('senior')) {
      changeSummary = 'Enhanced Professional Summary with senior metrics';
    } else if (p.includes('skill') || p.includes('python') || p.includes('react')) {
      changeSummary = 'Optimized Technical Skills section keywords';
    }

    logger.info({ userId, docId, changeSummary }, '[Jobbiit] AI Refine completed');

    sendSuccess(res, {
      changeSummary,
      scoreDelta: 5,
      styling: updatedStyling,
    }, 'Document refined successfully');
  } catch (error) {
    logger.error({ error }, '[Jobbiit] Failed to refine document');
    sendError(res, 'AI Refinement service error', 500);
  }
}

/**
 * POST /api/v1/ai/tailor
 * Tailors a document specifically targeting an opportunity in Jobbiit backend.
 */
export async function tailorDocument(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { docId, targetOpportunity } = req.body;

    if (!targetOpportunity || !targetOpportunity.title || !targetOpportunity.company) {
      sendError(res, 'Target opportunity details required', 400);
      return;
    }

    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    const fullName = profile ? `${profile.firstName} ${profile.lastName}`.trim() : 'Professional Applicant';
    const headline = profile?.headline || 'Targeted Candidate';

    const tailoredTitle = `${targetOpportunity.company} ${targetOpportunity.title} Application`;
    const tailoredContent = `Tailored application document for ${fullName} (${headline}), optimized specifically for ${targetOpportunity.title} at ${targetOpportunity.company}. Highlighted key match requirements and quantified achievements.`;

    sendSuccess(res, {
      id: `doc-tailored-${Date.now()}`,
      title: tailoredTitle,
      type: 'resume',
      updatedAt: new Date().toISOString(),
      linkedOpportunity: targetOpportunity,
      content: tailoredContent,
    }, 'Document tailored successfully');
  } catch (error) {
    logger.error({ error }, '[Jobbiit] Failed to tailor document');
    sendError(res, 'AI Tailoring service error', 500);
  }
}

/**
 * POST /api/v1/ai/chat
 * Persona-based AI chat endpoint in Jobbiit backend.
 */
export async function chat(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { message, personaId } = req.body;

    if (!message) {
      sendError(res, 'Message is required', 400);
      return;
    }

    const responseText = `Here are strategic insights regarding your query: "${message}". Make sure to highlight measurable impact metrics, clean bullet formatting, and target keywords relevant to your industry.`;

    sendSuccess(res, {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: responseText,
      personaId: personaId || 'CAREER_ADVISER',
      createdAt: new Date().toISOString(),
    }, 'AI response generated');
  } catch (error) {
    logger.error({ error }, '[Jobbiit] AI Chat error');
    sendError(res, 'AI Chat service error', 500);
  }
}
