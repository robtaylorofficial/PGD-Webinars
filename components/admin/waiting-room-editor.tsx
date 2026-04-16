'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface WaitingRoomData {
  waitingRoomMuxPlaybackId: string
  waitingRoomProductUrl: string
  waitingRoomProductTitle: string
  waitingRoomProductImage: string
  waitingRoomInstructions: string
  waitingRoomObjectives: string // JSON array
}

interface Props {
  webinarId: string
  data: WaitingRoomData
}

export default function WaitingRoomEditor({ webinarId, data: initial }: Props) {
  const router = useRouter()
  const [data, setData] = useState(initial)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)

  // Video upload state
  const [uploadState, setUploadState] = useState<'idle' | 'uploading' | 'processing' | 'ready'>(
    initial.waitingRoomMuxPlaybackId ? 'ready' : 'idle'
  )
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  // Objectives as array in UI, serialised to JSON for storage
  const [objectives, setObjectives] = useState<string[]>(() => {
    try { return JSON.parse(initial.waitingRoomObjectives) } catch { return [''] }
  })

  function update(field: keyof WaitingRoomData, value: string) {
    setData((p) => ({ ...p, [field]: value }))
    setDirty(true)
    setSaved(false)
  }

  function updateObjective(i: number, val: string) {
    const next = [...objectives]
    next[i] = val
    setObjectives(next)
    setDirty(true)
    setSaved(false)
  }

  function addObjective() { setObjectives((p) => [...p, '']); setDirty(true) }
  function removeObjective(i: number) {
    setObjectives((p) => p.filter((_, idx) => idx !== i))
    setDirty(true)
  }

  async function uploadVideo(file: File) {
    setUploadState('uploading')
    setUploadProgress(0)

    // Get Mux upload URL (reuse existing upload endpoint with a flag for waiting room)
    const res = await fetch('/api/mux/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webinarId, waitingRoom: true }),
    })
    if (!res.ok) { setUploadState('idle'); return }
    const { uploadUrl, assetId } = await res.json()

    // XHR upload with progress
    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) setUploadProgress(Math.round((e.loaded / e.total) * 100))
      }
      xhr.onload = () => xhr.status < 300 ? resolve() : reject()
      xhr.onerror = reject
      xhr.open('PUT', uploadUrl)
      xhr.send(file)
    })

    setUploadState('processing')
    // Poll for asset readiness
    const poll = setInterval(async () => {
      const r = await fetch(`/api/mux/asset-status?assetId=${assetId}`)
      if (r.ok) {
        const d = await r.json()
        if (d.playbackId) {
          clearInterval(poll)
          setData((p) => ({ ...p, waitingRoomMuxPlaybackId: d.playbackId }))
          setUploadState('ready')
          setDirty(true)
        }
      }
    }, 4000)
  }

  async function save() {
    setSaving(true)
    const payload = {
      ...data,
      waitingRoomObjectives: JSON.stringify(objectives.filter((o) => o.trim())),
    }
    await fetch(`/api/admin/webinars/${webinarId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    setSaved(true)
    setDirty(false)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Explainer */}
      <div className="bg-pgd-yellow/10 border border-pgd-yellow/20 rounded-xl p-4">
        <p className="text-pgd-yellow text-sm font-semibold mb-1">How the waiting room works</p>
        <p className="text-white/60 text-xs leading-relaxed">
          This page appears automatically 15 minutes before the scheduled start time. For pre-recorded webinars it auto-starts the video at the exact scheduled time. For live webinars it holds here until you press Go Live in the Live tab.
        </p>
      </div>

      {/* Holding video */}
      <div className="bg-pgd-purple rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-white font-semibold text-sm">Holding video</h3>
          <p className="text-white/40 text-xs mt-0.5">Plays on loop while attendees wait. Keep it short — 60–90 seconds works well.</p>
        </div>

        {uploadState === 'ready' && data.waitingRoomMuxPlaybackId ? (
          <div className="flex items-center justify-between bg-pgd-purple-light rounded-lg p-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-pgd-green" />
              <span className="text-white text-sm">Holding video ready</span>
            </div>
            <button
              onClick={() => { setUploadState('idle'); update('waitingRoomMuxPlaybackId', '') }}
              className="text-white/30 hover:text-red-400 text-xs transition-colors"
            >
              Replace
            </button>
          </div>
        ) : uploadState === 'uploading' ? (
          <div className="space-y-2">
            <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-pgd-yellow transition-all rounded-full" style={{ width: `${uploadProgress}%` }} />
            </div>
            <p className="text-white/40 text-xs">Uploading… {uploadProgress}%</p>
          </div>
        ) : uploadState === 'processing' ? (
          <div className="flex items-center gap-2 text-white/50 text-sm">
            <div className="w-4 h-4 border-2 border-pgd-yellow border-t-transparent rounded-full animate-spin" />
            Processing video…
          </div>
        ) : (
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadVideo(f) }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              className="w-full border-2 border-dashed border-white/10 rounded-xl p-6 text-center hover:border-pgd-yellow/40 transition-colors group"
            >
              <svg className="w-8 h-8 text-white/20 mx-auto mb-2 group-hover:text-pgd-yellow/40 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-white/40 text-sm group-hover:text-white/60 transition-colors">Click to upload holding video</p>
              <p className="text-white/20 text-xs mt-1">MP4, MOV — any length, loops automatically</p>
            </button>
          </div>
        )}
      </div>

      {/* Product promo */}
      <div className="bg-pgd-purple rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-white font-semibold text-sm">Product promo <span className="text-white/30 font-normal">(optional)</span></h3>
          <p className="text-white/40 text-xs mt-0.5">Show a product card while attendees wait — Amazon, a landing page, anything.</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Product name</label>
            <input
              type="text"
              value={data.waitingRoomProductTitle}
              onChange={(e) => update('waitingRoomProductTitle', e.target.value)}
              placeholder="e.g. Built to Last — Robert's book"
              className="w-full bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pgd-yellow"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Link URL</label>
            <input
              type="url"
              value={data.waitingRoomProductUrl}
              onChange={(e) => update('waitingRoomProductUrl', e.target.value)}
              placeholder="https://amazon.co.uk/... or any URL"
              className="w-full bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pgd-yellow"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Product image URL <span className="text-white/20">(optional)</span></label>
            <input
              type="url"
              value={data.waitingRoomProductImage}
              onChange={(e) => update('waitingRoomProductImage', e.target.value)}
              placeholder="https://... paste an image link"
              className="w-full bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pgd-yellow"
            />
          </div>
        </div>
      </div>

      {/* Preparation instructions */}
      <div className="bg-pgd-purple rounded-xl p-5 space-y-3">
        <div>
          <h3 className="text-white font-semibold text-sm">Preparation instructions <span className="text-white/30 font-normal">(optional)</span></h3>
          <p className="text-white/40 text-xs mt-0.5">What should attendees have ready? Pen and paper, a specific spreadsheet, etc.</p>
        </div>
        <textarea
          value={data.waitingRoomInstructions}
          onChange={(e) => update('waitingRoomInstructions', e.target.value)}
          rows={4}
          placeholder="e.g. Grab a pen and paper — you'll want to take notes. Have your last 3 months of revenue figures to hand if you have them."
          className="w-full bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-pgd-yellow resize-none placeholder:text-white/20"
        />
      </div>

      {/* Webinar objectives */}
      <div className="bg-pgd-purple rounded-xl p-5 space-y-3">
        <div>
          <h3 className="text-white font-semibold text-sm">Webinar objectives <span className="text-white/30 font-normal">(optional)</span></h3>
          <p className="text-white/40 text-xs mt-0.5">What will attendees walk away knowing? Shown as a checklist in the waiting room.</p>
        </div>
        <div className="space-y-2">
          {objectives.map((obj, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-pgd-yellow text-xs w-4 flex-shrink-0">✓</span>
              <input
                type="text"
                value={obj}
                onChange={(e) => updateObjective(i, e.target.value)}
                placeholder={`Objective ${i + 1}`}
                className="flex-1 bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pgd-yellow"
              />
              {objectives.length > 1 && (
                <button
                  onClick={() => removeObjective(i)}
                  className="text-white/20 hover:text-red-400 transition-colors flex-shrink-0"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          ))}
          <button
            onClick={addObjective}
            className="text-pgd-blue text-xs hover:text-pgd-blue-dark transition-colors mt-1"
          >
            + Add objective
          </button>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving || !dirty}
        className="w-full bg-pgd-yellow text-pgd-purple font-bold py-3 rounded-xl text-sm hover:bg-pgd-yellow-dark transition-colors disabled:opacity-40"
      >
        {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Waiting Room'}
      </button>
    </div>
  )
}
