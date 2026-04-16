'use client'

import { useState, useRef } from 'react'

interface Props {
  webinarId: string
  currentPlaybackId?: string
  currentAssetId?: string
  durationSecs?: number
  // Optional overrides for waiting-room / thank-you videos
  waitingRoom?: boolean
  thankYou?: boolean
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'ready' | 'error'
type Mode = 'file' | 'url'

function formatDuration(secs: number) {
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}m ${s}s`
}

export default function VideoUpload({
  webinarId,
  currentPlaybackId,
  durationSecs,
  waitingRoom,
  thankYou,
}: Props) {
  const [mode, setMode] = useState<Mode>('file')
  const [state, setState] = useState<UploadState>(currentPlaybackId ? 'ready' : 'idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [importUrl, setImportUrl] = useState('')
  const [importSource, setImportSource] = useState('')
  const [isImporting, setIsImporting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── File upload ─────────────────────────────────────────────────────────────

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setState('uploading')
    setProgress(0)
    setErrorMsg('')

    try {
      const res = await fetch('/api/mux/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webinarId, waitingRoom, thankYou }),
      })
      if (!res.ok) throw new Error('Failed to get upload URL')
      const { uploadUrl } = await res.json()

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl)
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100))
        }
        xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`))
        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.send(file)
      })

      setState('processing')
      setProgress(100)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed')
      setState('error')
    }
  }

  // ── URL import ──────────────────────────────────────────────────────────────

  async function handleUrlImport() {
    if (!importUrl.trim()) return
    setIsImporting(true)
    setErrorMsg('')

    try {
      const res = await fetch('/api/mux/import-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: importUrl.trim(), webinarId, waitingRoom, thankYou }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Import failed')

      setImportSource(data.source)
      setState('processing')
      // Poll until Mux finishes (same as file upload — webhook handles DB update)
      pollAsset(data.assetId)
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Import failed')
      setIsImporting(false)
    }
  }

  async function pollAsset(assetId: string) {
    let attempts = 0
    const max = 60 // 3 minutes @ 3s intervals
    const tick = async () => {
      attempts++
      if (attempts > max) {
        setErrorMsg('Processing is taking a long time — the page will update when Mux is done.')
        setIsImporting(false)
        return
      }
      try {
        const r = await fetch(`/api/mux/asset-status?assetId=${assetId}`)
        const d = await r.json()
        if (d.status === 'ready') {
          setState('ready')
          setIsImporting(false)
          // Reload so the page reflects the new playback ID from the webhook
          window.location.reload()
          return
        }
        if (d.status === 'errored') {
          setErrorMsg('Mux could not process the video — check the URL is publicly accessible.')
          setState('error')
          setIsImporting(false)
          return
        }
      } catch { /* keep polling */ }
      await new Promise((r) => setTimeout(r, 3000))
      tick()
    }
    tick()
  }

  // ── UI ──────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Status banner */}
      {state === 'ready' && currentPlaybackId && (
        <div className="bg-pgd-green/10 border border-pgd-green/30 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-pgd-green/20 rounded-full flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-pgd-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <p className="text-pgd-green text-sm font-medium">Video ready</p>
            <p className="text-white/40 text-xs mt-0.5">
              Playback ID: {currentPlaybackId.slice(0, 12)}…
              {durationSecs ? `  ·  ${formatDuration(durationSecs)}` : ''}
            </p>
          </div>
        </div>
      )}

      {state === 'processing' && (
        <div className="bg-pgd-yellow/10 border border-pgd-yellow/30 rounded-xl p-4 flex items-center gap-3">
          <svg className="w-5 h-5 text-pgd-yellow animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <div>
            <p className="text-pgd-yellow text-sm font-medium">
              {importSource ? `Importing from ${importSource}…` : 'Processing video…'}
            </p>
            <p className="text-white/40 text-xs mt-0.5">
              {importSource
                ? 'Mux is downloading and transcoding — usually 2–5 minutes depending on file size.'
                : 'Mux is transcoding your upload — usually 1–3 minutes.'}
            </p>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium">Failed</p>
          <p className="text-white/40 text-xs mt-1">{errorMsg}</p>
          <button
            onClick={() => { setState('idle'); setIsImporting(false); setErrorMsg('') }}
            className="text-red-400/60 hover:text-red-400 text-xs mt-2 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Mode picker + input — hidden while processing */}
      {state !== 'processing' && (
        <div className="space-y-4">

          {/* Tab switcher */}
          <div className="flex rounded-lg bg-white/5 p-1 gap-1 w-fit">
            <button
              onClick={() => setMode('file')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'file'
                  ? 'bg-pgd-purple-light text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Upload file
            </button>
            <button
              onClick={() => setMode('url')}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
                mode === 'url'
                  ? 'bg-pgd-purple-light text-white'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              Import from URL
            </button>
          </div>

          {/* File upload mode */}
          {mode === 'file' && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />

              {state === 'uploading' ? (
                <div className="border-2 border-pgd-yellow/30 rounded-xl p-8 text-center">
                  <p className="text-white/60 text-sm mb-3">Uploading… {progress}%</p>
                  <div className="w-full bg-white/10 rounded-full h-2">
                    <div
                      className="bg-pgd-yellow h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-white/20 rounded-xl p-10 text-center hover:border-pgd-yellow/50 transition-colors group"
                >
                  <svg className="w-10 h-10 text-white/20 group-hover:text-pgd-yellow/50 mx-auto mb-3 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-white/50 text-sm group-hover:text-white/70 transition-colors">
                    {state === 'ready' ? 'Replace video — click to upload' : 'Click to upload video'}
                  </p>
                  <p className="text-white/30 text-xs mt-1">MP4, MOV, MKV — up to 20 GB</p>
                </button>
              )}
            </>
          )}

          {/* URL import mode */}
          {mode === 'url' && (
            <div className="space-y-4">
              <div>
                <label className="block text-white/60 text-sm mb-2">Video URL</label>
                <input
                  type="url"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  placeholder="Paste a Google Drive, Dropbox, or direct video link…"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pgd-yellow/50 text-sm font-mono"
                  onKeyDown={(e) => { if (e.key === 'Enter') handleUrlImport() }}
                />
              </div>

              {/* Supported sources */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-pgd-green font-medium mb-0.5">✓ Google Drive</p>
                  <p className="text-white/30">Share link → paste as-is</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-pgd-green font-medium mb-0.5">✓ Dropbox</p>
                  <p className="text-white/30">Shared link → paste as-is</p>
                </div>
                <div className="bg-white/5 rounded-lg p-3 text-center">
                  <p className="text-pgd-green font-medium mb-0.5">✓ Direct MP4</p>
                  <p className="text-white/30">Any public .mp4 URL</p>
                </div>
              </div>

              <div className="bg-pgd-purple rounded-xl p-3 text-xs text-white/40 space-y-1">
                <p><strong className="text-white/60">Google Drive:</strong> open the file → Share → "Anyone with the link" → copy link → paste above.</p>
                <p><strong className="text-white/60">Dropbox:</strong> hover the file → Share → copy link → paste above. The dl=0 is handled automatically.</p>
                <p><strong className="text-white/60">Zoom recordings:</strong> download the MP4 from Zoom Cloud, then use the Upload file tab — or save to Google Drive and share the link.</p>
              </div>

              <button
                onClick={handleUrlImport}
                disabled={isImporting || !importUrl.trim()}
                className="bg-pgd-yellow text-pgd-purple font-bold px-6 py-2.5 rounded-lg text-sm hover:bg-pgd-yellow-dark transition-colors disabled:opacity-40"
              >
                {isImporting ? 'Starting import…' : 'Import video'}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="bg-pgd-purple rounded-xl p-4 text-xs text-white/30 space-y-1">
        <p>Videos are processed by Mux for adaptive streaming. File uploads typically take 1–3 minutes; URL imports take 2–5 minutes depending on file size.</p>
        <p>Once ready, the webinar player goes live automatically.</p>
      </div>
    </div>
  )
}
