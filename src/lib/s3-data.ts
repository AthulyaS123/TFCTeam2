import { getObject, uploadObject } from './s3'
import { COINS, COIN_MAP } from './market'
import type {
  MarketState,
  MarketRegime,
  Portfolio,
  UserProfile,
  UserIndex,
  EventLog,
  Leaderboard,
  LeaderboardEntry,
} from './types'

// ─── Helpers ────────────────────────────────────────────────────────────────

async function readJSON<T>(key: string): Promise<T | null> {
  try {
    const raw = await getObject(key)
    return JSON.parse(raw) as T
  } catch (err: unknown) {
    const name = (err as { name?: string }).name
    const code = (err as { Code?: string }).Code
    if (name === 'NoSuchKey' || code === 'NoSuchKey') return null
    throw err
  }
}

async function writeJSON(key: string, data: unknown): Promise<void> {
  await uploadObject(key, JSON.stringify(data), 'application/json')
}

// ─── Market ─────────────────────────────────────────────────────────────────

export function marketKey(symbol: string) {
  return `market/${symbol.toUpperCase()}.json`
}

export async function getMarketState(symbol: string): Promise<MarketState | null> {
  return readJSON<MarketState>(marketKey(symbol))
}

export async function saveMarketState(state: MarketState): Promise<void> {
  if (state.history.length > 200) state.history = state.history.slice(-200)
  await writeJSON(marketKey(state.symbol), state)
}

// Per-coin starting price ranges [min, max]
const START_PRICE_RANGES: Record<string, [number, number]> = {
  BTC:  [82000, 86000],
  ETH:  [1800,  2200],
  BNB:  [280,   320],
  SOL:  [120,   160],
}

function pickStartPrice(symbol: string, basePrice: number): number {
  const range = START_PRICE_RANGES[symbol]
  if (range) return Math.random() * (range[1] - range[0]) + range[0]
  // For coins without explicit range, ±5% around basePrice
  return basePrice + (Math.random() - 0.5) * basePrice * 0.10
}

export function buildInitialMarketState(symbol: string): MarketState {
  const coin = COIN_MAP[symbol]
  if (!coin) throw new Error(`Unknown coin: ${symbol}`)
  const now = Date.now()
  const startPrice = pickStartPrice(symbol, coin.basePrice)
  const startVolume = startPrice * (500 + Math.random() * 1500)
  return {
    symbol,
    price: startPrice,
    lastUpdatedAt: now,
    regime: 'bull' as MarketRegime,
    regimeChangedAt: now,
    volatility: coin.baseSigma,
    history: [{ t: now, price: startPrice, volume: startVolume }],
    halted: false,
    haltReason: null,
    haltedAt: null,
    rngState: Math.floor(Math.random() * 0xffffffff),
    whaleTickCounter: 40 + Math.floor(Math.random() * 20),
    startedAt: now,
  }
}

export async function getAllMarketStates(): Promise<MarketState[]> {
  const results = await Promise.all(COINS.map((c) => getMarketState(c.symbol)))
  return results.filter(Boolean) as MarketState[]
}

// ─── Users ──────────────────────────────────────────────────────────────────

const USER_INDEX_KEY = 'users/index.json'

export async function getUserIndex(): Promise<UserIndex> {
  return (await readJSON<UserIndex>(USER_INDEX_KEY)) ?? {}
}

export async function saveUserIndex(index: UserIndex): Promise<void> {
  await writeJSON(USER_INDEX_KEY, index)
}

export function userProfileKey(userId: string) {
  return `users/${userId}/profile.json`
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  return readJSON<UserProfile>(userProfileKey(userId))
}

export async function saveUserProfile(profile: UserProfile): Promise<void> {
  await writeJSON(userProfileKey(profile.userId), profile)
}

// ─── Portfolio ──────────────────────────────────────────────────────────────

export function portfolioKey(userId: string) {
  return `users/${userId}/portfolio.json`
}

export async function getUserPortfolio(userId: string): Promise<Portfolio> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await readJSON<any>(portfolioKey(userId))
  if (!raw) return { balance: 100_000, holdings: {}, costBasis: {}, trades: [], totalFeesPaid: 0 }

  // Migrate old single-coin schema (btcHoldings / avgCostBasis)
  const holdings: Record<string, number> = raw.holdings ?? {}
  const costBasis: Record<string, number> = raw.costBasis ?? {}
  if (!raw.holdings && raw.btcHoldings > 0) {
    holdings['BTC'] = raw.btcHoldings
    costBasis['BTC'] = raw.avgCostBasis ?? 0
  }

  const trades = (raw.trades ?? []).map((t: Record<string, unknown>) => ({
    ...t,
    symbol: (t.symbol as string) ?? 'BTC',
    coinAmount: (t.coinAmount as number) ?? (t.btcAmount as number) ?? 0,
    fee: (t.fee as number) ?? 0,
  }))

  return {
    balance: raw.balance ?? 100_000,
    holdings,
    costBasis,
    trades,
    totalFeesPaid: raw.totalFeesPaid ?? 0,
  }
}

export async function saveUserPortfolio(userId: string, portfolio: Portfolio): Promise<void> {
  if (portfolio.trades.length > 100) portfolio.trades = portfolio.trades.slice(-100)
  await writeJSON(portfolioKey(userId), portfolio)
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────

const LEADERBOARD_KEY = 'leaderboard/rankings.json'

export async function getLeaderboard(): Promise<Leaderboard> {
  return (await readJSON<Leaderboard>(LEADERBOARD_KEY)) ?? { entries: [] }
}

export async function upsertLeaderboardEntry(entry: LeaderboardEntry): Promise<void> {
  const board = await getLeaderboard()
  const idx = board.entries.findIndex((e) => e.userId === entry.userId)
  if (idx >= 0) board.entries[idx] = entry
  else board.entries.push(entry)
  // Sort by totalValue descending, keep top 200
  board.entries.sort((a, b) => b.totalValue - a.totalValue)
  board.entries = board.entries.slice(0, 200)
  await writeJSON(LEADERBOARD_KEY, board)
}

// ─── Event Log ──────────────────────────────────────────────────────────────

const EVENTS_KEY = 'events/global.json'

export async function getEventLog(): Promise<EventLog> {
  return (await readJSON<EventLog>(EVENTS_KEY)) ?? { events: [] }
}

export async function appendEvents(newEvents: EventLog['events']): Promise<void> {
  if (!newEvents.length) return
  const log = await getEventLog()
  log.events = [...newEvents, ...log.events].slice(0, 500)
  await writeJSON(EVENTS_KEY, log)
}
