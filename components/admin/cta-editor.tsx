'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

interface CTA {
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
  webinarId: string
  ctas: CTA[]
  durationSecs: number
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

const DISPLAY_STYLES = [
  { key: 'BANNER', label: 'Banner', desc: 'Fixed bottom bar' },
  { key: 'MODAL', label: 'Modal', desc: 'Centred overlay' },
  { key: 'SIDEBAR', label: 'Sidebar', desc: 'Right panel slide-in' },
]

export default function CtaEditor({ webinarId, ctas: initial, durationSecs }: Props) {
  const router = useRouter()
  const [ctas, setCtas] = useState<CTA[]>(initial)
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const timelineRef = useRef<HTMLDivElement>(null)

  const duration = durationSecs > 0 ? durationSecs : 3600
  const selected = ctas.find((c) => c.id === selectedId) ?? null

  function update(field: keyof CTA, value: string | number | boolean) {
    setCtas((prev) =>
      prev.map((c) => (c.id === selectedId ? { ...c, [field]: value } : c)),
    )
    setDirty(true)
  }

  // Click on timeline to add a new CTA
  async function handleTimelineClick(e: React.MouseEvent<HTMLDivElement>) {
    if (!timelineRef.current) return
    const rect = timelineRef.current.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    const secs = Math.round(pct * duration)

    // Don't add on top of existing marker
    const tooClose = ctas.some((c) => Math.abs(c.triggerSecs - secs) < 5)
    if (tooClose) return

    const res = await fetch(`/api/admin/webinars/${webinarId}/ctas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggerSecs: secs }),
    })
    if (res.ok) {
      const newCta = await res.json()
      setCtas((prev) => [...prev, newCta].sort((a, b) => a.triggerSecs - b.triggerSecs))
      setSelectedId(newCta.id)
    }
  }

  async function saveSelected() {
    if (!selected) return
    setSaving(true)
    await fetch(`/api/admin/webinars/${webinarId}/ctas/${selected.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selected),
    })
    setSaving(false)
    setDirty(false)
    router.refresh()
  }

