import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'

interface WatchEventPayload {
  webinarId: string
  registrationId?: string
  sessionId: string
  eventType: string
  positionSecs: number
  metadata?: Record<string, unknown>
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const events: WatchEventPayload[] = Array.isArray(body) ? body : [body]

    if (events.length === 0) {
      return NextResponse.json({ ok: true })
    }

    // Validate all events have required fields
    const valid = events.filter((e) => e.webinarId && e.sessionId && e.eventType)

    await prisma.watchEvent.createMany({
      data: valid.map((e) => ({
        webinarId: e.webinarId,
        registrationId: e.registrationId ?? null,
        sessionId: e.sessionId,
        eventType: e.eventType,
        positionSecs: e.positionSecs ?? 0,
        metadata: e.metadata ? JSON.stringify(e.metadata) : '{}',
      })),
      skipDuplicates: true,
    })

    return NextResponse.json({ ok: true, saved: valid.length })
  } catch (err) {
    console.error('[watch/events] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
