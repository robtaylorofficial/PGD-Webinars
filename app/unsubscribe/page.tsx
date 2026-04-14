export const dynamic = 'force-dynamic'

import { prisma } from '../../lib/prisma'
import Link from 'next/link'

interface Props {
  searchParams: Promise<{ token?: string }>
}

export default async function UnsubscribePage({ searchParams }: Props) {
  const { token } = await searchParams
  let unsubscribed = false

  if (token) {
    try {
      await prisma.registration.update({
        where: { accessToken: token },
        data: { emailPausedUntil: new Date('2099-01-01') },
      })
      unsubscribed = true
    } catch {
      // Token not found — show generic message
    }
  }

  return (
    <div className="min-h-screen bg-pgd-purple flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <Link href="/" className="text-xl font-extrabold tracking-tight inline-block mb-10">
          <span className="text-pgd-yellow">PLAN.</span>
          <span className="text-pgd-green"> GROW.</span>
          <span className="text-pgd-blue"> DO.</span>
        </Link>

        <h1 className="text-xl font-bold text-white mb-3">
          {unsubscribed ? 'You have been unsubscribed' : 'Unsubscribe'}
        </h1>
        <p className="text-white/50 text-sm mb-8">
          {unsubscribed
            ? 'We will not send you any more emails about this webinar. You can still access your content using the original link.'
            : 'Link not recognised. You may already be unsubscribed.'}
        </p>

        <Link href="/" className="text-white/30 text-sm hover:text-white transition-colors">
          ← Back to Plan Grow Do
        </Link>
      </div>
    </div>
  )
}
