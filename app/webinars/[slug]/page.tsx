export const dynamic = 'force-dynamic'

import { notFound } from 'next/navigation'
import { prisma } from '../../../lib/prisma'
import RegisterForm from './register-form'
import Link from 'next/link'

interface Props {
  params: Promise<{ slug: string }>
}

async function getWebinar(slug: string) {
  try {
    return await prisma.webinar.findUnique({
      where: { slug, status: 'PUBLISHED' },
    })
  } catch {
    return null
  }
}

export default async function WebinarPage({ params }: Props) {
  const { slug } = await params
  const webinar = await getWebinar(slug)

  if (!webinar) notFound()

  const isPaid = webinar.accessType === 'PAID'
  const isMembership = webinar.accessType === 'MEMBERSHIP'

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

      <div className="max-w-6xl mx-auto px-6 py-16 grid lg:grid-cols-[1fr_400px] gap-16 items-start">
        {/* Left — webinar details */}
        <div>
          {/* Thumbnail */}
          {webinar.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={webinar.thumbnailUrl}
              alt={webinar.title}
              className="w-full aspect-video object-cover rounded-2xl mb-8"
            />
          ) : (
            <div className="w-full aspect-video bg-pgd-purple-light rounded-2xl mb-8 flex items-center justify-center">
              <svg className="w-16 h-16 text-pgd-yellow/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 10l4.553-2.069A1 1 0 0121 8.876V15.124a1 1 0 01-1.447.894L15 14M3 8a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8z" />
              </svg>
            </div>
          )}

          <div className="flex items-center gap-3 mb-4">
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
              isPaid
                ? 'bg-pgd-yellow/20 text-pgd-yellow'
                : isMembership
                ? 'bg-pgd-blue/20 text-pgd-blue'
                : 'bg-pgd-green/20 text-pgd-green'
            }`}>
              {isPaid
                ? `£${(webinar.priceGbp / 100).toFixed(2)}`
                : isMembership
                ? 'Members only'
                : 'Free'}
            </span>
            {webinar.muxDurationSecs > 0 && (
              <span className="text-white/30 text-xs">
                {Math.round(webinar.muxDurationSecs / 60)} min
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-extrabold text-white leading-tight mb-4">
            {webinar.title}
          </h1>

          {webinar.subtitle && (
            <p className="text-white/60 text-lg mb-6">{webinar.subtitle}</p>
          )}

          {webinar.description && (
            <div
              className="prose prose-invert prose-sm max-w-none text-white/70"
              dangerouslySetInnerHTML={{ __html: webinar.description }}
            />
          )}
        </div>

        {/* Right — registration card */}
        <div className="lg:sticky lg:top-8">
          <RegisterForm
            webinarId={webinar.id}
            webinarTitle={webinar.title}
            accessType={webinar.accessType}
            priceGbp={webinar.priceGbp}
          />
        </div>
      </div>
    </div>
  )
}
