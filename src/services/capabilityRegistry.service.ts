import { logger } from '../core/telemetry/logger.service';

export interface CapabilityDescriptor {
  key: string;
  title: string;
  description: string;
  category: 'INTERVIEW' | 'CODING' | 'CASE_STUDY' | 'HR' | 'NEGOTIATION';
  enabled: boolean;
}

export class CapabilityRegistryService {
  private capabilities: Map<string, CapabilityDescriptor> = new Map();

  constructor() {
    this.registerDefaults();
  }

  private registerDefaults() {
    const list: CapabilityDescriptor[] = [
      { key: 'INTERVIEW_CONVERSATION', title: 'Live AI Interview', description: 'Interactive AI Chat Interviewer', category: 'INTERVIEW', enabled: true },
      { key: 'CODING_CHALLENGE', title: 'Live Coding Assessment', description: 'Technical LeetCode / System Design Challenge', category: 'CODING', enabled: true },
      { key: 'CASE_STUDY', title: 'Case Study Simulation', description: 'Business & System Architecture Case Study', category: 'CASE_STUDY', enabled: true },
      { key: 'MOCK_HR', title: 'Mock HR Screening', description: 'Recruiter Screening & Culture Alignment', category: 'HR', enabled: true },
      { key: 'SALARY_NEGOTIATION', title: 'Salary Negotiation Practice', description: 'Simulate offer negotiation strategies', category: 'NEGOTIATION', enabled: true },
    ];

    for (const item of list) {
      this.capabilities.set(item.key, item);
    }
  }

  public getCapabilities(): CapabilityDescriptor[] {
    return Array.from(this.capabilities.values());
  }
}

export const capabilityRegistryService = new CapabilityRegistryService();
