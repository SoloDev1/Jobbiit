/**
 * OpporHub OS — Manage Profile Command DTO
 */

import { Command } from '../../core/events/event-bus';

export interface ManageProfilePayload {
  userId: string;
  action: 'get' | 'update';
  profileData?: any;
}

export type ManageProfileCommand = Command<ManageProfilePayload>;
