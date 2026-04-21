import { prisma } from '../config/db'

export async function upsertToken(userId: string, token: string): Promise<void> {
  await prisma.pushToken.upsert({
    where:  { userId },
    create: { userId, token },
    update: { token },
  })
}

export async function deleteToken(userId: string): Promise<void> {
  await prisma.pushToken.deleteMany({ where: { userId } })
}

export async function getTokenByUserId(userId: string): Promise<string | null> {
  const row = await prisma.pushToken.findUnique({
    where:  { userId },
    select: { token: true },
  })
  return row?.token ?? null
}

export async function getTokensByUserIds(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) return []
  const rows = await prisma.pushToken.findMany({
    where:  { userId: { in: userIds } },
    select: { token: true },
  })
  return rows.map((r) => r.token)
}
