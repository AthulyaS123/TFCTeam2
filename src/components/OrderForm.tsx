'use client'

import { useState, FormEvent, useEffect } from 'react'
import { useMarket } from '@/context/MarketContext'
import { COINS } from '@/lib/market'

const COMMISSION = 0.0025  // 0.25%

interface Props {
  onTrade: (portfolio: { balance: number; holdings: Record<string, number> }) => void
  balance: number
  holdings: Record<string, number>
}

export default function OrderForm({ onTrade, balance, holdings }: Props) {
  const { markets, selectedSymbol, setSelectedSymbol } = useMarket()
  const market = markets[selectedSymbol]

  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [usdInput, setUsdInput] = useState('')
  const [coinInput, setCoinInput] = useState('')
  const [lastChanged, setLastChanged] = useState<'usd' | 'coin'>('usd')
  const [error, setError] = useState('')
  const [flash, setFlash] = useState<'ok' | 'err' | null>(null)
  const [loading, setLoading] = useState(false)

  const halted = market?.halted ?? false
  const price = market?.price ?? 0

  function handleUsdChange(val: string) {
    setUsdInput(val)
    setLastChanged('usd')
    const n = parseFloat(val)
    if (n > 0 && price > 0) setCoinInput((n / price).toFixed(6))
    else setCoinInput('')
  }

  function handleCoinChange(val: string) {
    setCoinInput(val)
    setLastChanged('coin')
    const n = parseFloat(val)
    if (n > 0 && price > 0) setUsdInput((n * price).toFixed(2))
    else setUsdInput('')
  }

  function applyPct(pct: number) {
    if (!price) return
    if (side === 'buy') handleUsdChange((balance * pct).toFixed(2))
    else handleCoinChange(((holdings[selectedSymbol] ?? 0) * pct).toFixed(6))
  }

  // Re-sync coin field when price ticks
  useEffect(() => {
    if (lastChanged === 'usd' && usdInput && price > 0) {
      setCoinInput((parseFloat(usdInput) / price).toFixed(6))
    }
  }, [price]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset inputs when switching coins
  useEffect(() => {
    setUsdInput('')
    setCoinInput('')
    setError('')
  }, [selectedSymbol])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    const usdAmount = parseFloat(usdInput)
    if (!usdAmount || usdAmount < 1) { setError('Minimum order: $1'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol: selectedSymbol, side, usdAmount }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      setUsdInput('')
      setCoinInput('')
      setFlash('ok')
      setTimeout(() => setFlash(null), 1500)
      onTrade(data.portfolio)
    } catch {
      setFlash('err')
      setError('Order failed. Try again.')
      setTimeout(() => setFlash(null), 1500)
    } finally {
      setLoading(false)
    }
  }

  const usdNum = parseFloat(usdInput) || 0
  const fee = usdNum * COMMISSION
  const totalCost = side === 'buy' ? usdNum + fee : usdNum - fee
  const heldQty = holdings[selectedSymbol] ?? 0

  const decimals = price < 1 ? 4 : 2

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      {/* Coin selector */}
      <div className="border-b border-border overflow-x-auto">
        <div className="flex min-w-max">
          {COINS.map((coin) => {
            const m = markets[coin.symbol]
            const isSelected = coin.symbol === selectedSymbol
            const change = m?.change ?? 0
            return (
              <button
                key={coin.symbol}
                onClick={() => setSelectedSymbol(coin.symbol)}
                className={`px-3 py-2.5 text-xs font-medium border-b-2 transition-colors shrink-0 ${
                  isSelected
                    ? 'border-green text-text bg-surface2'
                    : 'border-transparent text-muted hover:text-text hover:bg-surface2'
                }`}
              >
                <span className="font-bold">{coin.symbol}</span>
                {m && (
                  <span className={`ml-1.5 text-[10px] ${change >= 0 ? 'text-green' : 'text-red'}`}
                    style={{ fontFamily: 'var(--font-mono)' }}>
                    {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Price header */}
      <div className="px-4 py-2.5 border-b border-border bg-surface2 flex items-center justify-between">
        <span className="text-xs text-muted">{selectedSymbol}/USD</span>
        <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-mono)' }}>
          {price > 0
            ? `$${price.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`
            : <span className="text-muted font-normal text-xs animate-pulse">Loading...</span>
          }
        </span>
      </div>

      {/* Halt banner */}
      {halted && (
        <div className="px-4 py-2.5 bg-red-bg border-b border-red-border flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-red animate-pulse shrink-0" />
          <div>
            <p className="text-[10px] font-bold text-red tracking-wider">TRADING HALTED</p>
            <p className="text-[10px] text-red/60">{market?.haltReason}</p>
          </div>
        </div>
      )}

      <div className="p-4">
        {/* Buy/Sell toggle */}
        <div className="flex rounded overflow-hidden border border-border mb-4">
          <button type="button"
            onClick={() => { setSide('buy'); setUsdInput(''); setCoinInput(''); setError('') }}
            className={`flex-1 py-2.5 text-xs font-bold tracking-widest transition-colors ${
              side === 'buy' ? 'bg-green text-bg' : 'text-muted hover:text-green hover:bg-green-bg'
            }`}
          >BUY</button>
          <button type="button"
            onClick={() => { setSide('sell'); setUsdInput(''); setCoinInput(''); setError('') }}
            className={`flex-1 py-2.5 text-xs font-bold tracking-widest transition-colors ${
              side === 'sell' ? 'bg-red text-white' : 'text-muted hover:text-red hover:bg-red-bg'
            }`}
          >SELL</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Coin amount */}
          <div>
            <label className="flex justify-between text-[10px] text-muted uppercase tracking-wider mb-1.5">
              <span>Amount</span><span>{selectedSymbol}</span>
            </label>
            <input type="number" value={coinInput} onChange={(e) => handleCoinChange(e.target.value)}
              className="w-full bg-surface2 border border-border rounded px-3 py-2.5 text-sm font-medium text-text placeholder:text-dim focus:outline-none focus:border-border2"
              style={{ fontFamily: 'var(--font-mono)' }}
              placeholder="0.000000" step="any" min="0" disabled={halted || loading}
            />
          </div>

          {/* USD total */}
          <div>
            <label className="flex justify-between text-[10px] text-muted uppercase tracking-wider mb-1.5">
              <span>Total</span><span>USD</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">$</span>
              <input type="number" value={usdInput} onChange={(e) => handleUsdChange(e.target.value)}
                className="w-full bg-surface2 border border-border rounded pl-6 pr-3 py-2.5 text-sm font-medium text-text placeholder:text-dim focus:outline-none focus:border-border2"
                style={{ fontFamily: 'var(--font-mono)' }}
                placeholder="0.00" step="any" min="0" disabled={halted || loading}
              />
            </div>
          </div>

          {/* % buttons */}
          <div className="grid grid-cols-4 gap-1.5">
            {[0.25, 0.5, 0.75, 1].map((pct) => (
              <button key={pct} type="button" onClick={() => applyPct(pct)}
                disabled={halted || loading}
                className="py-1.5 text-[10px] text-muted border border-border rounded hover:border-border2 hover:text-text transition-colors disabled:opacity-30"
              >{pct * 100}%</button>
            ))}
          </div>

          {/* Available + fee */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-muted">Available</span>
              <span style={{ fontFamily: 'var(--font-mono)' }}>
                {side === 'buy'
                  ? `$${balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  : `${heldQty.toFixed(6)} ${selectedSymbol}`}
              </span>
            </div>
            {usdNum > 0 && (
              <div className="flex justify-between text-muted">
                <span>Commission (0.25%)</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>−${fee.toFixed(2)}</span>
              </div>
            )}
            {usdNum > 0 && (
              <div className="flex justify-between font-semibold border-t border-border pt-1">
                <span className="text-muted">{side === 'buy' ? 'Total cost' : 'You receive'}</span>
                <span style={{ fontFamily: 'var(--font-mono)' }}>
                  ${totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {error && (
            <p className="text-[11px] text-red bg-red-bg border border-red-border rounded px-3 py-2">{error}</p>
          )}

          <button type="submit"
            disabled={halted || loading || (!usdInput && !coinInput)}
            className={`w-full py-3 rounded text-xs font-bold tracking-widest transition-all disabled:opacity-30 ${
              flash === 'ok' ? 'bg-green/80 text-bg' :
              flash === 'err' ? 'bg-red/80 text-white' :
              side === 'buy' ? 'bg-green text-bg hover:bg-green-dim' : 'bg-red text-white hover:bg-red-dim'
            }`}
          >
            {loading ? 'EXECUTING...' :
             flash === 'ok' ? 'ORDER FILLED' :
             flash === 'err' ? 'ORDER FAILED' :
             halted ? 'TRADING HALTED' :
             `${side === 'buy' ? 'BUY' : 'SELL'} ${selectedSymbol}`}
          </button>
        </form>
      </div>
    </div>
  )
}
