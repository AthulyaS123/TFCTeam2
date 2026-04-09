'use client'

import type { PricePoint } from '@/lib/types'

interface Props {
  history: PricePoint[]
  height?: number
  showLabels?: boolean
}

const W = 600
const PAD_X = 0
const PAD_Y = 8

export default function PriceChart({ history, height = 100, showLabels = false }: Props) {
  if (history.length < 2) {
    return <div style={{ height }} className="w-full bg-surface2 rounded animate-pulse" />
  }

  const prices = history.map((p) => p.price)
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const range = max - min || max * 0.001

  const padBottom = showLabels ? 20 : PAD_Y
  const H = height - PAD_Y - padBottom

  const toX = (i: number) => PAD_X + (i / (prices.length - 1)) * (W - PAD_X * 2)
  const toY = (p: number) => PAD_Y + ((max - p) / range) * H

  const linePoints = prices.map((p, i) => `${toX(i)},${toY(p)}`).join(' ')
  const areaPath = `M${toX(0)},${toY(prices[0])} ${prices.map((p, i) => `L${toX(i)},${toY(p)}`).join(' ')} L${toX(prices.length - 1)},${height} L${toX(0)},${height} Z`

  const first = prices[0]
  const last = prices[prices.length - 1]
  const isUp = last >= first
  const stroke = isUp ? '#00c896' : '#ff4d4d'
  const gradId = `grad-${isUp ? 'up' : 'dn'}`

  // Horizontal grid lines at 25%, 50%, 75%
  const gridLines = [0.25, 0.5, 0.75].map((pct) => {
    const price = min + range * (1 - pct)
    const y = toY(price)
    return { y, price }
  })

  return (
    <svg
      viewBox={`0 0 ${W} ${height}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height, display: 'block' }}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor={stroke} stopOpacity="0.15" />
          <stop offset="80%"  stopColor={stroke} stopOpacity="0.02" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {gridLines.map(({ y }) => (
        <line key={y} x1={0} y1={y} x2={W} y2={y} stroke="#253047" strokeWidth="0.5" />
      ))}

      {/* Area */}
      <path d={areaPath} fill={`url(#${gradId})`} />

      {/* Line */}
      <polyline
        points={linePoints}
        fill="none"
        stroke={stroke}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* Current price dot */}
      <circle
        cx={toX(prices.length - 1)}
        cy={toY(last)}
        r="3"
        fill={stroke}
        vectorEffect="non-scaling-stroke"
      />

      {/* Price labels on right axis */}
      {showLabels && gridLines.map(({ y, price }) => (
        <text
          key={y}
          x={W - 2}
          y={y - 3}
          textAnchor="end"
          fontSize="10"
          fill="#7d8899"
          fontFamily="var(--font-mono)"
        >
          ${price.toLocaleString('en-US', { maximumFractionDigits: 0 })}
        </text>
      ))}
    </svg>
  )
}
