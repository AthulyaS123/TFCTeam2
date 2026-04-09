'use client'

import { useMarket } from '@/context/MarketContext'
import { usePriceFlash } from '@/hooks/usePriceFlash'
import RegimeBadge from './RegimeBadge'
import PriceChart from './PriceChart'

function fmtPrice(n: number | null | undefined): string {
  const v = n ?? 0
  if (v <= 0) return 'Loading...'
  return '$' + v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function fmtDelta(n: number): string {
  return (n >= 0 ? '+$' : '-$') + Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function PriceTicker() {
  const { currentMarket: market, connected } = useMarket()
  const flash = usePriceFlash(market?.price)

  if (!market) {
    return (
      <div className="bg-surface border border-border rounded-lg p-4 animate-pulse space-y-3">
        <div className="h-5 w-32 bg-surface3 rounded" />
        <div className="h-10 w-56 bg-surface3 rounded" />
        <div className="h-24 bg-surface3 rounded mt-2" />
      </div>
    )
  }

  const change = market.change ?? 0
  const isUp = change >= 0
  const flashClass = flash === 'up' ? 'price-flash-up' : flash === 'down' ? 'price-flash-down' : ''

  // Session stats from history
  const prices = market.history.map((p) => p.price).filter((p) => p != null)
  const sessionHigh = prices.length ? Math.max(...prices) : market.price ?? 0
  const sessionLow  = prices.length ? Math.min(...prices) : market.price ?? 0
  const sessionVol  = market.history.reduce((s, p) => s + p.volume, 0)

  const changeAbs = market.price - (prices[0] ?? market.price)

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-surface2">
        <span className="text-xs font-semibold text-muted tracking-widest">{market.symbol} / USD</span>
        <RegimeBadge regime={market.regime} />
        {!connected && (
          <span className="text-[10px] font-bold text-amber border border-amber-border bg-amber-bg px-2 py-0.5 rounded tracking-widest">
            RECONNECTING
          </span>
        )}
      </div>

      <div className="px-4 pt-3 pb-1">
        <div className="flex items-end justify-between">
          {/* Price */}
          <div>
            <div
              className={`text-4xl font-bold tracking-tight rounded px-1 -ml-1 transition-colors ${flashClass}`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {fmtPrice(market.price)}
            </div>
            {market.price > 0 && (
              <div className={`flex items-center gap-2 mt-1 text-sm font-medium ${isUp ? 'text-green' : 'text-red'}`}
                style={{ fontFamily: 'var(--font-mono)' }}>
                <span>{isUp ? '▲' : '▼'}</span>
                <span>{fmtDelta(changeAbs)}</span>
                <span className="text-muted font-normal">|</span>
                <span>{isUp ? '+' : ''}{change.toFixed(2)}%</span>
              </div>
            )}
          </div>

          {/* Session stats */}
          <div className="grid grid-cols-3 gap-x-6 text-right">
            {[
              { label: 'Session High', value: `$${sessionHigh.toLocaleString('en-US', { maximumFractionDigits: 0 })}`, color: 'text-green' },
              { label: 'Session Low',  value: `$${sessionLow.toLocaleString('en-US', { maximumFractionDigits: 0 })}`,  color: 'text-red' },
              { label: 'Volume',       value: sessionVol.toLocaleString('en-US', { maximumFractionDigits: 0 }),          color: 'text-text' },
            ].map(({ label, value, color }) => (
              <div key={label}>
                <p className="text-[10px] text-muted uppercase tracking-wider">{label}</p>
                <p className={`text-sm font-semibold ${color}`} style={{ fontFamily: 'var(--font-mono)' }}>{value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="px-0 pt-1">
        <PriceChart history={market.history} height={100} showLabels />
      </div>
    </div>
  )
}
