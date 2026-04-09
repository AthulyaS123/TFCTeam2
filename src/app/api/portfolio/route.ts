export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { getUserPortfolio, getAllMarketStates } from '@/lib/s3-data'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [portfolio, markets] = await Promise.all([
    getUserPortfolio(session.userId),
    getAllMarketStates(),
  ])

  const prices: Record<string, number> = {}
  for (const m of markets) prices[m.symbol] = m.price

  const holdingsValue = Object.entries(portfolio.holdings).reduce(
    (sum, [sym, qty]) => sum + qty * (prices[sym] ?? 0),
    0
  )
  const totalValue = portfolio.balance + holdingsValue
  const totalPnl = totalValue - 100_000

  return NextResponse.json({ portfolio, prices, totalValue, totalPnl })
}
