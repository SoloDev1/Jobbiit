import { prisma } from '../config/db'

export async function findByProviderSubject(provider: string, subject: string) {
  return prisma.oAuthAccount.findUnique({
    where:  { provider_subject: { provider, subject } },
    include: { user: { select: { id: true, email: true, role: true, isActive: true, isBanned: true, onboardingCompletedAt: true } } },
  })
}

export async function linkToUser(userId: string, provider: string, subject: string, email: string | null) {
  return prisma.oAuthAccount.create({
    data: { userId, provider, subject, email },
  })
}