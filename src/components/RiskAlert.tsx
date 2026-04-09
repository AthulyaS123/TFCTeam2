'use client'

import { useEffect, useRef, useState } from 'react'
import { useMarket } from '@/context/MarketContext'
import { IconAlertOctagon, IconAlertTriangle, IconInfo, IconX, IconChevronDown } from './Icons'
import type { EventEntry } from '@/lib/types'

interface ActiveAlert extends EventEntry {
  dismissedAt?: number
}

const MAX_QUEUE = 20
const COLLAPSE_THRESHOLD = 5

const EDUCATION: Partial<Record<string, string>> = {
  CRASH_ALERT:      'A rapid price decline signals panic selling or negative news. Avoid emotional decisions — consider waiting for stabilization before acting.',
  SPIKE_ALERT:      'Sudden upward spikes often precede sharp reversals. This can indicate a short squeeze or coordinated buying. Exercise caution entering at peak prices.',
  VOLATILITY_ALERT: 'High volatility means prices are moving rapidly in both directions. Position sizing and stop-losses become critical during these periods.',
  WHALE_ACTIVITY:   'A large institutional order has moved the market. Whale trades often signal major directional moves — watch for follow-through or reversal.',
  LIQUIDITY_STRESS: 'Low liquidity means orders have more price impact and spreads widen. Large orders may not execute at expected prices.',
  TRADING_HALT:     'The circuit breaker was triggered by an extreme price move. This protects the market from cascading liquidations. Trading resumes automatically.',
}

type SeverityKey = 'critical' | 'warning' | 'info'

const SEVERITY_CONFIG: Record<SeverityKey, {
  border: string
  bg: string
  badge: string
  label: string
  icon: React.ReactNode
  canDismiss: boolean
}> = {
  critical: {
    border: 'border-red alert-critical-pulse',
    bg: 'bg-red-bg',
    badge: 'bg-red text-white',
    label: 'CRITICAL',
    icon: <IconAlertOctagon size={14} className="text-red" />,
    canDismiss: false,
  },
  warning: {
    border: 'border-amber-border',
    bg: 'bg-amber-bg',
    badge: 'bg-amber text-bg',
    label: 'WARNING',
    icon: <IconAlertTriangle size={14} className="text-amber" />,
    canDismiss: true,
  },
  info: {
    border: 'border-blue-border',
    bg: 'bg-blue-bg',
    badge: 'bg-blue text-white',
    label: 'INFO',
    icon: <IconInfo size={14} className="text-blue" />,
    canDismiss: true,
  },
}

// Remove oldest non-critical alerts to stay under MAX_QUEUE.
// Alerts are stored newest-first, so oldest are at the end.
function enforceQueueLimit(alerts: ActiveAlert[]): ActiveAlert[] {
  const result = [...alerts]
  while (result.length > MAX_QUEUE) {
    // Find the last (oldest) non-critical alert
    let removed = false
    for (let i = result.length - 1; i >= 0; i--) {
      if (result[i].severity !== 'critical') {
        result.splice(i, 1)
        removed = true
        break
      }
    }
    if (!removed) {
      // All remaining are critical — just drop the oldest
      result.pop()
    }
  }
  return result
}