  async function deleteCta(id: string) {
    await fetch(`/api/admin/webinars/${webinarId}/ctas/${id}`, { method: 'DELETE' })
    setCtas((prev) => prev.filter((c) => c.id !== id))
    setSelectedId(ctas.find((c) => c.id !== id)?.id ?? null)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Timeline */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-white/60">
            Click anywhere on the timeline to add a CTA. Click a marker to edit it.
          </p>
          <span className="text-white/30 text-xs">{formatTime(duration)} total</span>
        </div>

        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          className="relative h-12 bg-pgd-purple rounded-xl cursor-crosshair select-none overflow-visible"
        >
          {/* Track line */}
          <div className="absolute top-1/2 left-3 right-3 h-0.5 bg-white/10 -translate-y-1/2 rounded-full" />

          {/* Time markers */}
          {[0.25, 0.5, 0.75].map((pct) => (
            <div
              key={pct}
              className="absolute top-1/2 -translate-y-1/2 text-white/20 text-xs"
              style={{ left: `${pct * 100}%`, transform: 'translate(-50%, -50%)' }}
            >
              {formatTime(Math.round(pct * duration))}
            </div>
          ))}

          {/* CTA markers */}
          {ctas.map((cta) => (
            <button
              key={cta.id}
              onClick={(e) => { e.stopPropagation(); setSelectedId(cta.id) }}
              title={`${cta.headline} @ ${formatTime(cta.triggerSecs)}`}
              style={{ left: `${(cta.triggerSecs / duration) * 100}%` }}
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 transition-transform hover:scale-125 ${
                selectedId === cta.id ? 'scale-125' : ''
              }`}
            >
              <div className={`w-4 h-4 rotate-45 border-2 ${
                selectedId === cta.id
                  ? 'bg-pgd-yellow border-pgd-yellow'
                  : cta.isActive
                  ? 'bg-pgd-yellow/40 border-pgd-yellow'
                  : 'bg-white/10 border-white/30'
              }`} />
            </button>
          ))}
        </div>

        {ctas.length === 0 && (
          <p className="text-white/30 text-xs text-center mt-2">
            No CTAs yet — click the timeline above to add one
          </p>
        )}
      </div>

      {/* Editor panel */}
      {selected && (
        <div className="bg-pgd-purple rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">
              Editing CTA @ {formatTime(selected.triggerSecs)}
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => deleteCta(selected.id)}
                className="text-red-400/60 hover:text-red-400 text-xs transition-colors"
              >
                Delete
              </button>
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => update('isActive', !selected.isActive)}
                  className={`w-9 h-5 rounded-full transition-colors relative ${selected.isActive ? 'bg-pgd-green' : 'bg-white/10'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${selected.isActive ? 'left-4.5' : 'left-0.5'}`} />
                </div>
                <span className="text-xs text-white/50">Active</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Trigger time */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Trigger time (MM:SS)</label>
              <input
                type="text"
                defaultValue={formatTime(selected.triggerSecs)}
                onBlur={(e) => update('triggerSecs', parseMmSs(e.target.value))}
                className="w-full bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pgd-yellow"
                placeholder="1:30"
              />
            </div>

            {/* Auto dismiss */}
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Auto-dismiss (seconds, 0 = manual)</label>
              <input
                type="number"
                value={selected.dismissSecs}
                onChange={(e) => update('dismissSecs', parseInt(e.target.value) || 0)}
                min={0}
                className="w-full bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pgd-yellow"
              />
            </div>
          </div>

          {/* Display style */}
          <div>
            <label className="block text-xs text-white/50 mb-2">Display style</label>
            <div className="grid grid-cols-3 gap-2">
              {DISPLAY_STYLES.map((style) => (
                <button
                  key={style.key}
                  onClick={() => update('displayStyle', style.key)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    selected.displayStyle === style.key
                      ? 'border-pgd-yellow bg-pgd-yellow/10'
                      : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <p className={`text-xs font-semibold ${selected.displayStyle === style.key ? 'text-pgd-yellow' : 'text-white'}`}>
                    {style.label}
                  </p>
                  <p className="text-white/40 text-xs mt-0.5">{style.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs text-white/50 mb-1.5">Headline</label>
            <input
              type="text"
              value={selected.headline}
              onChange={(e) => update('headline', e.target.value)}
              className="w-full bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pgd-yellow"
              placeholder="Limited time offer — join Always On today"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5">Sub-headline</label>
            <input
              type="text"
              value={selected.subheadline}
              onChange={(e) => update('subheadline', e.target.value)}
              className="w-full bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pgd-yellow"
              placeholder="Get unlimited access to every webinar"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Button label</label>
              <input
                type="text"
                value={selected.ctaLabel}
                onChange={(e) => update('ctaLabel', e.target.value)}
                className="w-full bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pgd-yellow"
                placeholder="Find Out More"
              />
            </div>
            <div>
              <label className="block text-xs text-white/50 mb-1.5">Button URL</label>
              <input
                type="url"
                value={selected.ctaUrl}
                onChange={(e) => update('ctaUrl', e.target.value)}
                className="w-full bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pgd-yellow"
                placeholder="https://plangrowdo.com/always-on"
              />
            </div>
          </div>

          {/* Colours */}
          <div>
            <label className="block text-xs text-white/50 mb-2">Colours</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { field: 'backgroundColor' as const, label: 'Background' },
                { field: 'textColor' as const, label: 'Text' },
                { field: 'accentColor' as const, label: 'Button' },
              ].map(({ field, label }) => (
                <div key={field} className="flex items-center gap-2 bg-pgd-purple-light rounded-lg px-3 py-2">
                  <input
                    type="color"
                    value={selected[field] as string}
                    onChange={(e) => update(field, e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                  />
                  <span className="text-xs text-white/50">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Live preview */}
          <div>
            <label className="block text-xs text-white/50 mb-2">Preview</label>
            <div className="relative rounded-xl overflow-hidden bg-pgd-purple-dark" style={{ aspectRatio: '16/5' }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <p className="text-white/10 text-xs">Video content</p>
              </div>

              {selected.displayStyle === 'BANNER' && (
                <div
                  className="absolute bottom-0 left-0 right-0 px-4 py-2.5 flex items-center justify-between gap-3"
                  style={{ backgroundColor: selected.backgroundColor }}
                >
                  <div>
                    <p className="font-bold text-xs" style={{ color: selected.textColor }}>{selected.headline || 'Headline text'}</p>
                    {selected.subheadline && <p className="text-xs opacity-70" style={{ color: selected.textColor }}>{selected.subheadline}</p>}
                  </div>
                  <button
                    className="font-bold text-xs px-3 py-1.5 rounded-lg flex-shrink-0"
                    style={{ backgroundColor: selected.accentColor, color: selected.backgroundColor }}
                  >
                    {selected.ctaLabel || 'Button'}
                  </button>
                </div>
              )}

              {selected.displayStyle === 'SIDEBAR' && (
                <div className="absolute right-0 top-0 bottom-0 w-32 flex items-center p-2">
                  <div className="rounded-lg p-2 w-full" style={{ backgroundColor: selected.backgroundColor }}>
                    <p className="font-bold text-xs leading-tight mb-1.5" style={{ color: selected.textColor }}>{selected.headline || 'Headline'}</p>
                    <button className="w-full text-xs font-bold py-1 rounded" style={{ backgroundColor: selected.accentColor, color: selected.backgroundColor }}>
                      {selected.ctaLabel || 'Button'}
                    </button>
                  </div>
                </div>
              )}

              {selected.displayStyle === 'MODAL' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="rounded-lg p-3 text-center w-36" style={{ backgroundColor: selected.backgroundColor }}>
                    <p className="font-bold text-xs mb-1" style={{ color: selected.textColor }}>{selected.headline || 'Headline'}</p>
                    <button className="text-xs font-bold px-3 py-1 rounded" style={{ backgroundColor: selected.accentColor, color: selected.backgroundColor }}>
                      {selected.ctaLabel || 'Button'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <button
            onClick={saveSelected}
            disabled={saving || !dirty}
            className="w-full bg-pgd-yellow text-pgd-purple font-bold py-2.5 rounded-lg text-sm hover:bg-pgd-yellow-dark transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving…' : dirty ? 'Save CTA' : 'Saved'}
          </button>
        </div>
      )}
    </div>
  )
}
