export type MarketRegime = 'bull' | 'bear' | 'volatile' | 'crash' | 'pump'

export type RiskEventType =
  | 'CRASH_ALERT'
  | 'SPIKE_ALERT'
  | 'VOLATILITY_ALERT'
  | 'WHALE_ACTIVITY'
  | 'LIQUIDITY_STRESS'
  | 'TRADING_HALT'
  | 'TRADING_RESUMED'
  | 'REGIME_CHANGE'

export interface CoinConfig {
  symbol: string
  name: string
  basePrice: number
  baseSigma: number   // annual volatility baseline
  color: string       // hex for UI accents
}

export interface PricePoint {
  t: number
  price: number
  volume: number
}

export interface MarketState {
  symbol: string
  price: number
  lastUpdatedAt: number
  regime: MarketRegime
  regimeChangedAt: number
  volatility: number
  history: PricePoint[]
  halted: boolean
  haltReason: string | null
  haltedAt: number | null
  rngState: number
  whaleTickCounter: number
  startedAt?: number  // timestamp of initial state creation; used for warmup suppression
}

export interface EventEntry {
  id: string
  t: number
  type: RiskEventType | 'TRADE' | 'PRICE_MILESTONE'
  message: string
  severity: 'info' | 'warning' | 'critical'
}

export interface EventLog {
  events: EventEntry[]
}

export interface Trade {
  id: string
  t: number
  symbol: string
  side: 'buy' | 'sell'
  price: number
  usdAmount: number   // gross USD (before fee)
  coinAmount: number
  fee: number         // USD fee paid
}

export interface Portfolio {
  balance: number
  holdings: Record<string, number>   // symbol → coin quantity
  costBasis: Record<string, number>  // symbol → avg USD per coin
  trades: Trade[]
  totalFeesPaid: number
}

export interface LeaderboardEntry {
  userId: string
  username: string
  totalValue: number
  totalPnl: number
  lastUpdated: number
}

export interface Leaderboard {
  entries: LeaderboardEntry[]
}

export interface UserProfile {
  userId: string
  username: string
  passwordHash: string
  createdAt: number
}

export interface UserIndex {
  [username: string]: string
}

export interface Session {
  userId: string
  username: string
}
