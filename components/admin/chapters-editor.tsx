'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { muxThumbnailUrl } from '../../lib/mux'

interface Chapter {
  id: string
  title: string
  startTimeSecs: number
  sortOrder: number
}

interface Props {
  webinarId: string
  chapters: Chapter[]
  playbackId?: string
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60)
  const s = Math.floor(secs % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

function parseMmSs(value: string): number {
  const parts = value.split(':')
  if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1])
  return parseInt(value) || 0
}

export default function ChaptersEditor({ webinarId, chapters: initial, playbackId }: Props) {
  const router = useRouter()
  const [chapters, setChapters] = useState<Chapter[]>(initial)
  const [saving, setSaving] = useState<string | null>(null)

  async function addChapter() {
    const res = await fetch(`/api/admin/webinars/${webinarId}/chapters`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'New Chapter', startTimeSecs: 0 }),
    })
    if (res.ok) {
      const ch = await res.json()
      setChapters((prev) => [...prev, ch])
    }
  }

  async function updateChapter(id: string, field: 'title' | 'startTimeSecs', value: string | number) {
    setChapters((prev) => prev.map((c) => c.id === id ? { ...c, [field]: value } : c))
  }

  async function saveChapter(chapter: Chapter) {
    setSaving(chapter.id)
    await fetch(`/api/admin/webinars/${webinarId}/chapters/${chapter.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: chapter.title, startTimeSecs: chapter.startTimeSecs }),
    })
    setSaving(null)
    router.refresh()
  }

  async function deleteChapter(id: string) {
    await fetch(`/api/admin/webinars/${webinarId}/chapters/${id}`, { method: 'DELETE' })
    setChapters((prev) => prev.filter((c) => c.id !== id))
    router.refresh()
  }

  const sorted = [...chapters].sort((a, b) => a.startTimeSecs - b.startTimeSecs)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-white/50 text-sm">
          Chapters appear as navigation markers in the player.
          {!playbackId && <span className="text-pgd-yellow ml-1">Upload a video first to see storyboard thumbnails.</span>}
        </p>
        <button
          onClick={addChapter}
          className="bg-pgd-yellow text-pgd-purple font-semibold text-xs px-3 py-2 rounded-lg hover:bg-pgd-yellow-dark transition-colors"
        >
          + Add Chapter
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="bg-pgd-purple rounded-xl p-10 text-center">
          <p className="text-white/30 text-sm">No chapters yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map((ch) => (
            <div key={ch.id} className="bg-pgd-purple rounded-xl p-4 flex items-center gap-4">
              {/* Storyboard thumbnail */}
              {playbackId ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={muxThumbnailUrl(playbackId, ch.startTimeSecs, 128)}
                  alt=""
                  className="w-20 h-11 object-cover rounded-lg flex-shrink-0 bg-pgd-purple-dark"
                />
              ) : (
                <div className="w-20 h-11 bg-pgd-purple-light rounded-lg flex-shrink-0 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.069A1 1 0 0121 8.876V15.124a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                  </svg>
                </div>
              )}

              {/* Time */}
              <input
                type="text"
                defaultValue={formatTime(ch.startTimeSecs)}
                onBlur={(e) => updateChapter(ch.id, 'startTimeSecs', parseMmSs(e.target.value))}
                className="w-16 bg-pgd-purple-light border border-white/10 rounded-lg px-2 py-1.5 text-white text-xs text-center focus:outline-none focus:border-pgd-yellow font-mono"
              />

              {/* Title */}
              <input
                type="text"
                value={ch.title}
                onChange={(e) => updateChapter(ch.id, 'title', e.target.value)}
                className="flex-1 bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-1.5 text-white text-sm focus:outline-none focus:border-pgd-yellow"
              />

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => saveChapter(ch)}
                  disabled={saving === ch.id}
                  className="bg-pgd-yellow/20 text-pgd-yellow text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-pgd-yellow/30 transition-colors disabled:opacity-50"
                >
                  {saving === ch.id ? 'Saving…' : 'Save'}
                </button>
                <button
                  onClick={() => deleteChapter(ch.id)}
                  className="text-white/20 hover:text-red-400 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
