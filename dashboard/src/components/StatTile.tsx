import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import type { ReactNode } from 'react'
import { Sparkline } from './charts/Sparkline'

export interface Delta {
  text: string
  direction: 'up' | 'down' | 'flat'
  /** Whether this direction is good news. null when neither. */
  good: boolean | null
}

interface Props {
  label: string
  value: string
  hero?: boolean
  delta?: Delta
  foot?: ReactNode
  trend?: number[]
  trendFormat?: (v: number, i: number) => string
}

export function StatTile({ label, value, hero, delta, foot, trend, trendFormat }: Props) {
  const Arrow = delta?.direction === 'up' ? ArrowUpRight : delta?.direction === 'down' ? ArrowDownRight : Minus
  const tone = delta ? (delta.good === null ? 'neutral' : delta.good ? 'good' : 'bad') : 'neutral'
  return (
    <div className={`stat${hero ? ' stat-hero' : ''}`}>
      <div className="stat-label">{label}</div>
      <div className="stat-row">
        <div className="stat-value">{value}</div>
        {delta && (
          <div className={`stat-delta tone-${tone}`}>
            <Arrow size={14} strokeWidth={2.4} aria-hidden="true" />
            {delta.text}
          </div>
        )}
      </div>
      {trend && trend.length > 1 && <Sparkline values={trend} accent="var(--series-4)" ariaLabel={`${label} trend`} format={trendFormat} />}
      {foot && <div className="stat-foot">{foot}</div>}
    </div>
  )
}
