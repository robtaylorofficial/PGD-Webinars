'use client'

import { useState, useRef } from 'react'

interface ThankYouData {
  thankYouHeadline: string
  thankYouMessage: string
  thankYouVideoMuxPlaybackId: string
  thankYouPrimaryCtaLabel: string
  thankYouPrimaryCtaUrl: string
  thankYouSecondaryCtaLabel: string
  thankYouSecondaryCtaUrl: string
  thankYouShowRating: boolean
  thankYouShowShare: boolean
}

interface Props {
  webinarId: string
  webinarSlug: string
  data: ThankYouData
  appUrl: string
}

export default function ThankYouEditor({ webinarId, webinarSlug, data, appUrl }: Props) {
  const [form, setForm] = useState<ThankYouData>(data)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  // Video upload state
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'processing' | 'done' | 'error'>('idle')
  const fileInputRef = useRef<HTMLInputElement>(null)

  function set<K extends keyof ThankYouData>(key: K, value: ThankYouData[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/webinars/${webinarId}/thank-you`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error(await res.text())
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function handleVideoUpload(file: File) {
    setUploading(true)
    setUploadProgress(0)
    setUploadStatus('uploading')

    try {
      // Get Mux upload URL
      const urlRes = await fetch('/api/mux/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webinarId, thankYou: true }),
      })
      if (!urlRes.ok) throw new Error('Failed to get upload URL')
      const { uploadUrl } = await urlRes.json()

      // Upload directly to Mux via XHR (for progress tracking)
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl)
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100))
          }
        }
        xhr.onload = () => (xhr.status < 400 ? resolve() : reject(new Error('Upload failed')))
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.send(file)
      })

      setUploadStatus('processing')

      // Poll asset-status until ready
      // The webhook will update the DB; we poll for the playback ID
      let attempts = 0
      const maxAttempts = 40 // 2 minutes
      const poll = async (): Promise<void> => {
        attempts++
        if (attempts > maxAttempts) {
          setUploadStatus('error')
          return
        }
        // Fetch updated webinar data to check if playbackId is populated
        const checkRes = await fetch(`/api/admin/webinars/${webinarId}/thank-you`)
        if (checkRes.ok) {
          const updated = await checkRes.json()
          if (updated.thankYouVideoMuxPlaybackId) {
            set('thankYouVideoMuxPlaybackId', updated.thankYouVideoMuxPlaybackId)
            setUploadStatus('done')
            setUploading(false)
            return
          }
        }
        await new Promise((r) => setTimeout(r, 3000))
        return poll()
      }
      await poll()
    } catch (e) {
      console.error(e)
      setUploadStatus('error')
      setUploading(false)
    }
  }

  const thankYouUrl = `${appUrl}/thank-you/${webinarSlug}`

  return (
    <div className="space-y-8">

      {/* Preview link */}
      <div className="bg-pgd-purple-light rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-white/60 text-sm">Thank you page URL</p>
          <p className="text-white/40 text-xs font-mono mt-0.5">{thankYouUrl}?token=&#123;access_token&#125;</p>
        </div>
        <a
          href={`${thankYouUrl}?token=preview`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-pgd-blue text-xs hover:underline shrink-0 ml-4"
        >
          Preview ↗
        </a>
      </div>

      {/* Personalised message */}
      <section className="space-y-4">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Personalised message</h3>
        <p className="text-white/40 text-xs">
          Use <code className="bg-white/10 px-1 rounded">{'{name}'}</code> as a placeholder — it&apos;s replaced with the viewer&apos;s first name.
        </p>

        <div>
          <label className="block text-white/60 text-sm mb-1">Headline</label>
          <input
            type="text"
            value={form.thankYouHeadline}
            onChange={(e) => set('thankYouHeadline', e.target.value)}
            placeholder="e.g. Well done, {name}! You just did what most don't."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-pgd-yellow/50 text-sm"
          />
        </div>

        <div>
          <label className="block text-white/60 text-sm mb-1">Body message</label>
          <textarea
            rows={4}
            value={form.thankYouMessage}
            onChange={(e) => set('thankYouMessage', e.target.value)}
            placeholder="e.g. You've just finished watching {name} — that alone puts you ahead of most people..."
            className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-pgd-yellow/50 text-sm resize-none"
          />
        </div>
      </section>

      {/* Personal video message */}
      <section className="space-y-4">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Personal video message (optional)</h3>
        <p className="text-white/40 text-xs">
          A short personal video from you — played automatically after the main webinar ends. Great for reinforcing the CTA.
        </p>

        {form.thankYouVideoMuxPlaybackId ? (
          <div className="bg-pgd-purple rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-pgd-green/20 flex items-center justify-center shrink-0">
                <svg className="w-5 h-5 text-pgd-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-medium">Video uploaded</p>
                <p className="text-white/40 text-xs font-mono">{form.thankYouVideoMuxPlaybackId}</p>
              </div>
            </div>
            <button
              onClick={() => set('thankYouVideoMuxPlaybackId', '')}
              className="text-red-400/60 hover:text-red-400 text-xs transition-colors"
            >
              Remove
            </button>
          </div>
        ) : (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleVideoUpload(file)
              }}
            />

            {uploadStatus === 'idle' && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-white/10 hover:border-white/20 rounded-xl p-8 text-center transition-colors group"
              >
                <svg className="w-10 h-10 text-white/20 group-hover:text-white/30 mx-auto mb-3 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M15 10l4.553-2.069A1 1 0 0121 8.876V15.124a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
                </svg>
                <p className="text-white/40 text-sm group-hover:text-white/60 transition-colors">Click to upload personal video</p>
                <p className="text-white/20 text-xs mt-1">MP4, MOV, or any video format</p>
              </button>
            )}

            {(uploadStatus === 'uploading' || uploadStatus === 'processing') && (
              <div className="bg-pgd-purple rounded-xl p-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">
                    {uploadStatus === 'uploading' ? 'Uploading…' : 'Processing…'}
                  </span>
                  {uploadStatus === 'uploading' && (
                    <span className="text-white/40">{uploadProgress}%</span>
                  )}
                </div>
                <div className="w-full bg-white/10 rounded-full h-1.5">
                  {uploadStatus === 'uploading' ? (
                    <div
                      className="bg-pgd-yellow h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  ) : (
                    <div className="bg-pgd-green h-1.5 rounded-full animate-pulse w-full" />
                  )}
                </div>
                {uploadStatus === 'processing' && (
                  <p className="text-white/30 text-xs">Mux is transcoding your video — this takes a minute or two</p>
                )}
              </div>
            )}

            {uploadStatus === 'error' && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                <p className="text-red-400 text-sm">Upload failed — please try again</p>
                <button
                  onClick={() => { setUploadStatus('idle'); fileInputRef.current?.click() }}
                  className="text-red-400/60 hover:text-red-400 text-xs mt-2 transition-colors"
                >
                  Retry
                </button>
              </div>
            )}
          </div>
        )}
      </section>

      {/* CTA buttons */}
      <section className="space-y-4">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Call-to-action buttons</h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-white/60 text-sm">Primary CTA label</label>
            <input
              type="text"
              value={form.thankYouPrimaryCtaLabel}
              onChange={(e) => set('thankYouPrimaryCtaLabel', e.target.value)}
              placeholder="e.g. Book a free call"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-pgd-yellow/50 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-white/60 text-sm">Primary CTA URL</label>
            <input
              type="url"
              value={form.thankYouPrimaryCtaUrl}
              onChange={(e) => set('thankYouPrimaryCtaUrl', e.target.value)}
              placeholder="https://"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-pgd-yellow/50 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-white/60 text-sm">Secondary CTA label</label>
            <input
              type="text"
              value={form.thankYouSecondaryCtaLabel}
              onChange={(e) => set('thankYouSecondaryCtaLabel', e.target.value)}
              placeholder="e.g. Watch another webinar"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-pgd-yellow/50 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-white/60 text-sm">Secondary CTA URL</label>
            <input
              type="url"
              value={form.thankYouSecondaryCtaUrl}
              onChange={(e) => set('thankYouSecondaryCtaUrl', e.target.value)}
              placeholder="https://"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-white placeholder-white/20 focus:outline-none focus:border-pgd-yellow/50 text-sm"
            />
          </div>
        </div>

        {/* Live preview of buttons */}
        {(form.thankYouPrimaryCtaLabel || form.thankYouSecondaryCtaLabel) && (
          <div className="bg-pgd-purple rounded-xl p-4">
            <p className="text-white/30 text-xs mb-3 uppercase tracking-wider">Preview</p>
            <div className="flex flex-wrap gap-2">
              {form.thankYouPrimaryCtaLabel && (
                <span className="bg-pgd-yellow text-pgd-purple font-bold px-6 py-2.5 rounded-xl text-sm">
                  {form.thankYouPrimaryCtaLabel}
                </span>
              )}
              {form.thankYouSecondaryCtaLabel && (
                <span className="border border-white/20 text-white/70 font-semibold px-6 py-2.5 rounded-xl text-sm">
                  {form.thankYouSecondaryCtaLabel}
                </span>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Engagement widgets */}
      <section className="space-y-4">
        <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Engagement</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="flex items-center justify-between bg-pgd-purple-light rounded-xl p-4 cursor-pointer group">
            <div>
              <p className="text-white text-sm font-medium">Star rating</p>
              <p className="text-white/40 text-xs mt-0.5">Ask viewers to rate the webinar 1–5 stars</p>
            </div>
            <div
              onClick={() => set('thankYouShowRating', !form.thankYouShowRating)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.thankYouShowRating ? 'bg-pgd-green' : 'bg-white/10'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.thankYouShowRating ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </div>
          </label>

          <label className="flex items-center justify-between bg-pgd-purple-light rounded-xl p-4 cursor-pointer group">
            <div>
              <p className="text-white text-sm font-medium">Share buttons</p>
              <p className="text-white/40 text-xs mt-0.5">LinkedIn, X (Twitter), and copy link</p>
            </div>
            <div
              onClick={() => set('thankYouShowShare', !form.thankYouShowShare)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.thankYouShowShare ? 'bg-pgd-green' : 'bg-white/10'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  form.thankYouShowShare ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </div>
          </label>
        </div>
      </section>

      {/* Save */}
      <div className="flex items-center gap-4 pt-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-pgd-yellow text-pgd-purple font-bold px-6 py-2.5 rounded-lg text-sm hover:bg-pgd-yellow-dark transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save thank you page'}
        </button>
        {saved && <span className="text-pgd-green text-sm">Saved ✓</span>}
        {error && <span className="text-red-400 text-sm">{error}</span>}
      </div>
    </div>
  )
}
