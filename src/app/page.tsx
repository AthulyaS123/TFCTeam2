'use client'

import Link from 'next/link'
import { useMarket } from '@/context/MarketContext'
import { usePriceFlash } from '@/hooks/usePriceFlash'
import { IconTrendingUp, IconZap, IconDroplets, IconActivity, IconInfo, IconBarChart } from '@/components/Icons'

const STATS = [
  { value: '100,000', label: 'Starting Balance', unit: 'USD' },
  { value: '0%',      label: 'Transaction Fee',  unit: 'free' },
  { value: '3s',      label: 'Price Updates',    unit: 'interval' },
  { value: '∞',       label: 'Risk Events',      unit: 'simulated' },
]

const FEATURES = [
  {
    icon: IconTrendingUp,
    title: 'Realistic Market Simulation',
    desc: 'Powered by Geometric Brownian Motion with regime switching — bull runs, bear markets, flash crashes, and pump cycles that mirror real crypto behavior.',
    color: 'green',
  },
  {
    icon: IconZap,
    title: 'Circuit Breakers',
    desc: 'Exchange-grade circuit breakers automatically halt trading when price drops exceed 20% in 5 minutes — just like real exchanges.',
    color: 'red',
  },
  {
    icon: IconDroplets,
    title: 'Whale Detection',
    desc: 'Simulated large institutional orders create real price impact. Watch the market react to whale buys and sells in real time.',
    color: 'blue',
  },
  {
    icon: IconActivity,
    title: 'Live Risk Monitor',
    desc: 'A dedicated risk dashboard tracks volatility, abnormal activity scores, liquidity stress, and logs every market event.',
    color: 'amber',
  },
  {
    icon: IconInfo,
    title: 'Educational Alerts',
    desc: 'Every risk event comes with an explanation — learn what high volatility, liquidity stress, and abnormal spikes actually mean.',
    color: 'green',
  },
  {
    icon: IconBarChart,
    title: 'Portfolio Tracking',
    desc: 'Track your total equity, unrealized P&L, average cost basis, and full order history — all calculated live against the market price.',
    color: 'amber',
  },
]

const HOW_IT_WORKS = [
  { step: '01', title: 'Create an account', desc: 'Sign up in seconds. You get $100,000 in simulated USD to start trading immediately.' },
  { step: '02', title: 'Watch the market',  desc: 'The BTC/USD price updates every 3 seconds with realistic volatility, trend regimes, and whale events.' },
  { step: '03', title: 'Place orders',      desc: 'Buy and sell with a professional order form. Track your P&L live against the moving price.' },
  { step: '04', title: 'Monitor risk',      desc: 'The risk dashboard flags crashes, spikes, and unusual activity — and explains what each event means.' },
]

function colorClass(color: string) {
  const map: Record<string, { text: string; bg: string; border: string }> = {
    green: { text: 'text-green', bg: 'bg-green-bg', border: 'border-green-border' },
    red:   { text: 'text-red',   bg: 'bg-red-bg',   border: 'border-red-border'   },
    amber: { text: 'text-amber', bg: 'bg-amber-bg', border: 'border-amber-border' },
    blue:  { text: 'text-blue',  bg: 'bg-blue-bg',  border: 'border-blue-border'  },
  }
  return map[color] ?? map.green
}

