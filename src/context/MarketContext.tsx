'use client'

import { createContext, useContext, useEffect, useState, useRef, ReactNode } from 'react'
import type { MarketRegime, EventEntry, PricePoint } from '@/lib/types'

export interface MarketSnapshot {
  symbol: string
  name: string
  color: string
  price: number
  change: number
  regime: MarketRegime
  volatility: number
  halted: boolean
  haltReason: string | null
  history: PricePoint[]
  newEvents: EventEntry[]
  lastUpdatedAt: number
  warmingUp: boolean
}

// EventEntry enriched with the coin symbol it came from
export interface LoggedEvent extends EventEntry {
  symbol: string
}

interface MarketContextValue {
  markets: Record<string, MarketSnapshot>
  selectedSymbol: string
  setSelectedSymbol: (s: string) => void
  currentMarket: MarketSnapshot | null
  connected: boolean
  /** All events from all coins, newest-first, capped at 200. Single source of truth. */
  eventLog: LoggedEvent[]
}

const MarketContext = createContext<MarketContextValue>({
  markets: {},
  selectedSymbol: 'BTC',
  setSelectedSymbol: () => {},
  currentMarket: null,
  connected: false,
  eventLog: [],
})

const POLL_INTERVAL = 3000
const MAX_LOG = 200

export function MarketProvider({ children }: { children: ReactNode }) {
  const [markets, setMarkets] = useState<Record<string, MarketSnapshot>>({})
  const [selectedSymbol, setSelectedSymbol] = useState('BTC')
  const [connected, setConnected] = useState(false)
  const [eventLog, setEventLog] = useState<LoggedEvent[]>([])
  const seenEventIds = useRef(new Set<string>())
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    let active = true

    async function poll() {
      try {
        const res = await fetch('/api/market/all')
        if (!res.ok) throw new Error('fetch failed')
        const data = await res.json()
        if (!active) return

        const map: Record<string, MarketSnapshot> = {}
        const incoming: LoggedEvent[] = []

        for (const m of data.markets) {
          map[m.symbol] = m
          // Collect new events from every coin, tag with symbol, deduplicate by id
          if (Array.isArray(m.newEvents)) {
            for (const e of m.newEvents as EventEntry[]) {
              if (!seenEventIds.current.has(e.id)) {
                seenEventIds.current.add(e.id)
                incoming.push({ ...e, symbol: m.symbol })
              }
            }
          }
        }

        setMarkets(map)
        setConnected(true)

        if (incoming.length > 0) {
          // Newest first; cap at MAX_LOG
          setEventLog((prev) => [...incoming, ...prev].slice(0, MAX_LOG))
        }
      } catch {
        setConnected(false)
      } finally {
        if (active) timerRef.current = setTimeout(poll, POLL_INTERVAL)
      }
    }

    poll()
    return () => {
      active = false
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const currentMarket = markets[selectedSymbol] ?? null

  return (
    <MarketContext.Provider value={{ markets, selectedSymbol, setSelectedSymbol, currentMarket, connected, eventLog }}>
      {children}
    </MarketContext.Provider>
  )
}

export function useMarket() {
  return useContext(MarketContext)
}
