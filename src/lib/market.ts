import type { MarketState, MarketRegime, EventEntry, RiskEventType, CoinConfig } from './types'

// ─── Alert Deduplication ──────────────────────────────────────────────────
// Module-level maps reset on server restart — acceptable for a simulation.
// Keys are `${symbol}:${alertSubtype}` to isolate cooldowns per coin.
const alertCooldowns = new Map<string, number>()
const ALERT_COOLDOWN_MS = 60_000 // 60-second cooldown per alert type per coin

function canFire(symbol: string, subtype: string): boolean {
  const key = `${symbol}:${subtype}`
  const last = alertCooldowns.get(key)
  if (last !== undefined && Date.now() - last < ALERT_COOLDOWN_MS) return false
  alertCooldowns.set(key, Date.now())
  return true
}

// Tracks highest volatility threshold band reached per coin.
// Fires once on each upward threshold crossing (50% / 100% / 200%).
const volThresholdReached = new Map<string, number>() // symbol → last band value
const VOL_BANDS = [0.5, 1.0, 2.0] as const

function currentVolBand(vol: number): number {
  let band = 0
  for (const t of VOL_BANDS) if (vol >= t) band = t
  return band
}

// ─── Coin Registry ────────────────────────────────────────────────────────
export const COINS: CoinConfig[] = [
  { symbol: 'BTC',  name: 'Bitcoin',     basePrice: 84000,  baseSigma: 0.45, color: '#f7931a' },
  { symbol: 'ETH',  name: 'Ethereum',    basePrice: 2000,   baseSigma: 0.55, color: '#627eea' },
  { symbol: 'BNB',  name: 'BNB',         basePrice: 300,    baseSigma: 0.60, color: '#f3ba2f' },
  { symbol: 'SOL',  name: 'Solana',      basePrice: 140,    baseSigma: 0.80, color: '#9945ff' },
  { symbol: 'DOGE', name: 'Dogecoin',    basePrice: 0.17,   baseSigma: 1.20, color: '#c2a633' },
  { symbol: 'ADA',  name: 'Cardano',     basePrice: 0.70,   baseSigma: 0.70, color: '#0033ad' },
  { symbol: 'XRP',  name: 'XRP',         basePrice: 2.10,   baseSigma: 0.65, color: '#346aa9' },
  { symbol: 'LINK', name: 'Chainlink',   basePrice: 13,     baseSigma: 0.75, color: '#2a5ada' },
  { symbol: 'DOT',  name: 'Polkadot',    basePrice: 4.50,   baseSigma: 0.70, color: '#e6007a' },
  { symbol: 'LTC',  name: 'Litecoin',    basePrice: 85,     baseSigma: 0.55, color: '#bfbbbb' },
]

export const COIN_MAP: Record<string, CoinConfig> = Object.fromEntries(COINS.map((c) => [c.symbol, c]))

// ─── Seeded PRNG (Mulberry32) ─────────────────────────────────────────────
function mulberry32(seed: number): { next: () => number; state: () => number } {
  let s = seed >>> 0
  return {
    next() {
      s += 0x6d2b79f5
      let z = s
      z = Math.imul(z ^ (z >>> 15), z | 1)
      z ^= z + Math.imul(z ^ (z >>> 7), z | 61)
      return ((z ^ (z >>> 14)) >>> 0) / 0x100000000
    },
    state() {
      return s
    },
  }
}

// Box-Muller: uniform → standard normal
function boxMuller(u1: number, u2: number): number {
  return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2)
}

// Student-t approximation with ν=4 (fat tails) using 2 chi-squared samples
function studentT(rng: ReturnType<typeof mulberry32>): number {
  const z = boxMuller(rng.next(), rng.next())
  // chi-squared(4) ≈ sum of 4 squared normals
  const chi2 =
    boxMuller(rng.next(), rng.next()) ** 2 +
    boxMuller(rng.next(), rng.next()) ** 2 +
    boxMuller(rng.next(), rng.next()) ** 2 +
    boxMuller(rng.next(), rng.next()) ** 2
  return z / Math.sqrt(chi2 / 4)
}

