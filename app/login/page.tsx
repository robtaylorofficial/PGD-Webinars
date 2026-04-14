'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError('Invalid email or password.')
    } else {
      router.push('/admin')
    }
  }

  return (
    <div className="min-h-screen bg-pgd-purple flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="text-2xl font-extrabold tracking-tight">
            <span className="text-pgd-yellow">PLAN.</span>
            <span className="text-pgd-green"> GROW.</span>
            <span className="text-pgd-blue"> DO.</span>
          </Link>
          <p className="text-white/40 text-sm mt-2">Admin portal</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-pgd-purple-light rounded-2xl p-8 space-y-5">
          <h1 className="text-xl font-bold text-white mb-2">Sign in</h1>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm text-white/60 mb-1.5">Email</label>
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
            <label className="block text-sm text-white/60 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full bg-pgd-purple border border-white/10 rounded-lg px-4 py-2.5 text-white text-sm placeholder-white/30 focus:outline-none focus:border-pgd-yellow"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-pgd-yellow text-pgd-purple font-bold py-3 rounded-lg text-sm hover:bg-pgd-yellow-dark transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
