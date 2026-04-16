'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import MuxPlayer from '@mux/mux-player-react'
import { usePlayerStore } from '../../lib/player-store'
import ProgressTracker from './progress-tracker'
import ResumePrompt from './resume-prompt'
import ChapterList from './chapter-list'
import CtaOverlayController from './cta-overlay'
import WatchQA from './watch-qa'

interface Chapter {
  id: string
  title: string
  startTimeSecs: number
  sortOrder: number
}

interface CtaData {
  id: string
  triggerSecs: number
  dismissSecs: number
  headline: string
  subheadline: string
  ctaLabel: string
  ctaUrl: string
  displayStyle: string
  backgroundColor: string
  textColor: string
  accentColor: string
  isActive: boolean
}

interface Props {
  playbackId: string
  playbackToken: string
  registrationId: string
  webinarId: string
  webinarSlug: string
  registrationToken: string
  chapters: Chapter[]
  ctas: CtaData[]
  resumeAt: number
  isEmbed?: boolean
  hasThankYouPage?: boolean
}

// Client-side session ID — stable per page load
function makeSessionId() {
  return crypto.randomUUID()
}

export default function WebinarPlayerShell({
  playbackId,
  playbackToken,
  registrationId,
  webinarId,
  webinarSlug,
  registrationToken,
  chapters,
  ctas,
  resumeAt,
  isEmbed = false,
  hasThankYouPage = false,
}: Props) {
  const router = useRouter()
  const playerRef = useRef<HTMLVideoElement & { currentTime: number } | null>(null)
  const [sessionId] = useState(makeSessionId)
  const [showResume, setShowResume] = useState(resumeAt >= 30)

  const setCurrentTime = usePlayerStore((s) => s.setCurrentTime)
  const setDuration = usePlayerStore((s) => s.setDuration)
  const setPlaying = usePlayerStore((s) => s.setPlaying)
  const setWatchedSeconds = usePlayerStore((s) => s.setWatchedSeconds)

  // Seed the store with resume position on mount
  useEffect(() => {
    if (resumeAt > 0) setWatchedSeconds(resumeAt)
  }, [resumeAt, setWatchedSeconds])

  function seekTo(secs: number) {
    if (playerRef.current) {
      playerRef.current.currentTime = secs
    }
  }

  const activeCtas = ctas.filter((c) => c.isActive)

  return (
    <div className="space-y-6">
      {/* Player wrapper */}
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video">
        <MuxPlayer
          ref={playerRef as React.Ref<HTMLVideoElement>}
          playbackId={playbackId}
          tokens={{ playback: playbackToken }}
          streamType="on-demand"
          accentColor="#fbba00"
          style={{ width: '100%', height: '100%' }}
          onTimeUpdate={(e) => {
            const t = (e.target as HTMLVideoElement).currentTime
            setCurrentTime(t)
          }}
          onDurationChange={(e) => {
            setDuration((e.target as HTMLVideoElement).duration)
          }}
          onPlay={() => {
            setPlaying(true)
            if (showResume) {
              // If they pressed play without choosing, hide the prompt
              setShowResume(false)
            }
          }}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false)
            // Fire COMPLETE event, then redirect to thank you page
            fetch('/api/watch/events', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify([{
                webinarId, registrationId, sessionId,
                eventType: 'COMPLETE',
                positionSecs: playerRef.current?.currentTime ?? 0,
              }]),
            }).finally(() => {
              if (hasThankYouPage && !isEmbed) {
                router.push(`/thank-you/${webinarSlug}?token=${registrationToken}`)
              }
            })
          }}
        />

        {/* CTA overlays */}
        <CtaOverlayController
          ctas={activeCtas}
          webinarId={webinarId}
          registrationId={registrationId}
          sessionId={sessionId}
        />

        {/* Resume prompt */}
        {showResume && (
          <ResumePrompt
            resumeAt={resumeAt}
            onResume={() => { seekTo(resumeAt); setShowResume(false) }}
            onRestart={() => { seekTo(0); setShowResume(false) }}
          />
        )}
      </div>

      {/* Progress tracker — invisible, fires API calls */}
      <ProgressTracker
        webinarId={webinarId}
        registrationId={registrationId}
        sessionId={sessionId}
      />

      {/* Below-player row: chapters + Q&A (hidden when embedded) */}
      {!isEmbed && (
        <div className={`grid gap-4 ${chapters.length > 0 ? 'md:grid-cols-[1fr_340px]' : ''}`}>
          {chapters.length > 0 && (
            <ChapterList
              chapters={chapters}
              playbackId={playbackId}
              onSeek={seekTo}
            />
          )}

          {/* AI Q&A panel */}
          <div className="space-y-2">
            <WatchQA
              webinarId={webinarId}
              registrationId={registrationId}
              sessionId={sessionId}
              chapters={chapters}
            />
          </div>
        </div>
      )}
    </div>
  )
}
