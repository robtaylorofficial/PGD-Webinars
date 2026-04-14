import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { prisma } from '../../../../lib/prisma'
import { getMux } from '../../../../lib/mux'

export async function POST(req: NextRequest) {
  const session = await auth()
  const role = (session?.user as { role?: string })?.role
  if (!session || role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { sessionId } = await req.json()
  if (!sessionId) return NextResponse.json({ error: 'sessionId required' }, { status: 400 })

  const liveSession = await prisma.liveSession.findUnique({
    where: { id: sessionId },
  })
  if (!liveSession) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!liveSession.muxLiveStreamId) {
    return NextResponse.json({ error: 'No stream to end' }, { status: 400 })
  }

  const mux = getMux()

  // Disable the Mux live stream — triggers recording + video.asset.ready webhook
  await mux.video.liveStreams.disable(liveSession.muxLiveStreamId)

  await prisma.liveSession.update({
    where: { id: sessionId },
    data: { status: 'ENDED', endedAt: new Date() },
  })

  // Webinar status reverts to PUBLISHED; muxPlaybackId will be set by webhook
  await prisma.webinar.update({
    where: { id: liveSession.webinarId },
    data: { status: 'PUBLISHED' },
  })

  return NextResponse.json({ ok: true })
}