export default function RiskAlert() {
  const { currentMarket: market } = useMarket()
  const [alerts, setAlerts] = useState<ActiveAlert[]>([])
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set())
  const seenIds = useRef(new Set<string>())
  const prevHaltedRef = useRef<boolean>(false)

  // Accumulate fresh events
  useEffect(() => {
    if (!market?.newEvents?.length) return
    const fresh = market.newEvents.filter(
      (e) => (e.severity === 'critical' || e.severity === 'warning') && !seenIds.current.has(e.id)
    )
    if (!fresh.length) return
    fresh.forEach((e) => seenIds.current.add(e.id))
    setAlerts((prev) => enforceQueueLimit([...fresh, ...prev]))
  }, [market?.newEvents])

  // Clear all alerts when trading halt is lifted
  useEffect(() => {
    const isHalted = market?.halted ?? false
    const wasHalted = prevHaltedRef.current
    prevHaltedRef.current = isHalted
    if (wasHalted && !isHalted) {
      setAlerts([])
      setExpandedTypes(new Set())
      seenIds.current.clear()
    }
  }, [market?.halted])

  function dismiss(id: string) {
    setAlerts((prev) => prev.filter((a) => a.id !== id))
  }

  function toggleExpand(type: string) {
    setExpandedTypes((prev) => {
      const next = new Set(prev)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }

  // Synthetic halt alert shown while halted (not stored in queue)
  const haltAlert: ActiveAlert | null = market?.halted
    ? {
        id: 'halt',
        t: market.lastUpdatedAt,
        type: 'TRADING_HALT',
        message: market.haltReason ?? 'Circuit breaker triggered',
        severity: 'critical',
      }
    : null

  // Build the displayable list: halt first, then accumulated alerts
  const queuedAlerts = alerts.filter((a) => a.id !== 'halt')

  // Group queuedAlerts by type for collapse logic
  const groupsByType = new Map<string, ActiveAlert[]>()
  for (const alert of queuedAlerts) {
    const group = groupsByType.get(alert.type) ?? []
    group.push(alert)
    groupsByType.set(alert.type, group)
  }

  if (!haltAlert && queuedAlerts.length === 0) return null

  return (
    <div className="space-y-2">
      {/* Halt alert always shown individually */}
      {haltAlert && <AlertRow alert={haltAlert} onDismiss={dismiss} />}

      {/* Grouped accumulated alerts */}
      {Array.from(groupsByType.entries()).map(([type, group]) => {
        const isExpanded = expandedTypes.has(type)
        if (group.length > COLLAPSE_THRESHOLD && !isExpanded) {
          return (
            <CollapsedGroup
              key={type}
              group={group}
              onExpand={() => toggleExpand(type)}
            />
          )
        }
        return (
          <div key={type} className="space-y-1.5">
            {group.length > COLLAPSE_THRESHOLD && isExpanded && (
              <button
                onClick={() => toggleExpand(type)}
                className="w-full text-left flex items-center gap-1.5 px-2 py-1 text-[10px] text-muted hover:text-text transition-colors"
              >
                <IconChevronDown size={11} className="rotate-180" />
                Collapse {group.length} alerts
              </button>
            )}
            {group.map((alert) => (
              <AlertRow key={alert.id} alert={alert} onDismiss={dismiss} />
            ))}
          </div>
        )
      })}
    </div>
  )
}

function AlertRow({ alert, onDismiss }: { alert: ActiveAlert; onDismiss: (id: string) => void }) {
  const sev = (alert.severity as SeverityKey) in SEVERITY_CONFIG ? alert.severity as SeverityKey : 'info'
  const cfg = SEVERITY_CONFIG[sev]
  return (
    <div className={`flex items-start gap-3 px-4 py-3 rounded-lg border ${cfg.bg} ${cfg.border}`}>
      <span className="shrink-0 mt-0.5">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider ${cfg.badge}`}>
            {cfg.label}
          </span>
          <span className="text-[10px] text-muted tabular-nums">
            {new Date(alert.t).toLocaleTimeString()}
          </span>
        </div>
        <p className="text-xs text-text">{alert.message}</p>
        {EDUCATION[alert.type] && (
          <p className="text-[11px] text-muted mt-1.5 leading-relaxed border-t border-white/5 pt-1.5 italic">
            {EDUCATION[alert.type]}
          </p>
        )}
      </div>
      {cfg.canDismiss && (
        <button
          onClick={() => onDismiss(alert.id)}
          className="shrink-0 text-muted hover:text-text transition-colors mt-0.5"
          aria-label="Dismiss"
        >
          <IconX size={14} />
        </button>
      )}
    </div>
  )
}

function CollapsedGroup({ group, onExpand }: { group: ActiveAlert[]; onExpand: () => void }) {
  // Use the severity of the most severe alert in the group
  const hasCritical = group.some((a) => a.severity === 'critical')
  const sev: SeverityKey = hasCritical ? 'critical' : 'warning'
  const cfg = SEVERITY_CONFIG[sev]
  const latest = group[0] // newest-first order
  const lastTime = new Date(latest.t).toLocaleTimeString()

  return (
    <button
      onClick={onExpand}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-left transition-opacity hover:opacity-80 ${cfg.bg} ${cfg.border}`}
    >
      <span className="shrink-0">{cfg.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded tracking-wider ${cfg.badge}`}>
            {cfg.label}
          </span>
        </div>
        <p className="text-xs text-text">
          {latest.message}
          <span className="text-muted ml-1.5">
            · {group.length} occurrences · last at {lastTime}
          </span>
        </p>
      </div>
      <IconChevronDown size={14} className="shrink-0 text-muted" />
    </button>
  )
}
