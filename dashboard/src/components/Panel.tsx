import { ChartColumn, Table2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'

interface Props {
  title: string
  subtitle?: ReactNode
  actions?: ReactNode
  /** When set, the panel offers a Chart/Table switch. Every chart has a table twin. */
  table?: ReactNode
  legend?: ReactNode
  children: ReactNode
  className?: string
  flush?: boolean
}

export function Panel({ title, subtitle, actions, table, legend, children, className = '', flush }: Props) {
  const [view, setView] = useState<'chart' | 'table'>('chart')
  return (
    <section className={`panel ${className}`}>
      <header className="panel-head">
        <div className="panel-titles">
          <h2>{title}</h2>
          {subtitle && <p className="panel-sub">{subtitle}</p>}
        </div>
        <div className="panel-actions">
          {actions}
          {table && (
            <div className="seg" role="group" aria-label={`${title} view`}>
              <button type="button" className={view === 'chart' ? 'is-on' : ''} aria-pressed={view === 'chart'} onClick={() => setView('chart')} title="Visualization">
                <ChartColumn size={14} aria-hidden="true" />
                <span className="sr-only">Visualization</span>
              </button>
              <button type="button" className={view === 'table' ? 'is-on' : ''} aria-pressed={view === 'table'} onClick={() => setView('table')} title="Statistics table">
                <Table2 size={14} aria-hidden="true" />
                <span className="sr-only">Statistics table</span>
              </button>
            </div>
          )}
        </div>
      </header>
      {legend && view === 'chart' && <div className="panel-legend">{legend}</div>}
      <div className={`panel-body${flush ? ' is-flush' : ''}`}>{table && view === 'table' ? table : children}</div>
    </section>
  )
}
