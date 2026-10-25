import { useState } from 'react'
import { useMeasure } from './useMeasure'

interface Props {
  values: number[]
  accent?: string
  height?: number
  format?: (v: number, i: number) => string
  ariaLabel: string
  max?: number
}

/** De-emphasised trend line with the current value marked in the accent colour. */
export function Sparkline({ values, accent = 'var(--series-1)', height = 30, format, ariaLabel, max }: Props) {
  const [ref, width] = useMeasure<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const n = values.length
  const top = max ?? Math.max(...values, 1)
  const pad = 5
  const x = (i: number) => pad + (n > 1 ? (i / (n - 1)) * (width - pad * 2) : 0)
  const y = (v: number) => pad + (height - pad * 2) * (1 - v / (top || 1))
  const d = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const shown = active ?? n - 1

  return (
    <div className="sparkline" ref={ref} style={{ height }}>
      {width > 0 && n > 1 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            setActive(Math.min(n - 1, Math.max(0, Math.round(((e.clientX - rect.left - pad) / Math.max(width - pad * 2, 1)) * (n - 1)))))
          }}
          onPointerLeave={() => setActive(null)}
        >
          <path d={d} fill="none" stroke="var(--series-muted)" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <circle cx={x(shown)} cy={y(values[shown])} r={4} fill={accent} stroke="var(--surface-1)" strokeWidth={2} />
        </svg>
      )}
      {active !== null && format && (
        <div className="sparkline-tip" style={{ left: Math.min(Math.max(x(active), 30), width - 30) }}>
          {format(values[active], active)}
        </div>
      )}
    </div>
  )
}
