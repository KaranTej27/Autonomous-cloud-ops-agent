import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { shortTime } from '../../lib/format'
import { ChartTooltip } from './Tooltip'
import { niceTicks, useMeasure } from './useMeasure'

interface Props {
  start: number
  step: number
  values: number[]
  color: string
  label: string
  unit: string
  height?: number
  threshold?: number
  markers?: { t: number; label: string }[]
  ariaLabel: string
  formatValue?: (v: number) => string
}

const M = { top: 16, right: 12, bottom: 22, left: 40 }

/** Single-series line with a 10% area wash, crosshair, and optional threshold and event markers. */
export function LineChart({ start, step, values, color, label, unit, height = 150, threshold, markers = [], ariaLabel, formatValue }: Props) {
  const [ref, width] = useMeasure<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  const fmt = formatValue ?? ((v: number) => `${v.toFixed(v < 10 ? 1 : 0)} ${unit}`)

  const plotW = Math.max(0, width - M.left - M.right)
  const plotH = height - M.top - M.bottom
  const peak = Math.max(...values, threshold ?? 0)
  // Percent scales that reach past half stop at 100 instead of rounding up to 150.
  const ticks = unit === '%' && peak > 40 && peak <= 100 ? [0, 25, 50, 75, 100] : niceTicks(peak * 1.02, 3)
  const max = ticks[ticks.length - 1]
  const n = values.length
  const end = start + step * (n - 1)
  const x = (i: number) => M.left + (n > 1 ? (i / (n - 1)) * plotW : 0)
  const xt = (t: number) => M.left + ((t - start) / (end - start || 1)) * plotW
  const y = (v: number) => M.top + plotH - (v / max) * plotH

  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join('')
  const area = `${line}L${x(n - 1).toFixed(1)},${y(0)}L${x(0).toFixed(1)},${y(0)}Z`
  const timeTicks = [0, 0.33, 0.66, 1].map((f) => start + f * (end - start))
  const visibleMarkers = markers.filter((mk) => mk.t >= start && mk.t <= end).sort((a, b) => a.t - b.t)

  function onMove(e: PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    const rel = (e.clientX - rect.left) / Math.max(rect.width, 1)
    setActive(Math.min(n - 1, Math.max(0, Math.round(rel * (n - 1)))))
  }

  function onKey(e: KeyboardEvent<SVGSVGElement>) {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const dir = e.key === 'ArrowRight' ? 1 : -1
    setActive((a) => (a === null ? (dir > 0 ? 0 : n - 1) : Math.min(n - 1, Math.max(0, a + dir))))
  }

  return (
    <div className="viz" ref={ref} style={{ height }}>
      {width > 0 && n > 1 && (
        <svg width={width} height={height} role="img" aria-label={ariaLabel} tabIndex={0} onKeyDown={onKey} onBlur={() => setActive(null)}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} className={t === 0 ? 'viz-axis' : 'viz-grid'} />
              <text x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="viz-tick">
                {t}
              </text>
            </g>
          ))}
          {timeTicks.map((t, i) => (
            <text key={t} x={xt(t)} y={height - 5} textAnchor={i === 0 ? 'start' : i === timeTicks.length - 1 ? 'end' : 'middle'} className="viz-tick">
              {shortTime(t)}
            </text>
          ))}

          {threshold !== undefined && threshold <= max && (
            <g>
              <line x1={M.left} x2={width - M.right} y1={y(threshold)} y2={y(threshold)} className="viz-threshold" />
              <text x={M.left + 4} y={y(threshold) + 12 < M.top + plotH - 4 ? y(threshold) + 12 : y(threshold) - 4} className="viz-annot">
                threshold {threshold}
                {unit === '%' ? '%' : ` ${unit}`}
              </text>
            </g>
          )}

          {visibleMarkers.map((mk, i) => {
            // When two markers sit close together, the earlier label goes to the left of its line.
            const next = visibleMarkers[i + 1]
            const crowded = next !== undefined && xt(next.t) - xt(mk.t) < 90
            return (
              <g key={mk.label}>
                <line x1={xt(mk.t)} x2={xt(mk.t)} y1={M.top} y2={M.top + plotH} className="viz-marker" />
                <text x={xt(mk.t) + (crowded ? -4 : 4)} y={M.top - 4} textAnchor={crowded ? 'end' : 'start'} className="viz-annot">
                  {mk.label}
                </text>
              </g>
            )
          })}

          <path d={area} fill={color} opacity={0.1} />
          <path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {active !== null && (
            <g pointerEvents="none">
              <line x1={x(active)} x2={x(active)} y1={M.top} y2={M.top + plotH} className="viz-crosshair" />
              <circle cx={x(active)} cy={y(values[active])} r={4} fill={color} stroke="var(--surface-1)" strokeWidth={2} />
            </g>
          )}

          <rect
            className="viz-hit"
            x={M.left}
            y={M.top}
            width={plotW}
            height={plotH}
            onPointerMove={onMove}
            onPointerEnter={onMove}
            onPointerLeave={() => setActive(null)}
          />
        </svg>
      )}
      {active !== null && (
        <ChartTooltip
          x={x(active)}
          y={Math.max(0, y(values[active]) - 40)}
          containerWidth={width}
          title={shortTime(start + active * step)}
          rows={[{ key: 'v', label, value: fmt(values[active]), color, shape: 'line' }]}
        />
      )}
    </div>
  )
}
