'use client'

import { useEffect } from 'react'
import { usePlayerStore, type WebinarCTAData } from '../../lib/player-store'

interface Props {
  ctas: WebinarCTAData[]
  webinarId: string
  registrationId: string
  sessionId: string
}

export default function CtaOverlayController({ ctas, webinarId, registrationId, sessionId }: Props) {
  const currentTime = usePlayerStore((s) => s.currentTime)
  const activeCta = usePlayerStore((s) => s.activeCta)
  const dismissedCtaIds = usePlayerStore((s) => s.dismissedCtaIds)
  const showCta = usePlayerStore((s) => s.showCta)
  const dismissCta = usePlayerStore((s) => s.dismissCta)

  // Check if any CTA should fire
  useEffect(() => {
    if (activeCta) return
    for (const cta of ctas) {
      if (dismissedCtaIds.has(cta.id)) continue
      if (currentTime >= cta.triggerSecs && currentTime < cta.triggerSecs + 2) {
        showCta(cta)
        // Log CTA_SEEN event
        fetch('/api/watch/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify([{
            webinarId, registrationId, sessionId,
            eventType: 'CTA_SEEN',
            positionSecs: currentTime,
            metadata: { ctaId: cta.id },
          }]),
        })
        break
      }
    }
  }, [currentTime]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-dismiss timer
  useEffect(() => {
    if (!activeCta || activeCta.dismissSecs <= 0) return
    const timer = setTimeout(() => dismissCta(activeCta.id), activeCta.dismissSecs * 1000)
    return () => clearTimeout(timer)
  }, [activeCta]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!activeCta) return null

  function handleCtaClick() {
    if (!activeCta) return
    fetch('/api/watch/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([{
        webinarId, registrationId, sessionId,
        eventType: 'CTA_CLICKED',
        positionSecs: currentTime,
        metadata: { ctaId: activeCta.id },
      }]),
    })
    window.open(activeCta.ctaUrl, '_blank', 'noopener')
    dismissCta(activeCta.id)
  }

  if (activeCta.displayStyle === 'BANNER') {
    return (
      <div
        className="absolute bottom-0 left-0 right-0 z-30 px-6 py-4 flex items-center justify-between gap-4"
        style={{ backgroundColor: activeCta.backgroundColor }}
      >
        <div>
          <p className="font-bold text-sm" style={{ color: activeCta.textColor }}>
            {activeCta.headline}
          </p>
          {activeCta.subheadline && (
            <p className="text-xs opacity-80 mt-0.5" style={{ color: activeCta.textColor }}>
              {activeCta.subheadline}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            onClick={handleCtaClick}
            className="font-bold text-xs px-4 py-2 rounded-lg transition-opacity hover:opacity-90"
            style={{ backgroundColor: activeCta.accentColor, color: activeCta.backgroundColor }}
          >
            {activeCta.ctaLabel}
          </button>
          <button
            onClick={() => dismissCta(activeCta.id)}
            className="text-xs opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: activeCta.textColor }}
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  if (activeCta.displayStyle === 'MODAL') {
    return (
      <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div
          className="rounded-2xl p-8 max-w-md w-full mx-4 text-center"
          style={{ backgroundColor: activeCta.backgroundColor }}
        >
          <h2 className="text-xl font-bold mb-2" style={{ color: activeCta.textColor }}>
            {activeCta.headline}
          </h2>
          {activeCta.subheadline && (
            <p className="text-sm mb-6 opacity-80" style={{ color: activeCta.textColor }}>
              {activeCta.subheadline}
            </p>
          )}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleCtaClick}
              className="font-bold py-3 px-6 rounded-xl transition-opacity hover:opacity-90"
              style={{ backgroundColor: activeCta.accentColor, color: activeCta.backgroundColor }}
            >
              {activeCta.ctaLabel}
            </button>
            <button
              onClick={() => dismissCta(activeCta.id)}
              className="text-sm opacity-50 hover:opacity-80 transition-opacity"
              style={{ color: activeCta.textColor }}
            >
              No thanks, continue watching
            </button>
          </div>
        </div>
      </div>
    )
  }

  // SIDEBAR
  return (
    <div className="absolute right-0 top-0 bottom-0 z-30 w-72 flex flex-col justify-center p-6">
      <div
        className="rounded-2xl p-6"
        style={{ backgroundColor: activeCta.backgroundColor }}
      >
        <h2 className="font-bold mb-2" style={{ color: activeCta.textColor }}>
          {activeCta.headline}
        </h2>
        {activeCta.subheadline && (
          <p className="text-sm mb-4 opacity-80" style={{ color: activeCta.textColor }}>
            {activeCta.subheadline}
          </p>
        )}
        <button
          onClick={handleCtaClick}
          className="w-full font-bold py-2.5 rounded-xl text-sm transition-opacity hover:opacity-90 mb-3"
          style={{ backgroundColor: activeCta.accentColor, color: activeCta.backgroundColor }}
        >
          {activeCta.ctaLabel}
        </button>
        <button
          onClick={() => dismissCta(activeCta.id)}
          className="w-full text-xs opacity-40 hover:opacity-70 transition-opacity"
          style={{ color: activeCta.textColor }}
        >
          Dismiss
        </button>
      </div>
    </div>
  )
}
