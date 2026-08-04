import { logger } from '../core/telemetry/logger.service';

export type OrganizationCategory = 'COMPANY' | 'UNIVERSITY' | 'ACCELERATOR' | 'GOVERNMENT' | 'SCHOLARSHIP' | 'GRANT';

export interface OrganizationIntelligenceProfile {
  orgId: string;
  name: string;
  category: OrganizationCategory;
  mission: string;
  values: string[];
  selectionCriteria: string[];
  knownInterviewPatterns: string[];
  technicalStack?: string[];
}

export class OrganizationIntelligenceService {
  /**
   * Generates or fetches Organization Intelligence across companies, universities, scholarships, and accelerators.
   */
  public async getOrgIntelligence(orgName: string, category: OrganizationCategory = 'COMPANY'): Promise<OrganizationIntelligenceProfile> {
    logger.info({ orgName, category, service: 'OrganizationIntelligenceService' }, 'Fetching Organization Intelligence');

    return {
      orgId: `org_${orgName.toLowerCase().replace(/\s+/g, '_')}`,
      name: orgName,
      category,
      mission: `Empower candidates and excel in ${category.toLowerCase()} selection.`,
      values: ['Excellence', 'Leadership', 'Innovation', 'Ownership'],
      selectionCriteria: ['Technical Depth', 'STAR Impact', 'Domain Expertise', 'Culture Alignment'],
      knownInterviewPatterns: ['System Architecture Trade-offs', 'STAR Behavioral Deep Dive', 'Live Incident Analysis'],
      technicalStack: ['TypeScript', 'Node.js', 'Distributed Systems', 'PostgreSQL', 'Redis'],
    };
  }
}

export const organizationIntelligenceService = new OrganizationIntelligenceService();
