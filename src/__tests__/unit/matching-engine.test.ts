import { describe, it, expect } from 'vitest';
import { matchingEngine } from '../../engines/matching-engine/matching.engine';
import { DocumentDomainEntity } from '../../domain/document/document.entity';

describe('Matching Engine', () => {
  const mockDoc: DocumentDomainEntity = {
    schemaVersion: 'v2',
    id: 'doc-123',
    userId: 'user-123',
    docType: 'cv',
    title: 'Software Engineer CV',
    templateId: 'apple',
    styling: {
      primaryColor: '#ea580c',
      accentColor: '#f97316',
      fontFamily: 'Inter',
      headerStyle: 'banner',
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    content: {
      personal: {
        fullName: 'Jane Doe',
        email: 'jane@example.com',
      },
      summary: 'Experienced software engineer focusing on building scalable systems.',
      skills: ['TypeScript', 'Node.js', 'React', 'Docker'],
      experience: [
        {
          company: 'Tech Corp',
          title: 'Senior Engineer',
          startDate: '2020-01-01',
          bullets: [
            'architected high throughput services in Node.js',
            'led a cross-functional pod of 5 engineers',
          ],
        },
      ],
      education: [
        {
          school: 'State University',
          degree: 'B.S. Computer Science',
        },
      ],
      projects: [],
      certifications: [],
    },
  };

  it('should calculate match scores successfully when opportunity context is provided', () => {
    const mockOpportunityContext = {
      summary: 'Frontend Engineer',
      simpleExplanation: 'React role',
      requiredSkills: ['TypeScript', 'React'],
      preferredSkills: ['GraphQL'],
      responsibilities: ['Write clean code'],
      benefits: ['Flexible hours'],
      atsKeywords: ['TypeScript', 'React', 'Node.js'],
      interviewQuestions: [],
      careerLevel: 'SENIOR',
    };

    const result = matchingEngine.calculateMatch(mockDoc, mockOpportunityContext);

    expect(result.overallScore).toBeGreaterThanOrEqual(50);
    expect(result.skillCoverageScore).toBe(100); // TypeScript & React are matched
    expect(result.matchedKeywords).toContain('TypeScript');
    expect(result.matchedKeywords).toContain('React');
    expect(result.suggestions.length).toBeLessThanOrEqual(2);
  });

  it('should fallback gracefully when opportunity context is empty or undefined', () => {
    const result = matchingEngine.calculateMatch(mockDoc, undefined);

    expect(result.overallScore).toBeGreaterThanOrEqual(50);
    expect(result.skillCoverageScore).toBe(90); // default
    expect(result.matchedKeywords.length).toBe(0);
  });

  it('should count weak bullets and generate suggestions for action verbs', () => {
    const docWithWeakBullets: DocumentDomainEntity = {
      ...mockDoc,
      content: {
        ...mockDoc.content,
        experience: [
          {
            company: 'Tech Corp',
            title: 'Developer',
            startDate: '2020-01-01',
            bullets: [
              'wrote code for a web app', // doesn't start with action verb
            ],
          },
        ],
      },
    };

    const result = matchingEngine.calculateMatch(docWithWeakBullets);

    expect(result.weakBullets).toContain('wrote code for a web app');
    expect(result.suggestions.some(s => s.includes('action verbs'))).toBe(true);
  });
});
