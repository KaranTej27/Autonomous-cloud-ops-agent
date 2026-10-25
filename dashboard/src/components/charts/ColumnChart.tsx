import { useState, type KeyboardEvent } from 'react'
import { compact, integer } from '../../lib/format'
import { ChartTooltip } from './Tooltip'
import { niceTicks, useMeasure } from './useMeasure'

export interface ColumnSeries {
  key: string
  label: string
  color: string
}

export interface ColumnDatum {
  start: number
  end: number
  values: Record<string, number>
}

interface Props {
  data: ColumnDatum[]
  series: ColumnSeries[]
  height?: number
  ariaLabel: string
  formatTick: (t: number) => string
  formatRange: (d: ColumnDatum) => string
  selected?: number | null
  onSelect?: (index: number | null) => void
  dimmed?: boolean
}

const M = { top: 10, right: 8, bottom: 24, left: 40 }
const GAP = 2
const RADIUS = 4
const MAX_BAR = 24

function topRounded(x: number, yTop: number, w: number, yBase: number): string {
  const h = yBase - yTop
  const r = Math.min(RADIUS, h, w / 2)
  return `M${x},${yBase}V${yTop + r}A${r},${r} 0 0 1 ${x + r},${yTop}H${x + w - r}A${r},${r} 0 0 1 ${x + w},${yTop + r}V${yBase}Z`
}

/** Stacked columns over time. Surface gaps separate segments; only the top segment is rounded. */
export function ColumnChart({ data, series, height = 220, ariaLabel, formatTick, formatRange, selected = null, onSelect, dimmed }: Props) {
  const [ref, width] = useMeasure<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  const plotW = Math.max(0, width - M.left - M.right)
  const plotH = height - M.top - M.bottom
  const totals = data.map((d) => series.reduce((sum, s) => sum + (d.values[s.key] ?? 0), 0))
  const ticks = niceTicks(Math.max(1, ...totals), 4)
  const max = ticks[ticks.length - 1]
  const band = data.length ? plotW / data.length : 0
  const barW = Math.max(1, Math.min(MAX_BAR, band - GAP))
  const y = (v: number) => M.top + plotH - (v / max) * plotH
  const labelEvery = Math.max(1, Math.ceil(76 / Math.max(band, 1)))

  function onKey(e: KeyboardEvent<SVGSVGElement>) {
    if (!data.length) return
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const dir = e.key === 'ArrowRight' ? 1 : -1
      setActive((a) => (a === null ? (dir > 0 ? 0 : data.length - 1) : Math.min(data.length - 1, Math.max(0, a + dir))))
    } else if ((e.key === 'Enter' || e.key === ' ') && active !== null && onSelect) {
      e.preventDefault()
      onSelect(selected === active ? null : active)
    } else if (e.key === 'Escape') {
      setActive(null)
    }
  }

  const tip = active !== null ? data[active] : null

  return (
    <div className={`viz${dimmed ? ' viz-dimmed' : ''}`} ref={ref} style={{ height }}>
      {width > 0 && (
        <svg
          width={width}
          height={height}
          role="img"
          aria-label={ariaLabel}
          tabIndex={0}
          onKeyDown={onKey}
          onBlur={() => setActive(null)}
          onPointerLeave={() => setActive(null)}
        >
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} className={t === 0 ? 'viz-axis' : 'viz-grid'} />
              <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="viz-tick">
                {compact(t)}
              </text>
            </g>
          ))}

          {data.map((d, i) => {
            const x = M.left + i * band + (band - barW) / 2
            const segs = series.map((s) => ({ s, v: d.values[s.key] ?? 0 })).filter((seg) => seg.v > 0)
            let acc = 0
            const isDim = (selected !== null && selected !== i) || (active !== null && active !== i)
            return (
              <g key={d.start} className="viz-col" opacity={isDim ? 0.42 : 1}>
                {segs.map((seg, j) => {
                  const yBase = y(acc)
                  acc += seg.v
                  const yTop = y(acc) + (j < segs.length - 1 ? GAP : 0)
                  if (yBase - yTop <= 0.5) return null
                  if (j === segs.length - 1) return <path key={seg.s.key} d={topRounded(x, yTop, barW, yBase)} fill={seg.s.color} />
                  return <rect key={seg.s.key} x={x} y={yTop} width={barW} height={yBase - yTop} fill={seg.s.color} />
                })}
              </g>
            )
          })}

          {data.map((d, i) =>
            i % labelEvery === 0 ? (
              <text key={d.start} x={M.left + i * band + band / 2} y={height - 6} textAnchor="middle" className="viz-tick">
                {formatTick(d.start)}
              </text>
            ) : null,
          )}

          {data.map((d, i) => (
            <rect
              key={d.start}
              className="viz-hit"
              x={M.left + i * band}
              y={M.top}
              width={Math.max(band, 1)}
              height={plotH}
              onPointerEnter={() => setActive(i)}
              onPointerMove={() => setActive(i)}
              onClick={onSelect ? () => onSelect(selected === i ? null : i) : undefined}
              style={{ cursor: onSelect ? 'pointer' : undefined }}
            />
          ))}
        </svg>
      )}

      {tip && active !== null && (
        <ChartTooltip
          x={M.left + active * band + band / 2}
          y={Math.max(M.top, y(totals[active]) - 8)}
          containerWidth={width}
          title={formatRange(tip)}
          rows={[
            { key: '__total', label: 'total', value: integer(totals[active]) },
            ...series.map((s) => ({ key: s.key, label: s.label, value: integer(tip.values[s.key] ?? 0), color: s.color, shape: 'rect' as const })),
          ]}
          footer={onSelect ? (selected === active ? 'Click to clear the selection' : 'Click to zoom to this column') : undefined}
        />
      )}
    </div>
  )
}
