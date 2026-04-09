export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { COINS } from '@/lib/market'
import { getMarketState, saveMarketState, buildInitialMarketState, appendEvents } from '@/lib/s3-data'
import { advanceSimulation } from '@/lib/market'

export async function GET() {
  const now = Date.now()

  const results = await Promise.all(
    COINS.map(async (coin) => {
      let state = await getMarketState(coin.symbol)
      // Reset if missing, price is corrupted (below 5% of base), or volatility
      // overflowed before the EWMA clamp was added (> 500% = 5.0).
      if (!state || state.price < coin.basePrice * 0.05 || state.volatility > 5.0) {
        state = buildInitialMarketState(coin.symbol)
      }

      const { state: advanced, events } = advanceSimulation(state, now)
      await Promise.all([saveMarketState(advanced), appendEvents(events)])

      const prices = advanced.history.map((p) => p.price)
      const sessionOpen = prices[0] ?? advanced.price
      const change = ((advanced.price - sessionOpen) / sessionOpen) * 100

      const WARMUP_MS = 30_000
      const warmingUp = advanced.startedAt !== undefined && (now - advanced.startedAt) < WARMUP_MS

      return {
        symbol: advanced.symbol,
        name: coin.name,
        color: coin.color,
        price: advanced.price,
        change,
        regime: advanced.regime,
        volatility: advanced.volatility,
        halted: advanced.halted,
        haltReason: advanced.haltReason,
        history: advanced.history.slice(-60),
        newEvents: events,
        lastUpdatedAt: advanced.lastUpdatedAt,
        warmingUp,
      }
    })
  )

  return NextResponse.json({ markets: results })
}
