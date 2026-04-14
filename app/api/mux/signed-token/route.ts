import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '../../../../lib/prisma'
import { signMuxPlaybackToken } from '../../../../lib/mux'

// Server-side: validates the registration access token, then returns a signed
// Mux playback JWT. Never exposes the signing key to the client.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const accessToken = searchParams.get('token')
  const slug = searchParams.get('slug')

  if (!accessToken || !slug) {
    return NextResponse.json({ error: 'token and slug required' }, { status: 400 })
  }

  try {
    const registration = await prisma.registration.findFirst({
      where: {
        accessToken,
        accessGranted: true,
        webinar: { slug },
      },
      include: { webinar: true },
    })

    if (!registration) {
      return NextResponse.json({ error: 'Invalid access token' }, { status: 403 })
    }

    const { muxPlaybackId } = registration.webinar

    if (!muxPlaybackId) {
      return NextResponse.json({ error: 'Video not ready' }, { status: 404 })
    }

    const playbackToken = await signMuxPlaybackToken(muxPlaybackId, 7200)

    return NextResponse.json({
      playbackId: muxPlaybackId,
      playbackToken,
      registrationId: registration.id,
      resumeAt: 0, // will be updated by /api/watch/progress
    })
  } catch (err) {
    console.error('[mux/signed-token] error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
