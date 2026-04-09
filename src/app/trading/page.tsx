'use client'

import { useState, useEffect, useCallback } from 'react'
import AuthGuard from '@/components/AuthGuard'
import PriceTicker from '@/components/PriceTicker'
import OrderForm from '@/components/OrderForm'
import Portfolio from '@/components/Portfolio'
import TradeHistory from '@/components/TradeHistory'
import RiskAlert from '@/components/RiskAlert'
import type { Trade } from '@/lib/types'

interface PortfolioData {
  balance: number
  holdings: Record<string, number>
  costBasis: Record<string, number>
  trades: Trade[]
  totalFeesPaid: number
}

export default function TradingPage() {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null)

  const loadPortfolio = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolio')
      if (res.ok) {
        const data = await res.json()
        setPortfolio(data.portfolio)
      }
    } catch { /* silent */ }
  }, [])

  useEffect(() => { loadPortfolio() }, [loadPortfolio])

  function handleTrade(updated: { balance: number; holdings: Record<string, number> }) {
    setPortfolio((prev) => prev ? { ...prev, ...updated } : null)
    loadPortfolio()
  }

  return (
    <AuthGuard>
      <div className="max-w-screen-xl mx-auto px-4 py-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3">

          {/* Left: ticker + alerts */}
          <div className="space-y-3 min-w-0">
            <PriceTicker />
            <RiskAlert />
          </div>

          {/* Right: order form */}
          <div className="shrink-0">
            <OrderForm
              onTrade={handleTrade}
              balance={portfolio?.balance ?? 0}
              holdings={portfolio?.holdings ?? {}}
            />
          </div>

          {/* Bottom */}
          <div className="lg:col-span-2 grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-3">
            <TradeHistory trades={portfolio?.trades ?? []} />
            <Portfolio
              data={portfolio ? {
                balance: portfolio.balance,
                holdings: portfolio.holdings,
                costBasis: portfolio.costBasis,
                totalFeesPaid: portfolio.totalFeesPaid,
              } : null}
            />
          </div>

        </div>
      </div>
    </AuthGuard>
  )
}
