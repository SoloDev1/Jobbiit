/**
 * OpporHub OS — Generate Document Command DTO
 */

import { Command } from '../../core/events/event-bus';

export interface GenerateDocumentPayload {
  userId: string;
  docType: string;
  userPrompt: string;
  opportunityId?: string;
  existingDocumentJson?: any;
}

export type GenerateDocumentCommand = Command<GenerateDocumentPayload>;
