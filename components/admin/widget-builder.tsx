'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Widget {
  id: string
  widgetType: string
  isActive: boolean
  headline: string
  subheadline: string
  ctaLabel: string
  accentColor: string
  cooldownHours: number
  floatPosition: string
  darkMode: boolean
}

interface Props {
  webinarId: string
  webinarSlug: string
  webinarTitle: string
  widgets: Widget[]
  appUrl: string
}

const WIDGET_TYPES = [
  { key: 'EXIT_INTENT', label: 'Exit-Intent Pop-up', desc: 'Appears when visitor moves to leave the page' },
  { key: 'FLOATING', label: 'Floating Button', desc: 'Persistent pill button in corner of screen' },
]

function ScriptSnippet({ widgetId, type, appUrl }: { widgetId: string; type: string; appUrl: string }) {
  const [copied, setCopied] = useState(false)
  const typeAttr = type === 'EXIT_INTENT' ? 'exit-intent' : 'floating'
  const code = `<script src="${appUrl}/widget.js" data-widget-id="${widgetId}" data-type="${typeAttr}" async></script>`

  function copy() {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="bg-pgd-purple-dark rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-wider">Embed code</p>
        <button
          onClick={copy}
          className="text-pgd-blue text-xs hover:text-pgd-blue-dark transition-colors"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
      </div>
      <code className="text-pgd-green text-xs break-all leading-relaxed">{code}</code>
    </div>
  )
}

export default function WidgetBuilder({ webinarId, webinarSlug, webinarTitle, widgets: initial, appUrl }: Props) {
  const router = useRouter()
  const [widgets, setWidgets] = useState<Widget[]>(initial)
  const [creating, setCreating] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(initial[0]?.id ?? null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const selected = widgets.find((w) => w.id === selectedId) ?? null

  async function createWidget(type: string) {
    setCreating(true)
    const res = await fetch(`/api/admin/webinars/${webinarId}/widgets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        widgetType: type,
        headline: `Watch: ${webinarTitle}`,
        ctaLabel: "Watch Now — It's Free",
      }),
    })
    if (res.ok) {
      const w = await res.json()
      setWidgets((prev) => [...prev, w])
      setSelectedId(w.id)
    }
    setCreating(false)
    router.refresh()
  }

  function update(field: keyof Widget, value: string | number | boolean) {
    setWidgets((prev) => prev.map((w) => w.id === selectedId ? { ...w, [field]: value } : w))
    setDirty(true)
  }

  async function save() {
    if (!selected) return
    setSaving(true)
    await fetch(`/api/admin/webinars/${webinarId}/widgets/${selected.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(selected),
    })
    setSaving(false)
    setDirty(false)
    router.refresh()
  }

  async function deleteWidget(id: string) {
    await fetch(`/api/admin/webinars/${webinarId}/widgets/${id}`, { method: 'DELETE' })
    setWidgets((prev) => prev.filter((w) => w.id !== id))
    setSelectedId(widgets.find((w) => w.id !== id)?.id ?? null)
    router.refresh()
  }

  return (
    <div className="space-y-6">
      {/* Create new widget */}
      {widgets.length < 2 && (
        <div className="grid grid-cols-2 gap-3">
          {WIDGET_TYPES.filter((t) => !widgets.some((w) => w.widgetType === t.key)).map((type) => (
            <button
              key={type.key}
              onClick={() => createWidget(type.key)}
              disabled={creating}
              className="bg-pgd-purple rounded-xl p-4 text-left hover:bg-pgd-purple-light transition-colors border border-white/5 hover:border-pgd-yellow/30 disabled:opacity-50"
            >
              <p className="text-white font-semibold text-sm">{type.label}</p>
              <p className="text-white/40 text-xs mt-1">{type.desc}</p>
              <p className="text-pgd-yellow text-xs mt-2 font-medium">+ Add →</p>
            </button>
          ))}
        </div>
      )}

      {/* Widget tabs */}
      {widgets.length > 0 && (
        <div className="flex gap-2">
          {widgets.map((w) => (
            <button
              key={w.id}
              onClick={() => { setSelectedId(w.id); setDirty(false) }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                selectedId === w.id
                  ? 'bg-pgd-yellow text-pgd-purple'
                  : 'bg-pgd-purple text-white/60 hover:text-white'
              }`}
            >
              {w.widgetType === 'EXIT_INTENT' ? 'Exit-Intent' : 'Floating'}
              {!w.isActive && <span className="ml-1 opacity-50">(off)</span>}
            </button>
          ))}
        </div>
      )}

      {/* Editor */}
      {selected && (
        <div className="bg-pgd-purple rounded-xl p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white text-sm">
              {selected.widgetType === 'EXIT_INTENT' ? 'Exit-Intent Pop-up' : 'Floating Button'}
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => deleteWidget(selected.id)}
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

          <div>
            <label className="block text-xs text-white/50 mb-1.5">Headline</label>
            <input
              type="text"
              value={selected.headline}
              onChange={(e) => update('headline', e.target.value)}
              className="w-full bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pgd-yellow"
              placeholder={`Watch: ${webinarTitle}`}
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5">Sub-headline (optional)</label>
            <input
              type="text"
              value={selected.subheadline}
              onChange={(e) => update('subheadline', e.target.value)}
              className="w-full bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pgd-yellow"
              placeholder="A short value proposition"
            />
          </div>

          <div>
            <label className="block text-xs text-white/50 mb-1.5">Button label</label>
            <input
              type="text"
              value={selected.ctaLabel}
              onChange={(e) => update('ctaLabel', e.target.value)}
              className="w-full bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pgd-yellow"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-3 bg-pgd-purple-light rounded-lg px-3 py-2">
              <input
                type="color"
                value={selected.accentColor}
                onChange={(e) => update('accentColor', e.target.value)}
                className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
              />
              <span className="text-xs text-white/50">Button colour</span>
            </div>

            {selected.widgetType === 'EXIT_INTENT' && (
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Cooldown (hours)</label>
                <input
                  type="number"
                  value={selected.cooldownHours}
                  min={1}
                  max={168}
                  onChange={(e) => update('cooldownHours', parseInt(e.target.value) || 24)}
                  className="w-full bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pgd-yellow"
                />
              </div>
            )}

            {selected.widgetType === 'FLOATING' && (
              <div>
                <label className="block text-xs text-white/50 mb-1.5">Position</label>
                <select
                  value={selected.floatPosition}
                  onChange={(e) => update('floatPosition', e.target.value)}
                  className="w-full bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-pgd-yellow"
                >
                  <option value="BOTTOM_RIGHT">Bottom right</option>
                  <option value="BOTTOM_LEFT">Bottom left</option>
                </select>
              </div>
            )}
          </div>

          {/* Embed snippet */}
          <ScriptSnippet widgetId={selected.id} type={selected.widgetType} appUrl={appUrl} />

          <button
            onClick={save}
            disabled={saving || !dirty}
            className="w-full bg-pgd-yellow text-pgd-purple font-bold py-2.5 rounded-lg text-sm hover:bg-pgd-yellow-dark transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving…' : dirty ? 'Save Widget' : 'Saved'}
          </button>
        </div>
      )}

      {widgets.length === 0 && (
        <div className="bg-pgd-purple rounded-xl p-10 text-center">
          <p className="text-white/30 text-sm">No widgets yet — add one above to get the embed code.</p>
        </div>
      )}
    </div>
  )
}
