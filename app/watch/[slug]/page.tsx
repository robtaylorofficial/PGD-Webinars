export const dynamic = 'force-dynamic'

import { notFound, redirect } from 'next/navigation'
import { prisma } from '../../../lib/prisma'
import { signMuxPlaybackToken } from '../../../lib/mux'
import WebinarPlayerShell from '../../../components/player/webinar-player-shell'
import Link from 'next/link'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ token?: string }>
}

async function getWatchData(slug: string, accessToken: string) {
  try {
    const registration = await prisma.registration.findFirst({
      where: { accessToken, accessGranted: true, webinar: { slug } },
      include: {
        webinar: {
          include: {
            chapters: { orderBy: { sortOrder: 'asc' } },
            ctas: { where: { isActive: true }, orderBy: { triggerSecs: 'asc' } },
          },
        },
      },
    })
    return registration
  } catch {
    return null
  }
}

async function getResumePosition(registrationId: string): Promise<number> {
  try {
    const latest = await prisma.watchEvent.findFirst({
      where: {
        registrationId,
        eventType: { in: ['PROGRESS', 'PAUSE', 'COMPLETE'] },
      },
      orderBy: { positionSecs: 'desc' },
    })
    return latest?.positionSecs ?? 0
  } catch {
    return 0
  }
}

export default async function WatchPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { token } = await searchParams

  if (!token) redirect(`/webinars/${slug}`)

  const registration = await getWatchData(slug, token)

  if (!registration) {
    return (
      <div className="min-h-screen bg-pgd-purple flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Link not valid</h1>
          <p className="text-white/50 text-sm mb-6">
            This access link is invalid or access has not been granted yet.
          </p>
          <Link href={`/webinars/${slug}`} className="inline-block bg-pgd-yellow text-pgd-purple font-bold px-6 py-3 rounded-lg text-sm hover:bg-pgd-yellow-dark transition-colors">
            Back to webinar →
          </Link>
        </div>
      </div>
    )
  }

  const { webinar } = registration

  // Get signed playback token and resume position in parallel
  const [playbackToken, resumeAt] = await Promise.all([
    webinar.muxPlaybackId ? signMuxPlaybackToken(webinar.muxPlaybackId, 7200) : null,
    getResumePosition(registration.id),
  ])

  return (
    <div className="min-h-screen bg-pgd-purple">
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            <span className="text-pgd-yellow">PLAN.</span>
            <span className="text-pgd-green"> GROW.</span>
            <span className="text-pgd-blue"> DO.</span>
          </Link>
          <Link href="/" className="text-sm text-white/50 hover:text-white transition-colors">
            ← All webinars
          </Link>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">{webinar.title}</h1>
          {webinar.subtitle && <p className="text-white/50 mt-1">{webinar.subtitle}</p>}
        </div>

        {webinar.muxPlaybackId && playbackToken ? (
          <WebinarPlayerShell
            playbackId={webinar.muxPlaybackId}
            playbackToken={playbackToken}
            registrationId={registration.id}
            webinarId={webinar.id}
            chapters={webinar.chapters}
            ctas={webinar.ctas}
            resumeAt={resumeAt}
          />
        ) : (
          <div className="aspect-video bg-pgd-purple-light rounded-2xl flex items-center justify-center">
            <div className="text-center">
              <svg className="w-16 h-16 text-pgd-yellow/30 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 10l4.553-2.069A1 1 0 0121 8.876V15.124a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
              <p className="text-white/40 text-sm">Video coming soon</p>
            </div>
          </div>
        )}

        {webinar.description && (
          <div className="mt-8 bg-pgd-purple-light rounded-xl p-6">
            <h2 className="text-base font-semibold text-white mb-3">About this webinar</h2>
            <div className="prose prose-invert prose-sm max-w-none text-white/70"
              dangerouslySetInnerHTML={{ __html: webinar.description }} />
          </div>
        )}
      </div>
    </div>
  )
}
