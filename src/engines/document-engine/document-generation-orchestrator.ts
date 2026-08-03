/**
 * OpporHub OS — Document Generation Orchestrator
 * Centralized pipeline coordinator for document generation, tailoring, and refinement.
 * Handles revision history (v1, v2, v3), plugin selection, validation, and event publishing.
 */

import { plannerAgent } from '../ai/agents/planner.agent';
import { retrieverAgent } from '../ai/agents/retriever.agent';
import { writerAgent } from '../ai/agents/writer.agent';
import { reviewerAgent } from '../ai/agents/reviewer.agent';
import { validatorAgent } from '../ai/agents/validator.agent';
import { documentRepository } from '../../repositories/document.repository';
import { EventBus } from '../../core/events/event-bus';
import { logger } from '../../core/telemetry/logger.service';
import { DocumentType, DocumentFormat } from '@prisma/client';

export interface OrchestratorGenerationInput {
  userId: string;
  docType: string;
  userPrompt: string;
  opportunityId?: string;
  existingDocumentJson?: any;
}

export class DocumentGenerationOrchestrator {
  /**
   * Generates a new document from scratch or memory.
   */
  public async generate(input: OrchestratorGenerationInput) {
    const { userId, docType, userPrompt, opportunityId, existingDocumentJson } = input;
    logger.info({ userId, docType, service: 'DocumentGenerationOrchestrator' }, 'Orchestrating document generation');

    // 1. Planner Agent
    const plan = await plannerAgent.execute({ userPrompt, intent: docType, mode: 'standard' });

    // 2. Retriever Agent
    const memory = await retrieverAgent.execute({ userId, opportunityId });

    // 3. Writer Agent (synthesizes via PluginRegistry)
    const rawDocumentJson = await writerAgent.execute({
      docType: plan.targetDocType,
      userPrompt,
      profile: memory.profile,
      opportunityContext: memory.opportunityContext,
      existingDocumentJson,
    });

    // 4. Reviewer Agent
    const reviewResult = await reviewerAgent.execute(rawDocumentJson);

    // 5. Validator Agent & Matching Engine
    const validation = await validatorAgent.execute(rawDocumentJson, memory.opportunityContext);

    // 6. Save document in repository
    const savedDoc = await documentRepository.create({
      userId,
      type: (docType.toUpperCase() as DocumentType) || 'CV',
      format: 'PDF' as DocumentFormat,
      metadata: validation.validatedDocument,
      status: 'DONE',
    });

    // 7. Publish Event
    await EventBus.publish('document.generated', {
      documentId: savedDoc.id,
      userId,
      docType,
      atsMatch: validation.atsMatch,
      review: reviewResult,
      timestamp: new Date(),
    });

    return {
      document: validation.validatedDocument,
      atsMatch: validation.atsMatch,
      savedDocId: savedDoc.id,
    };
  }

  /**
   * Tailors an existing document against a target opportunity, creating a new revision without mutating the original.
   */
  public async tailor(documentId: string, opportunityId: string, userId: string) {
    logger.info({ documentId, opportunityId, userId, service: 'DocumentGenerationOrchestrator' }, 'Orchestrating document tailoring');

    const originalDoc = await documentRepository.findById(documentId);

    // Run generation with opportunity context to produce a new revision
    const result = await this.generate({
      userId,
      docType: originalDoc.type.toLowerCase(),
      userPrompt: `Tailor document for opportunity ${opportunityId}`,
      opportunityId,
      existingDocumentJson: originalDoc.metadata,
    });

    // Publish document.tailored event
    await EventBus.publish('document.tailored', {
      originalDocumentId: documentId,
      tailoredDocumentId: result.savedDocId,
      opportunityId,
      userId,
      atsMatch: result.atsMatch,
      timestamp: new Date(),
    });

    return result;
  }
}

export const documentGenerationOrchestrator = new DocumentGenerationOrchestrator();