// ─── Regime Parameters ───────────────────────────────────────────────────

interface RegimeParams {
  mu: number    // annual drift
  sigma: number // annual volatility
  minDurationMs: number
  maxDurationMs: number
}

const REGIME_PARAMS: Record<MarketRegime, RegimeParams> = {
  bull:     { mu:  0.80, sigma: 0.45, minDurationMs: 2 * 60_000, maxDurationMs: 8 * 60_000 },
  bear:     { mu: -0.40, sigma: 0.55, minDurationMs: 2 * 60_000, maxDurationMs: 6 * 60_000 },
  volatile: { mu:  0.00, sigma: 1.20, minDurationMs: 1 * 60_000, maxDurationMs: 4 * 60_000 },
  crash:    { mu: -3.00, sigma: 2.00, minDurationMs: 30_000,     maxDurationMs: 90_000 },
  pump:     { mu:  4.00, sigma: 1.50, minDurationMs: 20_000,     maxDurationMs: 60_000 },
}

// Markov transition weights: from → { to: weight }
const TRANSITIONS: Record<MarketRegime, Partial<Record<MarketRegime, number>>> = {
  bull:     { bear: 0.60, volatile: 0.25, pump: 0.10, crash: 0.05 },
  bear:     { bull: 0.50, volatile: 0.30, crash: 0.15, pump: 0.05 },
  volatile: { bull: 0.40, bear: 0.40, crash: 0.10, pump: 0.10 },
  crash:    { bear: 0.70, volatile: 0.20, bull: 0.10 },
  pump:     { bull: 0.50, volatile: 0.30, bear: 0.20 },
}

// Probability of regime change per tick (3 sec step)
const REGIME_CHANGE_PROB: Record<MarketRegime, number> = {
  bull:     3 / (60_000 / 3000),   // ~5% per minute
  bear:     3 / (60_000 / 3000),
  volatile: 4.8 / (60_000 / 3000),
  crash:    9 / (60_000 / 3000),   // exits fast
  pump:     12 / (60_000 / 3000),
}

function sampleNextRegime(from: MarketRegime, rng: ReturnType<typeof mulberry32>): MarketRegime {
  const weights = TRANSITIONS[from]
  const entries = Object.entries(weights) as [MarketRegime, number][]
  const total = entries.reduce((s, [, w]) => s + w, 0)
  let r = rng.next() * total
  for (const [regime, w] of entries) {
    r -= w
    if (r <= 0) return regime
  }
  return entries[0][0]
}

// ─── GBM Tick ─────────────────────────────────────────────────────────────

const DT = 3 / 86400 // 3 seconds in years (annualized)
const EWMA_LAMBDA = 0.94

