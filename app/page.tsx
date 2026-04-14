export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { prisma } from '../lib/prisma'

async function getPublishedWebinars() {
  try {
    return await prisma.webinar.findMany({
      where: { status: { in: ['PUBLISHED', 'LIVE'] } },
      orderBy: [{ status: 'desc' }, { publishedAt: 'desc' }],
    })
  } catch {
    return []
  }
}

const ACCESS_BADGE: Record<string, { label: string; cls: string }> = {
  FREE: { label: 'Free', cls: 'bg-pgd-green/20 text-pgd-green' },
  PAID: { label: 'Paid', cls: 'bg-pgd-yellow/20 text-pgd-yellow' },
  MEMBERSHIP: { label: 'Members', cls: 'bg-pgd-blue/20 text-pgd-blue' },
}

export default async function HomePage() {
  const webinars = await getPublishedWebinars()

  return (
    <div className="min-h-screen bg-pgd-purple">
      {/* Nav */}
      <header className="border-b border-white/10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="text-xl font-extrabold tracking-tight">
            <span className="text-pgd-yellow">PLAN.</span>
            <span className="text-pgd-green"> GROW.</span>
            <span className="text-pgd-blue"> DO.</span>
          </Link>
          <a
            href="https://plangrowdo.com"
            className="text-sm text-white/50 hover:text-white transition-colors"
          >
            Back to PGD →
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-6">
          Free Webinars to Help You{' '}
          <span className="text-pgd-yellow">Plan.</span>{' '}
          <span className="text-pgd-green"> Grow.</span>{' '}
          <span className="text-pgd-blue"> Do.</span>
        </h1>
        <p className="text-white/60 text-lg max-w-2xl mx-auto">
          Watch on-demand training from Robert Taylor — practical strategies for
          business owners who want real results.
        </p>
      </section>

      {/* Webinar grid */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        {webinars.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-white/40">No webinars published yet. Check back soon.</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {webinars.map((w) => {
              const badge = ACCESS_BADGE[w.accessType] ?? ACCESS_BADGE.FREE
              return (
                <Link
                  key={w.id}
                  href={w.status === 'LIVE' ? `/live/${w.slug}` : `/webinars/${w.slug}`}
                  className="group bg-pgd-purple-light rounded-xl overflow-hidden hover:ring-2 hover:ring-pgd-yellow transition-all"
                >
                  {/* Thumbnail */}
                  <div className="aspect-video bg-pgd-purple-dark relative">
                    {w.thumbnailUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={w.thumbnailUrl}
                        alt={w.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <svg
                          className="w-12 h-12 text-pgd-yellow/30"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M15 10l4.553-2.069A1 1 0 0121 8.876V15.124a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z"
                          />
                        </svg>
                      </div>
                    )}
                    {w.status === 'LIVE' && (
                      <span className="absolute top-3 left-3 text-xs font-bold px-2 py-0.5 rounded-full bg-red-500/90 text-white flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                        LIVE
                      </span>
                    )}
                    <span
                      className={`absolute top-3 right-3 text-xs font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </div>
                  {/* Info */}
                  <div className="p-5">
                    <h2 className="font-semibold text-white group-hover:text-pgd-yellow transition-colors line-clamp-2">
                      {w.title}
                    </h2>
                    {w.subtitle && (
                      <p className="text-white/50 text-sm mt-1 line-clamp-2">{w.subtitle}</p>
                    )}
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-pgd-yellow text-sm font-medium">
                        {w.accessType === 'PAID'
                          ? `£${(w.priceGbp / 100).toFixed(2)}`
                          : w.accessType === 'MEMBERSHIP'
                          ? 'Members only'
                          : 'Watch free →'}
                      </span>
                      {w.muxDurationSecs > 0 && (
                        <span className="text-white/30 text-xs">
                          {Math.round(w.muxDurationSecs / 60)} min
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </div>
  )
}
