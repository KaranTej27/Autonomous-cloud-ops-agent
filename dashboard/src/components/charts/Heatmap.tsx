import { useState } from 'react'
import { shortTime } from '../../lib/format'
import { ChartTooltip } from './Tooltip'
import { useMeasure } from './useMeasure'

interface Props {
  rows: { key: string; label: string; values: number[] }[]
  start: number
  step: number
  domain: [number, number]
  unit: string
  ariaLabel: string
}

const BINS = 7
const LABEL_W = 132
const CELL_H = 22
const GAP = 2
const HEADER = 20

function bin(v: number, [lo, hi]: [number, number]): number {
  const f = (v - lo) / (hi - lo || 1)
  return Math.min(BINS, Math.max(1, Math.ceil(f * BINS)))
}

/** Sequential one-hue heatmap. Cells are separated by 2px surface gaps. */
export function Heatmap({ rows, start, step, domain, unit, ariaLabel }: Props) {
  const [ref, width] = useMeasure<HTMLDivElement>()
  const [active, setActive] = useState<{ r: number; c: number } | null>(null)
  const cols = rows[0]?.values.length ?? 0
  const cellW = cols ? (width - LABEL_W) / cols : 0
  const height = HEADER + rows.length * (CELL_H + GAP)
  const labelEvery = Math.max(1, Math.ceil(64 / Math.max(cellW, 1)))

  return (
    <div>
      <div className="viz" ref={ref} style={{ height }} onPointerLeave={() => setActive(null)}>
        {width > 0 && (
          <svg width={width} height={height} role="img" aria-label={ariaLabel}>
            {Array.from({ length: cols }, (_, c) =>
              c % labelEvery === 0 ? (
                <text key={c} x={LABEL_W + c * cellW} y={12} className="viz-tick">
                  {shortTime(start + c * step)}
                </text>
              ) : null,
            )}
            {rows.map((row, r) => (
              <g key={row.key}>
                <text x={LABEL_W - 10} y={HEADER + r * (CELL_H + GAP) + CELL_H / 2} dy="0.32em" textAnchor="end" className="viz-rowlabel">
                  {row.label}
                </text>
                {row.values.map((v, c) => {
                  const isActive = active?.r === r && active?.c === c
                  return (
                    <rect
                      key={c}
                      x={LABEL_W + c * cellW + GAP / 2}
                      y={HEADER + r * (CELL_H + GAP)}
                      width={Math.max(1, cellW - GAP)}
                      height={CELL_H}
                      rx={2}
                      fill={`var(--seq-${bin(v, domain)})`}
                      className={isActive ? 'viz-cell is-active' : 'viz-cell'}
                      onPointerEnter={() => setActive({ r, c })}
                    />
                  )
                })}
              </g>
            ))}
          </svg>
        )}
        {active && (
          <ChartTooltip
            x={LABEL_W + active.c * cellW + cellW / 2}
            y={HEADER + active.r * (CELL_H + GAP) - 34}
            containerWidth={width}
            title={`${rows[active.r].label}, ${shortTime(start + active.c * step)}`}
            rows={[{ key: 'v', label: 'average', value: `${rows[active.r].values[active.c].toFixed(0)}${unit}` }]}
          />
        )}
      </div>
      <div className="heat-legend" aria-hidden="true">
        <span>{domain[0]}{unit}</span>
        {Array.from({ length: BINS }, (_, i) => (
          <span key={i} className="heat-swatch" style={{ background: `var(--seq-${i + 1})` }} />
        ))}
        <span>{domain[1]}{unit}</span>
      </div>
    </div>
  )
}
