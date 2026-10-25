import type { ReactNode } from 'react'

export interface TooltipRow {
  key: string
  label: string
  value: string
  color?: string
  shape?: 'line' | 'rect'
}

interface Props {
  x: number
  y: number
  containerWidth: number
  title: ReactNode
  rows: TooltipRow[]
  footer?: ReactNode
}

/** Values lead, labels follow. Flips to the left of the pointer near the right edge. */
export function ChartTooltip({ x, y, containerWidth, title, rows, footer }: Props) {
  const flip = x > containerWidth * 0.62
  return (
    <div
      className="viz-tooltip"
      role="status"
      style={{ left: flip ? x - 12 : x + 12, top: Math.max(0, y), transform: flip ? 'translateX(-100%)' : undefined }}
    >
      <div className="viz-tooltip-title">{title}</div>
      {rows.map((r) => (
        <div className="viz-tooltip-row" key={r.key}>
          {r.color && <span className={r.shape === 'rect' ? 'key-rect' : 'key-line'} style={{ background: r.color }} />}
          <strong>{r.value}</strong>
          <span>{r.label}</span>
        </div>
      ))}
      {footer && <div className="viz-tooltip-footer">{footer}</div>}
    </div>
  )
}
