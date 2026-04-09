export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getMarketState, saveMarketState, buildInitialMarketState, appendEvents } from '@/lib/s3-data'
import { advanceSimulation, COIN_MAP } from '@/lib/market'

export async function GET(req: NextRequest) {
  const symbol = (req.nextUrl.searchParams.get('symbol') ?? 'BTC').toUpperCase()
  if (!COIN_MAP[symbol]) return NextResponse.json({ error: 'Unknown symbol' }, { status: 400 })

  let state = await getMarketState(symbol)
  if (!state) state = buildInitialMarketState(symbol)

  const now = Date.now()
  const { state: advanced, events } = advanceSimulation(state, now)

  await Promise.all([saveMarketState(advanced), appendEvents(events)])

  return NextResponse.json({
    symbol: advanced.symbol,
    price: advanced.price,
    regime: advanced.regime,
    volatility: advanced.volatility,
    halted: advanced.halted,
    haltReason: advanced.haltReason,
    history: advanced.history.slice(-60),
    newEvents: events,
    lastUpdatedAt: advanced.lastUpdatedAt,
  })
}
