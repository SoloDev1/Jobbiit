/**
 * OpporHub OS — Retriever Agent
 * Independent agent that fetches profile memory and opportunity context.
 */

import { profileRepository } from '../../../repositories/profile.repository';
import { opportunityRepository } from '../../../repositories/opportunity.repository';

export interface RetrieverAgentInput {
  userId: string;
  opportunityId?: string;
}

export interface ContextMemoryPayload {
  profile: any;
  opportunityContext: any | null;
}

export class RetrieverAgent {
  public async execute(input: RetrieverAgentInput): Promise<ContextMemoryPayload> {
    const profile = await profileRepository.findByUserId(input.userId).catch(() => null);

    let opportunityContext = null;
    if (input.opportunityId) {
      opportunityContext = await opportunityRepository
        .findAnalysisByOpportunityId(input.opportunityId)
        .catch(() => null);
    }

    return {
      profile,
      opportunityContext,
    };
  }
}

export const retrieverAgent = new RetrieverAgent();
