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
      const passthrough = asset.passthrough as string | undefined

      if (!passthrough) {
        console.warn('[mux/webhook] asset.ready with no passthrough', asset.id)
        return NextResponse.json({ received: true })
      }

      const signedPlayback = asset.playback_ids?.find(
        (p: { policy: string }) => p.policy === 'signed',
      )

      if (passthrough.startsWith('waiting_room:')) {
        // Waiting room holding video
        const webinarId = passthrough.replace('waiting_room:', '')
        await prisma.webinar.update({
          where: { id: webinarId },
          data: {
            waitingRoomMuxAssetId: asset.id,
            waitingRoomMuxPlaybackId: signedPlayback?.id ?? '',
          },
        })
        console.log(`[mux/webhook] webinar ${webinarId} waiting room video ready`)
      } else if (passthrough.startsWith('thank_you:')) {
        // Thank you personal video
        const webinarId = passthrough.replace('thank_you:', '')
        await prisma.webinar.update({
          where: { id: webinarId },
          data: {
            thankYouVideoMuxAssetId: asset.id,
            thankYouVideoMuxPlaybackId: signedPlayback?.id ?? '',
          },
        })
        console.log(`[mux/webhook] webinar ${webinarId} thank you video ready`)
      } else {
        // Main webinar VOD
        const webinarId = passthrough
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
