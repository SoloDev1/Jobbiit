import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../../app';

// Mock database (prisma) to avoid network calls to Neon DB during build/tests
vi.mock('../../config/db', () => {
  const mockPrisma = {
    workspace: {
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({
        id: 'mock-ws-id',
        title: data.title,
        userId: data.userId,
        status: 'DRAFT',
        opportunityContext: data.opportunityContext,
        intelligence: data.intelligence,
        preferences: data.preferences,
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findUnique: vi.fn().mockImplementation(({ where }) => Promise.resolve({
        id: where.id,
        title: 'Mock Workspace',
        userId: 'mock-user-id',
        status: 'READY',
        opportunityContext: {},
        intelligence: {},
        preferences: {},
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findMany: vi.fn().mockResolvedValue([]),
      update: vi.fn().mockImplementation(({ where, data }) => Promise.resolve({
        id: where.id,
        title: 'Mock Workspace Updated',
        userId: 'mock-user-id',
        status: data.status || 'READY',
        opportunityContext: {},
        intelligence: {},
        preferences: {},
        documents: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    },
    workspaceDocument: {
      create: vi.fn().mockResolvedValue({ workspaceId: 'mock-ws-id', documentId: 'mock-doc-id' }),
    },
    generatedDocument: {
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({
        id: 'mock-doc-id',
        userId: data.userId,
        type: data.type,
        format: data.format,
        metadata: data.metadata,
        status: 'DONE',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
      findUnique: vi.fn().mockImplementation(({ where }) => Promise.resolve({
        id: where.id,
        userId: 'mock-user-id',
        type: 'CV',
        format: 'PDF',
        metadata: {
          schemaVersion: 'v2',
          docType: 'cv',
          title: 'Mock CV',
          content: { personal: { fullName: 'Jane Doe', email: 'jane@example.com' }, experience: [], skills: [] },
          styling: { primaryColor: '#ea580c' },
        },
        status: 'DONE',
        createdAt: new Date(),
        updatedAt: new Date(),
      })),
    },
    profile: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'mock-profile-id',
        userId: 'mock-user-id',
        firstName: 'Jane',
        lastName: 'Doe',
        headline: 'Developer',
        bio: 'Hello world',
        updatedAt: new Date(),
      }),
    },
  };

  return {
    prisma: mockPrisma,
    connectDb: vi.fn().mockResolvedValue(null),
  };
});

// Mock Token verification to bypass authenticate middleware check
vi.mock('../../services/token.service', () => ({
  verifyAccess: vi.fn().mockReturnValue({ sub: 'mock-user-id' }),
}));

// Mock User Model helper queries used in authenticate middleware
vi.mock('../../models/User', () => ({
  findById: vi.fn().mockResolvedValue({
    id: 'mock-user-id',
    role: 'MEMBER',
    isActive: true,
    isBanned: false,
  }),
}));

// Mock OpenAI extraction engine to prevent network timeout
vi.mock('../../engines/opportunity-engine/opportunity-ai.engine', () => ({
  opportunityAIEngine: {
    extractIntelligence: vi.fn().mockResolvedValue({
      summary: 'Mocked opportunity analysis',
      simpleExplanation: 'Mocked explanation',
      requiredSkills: ['TypeScript', 'React'],
      preferredSkills: ['GraphQL'],
      responsibilities: [],
      benefits: [],
      atsKeywords: ['TypeScript', 'React'],
      interviewQuestions: [],
      careerLevel: 'SENIOR',
    }),
  },
}));

describe('Workspace Workflow Integration API (V2)', () => {
  const token = 'Bearer mock-jwt-token';

  it('should create a workspace', async () => {
    const res = await request(app)
      .post('/api/v2/workspaces')
      .set('Authorization', token)
      .send({
        title: 'My Workspace',
        rawOpportunityText: 'We are looking for a TypeScript developer with React expertise.',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('mock-ws-id');
    expect(res.body.data.title).toBe('My Workspace');
  });

  it('should return 400 when creating a workspace with invalid body', async () => {
    const res = await request(app)
      .post('/api/v2/workspaces')
      .set('Authorization', token)
      .send({
        title: '', // invalid empty title
      });

    expect(res.status).toBe(422); // Validation middleware returns 422
    expect(res.body.success).toBe(false);
  });

  it('should generate a document in a workspace', async () => {
    const res = await request(app)
      .post('/api/v2/workspaces/mock-ws-id/generate')
      .set('Authorization', token)
      .send({
        docType: 'cv',
        userPrompt: 'Tailor it aggressively',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('READY');
  });
});
