export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getMarketState, saveMarketState, buildInitialMarketState, getUserPortfolio, saveUserPortfolio, appendEvents, upsertLeaderboardEntry } from '@/lib/s3-data'
import { COIN_MAP, advanceSimulation } from '@/lib/market'
import type { Trade, EventEntry } from '@/lib/types'

export const COMMISSION_RATE = 0.0025  // 0.25%

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { symbol = 'BTC', side, usdAmount } = await req.json()
  const sym = symbol.toUpperCase()

  if (!COIN_MAP[sym]) return NextResponse.json({ error: 'Unknown symbol' }, { status: 400 })
  if (!side || !usdAmount || usdAmount <= 0) {
    return NextResponse.json({ error: 'symbol, side (buy|sell), and usdAmount > 0 required' }, { status: 400 })
  }
  if (side !== 'buy' && side !== 'sell') {
    return NextResponse.json({ error: 'side must be buy or sell' }, { status: 400 })
  }
  if (usdAmount < 1) return NextResponse.json({ error: 'Minimum order: $1' }, { status: 400 })

  const coin = COIN_MAP[sym]
  let market = await getMarketState(sym)
  if (!market || market.price < coin.basePrice * 0.05) {
    const fresh = buildInitialMarketState(sym)
    const { state } = advanceSimulation(fresh, Date.now())
    await saveMarketState(state)
    market = state
  }
  if (market.halted) return NextResponse.json({ error: 'Trading is halted: ' + market.haltReason }, { status: 403 })

  const portfolio = await getUserPortfolio(session.userId)
  const price = market.price
  const fee = usdAmount * COMMISSION_RATE
  const coinAmount = usdAmount / price

  if (side === 'buy') {
    const totalCost = usdAmount + fee
    if (portfolio.balance < totalCost) {
      return NextResponse.json({ error: `Insufficient balance (need $${totalCost.toFixed(2)} incl. fee)` }, { status: 400 })
    }
    const oldQty = portfolio.holdings[sym] ?? 0
    const newQty = oldQty + coinAmount
    portfolio.costBasis[sym] = newQty > 0
      ? ((portfolio.costBasis[sym] ?? price) * oldQty + price * coinAmount) / newQty
      : price
    portfolio.balance -= totalCost
    portfolio.holdings[sym] = newQty
  } else {
    const held = portfolio.holdings[sym] ?? 0
    if (held < coinAmount - 1e-10) {
      return NextResponse.json({ error: `Insufficient ${sym} holdings` }, { status: 400 })
    }
    const proceeds = usdAmount - fee
    portfolio.holdings[sym] = Math.max(0, held - coinAmount)
    portfolio.balance += proceeds
    if (portfolio.holdings[sym] < 1e-10) {
      portfolio.holdings[sym] = 0
      delete portfolio.costBasis[sym]
    }
  }

  portfolio.totalFeesPaid = (portfolio.totalFeesPaid ?? 0) + fee

  const trade: Trade = {
    id: crypto.randomUUID(),
    t: Date.now(),
    symbol: sym,
    side,
    price,
    usdAmount,
    coinAmount,
    fee,
  }
  portfolio.trades = [...portfolio.trades, trade].slice(-100)

  // Compute total portfolio value for leaderboard using current coin's price as proxy
  // (accurate for the traded coin; other coins use last known price from their own state)
  const holdingValue = (portfolio.holdings[sym] ?? 0) * price
  const otherValue = Object.entries(portfolio.holdings)
    .filter(([s]) => s !== sym)
    .reduce((sum, [, qty]) => sum + qty * price, 0)
  const totalValue = portfolio.balance + holdingValue + otherValue

  const tradeEvent: EventEntry = {
    id: trade.id,
    t: trade.t,
    type: 'TRADE',
    message: `${session.username} ${side === 'buy' ? 'bought' : 'sold'} $${usdAmount.toFixed(0)} of ${sym} @ $${price.toLocaleString('en-US', { maximumFractionDigits: sym === 'DOGE' || sym === 'ADA' || sym === 'XRP' ? 4 : 0 })}`,
    severity: 'info',
  }

  await Promise.all([
    saveUserPortfolio(session.userId, portfolio),
    appendEvents([tradeEvent]),
    upsertLeaderboardEntry({
      userId: session.userId,
      username: session.username,
      totalValue,
      totalPnl: totalValue - 100_000,
      lastUpdated: Date.now(),
    }),
  ])

  return NextResponse.json({ portfolio, trade })
}
