import { prisma } from '../config/db'

/**
 * GDPR / app-store style portable export of data tied to the authenticated user.
 * Excludes secrets (password hash, refresh tokens, raw push tokens).
 */
export async function buildAccountDataExport(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id:                     true,
      email:                  true,
      role:                   true,
      isVerified:             true,
      isActive:               true,
      isBanned:               true,
      banReason:              true,
      createdAt:              true,
      updatedAt:              true,
      onboardingCompletedAt:  true,
      profile: {
        include: {
          experiences: { orderBy: { startDate: 'desc' } },
          educations:  { orderBy: { startDate: 'desc' } },
          skills:      { include: { skill: true } },
        },
      },
      sentConnections:     true,
      receivedConnections: true,
      posts: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take:    500,
      },
      comments: {
        where: { isDeleted: false },
        orderBy: { createdAt: 'desc' },
        take:    500,
      },
      likes: {
        orderBy: { createdAt: 'desc' },
        take:    1_000,
      },
      jobsPosted: {
        orderBy: { createdAt: 'desc' },
        take:    200,
      },
      applications: {
        orderBy: { createdAt: 'desc' },
        take:    500,
      },
      savedJobs: {
        orderBy: { createdAt: 'desc' },
        take:    500,
      },
      opportunitiesPosted: {
        orderBy: { createdAt: 'desc' },
        take:    200,
      },
      savedOpportunities: {
        orderBy: { createdAt: 'desc' },
        take:    500,
      },
      opportunityApps: {
        orderBy: { createdAt: 'desc' },
        take:    500,
      },
      interests: { include: { interest: true } },
      recommendations: {
        orderBy: { updatedAt: 'desc' },
        take:    500,
      },
      events: {
        orderBy: { createdAt: 'desc' },
        take:    2_000,
      },
      notifications: {
        orderBy: { createdAt: 'desc' },
        take:    1_000,
      },
      reportsFiled: {
        orderBy: { createdAt: 'desc' },
        take:    200,
      },
      reportsAgainst: {
        orderBy: { createdAt: 'desc' },
        take:    100,
      },
      pushTokenRecord: {
        select: { id: true, createdAt: true, updatedAt: true },
      },
    },
  })
}
