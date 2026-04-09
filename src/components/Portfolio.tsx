'use client'

import { useMarket } from '@/context/MarketContext'
import { COIN_MAP } from '@/lib/market'

interface PortfolioData {
  balance: number
  holdings: Record<string, number>
  costBasis: Record<string, number>
  totalFeesPaid: number
}

interface Props {
  data: PortfolioData | null
}

const INITIAL = 100_000

function pnlCls(n: number) {
  return n > 0 ? 'text-green' : n < 0 ? 'text-red' : 'text-muted'
}

function fmtUsd(n: number, sign = false) {
  const abs = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  if (sign) return (n >= 0 ? '+$' : '-$') + abs
  return '$' + abs
}

export default function Portfolio({ data }: Props) {
  const { markets, setSelectedSymbol } = useMarket()
  // Live prices from the shared MarketContext — updates every 3s
  const prices: Record<string, number> = {}
  for (const [sym, m] of Object.entries(markets)) prices[sym] = m.price

  if (!data) {
    return (
      <div className="bg-surface border border-border rounded-lg p-4 animate-pulse space-y-3">
        <div className="h-4 w-28 bg-surface3 rounded" />
        {[1, 2, 3].map((i) => <div key={i} className="h-10 bg-surface3 rounded" />)}
      </div>
    )
  }

  const holdingsValue = Object.entries(data.holdings).reduce(
    (sum, [sym, qty]) => sum + qty * (prices[sym] ?? 0), 0
  )
  const totalValue = data.balance + holdingsValue
  const totalPnl = totalValue - INITIAL
  const totalPnlPct = (totalPnl / INITIAL) * 100

  const activeHoldings = Object.entries(data.holdings).filter(([, qty]) => qty > 1e-10)

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-surface2 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted uppercase tracking-widest">Portfolio</span>
        {data.totalFeesPaid > 0 && (
          <span className="text-[10px] text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
            Fees paid: ${data.totalFeesPaid.toFixed(2)}
          </span>
        )}
      </div>

      {/* Equity summary */}
      <div className="px-4 py-4 border-b border-border">
        <p className="text-[10px] text-muted uppercase tracking-wider mb-1">Total Equity</p>
        <p className="text-3xl font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
          {fmtUsd(totalValue)}
        </p>
        <div className={`flex items-center gap-2 mt-1 text-sm font-medium ${pnlCls(totalPnl)}`}>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{fmtUsd(totalPnl, true)}</span>
          <span className="text-muted">·</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{totalPnlPct >= 0 ? '+' : ''}{totalPnlPct.toFixed(2)}%</span>
          <span className="text-[10px] text-muted font-normal">all time</span>
        </div>
      </div>

      {/* Asset table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-border">
              {['Asset', 'Holdings', 'Avg Cost', 'Price', 'P&L'].map((h) => (
                <th key={h} className="px-3 py-2 text-left text-[10px] text-muted font-medium uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* USD */}
            <tr className="border-b border-border/50 hover:bg-surface2 transition-colors">
              <td className="px-3 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-blue/20 flex items-center justify-center text-[10px] font-bold text-blue shrink-0">$</div>
                  <span className="font-semibold">USD</span>
                </div>
              </td>
              <td className="px-3 py-3 font-medium" style={{ fontFamily: 'var(--font-mono)' }}>{fmtUsd(data.balance)}</td>
              <td className="px-3 py-3 text-muted">—</td>
              <td className="px-3 py-3 text-muted">—</td>
              <td className="px-3 py-3 text-muted">—</td>
            </tr>

            {/* Coin holdings */}
            {activeHoldings.map(([sym, qty]) => {
              const coin = COIN_MAP[sym]
              const currentPrice = prices[sym] ?? 0
              const avgCost = data.costBasis[sym] ?? 0
              const value = qty * currentPrice
              const pnl = (currentPrice - avgCost) * qty
              const pnlPct = avgCost > 0 ? ((currentPrice - avgCost) / avgCost) * 100 : 0
              const decimals = currentPrice < 1 ? 4 : 2

              return (
                <tr key={sym}
                  className="border-b border-border/30 hover:bg-surface2 transition-colors cursor-pointer"
                  onClick={() => setSelectedSymbol(sym)}
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: (coin?.color ?? '#888') + '22', color: coin?.color ?? '#888' }}>
                        {sym.slice(0, 1)}
                      </div>
                      <div>
                        <p className="font-semibold">{sym}</p>
                        <p className="text-[10px] text-muted">{coin?.name}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3" style={{ fontFamily: 'var(--font-mono)' }}>
                    <p className="font-medium">{qty.toFixed(6)}</p>
                    <p className="text-[10px] text-muted">{fmtUsd(value)}</p>
                  </td>
                  <td className="px-3 py-3 text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                    {avgCost > 0
                      ? `$${avgCost.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
                      : '—'}
                  </td>
                  <td className="px-3 py-3 font-medium" style={{ fontFamily: 'var(--font-mono)' }}>
                    ${currentPrice.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
                  </td>
                  <td className="px-3 py-3">
                    <div className={pnlCls(pnl)} style={{ fontFamily: 'var(--font-mono)' }}>
                      <p className="font-semibold text-[11px]">{fmtUsd(pnl, true)}</p>
                      <p className="text-[10px]">{pnlPct >= 0 ? '+' : ''}{pnlPct.toFixed(2)}%</p>
                    </div>
                  </td>
                </tr>
              )
            })}

            {activeHoldings.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-xs text-muted">No coin holdings yet</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
