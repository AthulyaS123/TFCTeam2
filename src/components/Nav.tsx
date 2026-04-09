'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/context/AuthContext'
import { useMarket } from '@/context/MarketContext'
import { usePriceFlash } from '@/hooks/usePriceFlash'
import { useTheme } from '@/context/ThemeContext'
import { IconSun, IconMoon } from './Icons'

export default function Nav() {
  const { user, logout } = useAuth()
  const { currentMarket: market, markets } = useMarket()
  const { theme, toggle } = useTheme()
  const pathname = usePathname()
  const router = useRouter()
  const flash = usePriceFlash(market?.price)

  async function handleLogout() {
    await logout()
    router.push('/auth/login')
  }

  const isActive = (path: string) =>
    pathname.startsWith(path)
      ? 'text-text border-b-2 border-green'
      : 'text-muted hover:text-text border-b-2 border-transparent'

  const flashClass = flash === 'up' ? 'price-flash-up' : flash === 'down' ? 'price-flash-down' : ''

  return (
    <nav className="border-b border-border bg-surface sticky top-0 z-50">
      <div className="max-w-screen-xl mx-auto px-6 h-12 flex items-center justify-between gap-6">

        {/* Logo */}
        <Link href="/" className="text-sm font-bold tracking-[0.2em] text-text shrink-0">
          TFC<span className="text-green" aria-hidden="true">·</span>
        </Link>

        {/* Nav links */}
        {user && (
          <div className="flex items-center gap-0">
            <Link href="/trading" className={`px-4 h-12 flex items-center text-xs font-medium tracking-wide transition-colors ${isActive('/trading')}`}>
              TRADE
            </Link>
            <Link href="/dashboard" className={`px-4 h-12 flex items-center text-xs font-medium tracking-wide transition-colors ${isActive('/dashboard')}`}>
              RISK MONITOR
            </Link>
            <Link href="/leaderboard" className={`px-4 h-12 flex items-center text-xs font-medium tracking-wide transition-colors ${isActive('/leaderboard')}`}>
              LEADERBOARD
            </Link>
          </div>
        )}

        {/* Live price ticker */}
        {market && (
          <div className="hidden md:flex items-center gap-4 flex-1 justify-center">
            <div className="flex items-center gap-3 bg-surface2 border border-border rounded px-4 py-1.5">
              <span className="text-xs text-muted font-medium">{market?.symbol ?? 'BTC'}/USD</span>
              <span
                className={`text-sm font-bold tabular-nums transition-colors rounded px-1 ${flashClass}`}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                {(market.price ?? 0) > 0
                  ? `$${(market.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : <span className="text-muted font-normal text-xs animate-pulse">Loading...</span>
                }
              </span>
              {(market.price ?? 0) > 0 && (
                <span className={`text-xs font-medium tabular-nums ${(market.change ?? 0) >= 0 ? 'text-green' : 'text-red'}`}
                  style={{ fontFamily: 'var(--font-mono)' }}>
                  {(market.change ?? 0) >= 0 ? '▲ +' : '▼ '}{Math.abs(market.change ?? 0).toFixed(2)}%
                </span>
              )}
              {market.halted && (
                <span className="text-xs font-bold text-red animate-pulse tracking-widest">HALTED</span>
              )}
            </div>
          </div>
        )}

        {/* User controls */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={toggle}
            className="w-7 h-7 flex items-center justify-center rounded text-muted hover:text-text hover:bg-surface2 transition-colors"
            aria-label="Toggle theme"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <IconSun size={15} /> : <IconMoon size={15} />}
          </button>
          {user ? (
            <>
              <span className="text-xs text-muted hidden sm:block">{user.username}</span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 text-xs text-muted border border-border rounded hover:border-border2 hover:text-text transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link href="/auth/login" className="px-3 py-1.5 text-xs text-muted hover:text-text transition-colors">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}
