// Runs daily at 9am — two jobs:
// 1. Nudge registrants whose scheduledWatchAt has passed but haven't watched yet
// 2. Send Step 7 (48h post-completion follow-up) "Next step after [Webinar]"
// Vercel cron: "0 9 * * *"
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { sendEmail } from '../../../../lib/email'
import {
  scheduledWatchReminderEmail,
  nextStepEmail,
} from '../../../../lib/email-templates'

function cronKey(type: string, id: string) {
  return `${type}_${id}`
}

async function alreadySent(key: string): Promise<boolean> {
  const log = await prisma.cronLog.findUnique({ where: { key } })
  return !!log
}

async function markSent(key: string) {
  await prisma.cronLog.upsert({
    where: { key },
    create: { key },
    update: { sentAt: new Date() },
  })
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  let sent = 0

  // ── Job 1: scheduledWatchAt reminder ─────────────────────────────────────
  // Target: accessGranted=true, scheduledWatchAt is in the past (up to 48h ago),
  // no PLAY event yet, not unsubscribed, not already reminded
  {
    const now = new Date()
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

    const registrations = await prisma.registration.findMany({
      where: {
        accessGranted: true,
        scheduledWatchAt: {
          not: null,
          lte: now,
          gte: fortyEightHoursAgo,
        },
        emailPausedUntil: { not: { lte: now } },
      },
      include: { webinar: true },
    })

    for (const reg of registrations) {
      const key = cronKey('scheduled_watch_reminder', reg.id)
      if (await alreadySent(key)) continue

      // Skip if they've already started watching
      const hasPlay = await prisma.watchEvent.findFirst({
        where: { registrationId: reg.id, eventType: 'PLAY' },
      })
      if (hasPlay) { await markSent(key); continue }

      const firstName = (reg.name || reg.email).split(' ')[0].split('@')[0]
      const accessUrl = `${appUrl}/watch/${reg.webinar.slug}?token=${reg.accessToken}`
      const { subject, html } = scheduledWatchReminderEmail({
        firstName,
        webinarTitle: reg.webinar.title,
        accessUrl,
        unsubscribeUrl: `${appUrl}/unsubscribe?token=${reg.accessToken}`,
      })

      const result = await sendEmail({ to: reg.email, subject, html })
      if (result.success) { await markSent(key); sent++ }
    }
  }

  // ── Job 2: Step 7 — 48h after completion — "Next step" ───────────────────
  {
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const ninetySixHoursAgo = new Date(Date.now() - 96 * 60 * 60 * 1000)

    // Find completions that happened 48–96h ago (window to avoid re-running on old data)
    const completions = await prisma.watchEvent.findMany({
      where: {
        eventType: 'COMPLETE',
        createdAt: {
          lte: fortyEightHoursAgo,
          gte: ninetySixHoursAgo,
        },
        registrationId: { not: null },
      },
      include: { webinar: true },
      distinct: ['registrationId'],
    })

    for (const event of completions) {
      if (!event.registrationId) continue
      const key = cronKey('step7', event.registrationId)
      if (await alreadySent(key)) continue

      const reg = await prisma.registration.findUnique({
        where: { id: event.registrationId },
      })
      if (!reg) continue
      if (reg.emailPausedUntil && reg.emailPausedUntil <= new Date()) continue

      const firstName = (reg.name || reg.email).split(' ')[0].split('@')[0]
      const { subject, html } = nextStepEmail({
        firstName,
        webinarTitle: event.webinar.title,
        ctaUrl: `${appUrl}/webinars/${event.webinar.slug}`,
        unsubscribeUrl: `${appUrl}/unsubscribe?token=${reg.accessToken}`,
      })

      const result = await sendEmail({ to: reg.email, subject, html })
      if (result.success) { await markSent(key); sent++ }
    }
  }

  return NextResponse.json({ ok: true, sent })
}
