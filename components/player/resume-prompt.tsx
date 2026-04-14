'use client'

import { useState } from 'react'

interface Props {
  resumeAt: number
  onResume: () => void
  onRestart: () => void
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ResumePrompt({ resumeAt, onResume, onRestart }: Props) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed || resumeAt < 30) return null

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-20 bg-black/80 backdrop-blur-sm border border-white/10 rounded-xl px-5 py-4 flex items-center gap-4 whitespace-nowrap">
      <p className="text-white text-sm">Resume from <span className="text-pgd-yellow font-semibold">{formatTime(resumeAt)}</span>?</p>
      <button
        onClick={() => { onResume(); setDismissed(true) }}
        className="bg-pgd-yellow text-pgd-purple font-bold text-xs px-4 py-1.5 rounded-lg hover:bg-pgd-yellow-dark transition-colors"
      >
        Resume
      </button>
      <button
        onClick={() => { onRestart(); setDismissed(true) }}
        className="text-white/50 text-xs hover:text-white transition-colors"
      >
        Start over
      </button>
    </div>
  )
}
