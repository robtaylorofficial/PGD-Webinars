'use client'

import { useState } from 'react'
import MuxPlayer from '@mux/mux-player-react'
import Link from 'next/link'

interface WebinarInfo {
  id: string
  slug: string
  title: string
  subtitle: string
  thumbnailUrl: string
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
  webinar: WebinarInfo
  firstName: string
  registrationToken: string | null
  signedThankYouToken: string | null
  shareUrl: string
}

const STAR_LABELS = ['', 'Not for me', 'It was ok', 'Good stuff', 'Really valuable', 'Absolutely brilliant']

export default function ThankYouClient({
  webinar,
  firstName,
  registrationToken,
  signedThankYouToken,
  shareUrl,
}: Props) {
  const [rating, setRating] = useState(0)
  const [hoveredRating, setHoveredRating] = useState(0)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const [copied, setCopied] = useState(false)

  const headline = webinar.thankYouHeadline
    ? webinar.thankYouHeadline.replace('{name}', firstName)
    : `Well done, ${firstName}!`

  const message = webinar.thankYouMessage
    ? webinar.thankYouMessage.replace('{name}', firstName)
    : `You've just finished watching ${webinar.title}. That alone puts you ahead of most people.`

  async function submitRating(stars: number) {
    setRating(stars)
    setRatingSubmitted(true)
    await fetch('/api/watch/rating', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webinarId: webinar.id,
        token: registrationToken,
        rating: stars,
      }),
    }).catch(() => {})
  }

  function copyShareLink() {
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const activeRating = hoveredRating || rating

  return (
    <div className="min-h-screen bg-pgd-purple">
      {/* Nav */}
      <header className="border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            <span className="text-pgd-yellow">PLAN.</span>
            <span className="text-pgd-green"> GROW.</span>
            <span className="text-pgd-blue"> DO.</span>
          </Link>
          <Link href="/" className="text-sm text-white/40 hover:text-white transition-colors">
            ← All webinars
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-8">

        {/* Completion badge */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-pgd-green/20 border border-pgd-green/30 mb-4">
            <svg className="w-8 h-8 text-pgd-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight">
            {headline}
          </h1>
          <p className="text-white/60 mt-3 text-lg max-w-xl mx-auto leading-relaxed">
            {message}
          </p>
        </div>

        {/* Thank you video (optional personal message) */}
        {signedThankYouToken && webinar.thankYouVideoMuxPlaybackId && (
          <div className="rounded-2xl overflow-hidden bg-black aspect-video max-w-2xl mx-auto">
            <MuxPlayer
              playbackId={webinar.thankYouVideoMuxPlaybackId}
              tokens={{ playback: signedThankYouToken }}
              streamType="on-demand"
              accentColor="#fbba00"
              autoPlay
              style={{ width: '100%', height: '100%' }}
            />
          </div>
        )}

        {/* CTA buttons */}
        {(webinar.thankYouPrimaryCtaLabel && webinar.thankYouPrimaryCtaUrl) && (
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <a
              href={webinar.thankYouPrimaryCtaUrl}
              className="bg-pgd-yellow text-pgd-purple font-bold px-8 py-3.5 rounded-xl text-center hover:bg-pgd-yellow-dark transition-colors"
            >
              {webinar.thankYouPrimaryCtaLabel}
            </a>
            {webinar.thankYouSecondaryCtaLabel && webinar.thankYouSecondaryCtaUrl && (
              <a
                href={webinar.thankYouSecondaryCtaUrl}
                className="border border-white/20 text-white/70 font-semibold px-8 py-3.5 rounded-xl text-center hover:border-white/40 hover:text-white transition-colors"
              >
                {webinar.thankYouSecondaryCtaLabel}
              </a>
            )}
          </div>
        )}

        {/* Divider */}
        <hr className="border-white/10" />

        <div className="grid md:grid-cols-2 gap-6">
          {/* Star rating */}
          {webinar.thankYouShowRating && (
            <div className="bg-pgd-purple-light rounded-xl p-6 text-center">
              <h3 className="text-white font-semibold mb-1">How was it?</h3>
              <p className="text-white/40 text-sm mb-4">Your honest rating helps others decide</p>

              {ratingSubmitted ? (
                <div className="space-y-2">
                  <div className="flex justify-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <svg key={s} className={`w-7 h-7 ${s <= rating ? 'text-pgd-yellow' : 'text-white/10'}`}
                        fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-pgd-yellow text-sm font-semibold">{STAR_LABELS[rating]}</p>
                  <p className="text-white/30 text-xs">Thanks for the feedback!</p>
                </div>
              ) : (
                <div>
                  <div className="flex justify-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <button
                        key={s}
                        onClick={() => submitRating(s)}
                        onMouseEnter={() => setHoveredRating(s)}
                        onMouseLeave={() => setHoveredRating(0)}
                        className="transition-transform hover:scale-110"
                      >
                        <svg className={`w-8 h-8 transition-colors ${s <= activeRating ? 'text-pgd-yellow' : 'text-white/20 hover:text-white/40'}`}
                          fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      </button>
                    ))}
                  </div>
                  {activeRating > 0 && (
                    <p className="text-white/50 text-xs">{STAR_LABELS[activeRating]}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Share */}
          {webinar.thankYouShowShare && (
            <div className="bg-pgd-purple-light rounded-xl p-6 text-center">
              <h3 className="text-white font-semibold mb-1">Know someone who'd benefit?</h3>
              <p className="text-white/40 text-sm mb-4">Share this webinar with them</p>

              <div className="flex gap-2 justify-center flex-wrap">
                {/* Copy link */}
                <button
                  onClick={copyShareLink}
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  {copied ? 'Copied!' : 'Copy link'}
                </button>

                {/* LinkedIn */}
                <a
                  href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-[#0077b5]/20 hover:bg-[#0077b5]/30 border border-[#0077b5]/30 text-[#0077b5] text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                  LinkedIn
                </a>

                {/* X / Twitter */}
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Just watched "${webinar.title}" — worth your time.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.746l7.73-8.835L1.254 2.25H8.08l4.259 5.631 5.905-5.631zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                  Post
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Subtle reply prompt */}
        <div className="text-center pb-4">
          <p className="text-white/30 text-sm">
            Hit reply to your confirmation email and tell me your biggest takeaway — I read every one.
          </p>
        </div>
      </main>
    </div>
  )
}
