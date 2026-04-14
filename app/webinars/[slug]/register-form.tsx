'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

interface Props {
  webinarId: string
  webinarTitle: string
  accessType: string
  priceGbp: number
}

// Preset watch-time slots for free registrations
const WATCH_SLOTS = [
  { label: 'Right now', value: 'now' },
  { label: 'Later today', value: 'today' },
  { label: 'Tomorrow morning', value: 'tomorrow_morning' },
  { label: 'Tomorrow evening', value: 'tomorrow_evening' },
  { label: 'This weekend', value: 'weekend' },
  { label: "I'll pick my own time", value: 'later' },
]

function resolveWatchTime(slot: string): string {
  const now = new Date()
  switch (slot) {
    case 'now':
      return now.toISOString()
    case 'today': {
      const d = new Date(now); d.setHours(19, 0, 0, 0); return d.toISOString()
    }
    case 'tomorrow_morning': {
      const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d.toISOString()
    }
    case 'tomorrow_evening': {
      const d = new Date(now); d.setDate(d.getDate() + 1); d.setHours(19, 0, 0, 0); return d.toISOString()
    }
    case 'weekend': {
      const d = new Date(now)
      const daysUntilSat = (6 - d.getDay() + 7) % 7 || 7
      d.setDate(d.getDate() + daysUntilSat); d.setHours(10, 0, 0, 0); return d.toISOString()
    }
    default:
      return ''
  }
}

export default function RegisterForm({ webinarId, accessType, priceGbp }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [email, setEmail] = useState('')
  const [watchSlot, setWatchSlot] = useState('now')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [successEmail, setSuccessEmail] = useState('')

  const isFree = accessType === 'FREE'
  const isPaid = accessType === 'PAID'
  const isMembership = accessType === 'MEMBERSHIP'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webinarId,
          email,
          name: isFree ? '' : name,
          scheduledWatchAt: isFree ? resolveWatchTime(watchSlot) : undefined,
          utmSource: searchParams.get('utm_source') ?? '',
          utmMedium: searchParams.get('utm_medium') ?? '',
          utmCampaign: searchParams.get('utm_campaign') ?? '',
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.')
        setLoading(false)
        return
      }

      if (isPaid && data.checkoutUrl) {
        window.location.href = data.checkoutUrl
        return
      }

      if (isMembership && data.membershipUrl) {
        router.push(data.membershipUrl)
        return
      }

      setSuccessEmail(email)
      setSuccess(true)
    } catch {
      setError('Something went wrong. Please try again.')
    }

    setLoading(false)
  }

  if (success) {
    const slotLabel = WATCH_SLOTS.find((s) => s.value === watchSlot)?.label ?? ''
    return (
      <div className="bg-pgd-purple-light rounded-2xl p-8 text-center space-y-4">
        <div className="w-16 h-16 bg-pgd-green/20 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-pgd-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-white">
          {watchSlot === 'now' ? "You're all set — start watching!" : "You're registered!"}
        </h2>
        <p className="text-white/60 text-sm">
          {watchSlot === 'now'
            ? <>Your access link has been sent to <span className="text-white">{successEmail}</span>. Check your inbox and click to watch.</>
            : <>We have sent your access link to <span className="text-white">{successEmail}</span>.{slotLabel && <> We will send you a reminder <strong className="text-white">{slotLabel.toLowerCase()}</strong>.</>}</>
          }
        </p>
        <p className="text-white/30 text-xs">
          Cannot find the email? Check your spam folder.
        </p>
      </div>
    )
  }

  // ── MEMBERSHIP ──────────────────────────────────────────────────────────────
  if (isMembership) {
    return (
      <div className="bg-pgd-purple-light rounded-2xl p-8 space-y-4">
        <h2 className="text-xl font-bold text-white mb-1">Members-only webinar</h2>
        <p className="text-white/50 text-sm mb-4">This webinar is exclusively for Always On members.</p>
        <a
          href="/membership/upgrade"
          className="block w-full bg-pgd-blue text-white font-bold py-3 rounded-lg text-sm text-center hover:bg-pgd-blue-dark transition-colors"
        >
          Join Always On →
        </a>
        <p className="text-white/30 text-xs text-center">
          Already a member?{' '}
          <a href="/login" className="text-pgd-blue hover:underline">Sign in</a>
        </p>
      </div>
    )
  }

  // ── PAID ────────────────────────────────────────────────────────────────────
  if (isPaid) {
    return (
      <div className="bg-pgd-purple-light rounded-2xl p-8">
        <h2 className="text-xl font-bold text-white mb-1">
          Get instant access — £{(priceGbp / 100).toFixed(2)}
        </h2>
        <p className="text-white/50 text-sm mb-6">One-off payment. Lifetime access.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm text-white/60 mb-1.5">First name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-pgd-purple border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-pgd-yellow"
              placeholder="Robert"
            />
          </div>
          <div>
            <label className="block text-sm text-white/60 mb-1.5">Email address</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-pgd-purple border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-pgd-yellow"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pgd-yellow text-pgd-purple font-bold py-3 rounded-lg text-sm hover:bg-pgd-yellow-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'Redirecting to checkout…' : `Pay £${(priceGbp / 100).toFixed(2)} — Watch Now`}
          </button>
          <p className="text-white/30 text-xs text-center">Secure checkout via Stripe.</p>
        </form>
      </div>
    )
  }

  // ── FREE ────────────────────────────────────────────────────────────────────
  return (
    <div className="bg-pgd-purple-light rounded-2xl p-8">
      <h2 className="text-xl font-bold text-white mb-1">Watch free</h2>
      <p className="text-white/50 text-sm mb-6">
        Enter your email and pick a time — we will send your access link straight away.
      </p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm text-white/60 mb-1.5">Email address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full bg-pgd-purple border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-pgd-yellow"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="block text-sm text-white/60 mb-2">When do you want to watch?</label>
          <div className="grid grid-cols-2 gap-2">
            {WATCH_SLOTS.map((slot) => (
              <button
                key={slot.value}
                type="button"
                onClick={() => setWatchSlot(slot.value)}
                className={`px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-all border ${
                  watchSlot === slot.value
                    ? 'bg-pgd-yellow/20 border-pgd-yellow text-pgd-yellow'
                    : 'bg-pgd-purple border-white/10 text-white/60 hover:border-white/30'
                }`}
              >
                {slot.label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-pgd-yellow text-pgd-purple font-bold py-3 rounded-lg text-sm hover:bg-pgd-yellow-dark transition-colors disabled:opacity-50"
        >
          {loading ? 'Sending your link…' : 'Send My Free Access Link →'}
        </button>

        <p className="text-white/30 text-xs text-center">
          No credit card. No spam. Unsubscribe any time.
        </p>
      </form>
    </div>
  )
}
