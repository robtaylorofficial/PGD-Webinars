'use client'

import { usePlayerStore } from '../../lib/player-store'
import { muxThumbnailUrl } from '../../lib/mux'

interface Chapter {
  id: string
  title: string
  startTimeSecs: number
  sortOrder: number
}

interface Props {
  chapters: Chapter[]
  playbackId: string
  onSeek: (secs: number) => void
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export default function ChapterList({ chapters, playbackId, onSeek }: Props) {
  const currentTime = usePlayerStore((s) => s.currentTime)

  if (chapters.length === 0) return null

  const sorted = [...chapters].sort((a, b) => a.sortOrder - b.sortOrder)

  // Find active chapter
  const activeIdx = sorted.reduce((acc, ch, i) => {
    return currentTime >= ch.startTimeSecs ? i : acc
  }, 0)

  return (
    <div className="bg-pgd-purple-light rounded-xl overflow-hidden">
      <h3 className="px-4 py-3 text-sm font-semibold text-white border-b border-white/10">
        Chapters
      </h3>
      <div className="divide-y divide-white/5">
        {sorted.map((chapter, i) => (
          <button
            key={chapter.id}
            onClick={() => onSeek(chapter.startTimeSecs)}
            className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
              i === activeIdx ? 'bg-pgd-yellow/10' : ''
            }`}
          >
            {/* Storyboard thumbnail */}
            <div className="w-16 h-9 rounded overflow-hidden flex-shrink-0 bg-pgd-purple-dark">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={muxThumbnailUrl(playbackId, chapter.startTimeSecs, 128)}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-medium truncate ${i === activeIdx ? 'text-pgd-yellow' : 'text-white'}`}>
                {chapter.title}
              </p>
              <p className="text-white/40 text-xs mt-0.5">{formatTime(chapter.startTimeSecs)}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
