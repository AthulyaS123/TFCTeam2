'use client'

import { useState, useEffect, useRef } from 'react'
import AuthGuard from '@/components/AuthGuard'
import { useMarket } from '@/context/MarketContext'
import RegimeBadge from '@/components/RegimeBadge'
import PriceChart from '@/components/PriceChart'
import EventLog from '@/components/EventLog'

type Status = 'normal' | 'warning' | 'critical'

function statusColor(s: Status) {
  return s === 'critical' ? 'text-red' : s === 'warning' ? 'text-amber' : 'text-green'
}
function statusDot(s: Status) {
  return s === 'critical' ? 'bg-red animate-pulse' : s === 'warning' ? 'bg-amber' : 'bg-green'
}
function statusLabel(s: Status) {
  return s === 'critical' ? 'CRITICAL' : s === 'warning' ? 'WARNING' : 'NORMAL'
}

function MetricCard({
  label, value, sub, status, bar,
}: {
  label: string
  value: string
  sub?: string
  status: Status
  bar?: number  // 0–100
}) {
  const barColor = status === 'critical' ? 'bg-red' : status === 'warning' ? 'bg-amber' : 'bg-green'
  return (
    <div className={`bg-surface border rounded-lg p-4 ${
      status === 'critical' ? 'border-red-border alert-critical-pulse' :
      status === 'warning'  ? 'border-amber-border' :
      'border-border'
    }`}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] text-muted uppercase tracking-widest">{label}</p>
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${statusDot(status)}`} />
          <span className={`text-[10px] font-bold ${statusColor(status)}`}>{statusLabel(status)}</span>
        </div>
      </div>
      <p className={`text-2xl font-bold ${statusColor(status)}`} style={{ fontFamily: 'var(--font-mono)' }}>
        {value}
      </p>
      {sub && <p className="text-[11px] text-muted mt-1">{sub}</p>}
      {bar !== undefined && (
        <div className="mt-3 h-1 bg-surface3 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${Math.min(bar, 100)}%` }}
          />
        </div>
      )}
    </div>
  )
}

