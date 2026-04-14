export const dynamic = 'force-dynamic'

import { prisma } from '../../../lib/prisma'
import { notFound, redirect } from 'next/navigation'
import { signMuxPlaybackToken } from '../../../lib/mux'
import LivePageClient from './live-page-client'

export default async function LivePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { slug } = await params
  const { token } = await searchParams

  const webinar = await prisma.webinar.findUnique({
    where: { slug },
    include: {
      liveSessions: {
        orderBy: { scheduledAt: 'desc' },
        take: 1,
      },
    },
  })

  if (!webinar) notFound()

  const latestSession = webinar.liveSessions[0] ?? null

  // If the stream has ended and a VOD is available, redirect to watch page
  if (
    latestSession?.status === 'ENDED' &&
    webinar.muxPlaybackId
  ) {
    redirect(`/watch/${slug}${token ? `?token=${token}` : ''}`)
  }

  // Validate access token if provided
  let registration = null
  if (token) {
    registration = await prisma.registration.findUnique({
      where: { accessToken: token },
    })
  }

  // Get a signed live playback token if we're live
  let signedLiveToken: string | null = null
  if (webinar.status === 'LIVE' && webinar.muxLivePlaybackId) {
    try {
      signedLiveToken = await signMuxPlaybackToken(webinar.muxLivePlaybackId, 7200)
    } catch {
      // If signing fails, we'll show an error state
    }
  }

  return (
    <LivePageClient
      webinar={{
        id: webinar.id,
        slug: webinar.slug,
        title: webinar.title,
        subtitle: webinar.subtitle,
        thumbnailUrl: webinar.thumbnailUrl,
        status: webinar.status,
        muxLivePlaybackId: webinar.muxLivePlaybackId,
        muxPlaybackId: webinar.muxPlaybackId,
      }}
      session={latestSession ? {
        id: latestSession.id,
        status: latestSession.status,
        scheduledAt: latestSession.scheduledAt.toISOString(),
        durationMins: latestSession.durationMins,
      } : null}
      signedLiveToken={signedLiveToken}
      registrationToken={registration?.accessToken ?? null}
      registrationEmail={registration?.email ?? null}
    />
  )
}
