/**
 * OpporHub OS — Generate Document Command Handler
 * Coordinates RetrieverAgent -> WriterAgent -> ValidatorAgent -> DocumentRepository -> EventBus.
 */

import { GenerateDocumentCommand } from './generate-document.command';
import { retrieverAgent } from '../../engines/ai/agents/retriever.agent';
import { writerAgent } from '../../engines/ai/agents/writer.agent';
import { validatorAgent } from '../../engines/ai/agents/validator.agent';
import { documentRepository } from '../../repositories/document.repository';
import { EventBus } from '../../core/events/event-bus';
import { logger } from '../../core/telemetry/logger.service';
import { DocumentType, DocumentFormat } from '@prisma/client';

export class GenerateDocumentHandler {
  public async execute(command: GenerateDocumentCommand) {
    const { userId, docType, userPrompt, opportunityId, existingDocumentJson } = command.payload;
    logger.info({ userId, docType, service: 'GenerateDocumentHandler' }, 'Executing generate document use case');

    // 1. Execute Retriever Agent
    const memoryContext = await retrieverAgent.execute({ userId, opportunityId });

    // 2. Execute Writer Agent (Synthesizes via PluginRegistry)
    const rawDocumentJson = await writerAgent.execute({
      docType,
      userPrompt,
      profile: memoryContext.profile,
      opportunityContext: memoryContext.opportunityContext,
      existingDocumentJson,
    });

    // 3. Execute Validator Agent (Validates schema & calculates ATS Match)
    const validationOutput = await validatorAgent.execute(rawDocumentJson, memoryContext.opportunityContext);

    // 4. Save to Document Repository
    const savedDoc = await documentRepository
      .create({
        userId,
        type: (docType.toUpperCase() as DocumentType) || 'CV',
        format: 'PDF' as DocumentFormat,
        metadata: validationOutput.validatedDocument,
        status: 'DONE',
      })
      .catch((err) => {
        logger.error({ err, userId }, 'Failed to save document to repository');
        return null;
      });

    // 5. Publish Event to EventBus asynchronously
    await EventBus.publish('document.generated', {
      documentId: savedDoc?.id || `doc-${Date.now()}`,
      userId,
      docType,
      atsMatch: validationOutput.atsMatch,
      timestamp: new Date(),
    });

    return {
      document: validationOutput.validatedDocument,
      atsMatch: validationOutput.atsMatch,
      savedDocId: savedDoc?.id,
    };
  }
}

export const generateDocumentHandler = new GenerateDocumentHandler();