export function gbmTick(state: MarketState, now: number): { state: MarketState; events: EventEntry[] } {
  const rng = mulberry32(state.rngState)
  const events: EventEntry[] = []
  const params = REGIME_PARAMS[state.regime]

  // Effective sigma: blend regime sigma with realized vol
  const sigmaEffective = 0.7 * params.sigma + 0.3 * state.volatility
  const mu = params.mu

  // GBM with fat tails
  const z = studentT(rng)
  const logReturn = (mu - 0.5 * sigmaEffective ** 2) * DT + sigmaEffective * Math.sqrt(DT) * z
  const prevPrice = state.price
  const priceFloor = (COIN_MAP[state.symbol]?.basePrice ?? 1) * 0.05
  let newPrice = Math.max(prevPrice * Math.exp(logReturn), priceFloor)

  // Update realized volatility (EWMA) using observed price log return.
  // Guard: skip update if either price is below $100 (avoids overflow from corrupted near-zero prices)
  // or if the computed return is not a finite number.
  let newVol = state.volatility
  if (newPrice >= 100 && prevPrice >= 100) {
    const realLogReturn = Math.log(newPrice / prevPrice)
    if (Number.isFinite(realLogReturn) && !Number.isNaN(realLogReturn)) {
      const absReturn = Math.abs(realLogReturn)
      const raw = EWMA_LAMBDA * (Number.isFinite(state.volatility) ? state.volatility : 0.45)
        + (1 - EWMA_LAMBDA) * absReturn * Math.sqrt(252 / DT)
      newVol = Math.min(Number.isFinite(raw) ? raw : state.volatility, 5.0)
    }
  }

  // Simulated volume in USD: higher during volatile/crash/pump
  const baseVolume = (500 + rng.next() * 1500) * newPrice
  const volMultiplier = state.regime === 'crash' || state.regime === 'pump' ? 3 + rng.next() * 4 : 1
  const volume = baseVolume * volMultiplier

  // Whale event
  let whaleTickCounter = state.whaleTickCounter - 1
  if (whaleTickCounter <= 0) {
    const direction = rng.next() > 0.45 ? 1 : -1
    const impact = (0.02 + rng.next() * 0.04) * direction
    newPrice = newPrice * (1 + impact)
    whaleTickCounter = 40 + Math.floor(rng.next() * 30)
    events.push(mkEvent('WHALE_ACTIVITY', `Whale ${direction > 0 ? 'buy' : 'sell'} detected — ${(Math.abs(impact) * 100).toFixed(1)}% price impact`, 'warning'))
  }

  // Regime change check
  let regime = state.regime
  let regimeChangedAt = state.regimeChangedAt
  const regimeDuration = now - state.regimeChangedAt
  const minDuration = REGIME_PARAMS[regime].minDurationMs
  const changeProb = REGIME_CHANGE_PROB[regime]

  if (regimeDuration >= minDuration && rng.next() < changeProb) {
    const nextRegime = sampleNextRegime(regime, rng)
    regime = nextRegime
    regimeChangedAt = now
    events.push(mkEvent('REGIME_CHANGE', `Market regime shifted to ${regime.toUpperCase()}`, regime === 'crash' ? 'critical' : regime === 'pump' ? 'warning' : 'info'))
  }

  const newHistory = [...state.history, { t: now, price: newPrice, volume }]

  const newState: MarketState = {
    ...state,
    price: newPrice,
    lastUpdatedAt: now,
    regime,
    regimeChangedAt,
    volatility: newVol,
    history: newHistory,
    rngState: rng.state(),
    whaleTickCounter,
  }

  return { state: newState, events }
}

// ─── Risk Detection ───────────────────────────────────────────────────────

