import Link from 'next/link'

export default function CheckoutCancelledPage() {
  return (
    <div className="min-h-screen bg-pgd-purple flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <Link href="/" className="text-xl font-extrabold tracking-tight inline-block mb-10">
          <span className="text-pgd-yellow">PLAN.</span>
          <span className="text-pgd-green"> GROW.</span>
          <span className="text-pgd-blue"> DO.</span>
        </Link>

        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-8 h-8 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-white mb-2">Payment cancelled</h1>
        <p className="text-white/50 text-sm mb-8">
          No worries — you were not charged. Head back to try again whenever you are ready.
        </p>

        <Link
          href="/"
          className="inline-block bg-pgd-yellow text-pgd-purple font-bold px-6 py-3 rounded-lg text-sm hover:bg-pgd-yellow-dark transition-colors"
        >
          ← Back to webinars
        </Link>
      </div>
    </div>
  )
}
