'use client'

import type { Trade } from '@/lib/types'

interface Props {
  trades: Trade[]
}

export default function TradeHistory({ trades }: Props) {
  const sorted = [...trades].reverse()

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-surface2 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted uppercase tracking-widest">Order History</span>
        <span className="text-[10px] text-muted">{trades.length} orders</span>
      </div>

      {sorted.length === 0 ? (
        <div className="py-12 text-center text-muted text-xs">No orders yet</div>
      ) : (
        <div className="overflow-y-auto max-h-64">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-border">
                {['Time', 'Pair', 'Side', 'Price', 'Amount', 'Total', 'Fee'].map((h) => (
                  <th key={h} className="px-4 py-2 text-left text-[10px] text-muted font-medium uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.id} className="border-b border-border/30 hover:bg-surface2 transition-colors">
                  <td className="px-3 py-2.5 text-muted tabular-nums text-[11px]" style={{ fontFamily: 'var(--font-mono)' }}>
                    {new Date(t.t).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="px-3 py-2.5 font-bold text-[11px]" style={{ fontFamily: 'var(--font-mono)' }}>
                    {(t.symbol ?? 'BTC')}/USD
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      t.side === 'buy' ? 'bg-green-bg text-green' : 'bg-red-bg text-red'
                    }`}>
                      {t.side.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-[11px]" style={{ fontFamily: 'var(--font-mono)' }}>
                    ${t.price.toLocaleString('en-US', { maximumFractionDigits: 4 })}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-[11px]" style={{ fontFamily: 'var(--font-mono)' }}>
                    {(t.coinAmount ?? 0).toFixed(6)}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums font-medium text-[11px]" style={{ fontFamily: 'var(--font-mono)' }}>
                    ${t.usdAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-2.5 tabular-nums text-[11px] text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                    ${((t.fee ?? 0)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
