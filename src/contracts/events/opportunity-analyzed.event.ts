/**
 * OpporHub OS — Opportunity Analyzed Event Contract
 */

export interface OpportunityAnalyzedEventPayload {
  userId: string;
  opportunityId: string;
  analysis: any;
  timestamp: Date;
}
