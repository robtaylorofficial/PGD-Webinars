import { NextRequest, NextResponse } from 'next/server'
import { getMux } from '../../../../lib/mux'
import { prisma } from '../../../../lib/prisma'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const muxSignature = req.headers.get('mux-signature')

  if (!muxSignature || !process.env.MUX_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  // Verify webhook signature
  try {
    getMux().webhooks.verifySignature(body, Object.fromEntries(req.headers), process.env.MUX_WEBHOOK_SECRET)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const event = JSON.parse(body)
  const { type, data } = event

  try {
    if (type === 'video.asset.ready') {
      const asset = data
      const webinarId = asset.passthrough // set in upload new_asset_settings

      if (!webinarId) {
        console.warn('[mux/webhook] asset.ready with no passthrough webinarId', asset.id)
        return NextResponse.json({ received: true })
      }

      // Get the signed playback ID
      const signedPlayback = asset.playback_ids?.find(
        (p: { policy: string }) => p.policy === 'signed',
      )

      await prisma.webinar.update({
        where: { id: webinarId },
        data: {
          muxAssetId: asset.id,
          muxPlaybackId: signedPlayback?.id ?? '',
          muxDurationSecs: Math.round(asset.duration ?? 0),
        },
      })

      console.log(`[mux/webhook] webinar ${webinarId} video ready: asset ${asset.id}`)
    }

    if (type === 'video.asset.errored') {
      const asset = data
      const webinarId = asset.passthrough
      if (webinarId) {
        console.error(`[mux/webhook] asset errored for webinar ${webinarId}`, asset.errors)
      }
    }

    if (type === 'video.live_stream.active') {
      const stream = data
      await prisma.webinar.updateMany({
        where: { muxLiveStreamId: stream.id },
        data: { status: 'LIVE' },
      })
      // Also update the LiveSession
      await prisma.liveSession.updateMany({
        where: { muxLiveStreamId: stream.id },
        data: { status: 'LIVE', startedAt: new Date() },
      })
    }

    if (type === 'video.live_stream.idle') {
      // Stream ended — the recording asset will come via video.asset.ready
      const stream = data
      await prisma.liveSession.updateMany({
        where: { muxLiveStreamId: stream.id },
        data: { status: 'ENDED', endedAt: new Date() },
      })
    }
  } catch (err) {
    console.error('[mux/webhook] processing error', err)
    return NextResponse.json({ error: 'Processing error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
