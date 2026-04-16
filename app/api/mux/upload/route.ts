import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { getMux } from '../../../../lib/mux'

// Admin only: create a Mux direct upload URL for a webinar
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { webinarId, waitingRoom } = await req.json()
    if (!webinarId) {
      return NextResponse.json({ error: 'webinarId required' }, { status: 400 })
    }

    const mux = getMux()
    // passthrough encodes both the webinarId and whether this is a waiting room video
    const passthrough = waitingRoom ? `waiting_room:${webinarId}` : webinarId

    const upload = await mux.video.uploads.create({
      cors_origin: process.env.NEXT_PUBLIC_APP_URL ?? '*',
      new_asset_settings: {
        playback_policy: ['signed'],
        passthrough,
      },
    })

    return NextResponse.json({ uploadId: upload.id, uploadUrl: upload.url })
  } catch (err) {
    console.error('[mux/upload] error', err)
    return NextResponse.json({ error: 'Failed to create upload URL' }, { status: 500 })
  }
}