export default function Home() {
  const { currentMarket: market } = useMarket()
  const flash = usePriceFlash(market?.price)
  const flashClass = flash === 'up' ? 'price-flash-up' : flash === 'down' ? 'price-flash-down' : ''

  return (
    <div className="min-h-screen">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background grid */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(var(--color-text) 1px, transparent 1px), linear-gradient(90deg, var(--color-text) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        {/* Gradient orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-green/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-blue/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative max-w-screen-xl mx-auto px-6 pt-20 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-surface border border-border rounded-full px-4 py-1.5 text-xs text-muted mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-green animate-pulse" />
            Live simulation running · BTC/USD updates every 3s
          </div>

          <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Trade crypto.<br />
            <span style={{ background: 'linear-gradient(135deg, #00c896 0%, #4f8ef7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Without the risk.
            </span>
          </h1>

          <p className="text-muted text-lg max-w-xl mx-auto leading-relaxed mb-10">
            A production-grade crypto trading simulator with realistic market dynamics,
            exchange-level risk monitoring, and live circuit breakers.
          </p>

          {/* Live price pill */}
          {market && (
            <div className="inline-flex items-center gap-3 bg-surface border border-border rounded-lg px-5 py-3 mb-10">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green" />
                <span className="text-xs text-muted font-medium">BTC / USD</span>
              </div>
              <span
                className={`text-xl font-bold rounded px-1 ${flashClass}`}
                style={{ fontFamily: 'var(--font-mono)' }}
              >
                ${(market.price ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className={`text-sm font-semibold ${(market.change ?? 0) >= 0 ? 'text-green' : 'text-red'}`}
                style={{ fontFamily: 'var(--font-mono)' }}>
                {(market.change ?? 0) >= 0 ? '▲ +' : '▼ '}{Math.abs(market.change ?? 0).toFixed(2)}%
              </span>
            </div>
          )}

          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              href="/auth/register"
              className="px-7 py-3 bg-green text-bg font-bold rounded-lg text-sm hover:bg-green-dim transition-colors tracking-wide"
            >
              Start trading free
            </Link>
            <Link
              href="/auth/login"
              className="px-7 py-3 border border-border text-text font-semibold rounded-lg text-sm hover:border-border2 transition-colors"
            >
              Sign in
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────────────────────────── */}
      <section className="border-y border-border bg-surface">
        <div className="max-w-screen-xl mx-auto px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {STATS.map(({ value, label, unit }) => (
            <div key={label}>
              <p className="text-2xl font-bold" style={{ fontFamily: 'var(--font-mono)' }}>{value}</p>
              <p className="text-xs text-muted mt-0.5">{label}</p>
              <p className="text-[10px] text-dim uppercase tracking-widest mt-0.5">{unit}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features grid ────────────────────────────────────────────────── */}
      <section className="max-w-screen-xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <p className="text-xs text-muted uppercase tracking-widest mb-2">Platform features</p>
          <h2 className="text-3xl font-bold">Everything a real exchange has.</h2>
          <p className="text-muted mt-2 text-sm">Minus the financial risk.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(({ icon: Icon, title, desc, color }) => {
            const c = colorClass(color)
            return (
              <div
                key={title}
                className={`bg-surface border ${c.border} rounded-xl p-6 hover:border-opacity-60 transition-all group`}
              >
                <div className={`w-10 h-10 ${c.bg} ${c.border} border rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon size={18} className={c.text} />
                </div>
                <h3 className="font-semibold text-sm mb-2">{title}</h3>
                <p className="text-xs text-muted leading-relaxed">{desc}</p>
              </div>
            )
          })}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────────────────────── */}
      <section className="border-t border-border bg-surface">
        <div className="max-w-screen-xl mx-auto px-6 py-16">
          <div className="text-center mb-12">
            <p className="text-xs text-muted uppercase tracking-widest mb-2">Getting started</p>
            <h2 className="text-3xl font-bold">Up and trading in 30 seconds.</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOW_IT_WORKS.map(({ step, title, desc }, i) => (
              <div key={step} className="relative">
                {/* Connector line */}
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden lg:block absolute top-5 left-[calc(100%-8px)] w-full h-px bg-border z-0" />
                )}
                <div className="relative z-10">
                  <div className="w-10 h-10 bg-green-bg border border-green-border rounded-xl flex items-center justify-center mb-4">
                    <span className="text-xs font-bold text-green" style={{ fontFamily: 'var(--font-mono)' }}>{step}</span>
                  </div>
                  <h3 className="font-semibold text-sm mb-2">{title}</h3>
                  <p className="text-xs text-muted leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-t border-border">
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'linear-gradient(var(--color-text) 1px, transparent 1px), linear-gradient(90deg, var(--color-text) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-green/10 rounded-full blur-3xl" />
        </div>
        <div className="relative max-w-xl mx-auto px-6 py-20 text-center">
          <h2 className="text-3xl font-bold mb-3">Ready to trade?</h2>
          <p className="text-muted text-sm mb-8 leading-relaxed">
            No real money. No risk. Just realistic market dynamics and a professional trading interface.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-green text-bg font-bold rounded-lg text-sm hover:bg-green-dim transition-colors tracking-wide"
          >
            Create free account
          </Link>
          <p className="text-xs text-muted mt-4">$100,000 starting balance · No credit card required</p>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer className="border-t border-border bg-surface">
        <div className="max-w-screen-xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted">
          <span className="font-bold tracking-[0.2em] text-text">TFC<span className="text-green">•</span></span>
          <span>Simulated trading only. Not financial advice. Prices are generated, not real.</span>
          <div className="flex gap-4">
            <Link href="/auth/register" className="hover:text-text transition-colors">Register</Link>
            <Link href="/auth/login"    className="hover:text-text transition-colors">Login</Link>
            <Link href="/trading"       className="hover:text-text transition-colors">Trade</Link>
            <Link href="/dashboard"     className="hover:text-text transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>

    </div>
  )
}
