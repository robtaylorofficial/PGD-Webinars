'use client'

import { useState, useRef } from 'react'

interface Props {
  webinarId: string
  currentPlaybackId?: string
  currentAssetId?: string
  durationSecs?: number
}

type UploadState = 'idle' | 'uploading' | 'processing' | 'ready' | 'error'

export default function VideoUpload({ webinarId, currentPlaybackId, durationSecs }: Props) {
  const [state, setState] = useState<UploadState>(currentPlaybackId ? 'ready' : 'idle')
  const [progress, setProgress] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setState('uploading')
    setProgress(0)
    setErrorMsg('')

    try {
      // Step 1: Get a Mux direct upload URL
      const res = await fetch('/api/mux/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webinarId }),
      })

      if (!res.ok) throw new Error('Failed to get upload URL')
      const { uploadUrl } = await res.json()

      // Step 2: PUT the file directly to Mux
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl)
        xhr.upload.onprogress = (ev) => {
          if (ev.lengthComputable) setProgress(Math.round((ev.loaded / ev.total) * 100))
        }
        xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`Upload failed: ${xhr.status}`))
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.send(file)
      })

      setState('processing')
      setProgress(100)
    } catch (err) {
      console.error(err)
      setErrorMsg(err instanceof Error ? err.message : 'Upload failed')
      setState('error')
    }
  }

  function formatDuration(secs: number) {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${m}m ${s}s`
  }

  return (
    <div className="space-y-6">
      {/* Current video status */}
      {state === 'ready' && currentPlaybackId && (
        <div className="bg-pgd-green/10 border border-pgd-green/30 rounded-xl p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-pgd-green/20 rounded-full flex items-center justify-center flex-shrink-0">
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
          <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-pgd-yellow animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <div>
            <p className="text-pgd-yellow text-sm font-medium">Processing video…</p>
            <p className="text-white/40 text-xs mt-0.5">Mux is transcoding your upload. This usually takes 1–3 minutes. The page will update automatically.</p>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 text-sm font-medium">Upload failed</p>
          <p className="text-white/40 text-xs mt-1">{errorMsg}</p>
        </div>
      )}

      {/* Upload area */}
      {state !== 'processing' && (
        <div>
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
                {state === 'ready' ? 'Replace video' : 'Click to upload video'}
              </p>
              <p className="text-white/30 text-xs mt-1">MP4, MOV, MKV — up to 20GB</p>
            </button>
          )}
        </div>
      )}

      <div className="bg-pgd-purple rounded-xl p-4 text-xs text-white/40 space-y-1">
        <p>Videos are processed by Mux for adaptive streaming. After upload, processing typically takes 1–3 minutes.</p>
        <p>Once ready, the playback ID will appear above and the webinar player will be live.</p>
      </div>
    </div>
  )
}