export function runRiskChecks(state: MarketState, prevPrice: number): EventEntry[] {
  const events: EventEntry[] = []
  const { price, history, symbol } = state
  const now = state.lastUpdatedAt

  // 5-minute rolling return
  const fiveMinAgo = now - 5 * 60_000
  const oldPoint = history.find((p) => p.t >= fiveMinAgo) ?? history[0]
  if (oldPoint) {
    const rollingReturn = (price - oldPoint.price) / oldPoint.price
    if (rollingReturn <= -0.20 && !state.halted) {
      // Circuit breaker: always fires (no cooldown — it applies the halt)
      events.push(mkEvent('TRADING_HALT', `Circuit breaker triggered — price down ${(rollingReturn * 100).toFixed(1)}% in 5 min`, 'critical'))
    } else if (rollingReturn <= -0.10 && canFire(symbol, 'CRASH_ALERT')) {
      events.push(mkEvent('CRASH_ALERT', `Price dropped ${(Math.abs(rollingReturn) * 100).toFixed(1)}% in the last 5 minutes`, 'critical'))
    } else if (rollingReturn >= 0.15 && canFire(symbol, 'SPIKE_ALERT_5M')) {
      events.push(mkEvent('SPIKE_ALERT', `Abnormal price spike: +${(rollingReturn * 100).toFixed(1)}% in 5 minutes`, 'warning'))
    }
  }

  // Single-tick spike — separate cooldown key from rolling spike
  const tickReturn = (price - prevPrice) / prevPrice
  if (Math.abs(tickReturn) >= 0.05 && canFire(symbol, 'SPIKE_ALERT_TICK')) {
    events.push(mkEvent('SPIKE_ALERT', `Sudden ${tickReturn > 0 ? 'surge' : 'drop'} of ${(Math.abs(tickReturn) * 100).toFixed(1)}% detected`, 'warning'))
  }

  // Volatility alert — fires once per upward threshold band crossing (50% / 100% / 200%).
  // Guards against NaN/Infinity propagation from corrupted price states.
  const vol = state.volatility
  if (Number.isFinite(vol) && !Number.isNaN(vol)) {
    const newBand = currentVolBand(vol)
    const prevBand = volThresholdReached.get(symbol) ?? 0
    volThresholdReached.set(symbol, newBand)
    if (newBand > prevBand) {
      if (vol > 2.0) {
        events.push(mkEvent('VOLATILITY_ALERT', `Extreme volatility detected — ${(vol * 100).toFixed(1)}% annualized`, 'critical'))
      } else if (vol > 1.0) {
        events.push(mkEvent('VOLATILITY_ALERT', `High volatility — ${(vol * 100).toFixed(1)}% annualized`, 'warning'))
      } else {
        events.push(mkEvent('VOLATILITY_ALERT', `Elevated volatility — ${(vol * 100).toFixed(1)}% annualized`, 'info'))
      }
    }
  }

  // Liquidity stress
  if ((state.regime === 'crash' || state.regime === 'volatile') && tickReturn <= -0.03
      && canFire(symbol, 'LIQUIDITY_STRESS')) {
    events.push(mkEvent('LIQUIDITY_STRESS', 'Liquidity stress detected — wide spreads expected', 'warning'))
  }

  return events
}

// ─── Advance Simulation ───────────────────────────────────────────────────

export function advanceSimulation(state: MarketState, now: number): { state: MarketState; events: EventEntry[] } {
  const STEP_MS = 3000
  const MAX_STEPS = 10
  const steps = Math.min(Math.floor((now - state.lastUpdatedAt) / STEP_MS), MAX_STEPS)

  if (steps <= 0) return { state, events: [] }

  let current = state
  const allEvents: EventEntry[] = []

  for (let i = 0; i < steps; i++) {
    const tickTime = state.lastUpdatedAt + (i + 1) * STEP_MS
    const prevPrice = current.price
    const { state: next, events: tickEvents } = gbmTick(current, tickTime)

    // Auto-resume halt after 2 minutes — also reset vol threshold so fresh alerts
    // can fire cleanly after the halt lifts.
    if (next.halted && next.haltedAt && tickTime - next.haltedAt > 2 * 60_000) {
      allEvents.push(mkEvent('TRADING_RESUMED', 'Trading resumed after circuit breaker cooldown', 'info'))
      volThresholdReached.delete(next.symbol)
      current = { ...next, halted: false, haltReason: null, haltedAt: null, regime: 'bear' }
    } else {
      current = next
    }

    // 30-second warmup: suppress all events so corrupted-state spikes
    // and startup noise don't flood the alert queue on first load.
    const WARMUP_MS = 30_000
    const inWarmup = current.startedAt !== undefined && tickTime - current.startedAt < WARMUP_MS

    const riskEvents = inWarmup ? [] : runRiskChecks(current, prevPrice)
    const emittedTickEvents = inWarmup ? [] : tickEvents

    // Apply halt if triggered (halts still apply even during warmup to prevent bad trades)
    const haltEvent = riskEvents.find((e) => e.type === 'TRADING_HALT')
    if (haltEvent && !current.halted) {
      current = { ...current, halted: true, haltReason: haltEvent.message, haltedAt: tickTime }
    }

    allEvents.push(...emittedTickEvents, ...riskEvents)
  }

  return { state: current, events: allEvents }
}

// ─── Helpers ─────────────────────────────────────────────────────────────

function mkEvent(type: RiskEventType, message: string, severity: EventEntry['severity']): EventEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    t: Date.now(),
    type,
    message,
    severity,
  }
}
