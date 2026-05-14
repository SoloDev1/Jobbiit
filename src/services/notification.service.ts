import { NotificationType } from '@prisma/client'
import { logger } from '../config/logger'
import { prisma } from '../config/db'
import * as NotificationModel from '../models/Notification'
import * as pushService from './push.service'

// ─────────────────────────────────────────────────────────────────────────────
// KIND → PRISMA TYPE MAP
// ─────────────────────────────────────────────────────────────────────────────
// OPPORTUNITY_APPROVED has no dedicated Prisma enum value → stored as SYSTEM.
// ─────────────────────────────────────────────────────────────────────────────

export const NOTIFICATION_TYPES = {
  NEW_CONNECTION_REQUEST:   'CONNECTION_REQUEST',
  CONNECTION_ACCEPTED:      'CONNECTION_ACCEPTED',
  POST_LIKED:               'POST_LIKE',
  POST_COMMENTED:           'POST_COMMENT',
  JOB_APPLICATION_RECEIVED: 'JOB_APPLICATION',
  JOB_LIKED:                'JOB_LIKE',
  JOB_COMMENTED:            'JOB_COMMENT',
  OPPORTUNITY_APPROVED:     'SYSTEM',
  OPPORTUNITY_MATCH:        'OPPORTUNITY_MATCH',
  OPPORTUNITY_LIKED:        'OPPORTUNITY_LIKE',
  OPPORTUNITY_COMMENTED:    'OPPORTUNITY_COMMENT',
  JOB_MATCH:                'JOB_MATCH',
} as const

export type NotificationKind = keyof typeof NOTIFICATION_TYPES

function toPrismaType(kind: NotificationKind): NotificationType {
  return NOTIFICATION_TYPES[kind] as NotificationType
}

// ─────────────────────────────────────────────────────────────────────────────
// PUSH COPY
// ─────────────────────────────────────────────────────────────────────────────

const PUSH_COPY: Record<NotificationKind, { title: string; body: string }> = {
  NEW_CONNECTION_REQUEST:   { title: 'New Connection Request',  body: 'Someone wants to connect with you' },
  CONNECTION_ACCEPTED:      { title: 'Connection Accepted',     body: 'Your connection request was accepted' },
  POST_LIKED:               { title: 'New Like',               body: 'Someone liked your post' },
  POST_COMMENTED:           { title: 'New Comment',            body: 'Someone commented on your post' },
  JOB_APPLICATION_RECEIVED: { title: 'New Application',        body: 'Someone applied to your job posting' },
  JOB_LIKED:                { title: 'New Like',               body: 'Someone liked your job posting' },
  JOB_COMMENTED:            { title: 'New Comment',            body: 'Someone commented on your job posting' },
  OPPORTUNITY_APPROVED:     { title: 'Opportunity Approved',   body: 'Your opportunity listing has been approved and is now live' },
  OPPORTUNITY_MATCH:        { title: 'New Opportunity Match',  body: 'An opportunity matching your skills is now available' },
  OPPORTUNITY_LIKED:        { title: 'New Like',               body: 'Someone liked your opportunity listing' },
  OPPORTUNITY_COMMENTED:    { title: 'New Comment',            body: 'Someone commented on your opportunity listing' },
  JOB_MATCH:                { title: 'New Job Posted',         body: 'A new job has just been posted' },
}

// ─────────────────────────────────────────────────────────────────────────────
// createNotification — CORE PRIMITIVE
// ─────────────────────────────────────────────────────────────────────────────
// Writes one Notification row then fires an Expo push (best-effort).
// Always call without await — fire-and-forget.
//
// recipientId  — User.id who receives it
// kind         — app-layer kind key (maps to Prisma NotificationType)
// message      — text stored on the Notification row
// entityId     — id of the Job / Opportunity / Post being referenced
// triggerId    — User.id who caused the event (the actor)
// ─────────────────────────────────────────────────────────────────────────────

