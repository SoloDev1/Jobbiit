/**
 * OpporHub OS — Edit Document Section Command Handler
 * Updates document sections, handles AI section refinement, creates new revision, and dispatches events.
 */

import { EditDocumentSectionCommand } from './edit-document.command';
import { documentRepository } from '../../repositories/document.repository';
import { matchingEngine } from '../../engines/matching-engine/matching.engine';
import { EventBus } from '../../core/events/event-bus';
import { logger } from '../../core/telemetry/logger.service';

export class EditDocumentSectionHandler {
  public async execute(command: EditDocumentSectionCommand) {
    const { userId, documentId, sectionKey, sectionData, aiAction } = command.payload;
    logger.info({ userId, documentId, sectionKey, aiAction, service: 'EditDocumentSectionHandler' }, 'Executing edit document section use case');

    const originalDoc = await documentRepository.findById(documentId);
    const metadata = typeof originalDoc.metadata === 'object' && originalDoc.metadata !== null
      ? { ...(originalDoc.metadata as Record<string, any>) }
      : {} as Record<string, any>;
    const content = { ...((metadata.content as Record<string, any>) || {}) };

    // Update section content
    content[sectionKey] = sectionData;
    metadata.content = content;
    metadata.updatedAt = new Date();

    // Calculate new ATS match breakdown
    const atsMatch = matchingEngine.calculateMatch(metadata as any);

    // Save new revision in repository
    const updatedDoc = await documentRepository.create({
      userId,
      type: originalDoc.type,
      format: originalDoc.format === 'BOTH' ? 'PDF' : originalDoc.format,
      metadata,
      status: 'DONE',
    });

    await EventBus.publish('document.updated', {
      originalDocumentId: documentId,
      updatedDocumentId: updatedDoc.id,
      sectionKey,
      aiAction,
      atsMatch,
      timestamp: new Date(),
    });

    return {
      document: metadata,
      atsMatch,
      savedDocId: updatedDoc.id,
    };
  }
}

export const editDocumentSectionHandler = new EditDocumentSectionHandler();
