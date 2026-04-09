'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/context/AuthContext'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { refresh } = useAuth()

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      await refresh()
      router.push('/trading')
    } catch {
      setError('Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-3rem)] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          <p className="text-2xl font-bold tracking-[0.2em]">TFC<span className="text-green">•</span></p>
          <p className="text-xs text-muted mt-2 tracking-widest uppercase">Trading Simulator</p>
        </div>

        <div className="bg-surface border border-border rounded-lg p-6">
          <h1 className="text-sm font-semibold text-text mb-1">Create account</h1>
          <p className="text-xs text-muted mb-5">Start with $100,000 simulated balance</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] text-muted uppercase tracking-widest mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-surface2 border border-border rounded px-3 py-2.5 text-sm text-text placeholder:text-dim focus:outline-none focus:border-border2 transition-colors"
                placeholder="satoshi"
                minLength={3}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="block text-[10px] text-muted uppercase tracking-widest mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface2 border border-border rounded px-3 py-2.5 text-sm text-text placeholder:text-dim focus:outline-none focus:border-border2 transition-colors"
                placeholder="min. 6 characters"
                minLength={6}
                required
              />
            </div>

            {error && (
              <p className="text-xs text-red bg-red-bg border border-red-border rounded px-3 py-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green text-bg font-bold py-2.5 rounded text-xs tracking-widest hover:bg-green-dim transition-colors disabled:opacity-50 mt-2"
            >
              {loading ? 'CREATING ACCOUNT...' : 'CREATE ACCOUNT'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-muted mt-4">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-green hover:text-green-dim transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
