/**
 * OpporHub OS — Edit Document Section Command DTO
 */

import { Command } from '../../core/events/event-bus';

export interface EditDocumentSectionPayload {
  userId: string;
  documentId: string;
  sectionKey: 'summary' | 'experience' | 'skills' | 'education' | 'projects';
  sectionData: any;
  aiAction?: 'improve' | 'shorten' | 'expand' | 'ats_optimize';
}

export type EditDocumentSectionCommand = Command<EditDocumentSectionPayload>;
