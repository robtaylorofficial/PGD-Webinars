import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../../lib/prisma'
import { getMux } from '../../../../../lib/mux'

// Simple in-memory cache: { streamId → { count, fetchedAt } }
const viewerCountCache = new Map<string, { count: number; fetchedAt: number }>()
const CACHE_TTL_MS = 30_000

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params

  try {
    const webinar = await prisma.webinar.findUnique({
      where: { slug },
      include: {
        liveSessions: {
          orderBy: { scheduledAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!webinar) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const latestSession = webinar.liveSessions[0] ?? null

    let viewerCount = 0

    if (webinar.status === 'LIVE' && webinar.muxLiveStreamId) {
      const cached = viewerCountCache.get(webinar.muxLiveStreamId)
      if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
        viewerCount = cached.count
      } else {
        try {
          const mux = getMux()
          const stream = await mux.video.liveStreams.retrieve(webinar.muxLiveStreamId)
          // Mux doesn't provide concurrent viewer count via the API directly on stream —
          // use the recent_encoder_stats if available, or default to 0
          viewerCount = 0
          viewerCountCache.set(webinar.muxLiveStreamId, {
            count: viewerCount,
            fetchedAt: Date.now(),
          })
        } catch {
          // Non-fatal — just return 0
        }
      }
    }

    return NextResponse.json({
      status: webinar.status, // DRAFT | PUBLISHED | LIVE | ARCHIVED
      sessionStatus: latestSession?.status ?? null,
      scheduledAt: latestSession?.scheduledAt ?? null,
      livePlaybackId: webinar.status === 'LIVE' ? webinar.muxLivePlaybackId : null,
      vodPlaybackId: webinar.muxPlaybackId || null,
      viewerCount,
    })
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 })
  }
}
