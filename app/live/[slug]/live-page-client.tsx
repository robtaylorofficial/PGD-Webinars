'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import MuxPlayer from '@mux/mux-player-react'

interface WebinarInfo {
  id: string
  slug: string
  title: string
  subtitle: string
  thumbnailUrl: string
  status: string
  webinarType: string // ON_DEMAND | LIVE | HYBRID
  muxLivePlaybackId: string
  muxPlaybackId: string
}

interface SessionInfo {
  id: string
  status: string
  scheduledAt: string
  durationMins: number
}

interface WaitingRoomInfo {
  signedToken: string | null
  productUrl: string
  productTitle: string
  productImage: string
  instructions: string
  objectives: string[]
}

interface Props {
  webinar: WebinarInfo
  session: SessionInfo | null
  waitingRoom: WaitingRoomInfo
  signedLiveToken: string | null
  registrationToken: string | null
  registrationEmail: string | null
}

const WAITING_ROOM_MINS = 15

function formatCountdown(targetDate: Date): string {
  const diff = targetDate.getTime() - Date.now()
  if (diff <= 0) return 'Starting now...'
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const mins = Math.floor((diff % 3600000) / 60000)
  const secs = Math.floor((diff % 60000) / 1000)
  if (days > 0) return `${days}d ${hours}h ${mins}m`
  if (hours > 0) return `${hours}h ${mins}m ${secs}s`
  return `${mins}m ${secs}s`
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' })
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function addToCalendarUrl(title: string, scheduledAt: string, durationMins: number): string {
  const start = new Date(scheduledAt)
  const end = new Date(start.getTime() + durationMins * 60000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace('.000', '')
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(start)}/${fmt(end)}`
}

type PageState = 'too-early' | 'waiting-room' | 'live' | 'ended'

function getPageState(session: SessionInfo | null, webinarStatus: string): PageState {
  if (webinarStatus === 'LIVE') return 'live'
  if (session?.status === 'ENDED') return 'ended'
  if (!session) return 'too-early'

  const now = Date.now()
  const scheduledMs = new Date(session.scheduledAt).getTime()
  const minsUntil = (scheduledMs - now) / 60000

  if (minsUntil > WAITING_ROOM_MINS) return 'too-early'
  if (minsUntil <= 0) return 'too-early' // past but not yet gone live — hold in waiting room for live, auto for recorded
  return 'waiting-room'
}

export default function LivePageClient({
  webinar,
  session,
  waitingRoom,
  signedLiveToken,
  registrationToken,
  registrationEmail,
}: Props) {
  const router = useRouter()
  const [countdown, setCountdown] = useState('')
  const [viewerCount, setViewerCount] = useState(0)
  const [pageState, setPageState] = useState<PageState>(() =>
    getPageState(session, webinar.status)
  )
  const [currentToken, setCurrentToken] = useState(signedLiveToken)
  const [livePlaybackId, setLivePlaybackId] = useState(webinar.muxLivePlaybackId)

  // Live countdown ticker
  useEffect(() => {
    if (!session || pageState === 'live' || pageState === 'ended') return
    const target = new Date(session.scheduledAt)
    const tick = () => setCountdown(formatCountdown(target))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [session, pageState])

  // Re-evaluate page state every 30 seconds (also handles 15-min threshold crossing)
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/status/${webinar.slug}`)
      if (!res.ok) return
      const data = await res.json()

      setViewerCount(data.viewerCount ?? 0)

      if (data.status === 'LIVE') {
        setPageState('live')
        if (data.livePlaybackId) setLivePlaybackId(data.livePlaybackId)
        if (!currentToken) router.refresh()
        return
      }

      if (data.sessionStatus === 'ENDED' && data.vodPlaybackId) {
        router.push(`/watch/${webinar.slug}${registrationToken ? `?token=${registrationToken}` : ''}`)
        return
      }

      // For ON_DEMAND/HYBRID: auto-start at scheduled time
      if (webinar.webinarType === 'ON_DEMAND' && webinar.muxPlaybackId && session) {
        const scheduledMs = new Date(session.scheduledAt).getTime()
        if (Date.now() >= scheduledMs) {
          router.push(`/watch/${webinar.slug}${registrationToken ? `?token=${registrationToken}` : ''}`)
          return
        }
      }

      // Re-evaluate which UI state to show
      setPageState(getPageState(session, data.status))
    } catch { /* ignore */ }
  }, [webinar.slug, webinar.webinarType, webinar.muxPlaybackId, currentToken, registrationToken, session, router])

  useEffect(() => {
    pollStatus()
    const id = setInterval(pollStatus, 30_000)
    return () => clearInterval(id)
  }, [pollStatus])

  const hasWaitingRoomContent =
    waitingRoom.signedToken ||
    waitingRoom.instructions ||
    waitingRoom.objectives.length > 0 ||
    waitingRoom.productUrl

  return (
    <div className="min-h-screen bg-pgd-purple">
      {/* Nav */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-extrabold text-xl tracking-tight">
            <span className="text-pgd-yellow">PLAN.</span>
            <span className="text-pgd-green"> GROW.</span>
            <span className="text-pgd-blue"> DO.</span>
          </span>
          {pageState === 'live' && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-sm font-semibold">LIVE</span>
              {viewerCount > 0 && <span className="text-white/40 text-sm">{viewerCount} watching</span>}
            </div>
          )}
          {pageState === 'waiting-room' && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pgd-yellow animate-pulse" />
              <span className="text-pgd-yellow text-sm font-semibold">Starting in {countdown}</span>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">

        {/* ══ TOO EARLY — standard countdown ══════════════════════════════ */}
        {pageState === 'too-early' && session && (
          <div className="max-w-xl mx-auto text-center py-16">
            {webinar.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={webinar.thumbnailUrl} alt="" className="w-full rounded-2xl mb-8 object-cover aspect-video opacity-80" />
            )}
            <div className="bg-pgd-purple-light rounded-2xl p-8 space-y-6">
              <span className="text-pgd-yellow text-xs font-bold uppercase tracking-widest">Upcoming Live Session</span>
              <h1 className="text-white font-bold text-2xl mt-2">{webinar.title}</h1>
              {webinar.subtitle && <p className="text-white/60 mt-2">{webinar.subtitle}</p>}

              <div className="bg-pgd-purple rounded-xl p-5">
                <p className="text-white/40 text-xs mb-1">Starting in</p>
                <p className="text-pgd-yellow font-bold text-3xl font-mono">{countdown}</p>
                <p className="text-white/40 text-xs mt-1">{formatDate(session.scheduledAt)} at {formatTime(session.scheduledAt)}</p>
              </div>

              {registrationEmail ? (
                <div className="bg-pgd-green/10 border border-pgd-green/30 rounded-xl p-4">
                  <p className="text-pgd-green text-sm font-semibold">✓ You're registered</p>
                  <p className="text-white/50 text-xs mt-1">We'll email {registrationEmail} when we go live. The waiting room opens 15 minutes before.</p>
                </div>
              ) : (
                <a href={`/webinars/${webinar.slug}`}
                  className="block w-full bg-pgd-yellow text-pgd-purple font-bold py-3 rounded-xl hover:bg-pgd-yellow-dark transition-colors text-center">
                  Register for Free →
                </a>
              )}

              <a href={addToCalendarUrl(webinar.title, session.scheduledAt, session.durationMins)}
                target="_blank" rel="noopener noreferrer"
                className="block text-pgd-blue text-sm hover:underline">
                + Add to Google Calendar
              </a>
            </div>
          </div>
        )}

        {/* ══ WAITING ROOM ════════════════════════════════════════════════ */}
        {pageState === 'waiting-room' && session && (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 bg-pgd-yellow/10 border border-pgd-yellow/20 rounded-full px-4 py-1.5 mb-4">
                <span className="w-2 h-2 rounded-full bg-pgd-yellow animate-pulse" />
                <span className="text-pgd-yellow text-sm font-semibold">Waiting room is open</span>
              </div>
              <h1 className="text-white font-bold text-2xl">{webinar.title}</h1>
              <p className="text-white/50 mt-1">
                {webinar.webinarType === 'LIVE'
                  ? `We go live at ${formatTime(session.scheduledAt)} — starting in ${countdown}`
                  : `Starting at ${formatTime(session.scheduledAt)} — ${countdown} to go`}
              </p>
            </div>

            <div className={`grid gap-6 ${hasWaitingRoomContent ? 'lg:grid-cols-[1fr_360px]' : ''}`}>
              {/* Left: holding video or thumbnail */}
              <div className="space-y-4">
                {waitingRoom.signedToken ? (
                  <div className="rounded-2xl overflow-hidden bg-black aspect-video">
                    <MuxPlayer
                      playbackId={webinar.muxPlaybackId /* waiting room token handled below */}
                      tokens={{ playback: waitingRoom.signedToken }}
                      streamType="on-demand"
                      autoPlay
                      loop
                      muted
                      accentColor="#fbba00"
                      style={{ width: '100%', height: '100%' }}
                    />
                  </div>
                ) : webinar.thumbnailUrl ? (
                  <div className="rounded-2xl overflow-hidden aspect-video relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={webinar.thumbnailUrl} alt="" className="w-full h-full object-cover opacity-60" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <p className="text-pgd-yellow font-bold text-4xl font-mono">{countdown}</p>
                        <p className="text-white/60 text-sm mt-1">until we begin</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl bg-pgd-purple-light aspect-video flex items-center justify-center">
                    <div className="text-center">
                      <p className="text-pgd-yellow font-bold text-5xl font-mono">{countdown}</p>
                      <p className="text-white/50 mt-2">until we begin</p>
                    </div>
                  </div>
                )}

                {/* Product promo */}
                {waitingRoom.productUrl && waitingRoom.productTitle && (
                  <a
                    href={waitingRoom.productUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-4 bg-pgd-purple-light rounded-xl p-4 hover:bg-white/5 transition-colors group"
                  >
                    {waitingRoom.productImage && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={waitingRoom.productImage} alt="" className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-white/40 text-xs uppercase tracking-wider mb-0.5">While you wait</p>
                      <p className="text-white font-semibold group-hover:text-pgd-yellow transition-colors">{waitingRoom.productTitle}</p>
                      <p className="text-pgd-blue text-xs mt-0.5">View →</p>
                    </div>
                  </a>
                )}
              </div>

              {/* Right panel: objectives + instructions */}
              {hasWaitingRoomContent && (
                <div className="space-y-4">
                  {/* Objectives */}
                  {waitingRoom.objectives.filter(Boolean).length > 0 && (
                    <div className="bg-pgd-purple-light rounded-xl p-5">
                      <h3 className="text-pgd-yellow text-xs font-bold uppercase tracking-wider mb-3">What you'll learn today</h3>
                      <ul className="space-y-2">
                        {waitingRoom.objectives.filter(Boolean).map((obj, i) => (
                          <li key={i} className="flex items-start gap-2.5">
                            <span className="text-pgd-green mt-0.5 flex-shrink-0">✓</span>
                            <span className="text-white text-sm">{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Instructions */}
                  {waitingRoom.instructions && (
                    <div className="bg-pgd-purple-light rounded-xl p-5">
                      <h3 className="text-pgd-yellow text-xs font-bold uppercase tracking-wider mb-3">How to prepare</h3>
                      <p className="text-white/70 text-sm leading-relaxed whitespace-pre-line">{waitingRoom.instructions}</p>
                    </div>
                  )}

                  {/* Registered confirmation */}
                  {registrationEmail && (
                    <div className="bg-pgd-green/10 border border-pgd-green/20 rounded-xl p-4">
                      <p className="text-pgd-green text-sm font-semibold">✓ You're in the right place</p>
                      <p className="text-white/40 text-xs mt-1">Registered as {registrationEmail}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ LIVE ════════════════════════════════════════════════════════ */}
        {pageState === 'live' && livePlaybackId && currentToken && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <span className="bg-red-500/20 text-red-400 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse inline-block" />
                LIVE NOW
              </span>
              <h1 className="text-white font-bold text-xl">{webinar.title}</h1>
            </div>
            <div className="rounded-2xl overflow-hidden bg-black aspect-video">
              <MuxPlayer
                playbackId={livePlaybackId}
                tokens={{ playback: currentToken }}
                streamType="live"
                autoPlay
                muted={false}
                className="w-full h-full"
              />
            </div>
            {webinar.subtitle && <p className="text-white/60 text-sm">{webinar.subtitle}</p>}
          </div>
        )}

        {/* ── LIVE but not registered ──────────────────────────────────── */}
        {pageState === 'live' && (!livePlaybackId || !currentToken) && (
          <div className="text-center py-20">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 font-semibold">We're LIVE!</span>
            </div>
            <h1 className="text-white font-bold text-3xl mb-3">{webinar.title}</h1>
            <p className="text-white/60 mb-8">Register to watch the live session.</p>
            <a href={`/webinars/${webinar.slug}`}
              className="bg-pgd-yellow text-pgd-purple font-bold px-8 py-3 rounded-xl hover:bg-pgd-yellow-dark transition-colors">
              Register to Watch →
            </a>
          </div>
        )}

        {/* ══ ENDED ═══════════════════════════════════════════════════════ */}
        {pageState === 'ended' && (
          <div className="max-w-xl mx-auto text-center py-16">
            <div className="bg-pgd-purple-light rounded-2xl p-8 space-y-4">
              <h1 className="text-white font-bold text-2xl">This session has ended</h1>
              <p className="text-white/60">The recording is being processed and will be available to watch very shortly.</p>
              <p className="text-white/40 text-sm">This page will redirect automatically.</p>
              <div className="flex justify-center">
                <div className="w-6 h-6 border-2 border-pgd-yellow border-t-transparent rounded-full animate-spin" />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
