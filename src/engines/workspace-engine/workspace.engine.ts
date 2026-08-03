/**
 * OpporHub OS — Workspace Engine
 * Central OS coordinator orchestrating Opportunity, Intelligence, Memory, Prompts, Documents, and Templates into a unified Workspace DTO.
 * Backed by Prisma via WorkspaceRepository (no in-memory state).
 */

import { WorkspaceDto } from '../../contracts/workspaces/workspace.dto';
import { opportunityAIEngine } from '../opportunity-engine/opportunity-ai.engine';
import { careerIntelligenceEngine } from '../intelligence-engine/career-intelligence.engine';
import { enhancedMemoryEngine } from '../memory-engine/enhanced-memory.engine';
import { documentGenerationOrchestrator } from '../document-engine/document-generation-orchestrator';
import { templateEngine, TemplateSkin } from '../template-engine/template.engine';
import { profileEngine } from '../profile-engine/profile.engine';
import { workspaceRepository } from '../../repositories/workspace.repository';
import { EventBus } from '../../core/events/event-bus';
import { logger } from '../../core/telemetry/logger.service';

export class WorkspaceEngine {
  /**
   * Creates a new Workspace, persisted via Prisma.
   */
  public async createWorkspace(userId: string, title: string, rawOpportunityText?: string): Promise<WorkspaceDto> {
    logger.info({ userId, service: 'WorkspaceEngine' }, 'Creating workspace');

    let opportunityContext = null;
    if (rawOpportunityText) {
      opportunityContext = await opportunityAIEngine.extractIntelligence(rawOpportunityText).catch(() => null);
    }

    const profile = await profileEngine.getProfile(userId);
    const intelligence = careerIntelligenceEngine.analyzeCareerFit(profile, opportunityContext || undefined);
    const preferences = enhancedMemoryEngine.getUserPreferences(userId);

    const workspace = await workspaceRepository.create({
      userId,
      title,
      status: 'DRAFT',
      opportunityContext,
      intelligence,
      preferences,
    });

    await EventBus.publish('workspace.created', { workspaceId: workspace.id, userId, timestamp: new Date() });

    return this.toWorkspaceDto(workspace);
  }

  /**
   * Generates a document inside a workspace using DocumentGenerationOrchestrator and TemplateEngine.
   */
  public async generateWorkspaceDocument(workspaceId: string, docType: string, userPrompt: string, templateId?: TemplateSkin): Promise<WorkspaceDto> {
    const workspace = await workspaceRepository.findById(workspaceId);

    const genResult = await documentGenerationOrchestrator.generate({
      userId: workspace.userId,
      docType,
      userPrompt,
      existingDocumentJson: null,
    });

    if (templateId) {
      templateEngine.applyTemplate(genResult.document, templateId);
    }

    // Link document to workspace
    if (genResult.savedDocId) {
      await workspaceRepository.addDocument(workspaceId, genResult.savedDocId);
    }

    // Update workspace status
    const updated = await workspaceRepository.update(workspaceId, { status: 'READY' });
    return this.toWorkspaceDto(updated);
  }

  /**
   * Returns unified WorkspaceDto for UI clients.
   */
  public async getWorkspaceDto(workspaceId: string): Promise<WorkspaceDto> {
    const workspace = await workspaceRepository.findById(workspaceId);
    return this.toWorkspaceDto(workspace);
  }

  public async listUserWorkspaces(userId: string): Promise<WorkspaceDto[]> {
    const workspaces = await workspaceRepository.findByUserId(userId);
    return workspaces.map((ws: any) => this.toWorkspaceDto(ws));
  }

  /**
   * Maps a Prisma workspace record to the WorkspaceDto contract.
   */
  private toWorkspaceDto(ws: any): WorkspaceDto {
    const documents = (ws.documents || []).map((wd: any) => wd.document?.metadata).filter(Boolean);

    return {
      id: ws.id,
      userId: ws.userId,
      title: ws.title,
      status: ws.status,
      opportunity: ws.opportunityContext || null,
      intelligence: ws.intelligence || null,
      preferences: ws.preferences || { preferredTemplate: 'apple', preferredAccentColor: '#ea580c', preferredJobType: 'FULL_TIME' },
      documents,
      timeline: [],
      activity: [],
      createdAt: ws.createdAt,
      updatedAt: ws.updatedAt,
    };
  }
}

export const workspaceEngine = new WorkspaceEngine();
