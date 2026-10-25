import { Link, useSearchParams } from 'react-router-dom'
import { HealthBadge } from '../components/Badges'
import { Heatmap } from '../components/charts/Heatmap'
import { LineChart } from '../components/charts/LineChart'
import { Sparkline } from '../components/charts/Sparkline'
import { DataTable } from '../components/DataTable'
import { Panel } from '../components/Panel'
import { PageHeader } from '../components/Shell'
import type { HealthStatus } from '../data/types'
import { METRIC_DEFS, WORKLOADS } from '../data/workloads'
import { shortTime } from '../lib/format'
import { HOUR } from '../lib/time'

const FILTERS: { key: 'all' | HealthStatus; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'critical', label: 'Critical' },
  { key: 'degraded', label: 'Degraded' },
  { key: 'healthy', label: 'Healthy' },
]

const COLORS = ['var(--series-4)', 'var(--series-2)', 'var(--series-3)', 'var(--series-5)']

function fmt(v: number, unit: string) {
  return unit === 'ms' ? `${v.toFixed(0)} ms` : `${v.toFixed(v < 10 ? 1 : 0)}${unit}`
}

export function Health() {
  const [params, setParams] = useSearchParams()
  const filter = (params.get('status') as 'all' | HealthStatus | null) ?? 'all'
  const selectedName = params.get('w') ?? WORKLOADS[0].name
  const list = WORKLOADS.filter((w) => filter === 'all' || w.status === filter)
  const selected = WORKLOADS.find((w) => w.name === selectedName) ?? WORKLOADS[0]

  const set = (k: string, v: string) => {
    const next = new URLSearchParams(params)
    next.set(k, v)
    setParams(next, { replace: true })
  }

  // Hourly CPU averages for the heatmap.
  const hourly = WORKLOADS.map((w) => {
    const per = Math.round(HOUR / w.step)
    const values: number[] = []
    for (let i = 0; i + per <= w.metrics.cpu.length; i += per) {
      const slice = w.metrics.cpu.slice(i, i + per)
      values.push(slice.reduce((a, b) => a + b, 0) / slice.length)
    }
    return { key: w.name, label: w.name, values }
  })
  const heatStart = WORKLOADS[0].start

  return (
    <div className="page">
      <PageHeader title="Workload health" description="Namespace lab-workloads in kind-cloudops-soc-lab. Metrics cover the last 24 hours at 10-minute steps.">
        <div className="seg seg-text" role="group" aria-label="Filter by status">
          {FILTERS.map((f) => (
            <button key={f.key} type="button" className={filter === f.key ? 'is-on' : ''} aria-pressed={filter === f.key} onClick={() => set('status', f.key)}>
              {f.label}
              <span className="seg-count">{f.key === 'all' ? WORKLOADS.length : WORKLOADS.filter((w) => w.status === f.key).length}</span>
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="workload-grid">
        {list.map((w) => (
          <button key={w.name} type="button" className={`workload status-${w.status}${w.name === selected.name ? ' is-selected' : ''}`} onClick={() => set('w', w.name)} aria-pressed={w.name === selected.name}>
            <div className="workload-head">
              <div>
                <div className="mono strong">{w.name}</div>
                <div className="muted small">
                  {w.kind} · {w.version}
                </div>
              </div>
              <HealthBadge status={w.status} />
            </div>
            <div className="workload-note">{w.statusNote}</div>
            <div className="workload-metrics">
              {METRIC_DEFS.map((m) => {
                const values = w.metrics[m.key]
                return (
                  <div key={m.key} className="workload-metric">
                    <div className="workload-metric-head">
                      <span className="muted small">{m.label}</span>
                      <span className="small strong">{fmt(values[values.length - 1], m.unit)}</span>
                    </div>
                    <Sparkline values={values} max={m.unit === '%' && m.key !== 'errors' ? 100 : undefined} accent="var(--series-4)" height={26} ariaLabel={`${w.name} ${m.label}`} format={(v, i) => `${fmt(v, m.unit)} at ${shortTime(w.start + i * w.step)}`} />
                  </div>
                )
              })}
            </div>
            <div className="workload-foot small">
              <span>
                {w.replicas.ready}/{w.replicas.desired} ready
              </span>
              <span>{w.restarts24h} restarts in 24h</span>
            </div>
          </button>
        ))}
      </div>

      <section className="panel">
        <header className="panel-head">
          <div className="panel-titles">
            <h2>
              <span className="mono">{selected.name}</span> over 24 hours
            </h2>
            <p className="panel-sub">
              {selected.statusNote}
              {selected.incidentId && (
                <>
                  {' '}
                  · <Link to={`/incidents/${selected.incidentId}`}>{selected.incidentId}</Link>
                </>
              )}
            </p>
          </div>
          <HealthBadge status={selected.status} />
        </header>
        <div className="multiples multiples-4">
          {METRIC_DEFS.map((m, i) => (
            <div key={m.key} className="multiple">
              <div className="multiple-head">
                <span className="key-line" style={{ background: COLORS[i] }} />
                <strong>{m.label}</strong>
                <span className="multiple-now">now {fmt(selected.metrics[m.key][selected.metrics[m.key].length - 1], m.unit)}</span>
              </div>
              <LineChart
                start={selected.start}
                step={selected.step}
                values={selected.metrics[m.key]}
                color={COLORS[i]}
                label={m.label}
                unit={m.unit}
                threshold={'threshold' in m ? m.threshold : undefined}
                height={150}
                ariaLabel={`${selected.name} ${m.label} over 24 hours`}
                formatValue={(v) => fmt(v, m.unit)}
              />
            </div>
          ))}
        </div>
      </section>

      <Panel
        title="CPU by workload and hour"
        subtitle="Hourly average CPU utilisation. Darker cells on light, brighter cells on dark, mean higher use."
        table={
          <DataTable
            caption="Hourly CPU by workload"
            rows={hourly}
            rowKey={(r) => r.key}
            columns={[
              { key: 'w', label: 'workload', render: (r) => <span className="mono">{r.label}</span> },
              ...hourly[0].values.map((_, c) => ({
                key: String(c),
                label: shortTime(heatStart + c * HOUR),
                numeric: true,
                render: (r: (typeof hourly)[number]) => r.values[c].toFixed(0),
              })),
            ]}
          />
        }
      >
        <Heatmap rows={hourly} start={heatStart} step={HOUR} domain={[0, 100]} unit="%" ariaLabel="Heatmap of hourly CPU by workload over 24 hours" />
      </Panel>
    </div>
  )
}
