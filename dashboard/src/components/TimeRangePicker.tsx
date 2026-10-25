import { Check, ChevronDown, Clock } from 'lucide-react'
import { RANGES, type RangeKey } from '../lib/time'
import { Popover } from './Popover'

export function TimeRangePicker({ value, onChange }: { value: RangeKey; onChange: (k: RangeKey) => void }) {
  const current = RANGES.find((r) => r.key === value) ?? RANGES[3]
  return (
    <Popover
      align="right"
      trigger={({ open, toggle }) => (
        <button type="button" className="btn btn-picker" aria-haspopup="listbox" aria-expanded={open} onClick={toggle}>
          <Clock size={14} aria-hidden="true" />
          {current.label}
          <ChevronDown size={14} aria-hidden="true" />
        </button>
      )}
    >
      {(close) => (
        <div className="menu menu-time" role="listbox" aria-label="Time range">
          <div className="menu-heading">Presets</div>
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              role="option"
              aria-selected={r.key === value}
              className={`menu-item${r.key === value ? ' is-selected' : ''}`}
              onClick={() => {
                onChange(r.key)
                close()
              }}
            >
              <span className="menu-check">{r.key === value && <Check size={16} strokeWidth={3} aria-hidden="true" />}</span>
              {r.label}
            </button>
          ))}
          <div className="menu-footer">Times shown in your local time zone. Synthetic data covers the last 7 days.</div>
        </div>
      )}
    </Popover>
  )
}
