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
    include: { webinar: true },
  })
  if (!liveSession) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (liveSession.status === 'LIVE') {
    return NextResponse.json({ error: 'Already live' }, { status: 409 })
  }

  const mux = getMux()

  // Create a Mux live stream — recording will auto-attach to webinar via webhook
  const stream = await mux.video.liveStreams.create({
    playback_policy: ['signed'],
    new_asset_settings: {
      playback_policy: ['signed'],
      passthrough: liveSession.webinarId, // links recording to webinar in webhook
    },
    reconnect_window: 60,
  })

  const streamKey = stream.stream_key ?? ''
  const livePlaybackId = stream.playback_ids?.[0]?.id ?? ''

  // Persist stream details
  await prisma.liveSession.update({
    where: { id: sessionId },
    data: {
      status: 'LIVE',
      startedAt: new Date(),
      muxLiveStreamId: stream.id,
    },
  })

  await prisma.webinar.update({
    where: { id: liveSession.webinarId },
    data: {
      status: 'LIVE',
      muxLiveStreamId: stream.id,
      muxLiveStreamKey: streamKey,
      muxLivePlaybackId: livePlaybackId,
    },
  })

  return NextResponse.json({
    streamId: stream.id,
    streamKey,
    rtmpUrl: 'rtmps://global-live.mux.com:443/app',
    livePlaybackId,
  })
}
