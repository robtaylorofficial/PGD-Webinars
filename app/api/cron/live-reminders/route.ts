// Runs hourly — sends 24h and 1h pre-live reminders to registrants
// Also sends "replay available" emails when a VOD becomes ready after a live session
// Vercel cron: "0 * * * *"
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { sendEmail } from '../../../../lib/email'
import { liveReminderEmail, replayAvailableEmail } from '../../../../lib/email-templates'

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

  // ── 24h reminder ─────────────────────────────────────────────────────────
  {
    const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const in23h = new Date(Date.now() + 23 * 60 * 60 * 1000)

    const upcomingSessions = await prisma.liveSession.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { gte: in23h, lte: in24h },
      },
      include: { webinar: true },
    })

    for (const session of upcomingSessions) {
      // Get all registrants for this webinar
      const registrations = await prisma.registration.findMany({
        where: {
          webinarId: session.webinarId,
          accessGranted: true,
          emailPausedUntil: { not: { lte: new Date() } },
        },
      })

      const scheduledTime = new Date(session.scheduledAt).toLocaleTimeString('en-GB', {
        hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
      })

      for (const reg of registrations) {
        const key = cronKey(`live_24h_${session.id}`, reg.id)
        if (await alreadySent(key)) continue

        const firstName = (reg.name || reg.email).split(' ')[0].split('@')[0]
        const { subject, html } = liveReminderEmail({
          firstName,
          webinarTitle: session.webinar.title,
          liveUrl: `${appUrl}/live/${session.webinar.slug}?token=${reg.accessToken}`,
          scheduledTime,
          unsubscribeUrl: `${appUrl}/unsubscribe?token=${reg.accessToken}`,
          hoursUntil: 24,
        })

        const result = await sendEmail({ to: reg.email, subject, html })
        if (result.success) { await markSent(key); sent++ }
      }
    }
  }

  // ── 1h reminder ──────────────────────────────────────────────────────────
  {
    const in1h = new Date(Date.now() + 60 * 60 * 1000)
    const in50m = new Date(Date.now() + 50 * 60 * 1000)

    const upcomingSessions = await prisma.liveSession.findMany({
      where: {
        status: 'SCHEDULED',
        scheduledAt: { gte: in50m, lte: in1h },
      },
      include: { webinar: true },
    })

    for (const session of upcomingSessions) {
      const registrations = await prisma.registration.findMany({
        where: {
          webinarId: session.webinarId,
          accessGranted: true,
          emailPausedUntil: { not: { lte: new Date() } },
        },
      })

      for (const reg of registrations) {
        const key = cronKey(`live_1h_${session.id}`, reg.id)
        if (await alreadySent(key)) continue

        const firstName = (reg.name || reg.email).split(' ')[0].split('@')[0]
        const { subject, html } = liveReminderEmail({
          firstName,
          webinarTitle: session.webinar.title,
          liveUrl: `${appUrl}/live/${session.webinar.slug}?token=${reg.accessToken}`,
          scheduledTime: '',
          unsubscribeUrl: `${appUrl}/unsubscribe?token=${reg.accessToken}`,
          hoursUntil: 1,
        })

        const result = await sendEmail({ to: reg.email, subject, html })
        if (result.success) { await markSent(key); sent++ }
      }
    }
  }

  // ── Replay available — send after ENDED session when VOD is ready ─────────
  {
    // Find sessions that ended in the last 48h with a VOD now available
    const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)
    const endedSessions = await prisma.liveSession.findMany({
      where: {
        status: 'ENDED',
        endedAt: { gte: fortyEightHoursAgo },
      },
      include: { webinar: true },
    })

    for (const session of endedSessions) {
      // Only send if the VOD is actually ready
      if (!session.webinar.muxPlaybackId) continue

      const registrations = await prisma.registration.findMany({
        where: {
          webinarId: session.webinarId,
          accessGranted: true,
          emailPausedUntil: { not: { lte: new Date() } },
        },
      })

      for (const reg of registrations) {
        const key = cronKey(`replay_available_${session.id}`, reg.id)
        if (await alreadySent(key)) continue

        const firstName = (reg.name || reg.email).split(' ')[0].split('@')[0]
        const { subject, html } = replayAvailableEmail({
          firstName,
          webinarTitle: session.webinar.title,
          watchUrl: `${appUrl}/watch/${session.webinar.slug}?token=${reg.accessToken}`,
          unsubscribeUrl: `${appUrl}/unsubscribe?token=${reg.accessToken}`,
        })

        const result = await sendEmail({ to: reg.email, subject, html })
        if (result.success) { await markSent(key); sent++ }
      }
    }
  }

  return NextResponse.json({ ok: true, sent })
}