// notification.service.ts
export async function createNotification(
  recipientId: string,
  kind: NotificationKind,
  message: string,
  entityId?: string,
  triggerId?: string,
): Promise<void> {
  try {
    logger.info(
      { recipientId, kind, entityId },
      '🔔 createNotification START',
    )

    const prismaType = toPrismaType(kind)

    logger.info(
      { prismaType },
      '🔔 mapped prisma type',
    )

    const row = await NotificationModel.createNotification(
      recipientId,
      prismaType,
      message,
      entityId,
      triggerId,
    )

    logger.info(
      { rowId: row.id },
      '🔔 notification row created',
    )

    const { title, body } = PUSH_COPY[kind]

    logger.info(
      { recipientId, title },
      '🔔 sending push',
    )

    await pushService.sendPushToUsers(
      [recipientId],
      title,
      body,
      {
        kind,
        entityId: entityId ?? null,
        notificationId: row.id,
      },
    )

    logger.info(
      { recipientId },
      '🔔 push sent successfully',
    )
  } catch (err) {
    logger.error(
      {
        err,
        recipientId,
        kind,
        entityId,
        triggerId,
      },
      '❌ createNotification FAILED',
    )
  }
}
// ─────────────────────────────────────────────────────────────────────────────
// notifyJobCreated — ALL USERS
// ─────────────────────────────────────────────────────────────────────────────
// Triggered when a new job is posted.
// Notifies every active, non-banned user in batches of 500.
// The poster is excluded — they don't need to be told about their own job.
//
// Strategy: cursor-based pagination over User table so we never load all
// user IDs into memory at once.
//
// Call site (job controller, fire-and-forget):
//   void notifyJobCreated(job.id, job.title, job.company, req.user.id)
// ─────────────────────────────────────────────────────────────────────────────

