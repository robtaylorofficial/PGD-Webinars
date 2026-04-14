'use client'

import { useEffect, useRef } from 'react'
import { usePlayerStore } from '../../lib/player-store'

interface Props {
  webinarId: string
  registrationId: string
  sessionId: string
}

export default function ProgressTracker({ webinarId, registrationId, sessionId }: Props) {
  const currentTime = usePlayerStore((s) => s.currentTime)
  const isPlaying = usePlayerStore((s) => s.isPlaying)
  const pendingEvents = useRef<object[]>([])

  function flush() {
    if (pendingEvents.current.length === 0) return
    const payload = [...pendingEvents.current]
    pendingEvents.current = []

    // Use sendBeacon if available (survives page unload)
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/watch/events', JSON.stringify(payload))
    } else {
      fetch('/api/watch/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      })
    }
  }

  function queueEvent(eventType: string, positionSecs: number, metadata?: object) {
    pendingEvents.current.push({
      webinarId,
      registrationId,
      sessionId,
      eventType,
      positionSecs,
      metadata: metadata ?? {},
    })
  }

  // Batch flush every 10 seconds while playing
  useEffect(() => {
    if (!isPlaying) return
    const interval = setInterval(() => {
      queueEvent('PROGRESS', currentTime)
      flush()
    }, 10_000)
    return () => clearInterval(interval)
  }, [isPlaying, currentTime]) // eslint-disable-line react-hooks/exhaustive-deps

  // Flush on page unload
  useEffect(() => {
    const handleUnload = () => {
      queueEvent('PROGRESS', currentTime)
      flush()
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [currentTime]) // eslint-disable-line react-hooks/exhaustive-deps

  return null
}
