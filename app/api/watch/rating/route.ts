import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

export async function POST(req: NextRequest) {
  const { webinarId, token, rating } = await req.json()

  if (!webinarId || !rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }

  try {
    // Find registration from token if provided
    const registration = token
      ? await prisma.registration.findUnique({ where: { accessToken: token } })
      : null

    // Log as a RATING watch event
    await prisma.watchEvent.create({
      data: {
        webinarId,
        registrationId: registration?.id ?? null,
        sessionId: registration?.id ?? 'anon',
        eventType: 'RATING',
        positionSecs: 0,
        metadata: JSON.stringify({ rating }),
      },
    })

    return NextResponse.json({ ok: true })
  } catch {
    // Non-fatal — don't surface errors to the viewer
    return NextResponse.json({ ok: true })
  }
}