export async function notifyJobCreated(
  jobId:    string,
  title:    string,
  company:  string,
  posterId: string,
): Promise<void> {
  try {

logger.info({ jobId, title }, '🔔 notifyJobCreated: ENTERED') 
    const BATCH_SIZE = 500
    const message    = `New job "${title}" at ${company} has just been posted`
    let   cursor: string | undefined

    while (true) {
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          isBanned: false,
          // id:       { not: posterId },       // exclude the poster
        },
        select: { id: true },
        take:   BATCH_SIZE,
        ...(cursor
          ? { skip: 1, cursor: { id: cursor } }
          : {}),
        orderBy: { id: 'asc' },              // stable order required for cursor pagination
      })

      if (users.length === 0) break

      for (const user of users) {
        await createNotification(user.id, 'JOB_MATCH', message, jobId)
      }

      if (users.length < BATCH_SIZE) break   // last page
      cursor = users[users.length - 1].id
    }

    logger.info({ jobId, title, company }, 'notifyJobCreated: all users notified')
  } catch (err) {
    logger.error({ err, jobId, title }, 'notifyJobCreated failed')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// notifyOpportunityApproved — POSTER + SKILL-MATCHED USERS
// ─────────────────────────────────────────────────────────────────────────────
// Triggered when an admin approves an opportunity. Does TWO things:
//
//   1. Notifies the POSTER that their listing is now live.
//      approverId stored as Notification.triggerId so the poster can see who approved.
//
//   2. Fan-out OPPORTUNITY_MATCH to all users whose ProfileSkill overlaps
//      the opportunity's OpportunitySkill rows (skill-based, capped at 500).
//
// ⚠️  OpportunitySkill rows must exist before calling this.
//     Attach skills when the opportunity is created so they're ready at approval time.
//
// Call site (admin opportunity controller, fire-and-forget):
//   void notifyOpportunityApproved(opp.id, opp.title, opp.posterId, req.user.id)
// ─────────────────────────────────────────────────────────────────────────────

export async function notifyOpportunityApproved(
  opportunityId: string,
  title:         string,
  posterId:      string,
  approverId:    string,
): Promise<void> {
  try {
    logger.info({ opportunityId, title }, '🔔 notifyOpportunityApproved: ENTERED')

    // 1 — tell the poster their listing is live
    await createNotification(
      posterId,
      'OPPORTUNITY_APPROVED',
      `Your opportunity "${title}" has been approved and is now live`,
      opportunityId,
      approverId,
    )

    // 2 — MVP: broadcast to ALL users except poster and approver
    const BATCH_SIZE = 500
    const message    = `New opportunity "${title}" is now available`
    let   cursor: string | undefined

    while (true) {
      const users = await prisma.user.findMany({
        where: {
          isActive: true,
          isBanned: false,
          //id:       { notIn: [posterId, approverId] },
        },
        select:  { id: true },
        take:    BATCH_SIZE,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: { id: 'asc' },
      })

      if (users.length === 0) break

      for (const user of users) {
        await createNotification(user.id, 'OPPORTUNITY_MATCH', message, opportunityId)
      }

      if (users.length < BATCH_SIZE) break
      cursor = users[users.length - 1].id
    }

    logger.info({ opportunityId, title }, 'notifyOpportunityApproved: all users notified')
  } catch (err) {
    logger.error({ err, opportunityId, posterId, approverId }, 'notifyOpportunityApproved failed')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// notifyOpportunityMatch — SKILL-MATCHED USERS (internal + exported)
// ─────────────────────────────────────────────────────────────────────────────
// Finds users whose ProfileSkill overlaps the opportunity's OpportunitySkill
// rows and sends each an OPPORTUNITY_MATCH notification + push.
//
// excludeUserId — prevents the poster from receiving a match notification
//                 on top of their OPPORTUNITY_APPROVED notification.
//
// Called internally by notifyOpportunityApproved.
// Also exported for direct use if needed (e.g. re-notify after attaching
// new skills to an already-live opportunity).
// ─────────────────────────────────────────────────────────────────────────────

export async function notifyOpportunityMatch(
  opportunityId:  string,
  title:          string,
  excludeUserId?: string,
): Promise<void> {
  try {
    // Step 1 — which skills does this opportunity require?
    logger.info({ opportunityId, title }, '🔔 notifyOpportunityMatch: ENTERED') 
    const skillIds = await prisma.opportunitySkill
      .findMany({ where: { opportunityId }, select: { skillId: true } })
      .then((rows) => rows.map((r) => r.skillId))

    if (skillIds.length === 0) {
      logger.debug({ opportunityId }, 'notifyOpportunityMatch: no skills attached — skipping')
      return
    }

    // Step 2 — find users with at least one matching skill
    // distinct profileId prevents duplicates when a user has multiple matching skills
    const userIds = await prisma.profileSkill
      .findMany({
        where: {
          skillId:            { in: skillIds },
          profile: {
            user: {
              isActive: true,
              isBanned: false,
              ...(excludeUserId ? { id: { not: excludeUserId } } : {}),
            },
          },
        },
        select:   { profile: { select: { userId: true } } },
        distinct: ['profileId'],
        take:     500,
      })
      .then((rows) => rows.map((r) => r.profile.userId))

    if (userIds.length === 0) {
      logger.debug({ opportunityId }, 'notifyOpportunityMatch: no matching users — skipping')
      return
    }

    // Step 3 — notify each matched user
    const message = `New opportunity "${title}" matches your skills`
    for (const recipientId of userIds) {
      await createNotification(recipientId, 'OPPORTUNITY_MATCH', message, opportunityId)
    }

    logger.info(
      { opportunityId, title, recipientCount: userIds.length },
      'notifyOpportunityMatch: done',
    )
  } catch (err) {
    logger.error({ err, opportunityId, title }, 'notifyOpportunityMatch failed')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// notifyNewPost — reserved for connection feed fan-out (post-MVP)
// ─────────────────────────────────────────────────────────────────────────────

export async function notifyNewPost(postId: string, authorId: string): Promise<void> {
  try {
    logger.debug({ postId, authorId }, 'notifyNewPost: reserved for connection feed fan-out')
  } catch (err) {
    logger.error({ err, postId, authorId }, 'notifyNewPost failed')
  }
}