function RiskGauge({ label, value, thresholds, format }: {
  label: string
  value: number | null
  thresholds: [number, number, number]
  format: (v: number) => string
}) {
  const [, warn, crit] = thresholds
  const status: Status = value === null ? 'normal'
    : value >= crit ? 'critical'
    : value >= warn ? 'warning'
    : 'normal'
  const pct = value !== null ? Math.min((value / crit) * 100, 100) : 0
  const barColor = status === 'critical' ? 'bg-red' : status === 'warning' ? 'bg-amber' : 'bg-green'

  return (
    <div className="py-3 border-b border-border last:border-0">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs text-muted">{label}</span>
        <span className={`text-xs font-bold ${statusColor(status)}`} style={{ fontFamily: 'var(--font-mono)' }}>
          {value !== null ? format(value) : '—'}
        </span>
      </div>
      <div className="h-1.5 bg-surface3 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// Volatility interpretation text for the card subtitle
function volSubtitle(vol: number | null, warmingUp: boolean): string {
  if (warmingUp) return 'Initializing baseline...'
  if (vol === null) return 'annualized realized vol'
  if (vol > 2.0) return 'Extreme — circuit breaker risk'
  if (vol > 1.0) return 'High — unusual activity'
  if (vol > 0.5) return 'Elevated — monitor closely'
  return 'Low — normal market conditions'
}

export default function DashboardPage() {
  const { currentMarket: market } = useMarket()

  const isWarmingUp = market?.warmingUp ?? false

  const safeVol = (!isWarmingUp && Number.isFinite(market?.volatility) && !Number.isNaN(market?.volatility))
    ? market!.volatility : null

  const volStatus: Status = isWarmingUp || safeVol === null ? 'normal'
    : safeVol > 2.0 ? 'critical'
    : safeVol > 1.2 ? 'warning'
    : 'normal'

  const changeAbs = Math.abs(market?.change ?? 0)
  const changeStatus: Status = isWarmingUp ? 'normal'
    : changeAbs > 20 ? 'critical' : changeAbs > 10 ? 'warning' : 'normal'

  // Raw activity signal from vol + regime; capped so it never exceeds 100
  const rawActivity = !market || isWarmingUp ? 0 : Math.min(100, Math.round(
    ((safeVol ?? 0) / 3.0) * 60 +
    (market.regime === 'crash' || market.regime === 'pump' ? 40 : market.regime === 'volatile' ? 25 : 0)
  ))

  // Decaying displayed score: spikes instantly on new anomalies, decays 5pts/30s when quiet
  const rawActivityRef = useRef(0)
  rawActivityRef.current = rawActivity
  const [activityScore, setActivityScore] = useState(0)

  useEffect(() => {
    setActivityScore((prev) => rawActivity > prev ? rawActivity : prev)
  }, [rawActivity])

  useEffect(() => {
    const id = setInterval(() => {
      setActivityScore((prev) => Math.max(rawActivityRef.current, prev - 5))
    }, 30_000)
    return () => clearInterval(id)
  }, [])

  const activityStatus: Status = isWarmingUp ? 'normal'
    : activityScore > 70 ? 'critical' : activityScore > 40 ? 'warning' : 'normal'

  // Liquidity: inversely proportional to vol, capped at vol=3.0 so it never hits 0
  // Normal BTC vol (~0.45) → ~89%. Extreme vol (3.0+) → ~30% floor.
  const volForLiquidity = isWarmingUp ? 0 : Math.min(safeVol ?? 0, 3.0)
  const liquidityPct = market
    ? Math.max(10, Math.round(100 - (volForLiquidity / 3.0) * 70))
    : 90
  const liquidityStatus: Status = isWarmingUp ? 'normal'
    : liquidityPct < 30 ? 'critical' : liquidityPct < 60 ? 'warning' : 'normal'

  const priceDisplay = market && market.price > 0
    ? `$${market.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—'

  return (
    <AuthGuard>
      {/* Full-width halt banner */}
      {market?.halted && (
        <div className="bg-red/10 border-b border-red flex items-center gap-4 px-6 py-3">
          <span className="w-2 h-2 rounded-full bg-red animate-pulse shrink-0" />
          <div className="flex-1">
            <span className="text-red font-bold text-sm tracking-wider">MARKET HALTED</span>
            <span className="text-red/70 text-xs ml-3">{market.haltReason}</span>
          </div>
          <span className="text-red/50 text-xs" style={{ fontFamily: 'var(--font-mono)' }}>
            {market.lastUpdatedAt ? new Date(market.lastUpdatedAt).toLocaleTimeString() : ''}
          </span>
        </div>
      )}

      <div className="max-w-screen-xl mx-auto px-4 py-4 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Risk Monitor</h1>
            <p className="text-xs text-muted mt-0.5">Exchange-level market surveillance · BTC/USD</p>
          </div>
          {market && (
            <div className="flex items-center gap-2">
              <RegimeBadge regime={market.regime} />
              <span className="text-[10px] text-muted" style={{ fontFamily: 'var(--font-mono)' }}>
                Last update: {new Date(market.lastUpdatedAt).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricCard
            label={`${market?.symbol ?? 'BTC'} Price`}
            value={priceDisplay}
            sub={isWarmingUp ? 'Initializing baseline...' : `${(market?.change ?? 0) >= 0 ? '▲' : '▼'} ${changeAbs.toFixed(2)}% session`}
            status={changeStatus}
          />
          <MetricCard
            label="Volatility"
            value={isWarmingUp ? '—' : safeVol !== null ? `${(safeVol * 100).toFixed(1)}%` : '—'}
            sub={volSubtitle(safeVol, isWarmingUp)}
            status={volStatus}
            bar={isWarmingUp ? 0 : safeVol !== null ? Math.min((safeVol / 3.0) * 100, 100) : 0}
          />
          <MetricCard
            label="Abnormal Activity"
            value={isWarmingUp ? '0/100' : `${activityScore}/100`}
            sub={isWarmingUp ? 'Initializing baseline...' : activityScore > 70 ? 'Unusual patterns detected' : activityScore > 40 ? 'Elevated signal' : 'Within normal range'}
            status={activityStatus}
            bar={isWarmingUp ? 0 : activityScore}
          />
          <MetricCard
            label="Liquidity"
            value={`${liquidityPct}%`}
            sub={isWarmingUp ? 'Initializing baseline...' : liquidityPct < 30 ? 'Severe stress — wide spreads' : liquidityPct < 60 ? 'Reduced depth' : 'Normal depth'}
            status={liquidityStatus}
            bar={liquidityPct}
          />
        </div>

        {/* Chart + gauges */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3">

          {/* Price chart */}
          <div className="bg-surface border border-border rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-surface2 flex items-center justify-between">
              <span className="text-xs font-semibold text-muted uppercase tracking-widest">Price Chart</span>
              <span className="text-[10px] text-muted">Last {market?.history.length ?? 0} ticks (~{Math.round((market?.history.length ?? 0) * 3 / 60)} min)</span>
            </div>
            <div className="p-0">
              {market
                ? <PriceChart history={market.history} height={200} showLabels />
                : <div className="h-48 bg-surface2 m-4 rounded animate-pulse" />
              }
            </div>
          </div>

          {/* Risk gauges */}
          <div className="bg-surface border border-border rounded-lg p-4">
            <p className="text-xs font-semibold text-muted uppercase tracking-widest mb-1">Risk Gauges</p>
            <RiskGauge
              label="Price Swing (session)"
              value={market ? changeAbs / 100 : null}
              thresholds={[0.05, 0.10, 0.20]}
              format={(v) => `${(v * 100).toFixed(1)}%`}
            />
            <RiskGauge
              label="Realized Volatility"
              value={isWarmingUp ? null : safeVol}
              thresholds={[0.8, 1.2, 2.0]}
              format={(v) => `${(v * 100).toFixed(1)}% ann.`}
            />
            <RiskGauge
              label="Abnormal Activity"
              value={isWarmingUp ? null : activityScore / 100}
              thresholds={[0.3, 0.5, 0.8]}
              format={(v) => `${Math.round(v * 100)}/100`}
            />
            <RiskGauge
              label="Liquidity Stress"
              value={isWarmingUp || !market ? null : (100 - liquidityPct) / 100}
              thresholds={[0.3, 0.5, 0.7]}
              format={(v) => `${Math.round(v * 100)}%`}
            />

            {/* Whale indicator */}
            <div className="pt-3 mt-1">
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted">Whale Activity</span>
                <span className={`text-xs font-bold ${
                  market?.regime === 'crash' || market?.regime === 'pump' ? 'text-amber' : 'text-muted'
                }`}>
                  {market?.regime === 'crash' || market?.regime === 'pump' ? 'DETECTED' : 'NONE'}
                </span>
              </div>
            </div>

            <div className="pt-3 mt-1 flex items-center justify-between">
              <span className="text-xs text-muted">Trading Halt</span>
              <span className={`text-xs font-bold ${market?.halted ? 'text-red' : 'text-green'}`}>
                {market?.halted ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
          </div>
        </div>

        <EventLog />
      </div>
    </AuthGuard>
  )
}
