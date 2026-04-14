// Runs hourly — processes all pending email sequence triggers
// Vercel cron: "0 * * * *"
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { sendEmail } from '../../../../lib/email'
import {
  registrationConfirmEmail,
  watchReminderEmail,
  completionEmail,
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

  // ── Step 1: REGISTRATION immediate (24h grace — re-send if not yet sent) ──
  // Handled at registration time in /api/register — skip here

  // ── Step 2: 24h after registration — "Have you watched yet?" ──────────────
  {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
    const registrations = await prisma.registration.findMany({
      where: {
        accessGranted: true,
        createdAt: { lte: cutoff },
        emailPausedUntil: { not: { lte: new Date() } },
      },
      include: { webinar: true },
    })

    for (const reg of registrations) {
      const key = cronKey('step2', reg.id)
      if (await alreadySent(key)) continue

      // Skip if they've already watched
      const hasWatch = await prisma.watchEvent.findFirst({
        where: { registrationId: reg.id, eventType: 'PLAY' },
      })
      if (hasWatch) { await markSent(key); continue }

      const firstName = (reg.name || reg.email).split(' ')[0].split('@')[0]
      const accessUrl = `${appUrl}/watch/${reg.webinar.slug}?token=${reg.accessToken}`
      const { subject, html } = watchReminderEmail({
        firstName,
        webinarTitle: reg.webinar.title,
        accessUrl,
        unsubscribeUrl: `${appUrl}/unsubscribe?token=${reg.accessToken}`,
        dayNumber: 1,
      })

      const result = await sendEmail({ to: reg.email, subject, html })
      if (result.success) { await markSent(key); sent++ }
    }
  }

  // ── Step 3: 72h after registration — "Don't miss this" ────────────────────
  {
    const cutoff = new Date(Date.now() - 72 * 60 * 60 * 1000)
    const registrations = await prisma.registration.findMany({
      where: {
        accessGranted: true,
        createdAt: { lte: cutoff },
        emailPausedUntil: { not: { lte: new Date() } },
      },
      include: { webinar: true },
    })

    for (const reg of registrations) {
      const key = cronKey('step3', reg.id)
      if (await alreadySent(key)) continue

      const hasComplete = await prisma.watchEvent.findFirst({
        where: { registrationId: reg.id, eventType: 'COMPLETE' },
      })
      if (hasComplete) { await markSent(key); continue }

      const firstName = (reg.name || reg.email).split(' ')[0].split('@')[0]
      const accessUrl = `${appUrl}/watch/${reg.webinar.slug}?token=${reg.accessToken}`
      const { subject, html } = watchReminderEmail({
        firstName,
        webinarTitle: reg.webinar.title,
        accessUrl,
        unsubscribeUrl: `${appUrl}/unsubscribe?token=${reg.accessToken}`,
        dayNumber: 3,
      })

      const result = await sendEmail({ to: reg.email, subject, html })
      if (result.success) { await markSent(key); sent++ }
    }
  }

  // ── Step 6: Watch complete +1h — "You did it!" ────────────────────────────
  {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const completions = await prisma.watchEvent.findMany({
      where: {
        eventType: 'COMPLETE',
        createdAt: { lte: oneHourAgo },
        registrationId: { not: null },
      },
      include: {
        webinar: true,
      },
      distinct: ['registrationId'],
    })

    for (const event of completions) {
      if (!event.registrationId) continue
      const key = cronKey('step6', event.registrationId)
      if (await alreadySent(key)) continue

      const reg = await prisma.registration.findUnique({
        where: { id: event.registrationId },
      })
      if (!reg || reg.emailPausedUntil && reg.emailPausedUntil <= new Date()) continue

      const firstName = (reg.name || reg.email).split(' ')[0].split('@')[0]
      const { subject, html } = completionEmail({
        firstName,
        webinarTitle: event.webinar.title,
        ctaUrl: `${appUrl}/webinars/${event.webinar.slug}`,
        unsubscribeUrl: `${appUrl}/unsubscribe?token=${reg.accessToken}`,
      })

      const result = await sendEmail({ to: reg.email, subject, html })
      if (result.success) { await markSent(key); sent++ }
    }
  }

  // ── Step 10: 7 days after registration — "Last chance" ───────────────────
  {
    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const registrations = await prisma.registration.findMany({
      where: {
        accessGranted: true,
        createdAt: { lte: cutoff },
        emailPausedUntil: { not: { lte: new Date() } },
      },
      include: { webinar: true },
    })

    for (const reg of registrations) {
      const key = cronKey('step10', reg.id)
      if (await alreadySent(key)) continue

      const hasComplete = await prisma.watchEvent.findFirst({
        where: { registrationId: reg.id, eventType: 'COMPLETE' },
      })
      if (hasComplete) { await markSent(key); continue }

      const firstName = (reg.name || reg.email).split(' ')[0].split('@')[0]
      const accessUrl = `${appUrl}/watch/${reg.webinar.slug}?token=${reg.accessToken}`
      const { subject, html } = watchReminderEmail({
        firstName,
        webinarTitle: reg.webinar.title,
        accessUrl,
        unsubscribeUrl: `${appUrl}/unsubscribe?token=${reg.accessToken}`,
        dayNumber: 7,
      })

      const result = await sendEmail({ to: reg.email, subject, html })
      if (result.success) { await markSent(key); sent++ }
    }
  }

  return NextResponse.json({ ok: true, sent })
}
