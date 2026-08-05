import OpenAI from 'openai';
import { prisma } from '../config/db';
import { env } from '../config/env';
import { buildDocumentGenerationPrompt, buildSectionAssistantPrompt } from './prompts';

const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

export class DocumentService {
  /**
   * Generates a new Studio Document based on user inputs and optional opportunity context
   */
  static async generateDocument(
    userId: string,
    documentType: string,
    formData: Record<string, any>,
    targetOpportunityText?: string
  ) {
    const startTime = Date.now();
    const { systemPrompt, userPrompt } = buildDocumentGenerationPrompt({
      documentType,
      formData,
      targetOpportunityText,
    });

    let completion: any;
    let durationMs = 0;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });
      durationMs = Date.now() - startTime;
    } catch (err: any) {
      // Log failure
      await prisma.aiGenerationLog.create({
        data: {
          userId,
          action: 'FULL_GENERATE',
          documentType,
          status: 'FAILED',
          errorMessage: err.message || 'OpenAI generation failed',
          durationMs: Date.now() - startTime,
        },
      });
      throw new Error(`Document generation failed: ${err.message}`);
    }

    const rawContent = completion.choices[0]?.message?.content || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(rawContent);
    } catch {
      parsed = {
        title: `${documentType.replace('_', ' ')} Document`,
        sections: [
          {
            id: 'content',
            title: 'Content',
            type: 'text',
            content: rawContent,
            isComplete: true,
            order: 1,
          },
        ],
      };
    }

    const title = parsed.title || `${documentType.replace('_', ' ')} - ${new Date().toLocaleDateString()}`;
    const sections = Array.isArray(parsed.sections) ? parsed.sections : [];

    const defaultSettings = {
      fontFamily: 'Inter',
      fontSize: 14,
      primaryColor: '#0F172A',
    };

    // Save document to Prisma DB
    const document = await prisma.studioDocument.create({
      data: {
        userId,
        title,
        documentType,
        targetOpportunityText: targetOpportunityText || null,
        templateId: 'professional',
        sections: sections as any,
        settings: defaultSettings as any,
        aiHistory: [],
      },
    });

    // Log telemetry
    await prisma.aiGenerationLog.create({
      data: {
        userId,
        documentId: document.id,
        action: 'FULL_GENERATE',
        documentType,
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        durationMs,
        status: 'SUCCESS',
      },
    });

    return document;
  }

  /**
   * Updates an existing Studio Document (Auto-save or explicit save)
   */
  static async updateDocument(
    userId: string,
    documentId: string,
    data: {
      title?: string;
      sections?: any[];
      settings?: any;
      templateId?: string;
    }
  ) {
    const document = await prisma.studioDocument.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      throw new Error('Document not found or unauthorized');
    }

    const updated = await prisma.studioDocument.update({
      where: { id: documentId },
      data: {
        ...(data.title !== undefined && { title: data.title }),
        ...(data.sections !== undefined && { sections: data.sections as any }),
        ...(data.settings !== undefined && { settings: data.settings as any }),
        ...(data.templateId !== undefined && { templateId: data.templateId }),
      },
    });

    return updated;
  }

  /**
   * Applies an inline AI transformation on a specific section
   */
  static async executeSectionAiAction(
    userId: string,
    documentId: string,
    sectionId: string,
    action: 'improve' | 'rewrite' | 'shorten' | 'expand' | 'ats_optimize',
    targetOpportunityText?: string
  ) {
    const document = await prisma.studioDocument.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    const sections = (document.sections as any[]) || [];
    const sectionIndex = sections.findIndex((s) => s.id === sectionId);

    if (sectionIndex === -1) {
      throw new Error('Section not found in document');
    }

    const targetSection = sections[sectionIndex];
    const startTime = Date.now();

    const { systemPrompt, userPrompt } = buildSectionAssistantPrompt({
      documentType: document.documentType,
      sectionTitle: targetSection.title,
      content: targetSection.content,
      action,
      targetOpportunityText: targetOpportunityText || document.targetOpportunityText || undefined,
    });

    let completion: any;
    try {
      completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      });
    } catch (err: any) {
      throw new Error(`Section AI transformation failed: ${err.message}`);
    }

    const durationMs = Date.now() - startTime;
    const rawContent = completion.choices[0]?.message?.content || '{}';
    let updatedContent = targetSection.content;

    try {
      const parsed = JSON.parse(rawContent);
      if (parsed.updatedContent !== undefined) {
        updatedContent = parsed.updatedContent;
      }
    } catch {}

    // Save snapshot in aiHistory for reversion
    const currentHistory = (document.aiHistory as any[]) || [];
    const historySnapshot = {
      timestamp: new Date().toISOString(),
      sectionId,
      previousContent: targetSection.content,
      newContent: updatedContent,
      action,
    };

    // Update section content in array
    sections[sectionIndex] = {
      ...targetSection,
      content: updatedContent,
    };

    const updated = await prisma.studioDocument.update({
      where: { id: documentId },
      data: {
        sections: sections as any,
        aiHistory: [historySnapshot, ...currentHistory.slice(0, 19)] as any,
      },
    });

    // Telemetry log
    await prisma.aiGenerationLog.create({
      data: {
        userId,
        documentId,
        action: `SECTION_${action.toUpperCase()}`,
        documentType: document.documentType,
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        durationMs,
        status: 'SUCCESS',
      },
    });

    return { document: updated, updatedSection: sections[sectionIndex] };
  }

  /**
   * Reverts the most recent AI transformation on a section
   */
  static async revertSectionAiAction(userId: string, documentId: string, sectionId: string) {
    const document = await prisma.studioDocument.findFirst({
      where: { id: documentId, userId },
    });

    if (!document) throw new Error('Document not found');

    const history = (document.aiHistory as any[]) || [];
    const historyIndex = history.findIndex((h) => h.sectionId === sectionId);

    if (historyIndex === -1) {
      throw new Error('No AI history available for this section');
    }

    const targetHistory = history[historyIndex];
    const sections = (document.sections as any[]) || [];
    const sectionIndex = sections.findIndex((s) => s.id === sectionId);

    if (sectionIndex !== -1) {
      sections[sectionIndex] = {
        ...sections[sectionIndex],
        content: targetHistory.previousContent,
      };
    }

    // Remove consumed history entry
    const newHistory = [...history.slice(0, historyIndex), ...history.slice(historyIndex + 1)];

    const updated = await prisma.studioDocument.update({
      where: { id: documentId },
      data: {
        sections: sections as any,
        aiHistory: newHistory as any,
      },
    });

    return updated;
  }

  /**
   * Returns list of user's Studio Documents with optional search filter
   */
  static async getUserDocuments(userId: string, page = 1, limit = 20, search?: string) {
    const where: any = { userId };
    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [documents, total] = await Promise.all([
      prisma.studioDocument.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.studioDocument.count({ where }),
    ]);

    return { documents, total, page, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Returns a single Studio Document by ID
   */
  static async getDocumentById(userId: string, documentId: string) {
    const document = await prisma.studioDocument.findFirst({
      where: { id: documentId, userId },
    });
    if (!document) throw new Error('Document not found');
    return document;
  }

  /**
   * Duplicates an existing document
   */
  static async duplicateDocument(userId: string, documentId: string) {
    const source = await this.getDocumentById(userId, documentId);
    const duplicated = await prisma.studioDocument.create({
      data: {
        userId,
        title: `${source.title} (Copy)`,
        documentType: source.documentType,
        targetOpportunityText: source.targetOpportunityText,
        templateId: source.templateId,
        sections: source.sections as any,
        settings: source.settings as any,
        aiHistory: [],
      },
    });
    return duplicated;
  }

  /**
   * Deletes a document
   */
  static async deleteDocument(userId: string, documentId: string) {
    const document = await prisma.studioDocument.findFirst({
      where: { id: documentId, userId },
    });
    if (!document) throw new Error('Document not found');

    await prisma.studioDocument.delete({
      where: { id: documentId },
    });
    return { success: true };
  }
}
