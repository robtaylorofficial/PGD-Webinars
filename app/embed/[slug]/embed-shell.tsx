'use client'

import { useState, useEffect } from 'react'

interface WebinarInfo {
  id: string
  slug: string
  title: string
  subtitle: string
  thumbnailUrl: string
  accessType: string
  status: string
  muxPlaybackId: string
}

interface Props {
  webinar: WebinarInfo
  existingToken: string | null
}

type EmbedState = 'register' | 'loading' | 'player'

export default function EmbedShell({ webinar, existingToken }: Props) {
  const [state, setState] = useState<EmbedState>(existingToken ? 'player' : 'register')
  const [token, setToken] = useState(existingToken ?? '')
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Listen for postMessage membership passthrough from plangrowdo.com
  useEffect(() => {
    async function handleMessage(event: MessageEvent) {
      // Verify origin is a PGD domain
      const origin = event.origin
      if (!origin.endsWith('plangrowdo.com') && origin !== window.location.origin) return

      if (event.data?.type !== 'PGD_AUTH') return

      const { email: memberEmail, membershipToken } = event.data
      if (!memberEmail || !membershipToken) return

      setState('loading')
      try {
        const res = await fetch('/api/auth/embed-passthrough', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: memberEmail,
            membershipToken,
            webinarSlug: webinar.slug,
          }),
        })
        if (res.ok) {
          const data = await res.json()
          setToken(data.accessToken)
          setState('player')
        } else {
          setState('register')
        }
      } catch {
        setState('register')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [webinar.slug])

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webinarId: webinar.id,
        email,
        name,
        scheduledWatch: 'now',
      }),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.accessToken) {
        setToken(data.accessToken)
        setState('player')
      } else {
        // Paid webinar — Stripe redirect
        if (data.checkoutUrl) window.top!.location.href = data.checkoutUrl
      }
    } else {
      const err = await res.json().catch(() => ({}))
      setError(err.error ?? 'Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  if (state === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-pgd-purple">
        <div className="w-8 h-8 border-2 border-pgd-yellow border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (state === 'player' && token) {
    return (
      <iframe
        src={`/embed/${webinar.slug}/player?token=${token}`}
        className="w-full h-full border-0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        style={{ display: 'block', width: '100%', height: '100%', minHeight: '360px' }}
      />
    )
  }

  // Registration form (stripped — no nav/footer)
  return (
    <div
      className="flex flex-col items-center justify-center min-h-screen bg-pgd-purple p-6"
      style={{ fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}
    >
      <div className="w-full max-w-sm space-y-5">
        {webinar.thumbnailUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={webinar.thumbnailUrl}
            alt=""
            className="w-full rounded-xl object-cover aspect-video"
          />
        )}

        <div>
          <h1 className="text-white font-bold text-lg leading-tight">{webinar.title}</h1>
          {webinar.subtitle && <p className="text-white/60 text-sm mt-1">{webinar.subtitle}</p>}
        </div>

        <form onSubmit={handleRegister} className="space-y-3">
          <input
            type="text"
            placeholder="First name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pgd-yellow"
          />
          <input
            type="email"
            placeholder="Email address"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-pgd-purple-light border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-pgd-yellow"
          />

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-pgd-yellow text-pgd-purple font-bold py-3 rounded-lg hover:bg-pgd-yellow-dark transition-colors disabled:opacity-50 text-sm"
          >
            {submitting ? 'Loading…' : webinar.accessType === 'FREE' ? 'Watch Now — It\'s Free' : 'Register & Pay →'}
          </button>
        </form>

        <p className="text-white/20 text-xs text-center">
          By registering you agree to receive emails from Plan Grow Do.{' '}
          <span className="underline cursor-pointer" onClick={() => window.top!.location.href = 'https://plangrowdo.com/privacy'}>
            Privacy policy
          </span>
        </p>
      </div>
    </div>
  )
}
