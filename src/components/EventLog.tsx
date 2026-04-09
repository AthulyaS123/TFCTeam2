'use client'

import { useMarket } from '@/context/MarketContext'
import type { LoggedEvent } from '@/context/MarketContext'

const TAG_COLOR: Record<LoggedEvent['severity'], string> = {
  critical: 'text-red',
  warning:  'text-amber',
  info:     'text-blue',
}

const TAG_LABEL: Record<LoggedEvent['severity'], string> = {
  critical: 'CRIT',
  warning:  'WARN',
  info:     'INFO',
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  })
}

export default function EventLog() {
  const { eventLog } = useMarket()

  return (
    <div className="bg-surface border border-border rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-surface2 flex items-center justify-between">
        <span className="text-xs font-semibold text-muted uppercase tracking-widest">Event Log</span>
        <span className="text-[10px] text-muted">{eventLog.length} events</span>
      </div>

      {eventLog.length === 0 ? (
        <div className="py-10 text-center text-xs text-muted animate-pulse" style={{ fontFamily: 'var(--font-mono)' }}>
          Awaiting market events...
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto divide-y divide-border/20">
          {eventLog.map((e, idx) => (
            <div
              key={e.id}
              className={`flex items-baseline gap-0 px-4 py-1.5 hover:bg-surface2 transition-colors ${idx === 0 ? 'bg-surface2/50' : ''}`}
              style={{ fontFamily: 'var(--font-mono)' }}
            >
              {/* HH:MM:SS */}
              <span className="text-[11px] text-muted tabular-nums shrink-0">
                {formatTime(e.t)}
              </span>

              {/* · separator */}
              <span className="text-muted mx-1.5 text-[11px] shrink-0">·</span>

              {/* [CRIT/WARN/INFO] tag */}
              <span className={`text-[10px] font-bold w-7 shrink-0 ${TAG_COLOR[e.severity]}`}>
                {TAG_LABEL[e.severity]}
              </span>

              {/* · separator */}
              <span className="text-muted mx-1.5 text-[11px] shrink-0">·</span>

              {/* Symbol badge (subtle) */}
              <span className="text-[10px] text-dim shrink-0 mr-1.5">{e.symbol}</span>

              {/* Message */}
              <span className={`text-[11px] min-w-0 truncate ${
                e.severity === 'critical' ? 'text-red/90' :
                e.severity === 'warning'  ? 'text-amber/90' :
                'text-muted'
              }`}>
                {e.message}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
