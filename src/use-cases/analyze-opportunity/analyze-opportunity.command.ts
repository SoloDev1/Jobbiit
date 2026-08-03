/**
 * OpporHub OS — Analyze Opportunity Command DTO
 */

import { Command } from '../../core/events/event-bus';

export interface AnalyzeOpportunityPayload {
  userId: string;
  rawText: string;
  opportunityUrl?: string;
}

export type AnalyzeOpportunityCommand = Command<AnalyzeOpportunityPayload>;
