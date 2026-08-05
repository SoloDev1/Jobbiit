import { describe, it, expect, vi } from 'vitest';
import request from 'supertest';
import { app } from '../../app';

// Mock database (prisma) to avoid external database calls in integration tests
vi.mock('../../config/db', () => {
  const mockSessions: Record<string, any> = {};

  const mockPrisma = {
    studioInterviewSession: {
      create: vi.fn().mockImplementation(({ data }) => {
        const id = 'mock-studio-session-123';
        const session = {
          id,
          userId: data.userId,
          category: data.category,
          targetOpportunityText: data.targetOpportunityText,
          history: data.history,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        mockSessions[id] = session;
        return Promise.resolve(session);
      }),
      findFirst: vi.fn().mockImplementation(({ where }) => {
        const session = mockSessions[where.id] || {
          id: where.id,
          userId: where.userId,
          category: 'Behavioral Interview',
          targetOpportunityText: 'Senior Engineer Role',
          history: [
            { role: 'assistant', content: 'Welcome to your interview practice! Tell me about yourself.' }
          ],
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        return Promise.resolve(session);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const session = mockSessions[where.id] || { id: where.id };
        session.history = data.history;
        return Promise.resolve(session);
      }),
    },
    aiGenerationLog: {
      create: vi.fn().mockResolvedValue({ id: 'log-123' }),
    },
  };

  return {
    prisma: mockPrisma,
    connectDb: vi.fn().mockResolvedValue(null),
  };
});

// Mock Token verification middleware
vi.mock('../../services/token.service', () => ({
  verifyAccess: vi.fn().mockReturnValue({ sub: 'mock-user-id' }),
}));

// Mock User Model helper query used in authenticate middleware
vi.mock('../../models/User', () => ({
  findById: vi.fn().mockResolvedValue({
    id: 'mock-user-id',
    role: 'MEMBER',
    isActive: true,
    isBanned: false,
  }),
}));

describe('Interview Studio MVP Integration API (/api/v1/studio/interview)', () => {
  const token = 'Bearer mock-jwt-token';

  it('should initialize a new interview studio session', async () => {
    const res = await request(app)
      .post('/api/v1/studio/interview/start')
      .set('Authorization', token)
      .send({
        category: 'Behavioral Interview',
        persona: 'TECHNICAL_LEAD',
        targetOpportunityText: 'Full Stack Engineer opportunity at OpporHub',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('mock-studio-session-123');
    expect(res.body.data.category).toBe('Behavioral Interview');
    expect(res.body.data.history).toBeDefined();
    expect(res.body.data.history.length).toBeGreaterThan(0);
  });

  it('should return 400 when starting session without category', async () => {
    const res = await request(app)
      .post('/api/v1/studio/interview/start')
      .set('Authorization', token)
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('category is required');
  });

  it('should respond to an interview turn and return STAR feedback', async () => {
    const res = await request(app)
      .post('/api/v1/studio/interview/mock-studio-session-123/respond')
      .set('Authorization', token)
      .send({
        userResponse: 'In my last project, I migrated our microservices to Docker and reduced deployment latency by 45%.',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.feedback).toBeDefined();
    expect(res.body.data.nextQuestion).toBeDefined();
    expect(res.body.data.session).toBeDefined();
  });

  it('should return 400 when responding with empty userResponse', async () => {
    const res = await request(app)
      .post('/api/v1/studio/interview/mock-studio-session-123/respond')
      .set('Authorization', token)
      .send({
        userResponse: '',
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should fetch session history by ID', async () => {
    const res = await request(app)
      .get('/api/v1/studio/interview/mock-studio-session-123')
      .set('Authorization', token);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe('mock-studio-session-123');
  });
});
