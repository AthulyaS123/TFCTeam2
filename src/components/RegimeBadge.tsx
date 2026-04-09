import type { MarketRegime } from '@/lib/types'

const CONFIG: Record<MarketRegime, { label: string; cls: string }> = {
  bull:     { label: 'BULL',     cls: 'text-green  border-green-border  bg-green-bg' },
  bear:     { label: 'BEAR',     cls: 'text-red    border-red-border    bg-red-bg' },
  volatile: { label: 'VOLATILE', cls: 'text-amber  border-amber-border  bg-amber-bg' },
  crash:    { label: 'CRASH',    cls: 'text-red    border-red-border    bg-red-bg    alert-critical-pulse' },
  pump:     { label: 'PUMP',    cls: 'text-green  border-green-border  bg-green-bg  animate-pulse' },
}

export default function RegimeBadge({ regime }: { regime: MarketRegime }) {
  const { label, cls } = CONFIG[regime]
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-widest border ${cls}`}>
      {label}
    </span>
  )
}
