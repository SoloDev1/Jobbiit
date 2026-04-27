import { NotificationType } from '@prisma/client'
import { logger } from '../config/logger'
import { prisma } from '../config/db'
import * as NotificationModel from '../models/Notification'
import * as pushService from './push.service'

/**
 * Logical notification kinds (API / app layer). Mapped to Prisma `NotificationType`.
 */
export const NOTIFICATION_TYPES = {
  NEW_CONNECTION_REQUEST:   'CONNECTION_REQUEST',
  CONNECTION_ACCEPTED:      'CONNECTION_ACCEPTED',
  POST_LIKED:               'POST_LIKE',
  POST_COMMENTED:           'POST_COMMENT',
  JOB_APPLICATION_RECEIVED: 'JOB_APPLICATION',
  /** Prisma has no dedicated enum value — stored as SYSTEM. */
  OPPORTUNITY_APPROVED:     'SYSTEM',
  OPPORTUNITY_MATCH:        'OPPORTUNITY_MATCH',
  JOB_MATCH:                'JOB_MATCH',
} as const

export type NotificationKind = keyof typeof NOTIFICATION_TYPES

function toPrismaType(kind: NotificationKind): NotificationType {
  return NOTIFICATION_TYPES[kind] as NotificationType
}

const PUSH_COPY: Record<NotificationKind, { title: string; body: string }> = {
  NEW_CONNECTION_REQUEST: {
    title: 'New Connection Request',
    body:  'Someone wants to connect with you',
  },
  CONNECTION_ACCEPTED: {
    title: 'Connection Accepted',
    body:  'Your connection request was accepted',
  },
  POST_LIKED: {
    title: 'New Like',
    body:  'Someone liked your post',
  },
  POST_COMMENTED: {
    title: 'New Comment',
    body:  'Someone commented on your post',
  },
  JOB_APPLICATION_RECEIVED: {
    title: 'New Application',
    body:  'Someone applied to your job posting',
  },
  OPPORTUNITY_APPROVED: {
    title: 'Opportunity Approved',
    body:  'Your opportunity listing has been approved',
  },
  OPPORTUNITY_MATCH: {
    title: 'New Opportunity Match',
    body:  'An opportunity matching your skills is now available',
  },
  JOB_MATCH: {
    title: 'New Job Match',
    body:  'A job matching your skills has been posted',
  },
}

/**
 * Create an in-app notification for a recipient, then enqueue Expo push (best-effort).
 * Fire-and-forget from controllers — DB + push errors are logged only.
 */
export function createNotification(
  recipientId: string,
  kind:        NotificationKind,
  message:     string,
  entityId?:   string,
  triggerId?:  string,
): void {
  void (async () => {
    try {
      const type = toPrismaType(kind)
      const row = await NotificationModel.createNotification(
        recipientId,
        type,
        message,
        entityId,
        triggerId,
      )

      const copy = PUSH_COPY[kind]
      void pushService.sendPushToUser(recipientId, copy.title, copy.body, {
        kind,
        entityId:       entityId ?? null,
        notificationId: row.id,
      })
    } catch (err) {
      logger.error({ err, recipientId, kind, entityId }, 'createNotification failed')
    }
  })()
}

/**
 * Fan-out when a new post is published (connections, push, in-app notifications).
 */
export async function notifyNewPost(postId: string, authorId: string): Promise<void> {
  try {
    logger.debug({ postId, authorId }, 'notifyNewPost (reserved)')
  } catch (err) {
    logger.error({ err, postId, authorId }, 'notifyNewPost failed')
  }
}

/**
 * Fan-out OPPORTUNITY_MATCH notifications to all users whose profile skills
 * overlap the opportunity's skills. Capped at 500 recipients. Fire-and-forget safe.
 */
export async function notifyOpportunityMatch(
  opportunityId: string,
  title:         string,
): Promise<void> {
  try {
    const skillIds = await prisma.opportunitySkill
      .findMany({ where: { opportunityId }, select: { skillId: true } })
      .then((rows) => rows.map((r) => r.skillId))

    if (skillIds.length === 0) return

    const userIds = await prisma.profileSkill
      .findMany({
        where:    { skillId: { in: skillIds } },
        select:   { profile: { select: { userId: true } } },
        distinct: ['profileId'],
        take:     500,
      })
      .then((rows) => rows.map((r) => r.profile.userId))

    if (userIds.length === 0) return

    const message = `"${title}" matches your skills`
    for (const recipientId of userIds) {
      createNotification(recipientId, 'OPPORTUNITY_MATCH', message, opportunityId)
    }

    logger.info({ opportunityId, recipientCount: userIds.length }, 'Opportunity match notifications sent')
  } catch (err) {
    logger.error({ err, opportunityId }, 'notifyOpportunityMatch failed')
  }
}

/**
 * Fan-out JOB_MATCH notifications to all users whose profile skills
 * overlap the job's skills. Capped at 500 recipients. Fire-and-forget safe.
 */
export async function notifyJobMatch(
  jobId: string,
  title: string,
): Promise<void> {
  try {
    const skillIds = await prisma.jobSkill
      .findMany({ where: { jobId }, select: { skillId: true } })
      .then((rows) => rows.map((r) => r.skillId))

    if (skillIds.length === 0) return

    const userIds = await prisma.profileSkill
      .findMany({
        where:    { skillId: { in: skillIds } },
        select:   { profile: { select: { userId: true } } },
        distinct: ['profileId'],
        take:     500,
      })
      .then((rows) => rows.map((r) => r.profile.userId))

    if (userIds.length === 0) return

    const message = `"${title}" matches your skills`
    for (const recipientId of userIds) {
      createNotification(recipientId, 'JOB_MATCH', message, jobId)
    }

    logger.info({ jobId, recipientCount: userIds.length }, 'Job match notifications sent')
  } catch (err) {
    logger.error({ err, jobId }, 'notifyJobMatch failed')
  }
}
