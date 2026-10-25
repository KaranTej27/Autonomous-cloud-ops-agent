import { useState, type ReactNode } from 'react'
import { integer, pct } from '../../lib/format'

export interface BarItem {
  key: string
  label: ReactNode
  value: number
  color: string
  onClick?: () => void
}

interface Props {
  items: BarItem[]
  format?: (v: number) => string
  ariaLabel: string
  labelWidth?: number
}

/** Horizontal bars, value at the tip. Rows double as hover and focus targets. */
export function BarList({ items, format = integer, ariaLabel, labelWidth = 128 }: Props) {
  const [active, setActive] = useState<string | null>(null)
  const max = Math.max(1, ...items.map((i) => i.value))
  const total = items.reduce((s, i) => s + i.value, 0) || 1

  return (
    <ul className="barlist" aria-label={ariaLabel} style={{ ['--bar-label-w' as string]: `${labelWidth}px` }}>
      {items.map((it) => (
        <li key={it.key} className={active === it.key ? 'is-active' : undefined}>
          <div
            className={`barlist-row${it.onClick ? ' is-clickable' : ''}`}
            role={it.onClick ? 'button' : undefined}
            tabIndex={0}
            onClick={it.onClick}
            onKeyDown={(e) => {
              if (it.onClick && (e.key === 'Enter' || e.key === ' ')) {
                e.preventDefault()
                it.onClick()
              }
            }}
            onPointerEnter={() => setActive(it.key)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(it.key)}
            onBlur={() => setActive(null)}
          >
            <span className="barlist-label">{it.label}</span>
            <span className="barlist-track">
              {it.value > 0 && <span className="barlist-bar" style={{ width: `${(it.value / max) * 100}%`, background: it.color }} />}
              <span className="barlist-value">{format(it.value)}</span>
            </span>
            {active === it.key && <span className="barlist-tip">{pct((it.value / total) * 100)} of total</span>}
          </div>
        </li>
      ))}
    </ul>
  )
}
