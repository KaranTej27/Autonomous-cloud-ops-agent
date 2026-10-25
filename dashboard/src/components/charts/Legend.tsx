interface Item {
  key: string
  label: string
  color: string
  value?: string
}

/** Legend mirrors the mark: rect for bars and areas, line for lines. */
export function Legend({ items, shape = 'rect' }: { items: Item[]; shape?: 'rect' | 'line' }) {
  return (
    <ul className="viz-legend" aria-label="Legend">
      {items.map((it) => (
        <li key={it.key}>
          <span className={shape === 'rect' ? 'key-rect' : 'key-line'} style={{ background: it.color }} />
          <span className="viz-legend-label">{it.label}</span>
          {it.value && <span className="viz-legend-value">{it.value}</span>}
        </li>
      ))}
    </ul>
  )
}
