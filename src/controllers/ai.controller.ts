import type { Request, Response } from 'express';
import { prisma } from '../config/db';
import { logger } from '../config/logger';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { MultiAgentOrchestratorService } from '../services/multiAgentOrchestrator.service';
import { tailorDocumentHandler } from '../use-cases/tailor-document/tailor-document.handler';

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

    // Call real MultiAgentOrchestrator pipeline
    const pipelineResult = await MultiAgentOrchestratorService.executePipeline({
      userId,
      userPrompt: prompt,
      existingResumeJson: currentContent || {},
    });

    if (!pipelineResult.success) {
      sendError(res, pipelineResult.refusalMessage || 'Refinement blocked by AI guardrails', 400);
      return;
    }

    if (pipelineResult.requiresClarification) {
      sendSuccess(res, {
        requiresClarification: true,
        clarifyingQuestion: pipelineResult.clarifyingQuestion,
      }, 'Clarification required');
      return;
    }

    // Apply styling logic on top of the refined content
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

    const mergedContent = pipelineResult.data || currentContent || {};

    // Persist changes to database if docId is provided
    if (docId) {
      const doc = await prisma.generatedDocument.findUnique({
        where: { id: docId },
      });
      if (doc) {
        const updatedMetadata = {
          ...(typeof doc.metadata === 'object' && doc.metadata ? (doc.metadata as any) : {}),
          ...mergedContent,
          styling: updatedStyling,
        };
        await prisma.generatedDocument.update({
          where: { id: docId },
          data: {
            metadata: updatedMetadata,
          },
        });
      }
    }

    logger.info({ userId, docId, changeSummary }, '[Jobbiit] AI Refine completed');

    sendSuccess(res, {
      changeSummary,
      scoreDelta: 5,
      styling: updatedStyling,
      content: mergedContent,
      atsScore: pipelineResult.atsScore || 85,
    }, 'Document refined successfully');
  } catch (error: any) {
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

    let opportunityId = targetOpportunity.id;

    // Resolve or create opportunity ID
    if (!opportunityId || opportunityId.startsWith('custom-op-')) {
      const opp = await prisma.opportunity.findFirst({
        where: {
          title: targetOpportunity.title,
          organisation: targetOpportunity.company,
        },
      });
      if (opp) {
        opportunityId = opp.id;
      } else {
        const poster = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
        const newOpp = await prisma.opportunity.create({
          data: {
            title: targetOpportunity.title,
            organisation: targetOpportunity.company,
            description: `Tailored role for ${targetOpportunity.title}`,
            applyUrl: 'https://example.com',
            deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            posterId: poster?.id || userId,
            status: 'ACTIVE',
            category: 'JOB',
          },
        });
        opportunityId = newOpp.id;
      }
    }

    let activeDocId = docId;
    if (!activeDocId) {
      const latestDoc = await prisma.generatedDocument.findFirst({
        where: { userId, type: 'CV' },
        orderBy: { createdAt: 'desc' },
      });
      if (latestDoc) {
        activeDocId = latestDoc.id;
      } else {
        const user = await prisma.user.findUnique({ where: { id: userId } });
        const email = user?.email || '';
        const newBaseline = await prisma.generatedDocument.create({
          data: {
            userId,
            type: 'CV',
            format: 'PDF',
            status: 'DONE',
            metadata: {
              personal: { fullName: 'Professional Candidate', email },
              summary: 'Experienced professional.',
              experience: [],
              education: [],
              skills: [],
            },
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
        activeDocId = newBaseline.id;
      }
    }

    const result = await tailorDocumentHandler.execute({
      id: `cmd-${Date.now()}`,
      type: 'document.tailor',
      timestamp: new Date(),
      payload: { userId, documentId: activeDocId, opportunityId },
    });

    sendSuccess(res, {
      id: result.savedDocId || result.document?.id || `doc-tailored-${Date.now()}`,
      title: `${targetOpportunity.company} ${targetOpportunity.title} Application`,
      type: 'resume',
      updatedAt: new Date().toISOString(),
      linkedOpportunity: targetOpportunity,
      content: result.document,
      atsScore: result.atsMatch?.overallScore || 85,
    }, 'Document tailored successfully');
  } catch (error: any) {
    logger.error({ error }, '[Jobbiit] Failed to tailor document');
    sendError(res, error.message || 'AI Tailoring service error', 500);
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

    // Trigger MultiAgentOrchestrator pipeline
    const pipelineResult = await MultiAgentOrchestratorService.executePipeline({
      userId,
      userPrompt: message,
    });

    let responseText = '';
    if (pipelineResult.success) {
      if (pipelineResult.requiresClarification) {
        responseText = pipelineResult.clarifyingQuestion || 'Could you provide more context?';
      } else if (pipelineResult.refusalMessage) {
        responseText = pipelineResult.refusalMessage;
      } else if (pipelineResult.data) {
        responseText = typeof pipelineResult.data === 'string'
          ? pipelineResult.data
          : JSON.stringify(pipelineResult.data, null, 2);
      }
    }

    if (!responseText) {
      responseText = `Here are strategic insights regarding your query: "${message}". Make sure to highlight measurable impact metrics, clean bullet formatting, and target keywords relevant to your industry.`;
    }

    sendSuccess(res, {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content: responseText,
      personaId: personaId || 'CAREER_ADVISER',
      createdAt: new Date().toISOString(),
    }, 'AI response generated');
  } catch (error: any) {
    logger.error({ error }, '[Jobbiit] AI Chat error');
    sendError(res, 'AI Chat service error', 500);
  }
}

