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
  muxLivePlaybackId: string
  muxPlaybackId: string
}

interface SessionInfo {
  id: string
  status: string
  scheduledAt: string
  durationMins: number
}

interface Props {
  webinar: WebinarInfo
  session: SessionInfo | null
  signedLiveToken: string | null
  registrationToken: string | null
  registrationEmail: string | null
}

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

function addToCalendarUrl(title: string, scheduledAt: string, durationMins: number): string {
  const start = new Date(scheduledAt)
  const end = new Date(start.getTime() + durationMins * 60000)
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, '').replace('.000', '')
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(start)}/${fmt(end)}`
}

export default function LivePageClient({
  webinar,
  session,
  signedLiveToken,
  registrationToken,
  registrationEmail,
}: Props) {
  const router = useRouter()
  const [countdown, setCountdown] = useState('')
  const [viewerCount, setViewerCount] = useState(0)
  const [currentStatus, setCurrentStatus] = useState(webinar.status)
  const [currentToken, setCurrentToken] = useState(signedLiveToken)
  const [livePlaybackId, setLivePlaybackId] = useState(webinar.muxLivePlaybackId)

  // Countdown timer for SCHEDULED state
  useEffect(() => {
    if (currentStatus !== 'LIVE' || !session) return
    const target = new Date(session.scheduledAt)
    const tick = () => setCountdown(formatCountdown(target))
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [currentStatus, session])

  // Poll /api/live/status every 30s
  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/live/status/${webinar.slug}`)
      if (!res.ok) return
      const data = await res.json()

      setCurrentStatus(data.status)
      setViewerCount(data.viewerCount ?? 0)

      // If stream just went LIVE, reload to get fresh signed token
      if (data.status === 'LIVE' && data.livePlaybackId && !currentToken) {
        router.refresh()
      }

      // If ended and VOD is ready, redirect to watch page
      if (data.sessionStatus === 'ENDED' && data.vodPlaybackId) {
        router.push(`/watch/${webinar.slug}${registrationToken ? `?token=${registrationToken}` : ''}`)
      }

      if (data.livePlaybackId) setLivePlaybackId(data.livePlaybackId)
    } catch {
      // silently ignore poll failures
    }
  }, [webinar.slug, currentToken, registrationToken, router])

  useEffect(() => {
    pollStatus()
    const interval = setInterval(pollStatus, 30_000)
    return () => clearInterval(interval)
  }, [pollStatus])

  const isScheduled = currentStatus !== 'LIVE' && session?.status === 'SCHEDULED'
  const isLive = currentStatus === 'LIVE'
  const isEnded = session?.status === 'ENDED'

  return (
    <div className="min-h-screen bg-pgd-purple">
      {/* Nav bar */}
      <header className="border-b border-white/10 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-extrabold text-xl tracking-tight">
            <span className="text-pgd-yellow">PLAN.</span>
            <span className="text-pgd-green"> GROW.</span>
            <span className="text-pgd-blue"> DO.</span>
          </span>

          {isLive && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 text-sm font-semibold">LIVE</span>
              {viewerCount > 0 && (
                <span className="text-white/40 text-sm">{viewerCount} watching</span>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {/* ── LIVE state ─────────────────────────────────────────────────── */}
        {isLive && livePlaybackId && currentToken && (
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

            {webinar.subtitle && (
              <p className="text-white/60 text-sm">{webinar.subtitle}</p>
            )}
          </div>
        )}

        {/* ── LIVE but no token (not registered) ─────────────────────────── */}
        {isLive && (!livePlaybackId || !currentToken) && (
          <div className="text-center py-20">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              <span className="text-red-400 font-semibold">We&apos;re LIVE!</span>
            </div>
            <h1 className="text-white font-bold text-3xl mb-3">{webinar.title}</h1>
            <p className="text-white/60 mb-8">Register to watch the live session.</p>
            <a
              href={`/webinars/${webinar.slug}`}
              className="bg-pgd-yellow text-pgd-purple font-bold px-8 py-3 rounded-xl hover:bg-pgd-yellow-dark transition-colors"
            >
              Register to Watch →
            </a>
          </div>
        )}

        {/* ── SCHEDULED state ─────────────────────────────────────────────── */}
        {isScheduled && session && (
          <div className="max-w-xl mx-auto text-center py-16">
            {webinar.thumbnailUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={webinar.thumbnailUrl}
                alt=""
                className="w-full rounded-2xl mb-8 object-cover aspect-video opacity-80"
              />
            )}

            <div className="bg-pgd-purple-light rounded-2xl p-8 space-y-6">
              <div>
                <span className="text-pgd-yellow text-xs font-bold uppercase tracking-widest">
                  Upcoming Live Session
                </span>
                <h1 className="text-white font-bold text-2xl mt-2">{webinar.title}</h1>
                {webinar.subtitle && (
                  <p className="text-white/60 mt-2">{webinar.subtitle}</p>
                )}
              </div>

              {/* Countdown */}
              <div className="bg-pgd-purple rounded-xl p-5">
                <p className="text-white/40 text-xs mb-1">Starting in</p>
                <p className="text-pgd-yellow font-bold text-3xl font-mono">{countdown}</p>
                <p className="text-white/40 text-xs mt-1">
                  {new Date(session.scheduledAt).toLocaleDateString('en-GB', {
                    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                  })}
                  {' '}at{' '}
                  {new Date(session.scheduledAt).toLocaleTimeString('en-GB', {
                    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
                  })}
                </p>
              </div>

              {registrationEmail ? (
                <div className="bg-pgd-green/10 border border-pgd-green/30 rounded-xl p-4">
                  <p className="text-pgd-green text-sm font-semibold">
                    ✓ You&apos;re registered
                  </p>
                  <p className="text-white/50 text-xs mt-1">
                    We&apos;ll email {registrationEmail} when we go live.
                  </p>
                </div>
              ) : (
                <a
                  href={`/webinars/${webinar.slug}`}
                  className="block w-full bg-pgd-yellow text-pgd-purple font-bold py-3 rounded-xl hover:bg-pgd-yellow-dark transition-colors text-center"
                >
                  Register for Free →
                </a>
              )}

              <a
                href={addToCalendarUrl(webinar.title, session.scheduledAt, session.durationMins)}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-pgd-blue text-sm hover:underline"
              >
                + Add to Google Calendar
              </a>
            </div>
          </div>
        )}

        {/* ── ENDED / recording processing ────────────────────────────────── */}
        {isEnded && (
          <div className="max-w-xl mx-auto text-center py-16">
            <div className="bg-pgd-purple-light rounded-2xl p-8 space-y-4">
              <h1 className="text-white font-bold text-2xl">This session has ended</h1>
              <p className="text-white/60">
                The recording is being processed and will be available to watch very shortly.
              </p>
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
