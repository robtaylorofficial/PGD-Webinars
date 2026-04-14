// Runs daily at 10am — re-engages partial viewers who stopped watching
// Step 8: watched < 30%, last activity > 48h → "You were so close..."
// Step 9: watched 30–70%, last activity > 72h → "You got most of the way..."
// Vercel cron: "0 10 * * *"
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { sendEmail } from '../../../../lib/email'
import { abandonedEmail } from '../../../../lib/email-templates'

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

  // Find all registrations that have started watching but not completed,
  // with last watch activity older than 48h
  const fortyEightHoursAgo = new Date(Date.now() - 48 * 60 * 60 * 1000)

  // Get registrations that have at least one PLAY event but no COMPLETE event
  const startedRegistrationIds = await prisma.watchEvent.findMany({
    where: { eventType: 'PLAY', registrationId: { not: null } },
    select: { registrationId: true },
    distinct: ['registrationId'],
  })

  const completedRegistrationIds = await prisma.watchEvent.findMany({
    where: { eventType: 'COMPLETE', registrationId: { not: null } },
    select: { registrationId: true },
    distinct: ['registrationId'],
  })

  const completedSet = new Set(completedRegistrationIds.map((e) => e.registrationId))
  const candidateIds = startedRegistrationIds
    .map((e) => e.registrationId!)
    .filter((id) => !completedSet.has(id))

  if (candidateIds.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 })
  }

  // For each candidate, check last activity time and watch percentage
  for (const registrationId of candidateIds) {
    const reg = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { webinar: true },
    })
    if (!reg || !reg.accessGranted) continue
    if (reg.emailPausedUntil && reg.emailPausedUntil <= new Date()) continue

    // Check last watch event time
    const lastEvent = await prisma.watchEvent.findFirst({
      where: { registrationId },
      orderBy: { createdAt: 'desc' },
    })
    if (!lastEvent || lastEvent.createdAt > fortyEightHoursAgo) continue

    // Calculate watch percentage from max PROGRESS position
    const maxProgress = await prisma.watchEvent.aggregate({
      where: { registrationId, eventType: { in: ['PROGRESS', 'PAUSE', 'COMPLETE'] } },
      _max: { positionSecs: true },
    })

    const maxSecs = maxProgress._max.positionSecs ?? 0
    const duration = reg.webinar.muxDurationSecs
    if (duration <= 0) continue

    const watchPct = (maxSecs / duration) * 100

    // Only process genuinely partial viewers (1–70%)
    if (watchPct < 1 || watchPct >= 70) continue

    const isEarly = watchPct < 30
    // Step 8 uses 48h staleness; step 9 uses 72h staleness
    if (!isEarly) {
      const seventyTwoHoursAgo = new Date(Date.now() - 72 * 60 * 60 * 1000)
      if (lastEvent.createdAt > seventyTwoHoursAgo) continue
    }

    const stepKey = isEarly ? 'step8' : 'step9'
    const key = cronKey(stepKey, registrationId)
    if (await alreadySent(key)) continue

    const firstName = (reg.name || reg.email).split(' ')[0].split('@')[0]
    const accessUrl = `${appUrl}/watch/${reg.webinar.slug}?token=${reg.accessToken}`
    const { subject, html } = abandonedEmail({
      firstName,
      webinarTitle: reg.webinar.title,
      accessUrl,
      unsubscribeUrl: `${appUrl}/unsubscribe?token=${reg.accessToken}`,
      watchPercent: Math.round(watchPct),
    })

    const result = await sendEmail({ to: reg.email, subject, html })
    if (result.success) { await markSent(key); sent++ }
  }

  return NextResponse.json({ ok: true, sent })
}
