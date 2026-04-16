export const dynamic = 'force-dynamic'

import { prisma } from '../../../../../lib/prisma'
import { notFound } from 'next/navigation'
import WebinarForm from '../../../../../components/admin/webinar-form'
import VideoUpload from '../../../../../components/admin/video-upload'
import CtaEditor from '../../../../../components/admin/cta-editor'
import ChaptersEditor from '../../../../../components/admin/chapters-editor'
import AdminTabs from '../../../../../components/admin/admin-tabs'
import LiveSessionsManager from '../../../../../components/admin/live-sessions-manager'
import WidgetBuilder from '../../../../../components/admin/widget-builder'
import WebinarAnalytics from '../../../../../components/admin/webinar-analytics'
import WaitingRoomEditor from '../../../../../components/admin/waiting-room-editor'
import Link from 'next/link'

export default async function EditWebinarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ tab?: string }>
}) {
  const { id } = await params
  const { tab = 'details' } = await searchParams

  const webinar = await prisma.webinar.findUnique({
    where: { id },
    include: {
      chapters: { orderBy: { sortOrder: 'asc' } },
      ctas: { orderBy: { triggerSecs: 'asc' } },
      liveSessions: { orderBy: { scheduledAt: 'desc' } },
      widgets: true,
      _count: { select: { registrations: true } },
    },
  })
  if (!webinar) notFound()

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  // Analytics data — only fetch when on that tab
  let analyticsData = null
  if (tab === 'analytics') {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      const [
        totalRegistrations,
        uniqueViewedRows,
        halfwayRows,
        completionRows,
        avgWatch,
        ctaClicks,
        qaQuestions,
        recentRegs,
        topQAs,
      ] = await Promise.all([
        prisma.registration.count({ where: { webinarId: id } }),
        prisma.watchEvent.findMany({
          where: { webinarId: id, eventType: 'PLAY' },
          select: { registrationId: true },
          distinct: ['registrationId'],
        }),
        prisma.watchEvent.groupBy({
          by: ['registrationId'],
          where: { webinarId: id, eventType: 'PROGRESS', positionSecs: { gte: (webinar.muxDurationSecs || 1) * 0.5 } },
        }),
        prisma.watchEvent.findMany({
          where: { webinarId: id, eventType: 'COMPLETE' },
          select: { registrationId: true },
          distinct: ['registrationId'],
        }),
        prisma.watchEvent.aggregate({
          where: { webinarId: id, eventType: 'PROGRESS' },
          _avg: { positionSecs: true },
        }),
        prisma.watchEvent.count({ where: { webinarId: id, eventType: 'CTA_CLICKED' } }),
        prisma.watchQA.count({ where: { webinarId: id } }),
        prisma.registration.findMany({
          where: { webinarId: id, createdAt: { gte: thirtyDaysAgo } },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
        }),
        prisma.watchQA.groupBy({
          by: ['question'],
          where: { webinarId: id },
          _count: { question: true },
          orderBy: { _count: { question: 'desc' } },
          take: 10,
        }),
      ])

      // Build chart data
      const dayMap = new Map<string, number>()
      for (let i = 29; i >= 0; i--) {
        const d = new Date(Date.now() - i * 86400000)
        const key = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        dayMap.set(key, 0)
      }
      for (const reg of recentRegs) {
        const key = new Date(reg.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
        dayMap.set(key, (dayMap.get(key) ?? 0) + 1)
      }

      const avgSecs = avgWatch._avg.positionSecs ?? 0
      const avgPct = webinar.muxDurationSecs > 0
        ? Math.round((avgSecs / webinar.muxDurationSecs) * 100)
        : 0

      analyticsData = {
        totalRegistrations,
        uniqueViewed: uniqueViewedRows.length,
        halfwayCount: halfwayRows.length,
        completionCount: completionRows.length,
        completionRate: totalRegistrations > 0
          ? Math.round((completionRows.length / totalRegistrations) * 100)
          : 0,
        avgWatchPct: avgPct,
        ctaClicks,
        qaQuestions,
        chartData: Array.from(dayMap.entries()).map(([date, registrations]) => ({ date, registrations })),
        topQAs: topQAs.map((q) => ({ question: q.question, count: q._count.question })),
      }
    } catch {
      analyticsData = null
    }
  }

  const tabs = [
    { key: 'details', label: 'Details' },
    { key: 'video', label: 'Video' },
    { key: 'chapters', label: 'Chapters' },
    { key: 'ctas', label: 'CTAs' },
    { key: 'live', label: 'Live' },
    { key: 'waiting-room', label: 'Waiting Room' },
    { key: 'widgets', label: 'Widgets' },
    { key: 'analytics', label: 'Analytics' },
  ]

  return (
    <div className="max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/admin/webinars" className="text-white/30 hover:text-white text-sm transition-colors">
              Webinars
            </Link>
            <span className="text-white/20">›</span>
            <span className="text-white/60 text-sm">{webinar.title}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              webinar.status === 'PUBLISHED' ? 'bg-pgd-blue/20 text-pgd-blue'
              : webinar.status === 'LIVE' ? 'bg-pgd-green/20 text-pgd-green animate-pulse'
              : webinar.status === 'ARCHIVED' ? 'bg-white/5 text-white/30'
              : 'bg-white/10 text-white/40'
            }`}>
              {webinar.status}
            </span>
            <span className="text-white/30 text-xs">{webinar._count.registrations} registrations</span>
          </div>
        </div>
        <a
          href={`/webinars/${webinar.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-pgd-blue text-xs hover:underline"
        >
          View page ↗
        </a>
      </div>

      <AdminTabs tabs={tabs} active={tab} baseHref={`/admin/webinars/${id}`} />

      <div className="mt-6">
        {tab === 'details' && <WebinarForm webinar={webinar} />}

        {tab === 'video' && (
          <VideoUpload
            webinarId={webinar.id}
            currentPlaybackId={webinar.muxPlaybackId || undefined}
            currentAssetId={webinar.muxAssetId || undefined}
            durationSecs={webinar.muxDurationSecs || undefined}
          />
        )}

        {tab === 'chapters' && (
          <ChaptersEditor
            webinarId={webinar.id}
            chapters={webinar.chapters}
            playbackId={webinar.muxPlaybackId || undefined}
          />
        )}

        {tab === 'ctas' && (
          <CtaEditor
            webinarId={webinar.id}
            ctas={webinar.ctas}
            durationSecs={webinar.muxDurationSecs}
          />
        )}

        {tab === 'waiting-room' && (
          <WaitingRoomEditor
            webinarId={webinar.id}
            data={{
              waitingRoomMuxPlaybackId: webinar.waitingRoomMuxPlaybackId,
              waitingRoomProductUrl: webinar.waitingRoomProductUrl,
              waitingRoomProductTitle: webinar.waitingRoomProductTitle,
              waitingRoomProductImage: webinar.waitingRoomProductImage,
              waitingRoomInstructions: webinar.waitingRoomInstructions,
              waitingRoomObjectives: webinar.waitingRoomObjectives,
            }}
          />
        )}

        {tab === 'widgets' && (
          <WidgetBuilder
            webinarId={webinar.id}
            webinarSlug={webinar.slug}
            webinarTitle={webinar.title}
            widgets={webinar.widgets}
            appUrl={appUrl}
          />
        )}

        {tab === 'analytics' && (
          analyticsData ? (
            <WebinarAnalytics data={analyticsData} />
          ) : (
            <div className="bg-pgd-purple rounded-xl p-10 text-center">
              <p className="text-white/30 text-sm">Analytics unavailable — database not connected.</p>
            </div>
          )
        )}

        {tab === 'live' && (
          <LiveSessionsManager
            webinar={{
              id: webinar.id,
              slug: webinar.slug,
              status: webinar.status,
              muxLiveStreamKey: webinar.muxLiveStreamKey,
            }}
            sessions={webinar.liveSessions.map((s) => ({
              id: s.id,
              status: s.status,
              scheduledAt: s.scheduledAt.toISOString(),
              durationMins: s.durationMins,
              maxAttendees: s.maxAttendees,
              muxLiveStreamId: s.muxLiveStreamId,
              muxLiveStreamKey: webinar.muxLiveStreamKey,
              startedAt: s.startedAt?.toISOString() ?? null,
              endedAt: s.endedAt?.toISOString() ?? null,
              attendeeCount: s.attendeeCount,
            }))}
            appUrl={appUrl}
          />
        )}
      </div>
    </div>
  )
}
