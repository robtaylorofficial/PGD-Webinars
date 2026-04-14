// Stripped iframe player — no chrome, no nav, just the video + CTAs.
export const dynamic = 'force-dynamic'

import { prisma } from '../../../../lib/prisma'
import { notFound } from 'next/navigation'
import { signMuxPlaybackToken } from '../../../../lib/mux'
import WebinarPlayerShell from '../../../../components/player/webinar-player-shell'

export default async function EmbedPlayerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string }>
}) {
  const { slug } = await params
  const { token } = await searchParams

  if (!token) notFound()

  const registration = await prisma.registration.findUnique({
    where: { accessToken: token },
    include: {
      webinar: {
        include: {
          chapters: { orderBy: { sortOrder: 'asc' } },
          ctas: { orderBy: { triggerSecs: 'asc' }, where: { isActive: true } },
        },
      },
    },
  })

  if (!registration?.accessGranted || registration.webinar.slug !== slug) {
    notFound()
  }

  const webinar = registration.webinar
  if (!webinar.muxPlaybackId) notFound()

  // Fetch signed token and resume position in parallel
  const [signedToken, resumeData] = await Promise.all([
    signMuxPlaybackToken(webinar.muxPlaybackId, 7200).catch(() => null),
    prisma.watchEvent.aggregate({
      where: {
        registrationId: registration.id,
        eventType: { in: ['PROGRESS', 'PAUSE', 'COMPLETE'] },
      },
      _max: { positionSecs: true },
    }).catch(() => ({ _max: { positionSecs: null } })),
  ])

  if (!signedToken) notFound()

  const resumeAt = Math.floor(resumeData._max.positionSecs ?? 0)

  return (
    <div className="w-full h-full bg-black">
      <WebinarPlayerShell
        playbackId={webinar.muxPlaybackId}
        playbackToken={signedToken}
        registrationId={registration.id}
        webinarId={webinar.id}
        chapters={webinar.chapters}
        ctas={webinar.ctas}
        resumeAt={resumeAt}
        isEmbed
      />
    </div>
  )
}
