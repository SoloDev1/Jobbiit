/**
 * OpporHub OS — Tailor Document Command Handler
 * Delegates execution directly to DocumentGenerationOrchestrator.
 */

import { TailorDocumentCommand } from './tailor-document.command';
import { documentGenerationOrchestrator } from '../../engines/document-engine/document-generation-orchestrator';
import { logger } from '../../core/telemetry/logger.service';

export class TailorDocumentHandler {
  public async execute(command: TailorDocumentCommand) {
    const { userId, documentId, opportunityId } = command.payload;
    logger.info({ userId, documentId, opportunityId, service: 'TailorDocumentHandler' }, 'Executing tailor document use case');

    return documentGenerationOrchestrator.tailor(documentId, opportunityId, userId);
  }
}

export const tailorDocumentHandler = new TailorDocumentHandler();
