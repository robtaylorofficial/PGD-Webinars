import { NextRequest, NextResponse } from 'next/server'
import { auth } from '../../../../auth'
import { getMux } from '../../../../lib/mux'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user || (session.user as { role?: string }).role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const assetId = req.nextUrl.searchParams.get('assetId')
  if (!assetId) return NextResponse.json({ error: 'assetId required' }, { status: 400 })

  try {
    const mux = getMux()
    const asset = await mux.video.assets.retrieve(assetId)
    const signedPlayback = asset.playback_ids?.find((p) => p.policy === 'signed')

    return NextResponse.json({
      status: asset.status, // preparing | ready | errored
      playbackId: signedPlayback?.id ?? null,
    })
  } catch {
    return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
  }
}
