export const dynamic = 'force-dynamic'

import { prisma } from '../../../lib/prisma'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ session_id?: string }>
}

async function getPurchase(sessionId: string) {
  try {
    return await prisma.purchase.findUnique({
      where: { stripeSessionId: sessionId },
      include: {
        // We need to find the registration separately via the webinar
      },
    })
  } catch {
    return null
  }
}

async function getRegistrationFromSession(sessionId: string) {
  try {
    const purchase = await prisma.purchase.findUnique({
      where: { stripeSessionId: sessionId },
    })
    if (!purchase?.webinarId) return null

    // Find webinar to get slug for watch link
    const webinar = await prisma.webinar.findUnique({
      where: { id: purchase.webinarId },
    })
    if (!webinar) return null

    const registration = await prisma.registration.findFirst({
      where: { webinarId: webinar.id, email: purchase.email },
    })

    return { webinar, registration }
  } catch {
    return null
  }
}

export default async function CheckoutSuccessPage({ searchParams }: Props) {
  const { session_id } = await searchParams
  const data = session_id ? await getRegistrationFromSession(session_id) : null

  return (
    <div className="min-h-screen bg-pgd-purple flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        {/* Logo */}
        <Link href="/" className="text-xl font-extrabold tracking-tight inline-block mb-10">
          <span className="text-pgd-yellow">PLAN.</span>
          <span className="text-pgd-green"> GROW.</span>
          <span className="text-pgd-blue"> DO.</span>
        </Link>

        <div className="w-20 h-20 bg-pgd-green/20 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-pgd-green" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-extrabold text-white mb-3">Payment successful!</h1>

        {data ? (
          <>
            <p className="text-white/60 mb-6">
              Your access to <span className="text-white font-medium">{data.webinar.title}</span> is
              confirmed. We have sent your watch link to your email.
            </p>
            {data.registration && (
              <Link
                href={`/watch/${data.webinar.slug}?token=${data.registration.accessToken}`}
                className="inline-block bg-pgd-yellow text-pgd-purple font-bold px-8 py-3 rounded-lg text-sm hover:bg-pgd-yellow-dark transition-colors"
              >
                Watch now →
              </Link>
            )}
          </>
        ) : (
          <p className="text-white/60 mb-6">
            Thank you for your purchase. Check your email for your access link.
          </p>
        )}

        <div className="mt-8">
          <Link href="/" className="text-white/30 text-sm hover:text-white transition-colors">
            ← Browse all webinars
          </Link>
        </div>
      </div>
    </div>
  )
}
