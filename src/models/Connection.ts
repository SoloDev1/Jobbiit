import { prisma } from '../config/db'
import { ConnectionStatus } from '@prisma/client'
import type { Prisma } from '@prisma/client'

// ─── Shared helpers ───────────────────────────────────────────────────────────

const otherUserInclude = {
  select: {
    id: true,
    profile: {
      select: {
        firstName: true,
        lastName:  true,
        headline:  true,
        avatarUrl: true,
      },
    },
  },
} satisfies Prisma.UserDefaultArgs

export type ConnectionUser = {
  id:      string
  profile: {
    firstName: string
    lastName:  string
    headline:  string | null
    avatarUrl: string | null
  } | null
}

export type ConnectionRecord = {
  id:         string
  senderId:   string
  receiverId: string
  status:     ConnectionStatus
  createdAt:  Date
  updatedAt:  Date
  sender?:    ConnectionUser
  receiver?:  ConnectionUser
}

export type ConnectionStatus_ = ConnectionStatus

// ─── sendRequest ─────────────────────────────────────────────────────────────

export async function sendRequest(
  requesterId: string,
  receiverId:  string,
): Promise<
  | { ok: true;      row: ConnectionRecord }
  | { ok: false;     reason: 'self' | 'duplicate' }
> {
  if (requesterId === receiverId) return { ok: false, reason: 'self' }

  const existing = await prisma.connection.findFirst({
    where: {
      OR: [
        { senderId: requesterId, receiverId },
        { senderId: receiverId, receiverId: requesterId },
      ],
    },
    select: { id: true },
  })
  if (existing) return { ok: false, reason: 'duplicate' }

  const row = await prisma.connection.create({
    data: {
      senderId:   requesterId,
      receiverId,
      status:     ConnectionStatus.PENDING,
    },
    include: {
      receiver: otherUserInclude,
    },
  })
  return { ok: true, row: row as ConnectionRecord }
}

// ─── acceptConnection ─────────────────────────────────────────────────────────

export async function acceptConnection(
  connectionId: string,
  userId:       string,
): Promise<ConnectionRecord | null | 'forbidden'> {
  const conn = await prisma.connection.findUnique({
    where:  { id: connectionId },
    select: { id: true, receiverId: true, status: true },
  })
  if (!conn || conn.status !== ConnectionStatus.PENDING) return null
  if (conn.receiverId !== userId) return 'forbidden'

  const updated = await prisma.connection.update({
    where: { id: connectionId },
    data:  { status: ConnectionStatus.ACCEPTED },
    include: {
      sender:   otherUserInclude,
      receiver: otherUserInclude,
    },
  })
  return updated as ConnectionRecord
}

// ─── declineConnection ────────────────────────────────────────────────────────

export async function declineConnection(
  connectionId: string,
  userId:       string,
): Promise<ConnectionRecord | null | 'forbidden'> {
  const conn = await prisma.connection.findUnique({
    where:  { id: connectionId },
    select: { id: true, receiverId: true, status: true },
  })
  if (!conn || conn.status !== ConnectionStatus.PENDING) return null
  if (conn.receiverId !== userId) return 'forbidden'

  const updated = await prisma.connection.update({
    where: { id: connectionId },
    data:  { status: ConnectionStatus.DECLINED },
    include: {
      sender:   otherUserInclude,
      receiver: otherUserInclude,
    },
  })
  return updated as ConnectionRecord
}

// ─── removeConnection ─────────────────────────────────────────────────────────

export async function removeConnection(
  connectionId: string,
  userId:       string,
): Promise<'deleted' | 'not_found' | 'forbidden'> {
  const conn = await prisma.connection.findUnique({
    where:  { id: connectionId },
    select: { senderId: true, receiverId: true },
  })
  if (!conn) return 'not_found'
  if (conn.senderId !== userId && conn.receiverId !== userId) return 'forbidden'

  await prisma.connection.delete({ where: { id: connectionId } })
  return 'deleted'
}

// ─── getConnections ───────────────────────────────────────────────────────────

export async function getConnections(userId: string): Promise<ConnectionRecord[]> {
  const rows = await prisma.connection.findMany({
    where: {
      status: ConnectionStatus.ACCEPTED,
      OR:     [{ senderId: userId }, { receiverId: userId }],
    },
    orderBy: { updatedAt: 'desc' },
    include: {
      sender:   otherUserInclude,
      receiver: otherUserInclude,
    },
  })
  return rows as ConnectionRecord[]
}

// ─── getPendingRequests ───────────────────────────────────────────────────────

export async function getPendingRequests(userId: string): Promise<ConnectionRecord[]> {
  const rows = await prisma.connection.findMany({
    where: {
      receiverId: userId,
      status:     ConnectionStatus.PENDING,
    },
    orderBy: { createdAt: 'desc' },
    include: {
      sender: otherUserInclude,
    },
  })
  return rows as ConnectionRecord[]
}

// ─── getSuggestions ───────────────────────────────────────────────────────────

export async function getSuggestions(
  userId: string,
  limit = 10,
): Promise<ConnectionUser[]> {
  const connected = await prisma.connection.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    select: { senderId: true, receiverId: true },
  })

  const excludedIds = new Set<string>([userId])
  for (const c of connected) {
    excludedIds.add(c.senderId)
    excludedIds.add(c.receiverId)
  }

  const users = await prisma.user.findMany({
    where: {
      id:       { notIn: [...excludedIds] },
      isActive: true,
      isBanned: false,
    },
    take:    limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      profile: {
        select: {
          firstName: true,
          lastName:  true,
          headline:  true,
          avatarUrl: true,
        },
      },
    },
  })
  return users
}

// ─── getConnectionStatus ──────────────────────────────────────────────────────

export async function getConnectionStatus(
  userId:      string,
  otherUserId: string,
): Promise<{ status: ConnectionStatus; connectionId: string } | null> {
  const conn = await prisma.connection.findFirst({
    where: {
      OR: [
        { senderId: userId,      receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    },
    select: { id: true, status: true },
  })
  if (!conn) return null
  return { connectionId: conn.id, status: conn.status }
}
