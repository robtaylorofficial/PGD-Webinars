'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface WebinarData {
  id?: string
  title: string
  slug: string
  subtitle: string
  description: string
  webinarType: string
  accessType: string
  priceGbp: number
  status: string
  metaTitle: string
  metaDesc: string
}

interface Props {
  webinar?: WebinarData
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

export default function WebinarForm({ webinar }: Props) {
  const router = useRouter()
  const isEdit = !!webinar?.id

  const [form, setForm] = useState<WebinarData>({
    title: webinar?.title ?? '',
    slug: webinar?.slug ?? '',
    subtitle: webinar?.subtitle ?? '',
    description: webinar?.description ?? '',
    webinarType: webinar?.webinarType ?? 'ON_DEMAND',
    accessType: webinar?.accessType ?? 'FREE',
    priceGbp: webinar?.priceGbp ?? 0,
    status: webinar?.status ?? 'DRAFT',
    metaTitle: webinar?.metaTitle ?? '',
    metaDesc: webinar?.metaDesc ?? '',
  })

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) {
    const { name, value } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      // Auto-generate slug from title on create
      if (name === 'title' && !isEdit) {
        next.slug = slugify(value)
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')

    const url = isEdit ? `/api/admin/webinars/${webinar!.id}` : '/api/admin/webinars'
    const method = isEdit ? 'PUT' : 'POST'

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, priceGbp: Number(form.priceGbp) * 100 }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      setError(body.error ?? 'Something went wrong')
      setSaving(false)
      return
    }

    const data = await res.json()
    router.push(`/admin/webinars/${data.id}`)
    router.refresh()
  }

  async function handleDelete() {
    if (!confirm('Delete this webinar? This cannot be undone.')) return
    await fetch(`/api/admin/webinars/${webinar!.id}`, { method: 'DELETE' })
    router.push('/admin/webinars')
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <Field label="Title" required>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          required
          placeholder="e.g. How to Double Your Leads in 90 Days"
          className={input()}
        />
      </Field>

      <Field label="Slug" hint="Used in the URL: /webinars/[slug]" required>
        <input
          name="slug"
          value={form.slug}
          onChange={handleChange}
          required
          placeholder="how-to-double-your-leads"
          pattern="[a-z0-9-]+"
          className={input()}
        />
      </Field>

      <Field label="Subtitle" hint="Short tagline shown below the title">
        <input
          name="subtitle"
          value={form.subtitle}
          onChange={handleChange}
          placeholder="The exact system 500+ business owners use"
          className={input()}
        />
      </Field>

      <Field label="Description">
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={5}
          placeholder="What will people learn? Why should they watch?"
          className={input('resize-none')}
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Webinar type">
          <select name="webinarType" value={form.webinarType} onChange={handleChange} className={input()}>
            <option value="ON_DEMAND">On Demand</option>
            <option value="LIVE">Live</option>
            <option value="HYBRID">Hybrid (live → on demand)</option>
          </select>
        </Field>

        <Field label="Status">
          <select name="status" value={form.status} onChange={handleChange} className={input()}>
            <option value="DRAFT">Draft</option>
            <option value="PUBLISHED">Published</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Access type">
          <select name="accessType" value={form.accessType} onChange={handleChange} className={input()}>
            <option value="FREE">Free</option>
            <option value="PAID">Paid</option>
            <option value="MEMBERSHIP">Membership only</option>
          </select>
        </Field>

        {form.accessType === 'PAID' && (
          <Field label="Price (£)" hint="Enter in pounds e.g. 97">
            <input
              name="priceGbp"
              type="number"
              min="0"
              step="0.01"
              value={form.priceGbp / 100 || ''}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, priceGbp: Math.round(parseFloat(e.target.value || '0') * 100) }))
              }
              placeholder="97.00"
              className={input()}
            />
          </Field>
        )}
      </div>

      <div className="border-t border-white/10 pt-6">
        <p className="text-xs font-medium text-white/40 uppercase tracking-wider mb-4">SEO</p>
        <div className="space-y-4">
          <Field label="Meta title" hint="Leave blank to use webinar title">
            <input
              name="metaTitle"
              value={form.metaTitle}
              onChange={handleChange}
              placeholder={form.title}
              className={input()}
            />
          </Field>
          <Field label="Meta description">
            <textarea
              name="metaDesc"
              value={form.metaDesc}
              onChange={handleChange}
              rows={2}
              maxLength={160}
              placeholder="Short description for search engines (max 160 chars)"
              className={input('resize-none')}
            />
          </Field>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2">
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={saving}
            className="bg-pgd-yellow text-pgd-purple font-semibold px-6 py-2.5 rounded-lg text-sm hover:bg-pgd-yellow-dark transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create webinar'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 rounded-lg text-sm text-white/60 hover:text-white transition-colors"
          >
            Cancel
          </button>
        </div>
        {isEdit && (
          <button
            type="button"
            onClick={handleDelete}
            className="text-red-400 hover:text-red-300 text-sm transition-colors"
          >
            Delete webinar
          </button>
        )}
      </div>
    </form>
  )
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-white/80 mb-1.5">
        {label}
        {required && <span className="text-pgd-yellow ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-white/40 mt-1">{hint}</p>}
    </div>
  )
}

function input(extra = '') {
  return `w-full bg-pgd-purple border border-white/10 text-white text-sm rounded-lg px-3 py-2.5 placeholder:text-white/30 focus:outline-none focus:border-pgd-yellow transition-colors ${extra}`
}
