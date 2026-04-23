import { Resend } from 'resend'
import { env, isTest } from '../config/env'
import { logger } from '../config/logger'

let resend: Resend | null = null

function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) return null
  if (!resend) resend = new Resend(env.RESEND_API_KEY)
  return resend
}

export interface SendEmailInput {
  to:       string | string[]
  subject:  string
  html:     string
  text?:    string
  replyTo?: string
}

/**
 * Sends one email via Resend. No-ops in `test` or when `RESEND_API_KEY` is unset.
 * Throws on Resend API errors so callers can catch and log without failing user flows.
 */
export async function sendEmail(input: SendEmailInput): Promise<{ id: string } | null> {
  if (isTest) {
    logger.debug({ to: input.to, subject: input.subject }, 'Email skipped (NODE_ENV=test)')
    return null
  }

  const client = getResend()
  if (!client) {
    logger.warn({ to: input.to, subject: input.subject }, 'Email skipped: RESEND_API_KEY not set')
    return null
  }

  const to = Array.isArray(input.to) ? input.to : [input.to]

  const { data, error } = await client.emails.send({
    from:    env.EMAIL_FROM,
    to,
    subject: input.subject,
    html:    input.html,
    text:    input.text,
    ...(input.replyTo !== undefined ? { replyTo: input.replyTo } : {}),
  })

  if (error) {
    logger.error({ message: error.message, name: error.name, to }, 'Resend send failed')
    throw new Error(error.message)
  }

  const id = data?.id ?? ''
  logger.info({ emailId: id, to }, 'Email sent via Resend')
  return id ? { id } : null
}

export async function sendPasswordResetEmail(
  to: string,
  opts: { resetLink: string | null; rawToken?: string },
): Promise<void> {
  const linkBlock = opts.resetLink
    ? `<p><a href="${opts.resetLink}">Reset your password</a></p><p>This link expires in one hour.</p>`
    : `<p>Copy this one-time token into the OpporLink app (password reset screen). It expires in one hour:</p><p style="word-break:break-all;font-family:monospace">${opts.rawToken ?? ''}</p>`

  const textLink = opts.resetLink
    ? `Reset your password (expires in one hour):\n${opts.resetLink}\n`
    : `Your one-time reset token (expires in one hour):\n${opts.rawToken ?? ''}\n`

  await sendEmail({
    to,
    subject: 'Reset your OpporLink password',
    html: `
      <p>We received a request to reset your OpporLink password.</p>
      ${linkBlock}
      <p>If you did not request this, you can ignore this email.</p>
    `.trim(),
    text: [
      'We received a request to reset your OpporLink password.',
      '',
      textLink.trim(),
      '',
      'If you did not request this, you can ignore this email.',
    ].join('\n'),
  })
}

export async function sendWelcomeEmail(to: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Welcome to OpporLink',
    html: `
      <p>Hi,</p>
      <p>Welcome to OpporLink — your account is ready.</p>
      <p>You can open the app to finish onboarding and start discovering opportunities.</p>
    `.trim(),
    text: [
      'Hi,',
      '',
      'Welcome to OpporLink — your account is ready.',
      '',
      'You can open the app to finish onboarding and start discovering opportunities.',
    ].join('\n'),
  })
}
