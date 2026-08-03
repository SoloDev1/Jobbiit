/**
 * OpporHub OS — Tailor Document Command DTO
 */

import { Command } from '../../core/events/event-bus';

export interface TailorDocumentPayload {
  userId: string;
  documentId: string;
  opportunityId: string;
}

export type TailorDocumentCommand = Command<TailorDocumentPayload>;
