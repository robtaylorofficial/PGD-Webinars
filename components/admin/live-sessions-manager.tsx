'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface LiveSession {
  id: string
  status: string
  scheduledAt: string
  durationMins: number
  maxAttendees: number
  muxLiveStreamId: string
  muxLiveStreamKey: string
  startedAt: string | null
  endedAt: string | null
  attendeeCount: number
}

interface WebinarInfo {
  id: string
  slug: string
  status: string
  muxLiveStreamKey: string
}

interface Props {
  webinar: WebinarInfo
  sessions: LiveSession[]
  appUrl: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function LiveSessionsManager({ webinar, sessions: initial, appUrl }: Props) {
  const router = useRouter()
  const [sessions, setSessions] = useState<LiveSession[]>(initial)
  const [scheduling, setScheduling] = useState(false)
  const [starting, setStarting] = useState(false)
  const [ending, setEndingId] = useState<string | null>(null)
  const [streamKey, setStreamKey] = useState(webinar.muxLiveStreamKey)
  const [copied, setCopied] = useState(false)
  const [newSession, setNewSession] = useState({
    scheduledAt: '',
    durationMins: 60,
    maxAttendees: 100,
  })

  const latestSession = sessions[0] ?? null
  const isLive = webinar.status === 'LIVE'

  async function scheduleSession() {
    if (!newSession.scheduledAt) return
    setScheduling(true)
    const res = await fetch(`/api/admin/webinars/${webinar.id}/live-sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newSession),
    })
    if (res.ok) {
      const s = await res.json()
      setSessions([s, ...sessions])
      setNewSession({ scheduledAt: '', durationMins: 60, maxAttendees: 100 })
    }
    setScheduling(false)
    router.refresh()
  }

  async function goLive(sessionId: string) {
    setStarting(true)
    const res = await fetch('/api/live/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
    if (res.ok) {
      const data = await res.json()
      setStreamKey(data.streamKey)
      setSessions((prev) => prev.map((s) => s.id === sessionId ? { ...s, status: 'LIVE' } : s))
    }
    setStarting(false)
    router.refresh()
  }

  async function endStream(sessionId: string) {
    setEndingId(sessionId)
    await fetch('/api/live/end', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId }),
    })
    setEndingId(null)
    router.refresh()
  }

  function copyStreamKey() {
    navigator.clipboard.writeText(streamKey)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const minutesUntilLatest = latestSession
    ? (new Date(latestSession.scheduledAt).getTime() - Date.now()) / 60000
    : Infinity

  const canGoLive = latestSession?.status === 'SCHEDULED' && minutesUntilLatest <= 30

  return (
    <div className="space-y-6">
      {/* Schedule new session */}
      <div className="bg-pgd-purple rounded-xl p-5 space-y-4">
        <h3 className="text-white font-semibold text-sm">Schedule a Live Session</h3>

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-3 sm:col-span-1">
            <label className="block text-xs text-white/50 mb-1.5">Date &amp; time</label>
            <input
              type="datetime-local"
              value={newSession.scheduledAt}
              onChange={(e) => setNewSession((p) => ({ ...p, scheduledAt: e.target.value }))}
              className="w-full bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pgd-yellow"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Duration (mins)</label>
            <input
              type="number"
              value={newSession.durationMins}
              min={15}
              max={480}
              onChange={(e) => setNewSession((p) => ({ ...p, durationMins: parseInt(e.target.value) || 60 }))}
              className="w-full bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pgd-yellow"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Max attendees</label>
            <input
              type="number"
              value={newSession.maxAttendees}
              min={1}
              max={1000}
              onChange={(e) => setNewSession((p) => ({ ...p, maxAttendees: parseInt(e.target.value) || 100 }))}
              className="w-full bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pgd-yellow"
            />
          </div>
        </div>

        <button
          onClick={scheduleSession}
          disabled={scheduling || !newSession.scheduledAt}
          className="bg-pgd-yellow text-pgd-purple font-bold text-sm px-4 py-2 rounded-lg hover:bg-pgd-yellow-dark transition-colors disabled:opacity-40"
        >
          {scheduling ? 'Scheduling…' : 'Schedule Session'}
        </button>
      </div>

      {/* Session list */}
      {sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((s) => (
            <div key={s.id} className="bg-pgd-purple rounded-xl p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    s.status === 'LIVE' ? 'bg-red-500/20 text-red-400'
                    : s.status === 'ENDED' ? 'bg-white/5 text-white/30'
                    : 'bg-pgd-blue/20 text-pgd-blue'
                  }`}>
                    {s.status === 'LIVE' ? '● LIVE' : s.status}
                  </span>
                  <p className="text-white text-sm font-medium mt-1.5">{formatDate(s.scheduledAt)}</p>
                  <p className="text-white/40 text-xs">{s.durationMins} mins · up to {s.maxAttendees} attendees</p>
                </div>

                <div className="flex gap-2">
                  {s.status === 'SCHEDULED' && (
                    <button
                      onClick={() => goLive(s.id)}
                      disabled={starting || !canGoLive}
                      title={!canGoLive ? 'Available within 30 minutes of scheduled time' : undefined}
                      className="bg-red-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-red-600 transition-colors disabled:opacity-40"
                    >
                      {starting ? 'Starting…' : 'Go Live'}
                    </button>
                  )}

                  {s.status === 'LIVE' && (
                    <button
                      onClick={() => endStream(s.id)}
                      disabled={ending === s.id}
                      className="bg-white/10 text-white/70 font-bold text-xs px-3 py-1.5 rounded-lg hover:bg-white/20 transition-colors disabled:opacity-40"
                    >
                      {ending === s.id ? 'Ending…' : 'End Stream'}
                    </button>
                  )}

                  {s.status === 'ENDED' && s.attendeeCount > 0 && (
                    <span className="text-white/30 text-xs self-center">{s.attendeeCount} peak viewers</span>
                  )}
                </div>
              </div>

              {/* RTMP details — only show when live or if stream key is available */}
              {s.status === 'LIVE' && streamKey && (
                <div className="bg-pgd-purple-dark rounded-lg p-4 space-y-3">
                  <p className="text-white/60 text-xs font-semibold uppercase tracking-wider">OBS / Streamyard Settings</p>
                  <div>
                    <p className="text-white/40 text-xs mb-1">RTMP URL</p>
                    <code className="text-pgd-green text-xs">rtmps://global-live.mux.com:443/app</code>
                  </div>
                  <div>
                    <p className="text-white/40 text-xs mb-1">Stream Key</p>
                    <div className="flex items-center gap-2">
                      <code className="text-pgd-yellow text-xs flex-1 truncate">{streamKey}</code>
                      <button
                        onClick={copyStreamKey}
                        className="bg-pgd-yellow/20 text-pgd-yellow text-xs font-medium px-2.5 py-1 rounded-lg hover:bg-pgd-yellow/30 transition-colors flex-shrink-0"
                      >
                        {copied ? 'Copied!' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <a
                    href={`${appUrl}/live/${webinar.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-pgd-blue text-xs hover:underline"
                  >
                    View live page ↗
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {sessions.length === 0 && (
        <div className="bg-pgd-purple rounded-xl p-10 text-center">
          <p className="text-white/30 text-sm">No live sessions scheduled yet.</p>
        </div>
      )}
    </div>
  )
}
