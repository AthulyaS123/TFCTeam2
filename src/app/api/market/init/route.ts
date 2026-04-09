export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { COINS } from '@/lib/market'
import { getMarketState, saveMarketState, buildInitialMarketState } from '@/lib/s3-data'

export async function POST() {
  const results = await Promise.all(
    COINS.map(async (coin) => {
      const existing = await getMarketState(coin.symbol)
      if (existing) return { symbol: coin.symbol, status: 'already_exists', price: existing.price }
      const state = buildInitialMarketState(coin.symbol)
      await saveMarketState(state)
      return { symbol: coin.symbol, status: 'initialized', price: state.price }
    })
  )
  return NextResponse.json({ coins: results }, { status: 201 })
}
