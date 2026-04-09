'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/context/AuthContext'
import type { LeaderboardEntry } from '@/lib/types'

const INITIAL = 100_000

const RANK_STYLES: Record<number, string> = {
  1: 'text-[#FFD700] border-[#FFD700]/40 bg-[#FFD700]/10',
  2: 'text-[#C0C0C0] border-[#C0C0C0]/40 bg-[#C0C0C0]/10',
  3: 'text-[#CD7F32] border-[#CD7F32]/40 bg-[#CD7F32]/10',
}

export default function LeaderboardPage() {
  const { user } = useAuth()
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard')
      if (res.ok) {
        const data = await res.json()
        setEntries(data.entries ?? [])
      }
    } catch { /* silent */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    load()
    const id = setInterval(load, 15_000)
    return () => clearInterval(id)
  }, [load])

  const myRank = user ? entries.findIndex((e) => e.userId === user.userId) + 1 : 0

  return (
    <div className="max-w-screen-md mx-auto px-4 py-6">

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="text-muted text-sm mt-1">Top traders by portfolio value · Updates every 15s</p>
      </div>

      {/* My rank card (if logged in and on board) */}
      {user && myRank > 0 && (
        <div className="bg-green-bg border border-green-border rounded-lg px-4 py-3 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-green">YOUR RANK</span>
            <span className="text-2xl font-bold" style={{ fontFamily: 'var(--font-mono)' }}>#{myRank}</span>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted">Portfolio value</p>
            <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
              ${(entries[myRank - 1]?.totalValue ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface border border-border rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-surface2 flex items-center justify-between">
          <span className="text-xs font-semibold text-muted uppercase tracking-widest">Rankings</span>
          <span className="text-[10px] text-muted">{entries.length} traders</span>
        </div>

        {loading ? (
          <div className="p-8 text-center text-muted text-sm animate-pulse">Loading rankings...</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-muted text-sm">No traders on the board yet.</p>
            <p className="text-muted text-xs mt-1">Make your first trade to appear here.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {['Rank', 'Trader', 'Portfolio Value', 'All-Time P&L', 'Last Trade'].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-[10px] text-muted font-medium uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry, idx) => {
                const rank = idx + 1
                const isMe = user?.userId === entry.userId
                const pnlPct = (entry.totalPnl / INITIAL) * 100
                const isUp = entry.totalPnl >= 0

                return (
                  <tr
                    key={entry.userId}
                    className={`border-b border-border/30 transition-colors ${isMe ? 'bg-green-bg' : 'hover:bg-surface2'}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {RANK_STYLES[rank] ? (
                          <span className={`inline-flex items-center justify-center w-7 h-7 rounded border text-[11px] font-bold ${RANK_STYLES[rank]}`}
                            style={{ fontFamily: 'var(--font-mono)' }}>
                            #{rank}
                          </span>
                        ) : (
                          <span className="text-sm text-muted font-bold w-6 text-center" style={{ fontFamily: 'var(--font-mono)' }}>
                            {rank}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold text-sm ${isMe ? 'text-green' : ''}`}>
                        {entry.username}
                        {isMe && <span className="ml-2 text-[10px] text-green font-bold bg-green-bg border border-green-border rounded px-1.5 py-0.5">YOU</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
                      ${entry.totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className={`px-4 py-3 font-semibold ${isUp ? 'text-green' : 'text-red'}`} style={{ fontFamily: 'var(--font-mono)' }}>
                      <div>{isUp ? '+' : ''}${Math.abs(entry.totalPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                      <div className="text-[10px]">{isUp ? '+' : ''}{pnlPct.toFixed(2)}%</div>
                    </td>
                    <td className="px-4 py-3 text-muted text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
                      {new Date(entry.lastUpdated).toLocaleTimeString()}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <p className="text-center text-xs text-muted mt-4">Rankings update after each trade. Portfolio values reflect last trade price.</p>
    </div>
  )
}
