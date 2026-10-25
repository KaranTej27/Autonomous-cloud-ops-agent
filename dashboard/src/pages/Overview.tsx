import { ExternalLink } from 'lucide-react'
import { useMemo } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { DecisionBadge, DomainBadge, HealthBadge, StateBadge, UrgencyBadge, decisionColor, urgencyColor } from '../components/Badges'
import { BarList } from '../components/charts/BarList'
import { ColumnChart, type ColumnDatum } from '../components/charts/ColumnChart'
import { Legend } from '../components/charts/Legend'
import { Sparkline } from '../components/charts/Sparkline'
import { DataTable } from '../components/DataTable'
import { Panel } from '../components/Panel'
import { PageHeader } from '../components/Shell'
import { StatTile, type Delta } from '../components/StatTile'
import { TimeRangePicker } from '../components/TimeRangePicker'
import { EVENTS, SOURCETYPE_SERIES } from '../data/events'
import { DETECTIONS, POLICY_DECISIONS } from '../data/incidents'
import { URGENCIES, type Decision, type Incident } from '../data/types'
import { WORKLOADS } from '../data/workloads'
import { axisLabel, compact, dayTime, duration, integer, pct, relative, shortTime, titleCase } from '../lib/format'
import { DAY, NOW, getRange, makeBuckets, type RangeKey } from '../lib/time'
import { useApp } from '../state/AppState'
import { isOpen, pendingApprovals, searchHref, useIncidents } from '../state/selectors'

function pctDelta(cur: number, prev: number | null, upIsGood: boolean | null): Delta | undefined {
  if (prev === null || prev === 0) return undefined
  const change = ((cur - prev) / prev) * 100
  const direction = Math.abs(change) < 0.5 ? 'flat' : change > 0 ? 'up' : 'down'
  return {
    text: `${change > 0 ? '+' : ''}${pct(change)} vs previous`,
    direction,
    good: direction === 'flat' || upIsGood === null ? null : (direction === 'up') === upIsGood,
  }
}

function openAt(incidents: Incident[], t: number): number {
  return incidents.filter((i) => i.createdAt <= t && (i.resolvedAt === undefined || i.resolvedAt > t)).length
}

export function Overview() {
  const [params, setParams] = useSearchParams()
  const range = getRange(params.get('range'))
  const navigate = useNavigate()
  const { mode, emergencyStop } = useApp()
  const incidents = useIncidents()

  const from = NOW - range.ms
  const prevFrom = from - range.ms
  const hasPrev = prevFrom >= NOW - 7 * DAY

  const { buckets, totals, eventCount, prevEventCount, trend } = useMemo(() => {
    const bs = makeBuckets(from, NOW, range.bucketMs)
    const data: ColumnDatum[] = bs.map((b) => ({ ...b, values: {} }))
    const first = bs[0]?.start ?? from
    const totals: Record<string, number> = {}
    let count = 0
    let prev = 0
    for (const e of EVENTS) {
      if (e.time >= from && e.time <= NOW) {
        const idx = Math.floor((e.time - first) / range.bucketMs)
        const d = data[idx]
        if (d) d.values[e.sourcetype] = (d.values[e.sourcetype] ?? 0) + 1
        totals[e.sourcetype] = (totals[e.sourcetype] ?? 0) + 1
        count++
      } else if (hasPrev && e.time >= prevFrom && e.time < from) prev++
    }
    // The trend uses complete buckets only, so the still-filling last bucket does not read as a drop.
    const complete = data.filter((d) => d.end <= NOW)
    const per = Math.max(1, Math.floor(complete.length / 12))
    const tr: number[] = []
    for (let i = 0; i + per <= complete.length; i += per) {
      tr.push(complete.slice(i, i + per).reduce((s, d) => s + Object.values(d.values).reduce((a, b) => a + b, 0), 0))
    }
    return { buckets: data, totals, eventCount: count, prevEventCount: hasPrev ? prev : null, trend: tr }
  }, [from, prevFrom, hasPrev, range.bucketMs])

  const open = incidents.filter(isOpen)
  const openedInRange = incidents.filter((i) => i.createdAt >= from)
  const critHigh = open.filter((i) => i.urgency === 'critical' || i.urgency === 'high')
  const pending = pendingApprovals(incidents)
  const nextExpiry = pending.map((i) => i.proposal?.expiresAt ?? Infinity).sort((a, b) => a - b)[0]

  const mttd = (list: Incident[]) => (list.length ? list.reduce((s, i) => s + (i.createdAt - i.firstSignalAt), 0) / list.length : null)
  const mttdNow = mttd(openedInRange)
  const mttdPrev = hasPrev ? mttd(incidents.filter((i) => i.createdAt >= prevFrom && i.createdAt < from)) : null
  const mttdDelta: Delta | undefined =
    mttdNow !== null && mttdPrev !== null
      ? { text: `${duration(Math.abs(mttdNow - mttdPrev))} ${mttdNow <= mttdPrev ? 'faster' : 'slower'} than previous`, direction: mttdNow <= mttdPrev ? 'down' : 'up', good: mttdNow <= mttdPrev }
      : undefined

  const openTrend = Array.from({ length: 12 }, (_, i) => openAt(incidents, from + ((i + 1) / 12) * range.ms))

  const detections = DETECTIONS.filter((d) => d.t >= from)
  const byRule = new Map<string, { firings: number; suppressed: number; incidents: Set<string> }>()
  for (const d of detections) {
    const r = byRule.get(d.rule) ?? { firings: 0, suppressed: 0, incidents: new Set<string>() }
    r.firings++
    if (d.suppressed) r.suppressed++
    if (d.incidentId) r.incidents.add(d.incidentId)
    byRule.set(d.rule, r)
  }
  const ruleRows = [...byRule.entries()].map(([rule, r]) => ({ rule, ...r })).sort((a, b) => b.firings - a.firings)

  const decisions = POLICY_DECISIONS.filter((d) => d.t >= from)
  const decisionCounts = (['allow', 'require_approval', 'deny'] as Decision[]).map((d) => ({ d, n: decisions.filter((x) => x.decision === d).length }))

  const urgencyRows = URGENCIES.map((u) => ({ u, n: open.filter((i) => i.urgency === u).length }))
  const notable = [...incidents].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6)

  const setRange = (k: RangeKey) => setParams({ range: k })

  return (
    <div className="page">
      <PageHeader title="Security and reliability posture" description="Operational and security signals from the lab, correlated into one incident workflow.">
        <TimeRangePicker value={range.key} onChange={setRange} />
      </PageHeader>

      <div className="stat-grid">
        <StatTile
          hero
          label="Open incidents"
          value={integer(open.length)}
          trend={openTrend}
          trendFormat={(v, i) => `${v} open at ${shortTime(from + ((i + 1) / 12) * range.ms)}`}
          foot={`${openedInRange.length} opened in ${range.label.toLowerCase()}`}
        />
        <StatTile
          label="Critical or high, open"
          value={integer(critHigh.length)}
          foot={
            <span className="stat-split">
              <UrgencyBadge urgency="critical" compact /> {critHigh.filter((i) => i.urgency === 'critical').length}
              <UrgencyBadge urgency="high" compact /> {critHigh.filter((i) => i.urgency === 'high').length}
            </span>
          }
        />
        <StatTile
          label="Awaiting approval"
          value={integer(pending.length)}
          foot={pending.length ? <Link to="/approvals">Nearest expires {relative(nextExpiry, Date.now())}</Link> : 'Nothing waiting'}
        />
        <StatTile label="Mean time to detect" value={mttdNow === null ? 'None' : duration(mttdNow)} delta={mttdDelta} foot={mttdNow === null ? 'No incidents opened in range' : `Across ${openedInRange.length} incidents opened in range`} />
        <StatTile
          label="Events indexed"
          value={compact(eventCount)}
          delta={pctDelta(eventCount, prevEventCount, null)}
          trend={trend}
          trendFormat={(v) => `${integer(v)} events`}
          foot={`${Object.keys(totals).length} sourcetypes`}
        />
      </div>

      <div className="grid">
        <Panel
          className="span-8"
          title="Event volume by sourcetype"
          subtitle={`${integer(eventCount)} events, ${range.bucketLabel}`}
          actions={
            <Link className="btn btn-ghost btn-sm" to={searchHref('index=*', range.key)}>
              <ExternalLink size={13} aria-hidden="true" /> Open in Search
            </Link>
          }
          legend={<Legend items={SOURCETYPE_SERIES.map((s) => ({ ...s, value: compact(totals[s.key] ?? 0) }))} />}
          table={
            <DataTable
              caption="Event volume by sourcetype"
              rows={buckets}
              rowKey={(b) => String(b.start)}
              columns={[
                { key: 't', label: '_time', render: (b) => dayTime(b.start), sortValue: (b) => b.start },
                ...SOURCETYPE_SERIES.map((s) => ({ key: s.key, label: s.label, numeric: true, render: (b: ColumnDatum) => integer(b.values[s.key] ?? 0), sortValue: (b: ColumnDatum) => b.values[s.key] ?? 0 })),
              ]}
            />
          }
        >
          <ColumnChart
            data={buckets}
            series={SOURCETYPE_SERIES}
            height={236}
            ariaLabel={`Stacked columns of event volume by sourcetype, ${range.label}`}
            formatTick={(t) => axisLabel(t, range.bucketMs)}
            formatRange={(d) => `${dayTime(d.start)} to ${shortTime(d.end)}`}
          />
        </Panel>

        <Panel
          className="span-4"
          title="Open incidents by urgency"
          subtitle={`${open.length} open`}
          table={
            <DataTable caption="Open incidents by urgency" rows={urgencyRows} rowKey={(r) => r.u} columns={[{ key: 'u', label: 'urgency', render: (r) => <UrgencyBadge urgency={r.u} /> }, { key: 'n', label: 'count', numeric: true, render: (r) => r.n }]} />
          }
        >
          <BarList
            ariaLabel="Open incidents by urgency"
            labelWidth={132}
            items={urgencyRows.map((r) => ({
              key: r.u,
              label: <UrgencyBadge urgency={r.u} />,
              value: r.n,
              color: urgencyColor(r.u),
              onClick: () => navigate(`/incidents?urgency=${r.u}&status=open`),
            }))}
          />
          <p className="panel-note">Select a row to filter Incident Review.</p>
        </Panel>

        <Panel
          className="span-8"
          title="Notable incidents"
          subtitle="Most recently updated"
          actions={
            <Link className="btn btn-ghost btn-sm" to="/incidents">
              View all
            </Link>
          }
          flush
        >
          <DataTable
            caption="Notable incidents"
            rows={notable}
            rowKey={(i) => i.id}
            onRowClick={(i) => navigate(`/incidents/${i.id}`)}
            columns={[
              { key: 'u', label: 'Urgency', render: (i) => <UrgencyBadge urgency={i.urgency} />, width: 120 },
              {
                key: 'title',
                label: 'Incident',
                render: (i) => (
                  <span className="cell-title">
                    <Link to={`/incidents/${i.id}`} onClick={(e) => e.stopPropagation()}>
                      {i.title}
                    </Link>
                    <span className="mono muted small">{i.id}</span>
                  </span>
                ),
              },
              { key: 'd', label: 'Domain', render: (i) => <DomainBadge domain={i.domain} />, width: 130 },
              { key: 's', label: 'State', render: (i) => <StateBadge state={i.state} />, width: 170 },
              { key: 't', label: 'Updated', render: (i) => <span className="muted nowrap">{relative(i.updatedAt)}</span>, width: 100 },
            ]}
          />
        </Panel>

        <Panel
          className="span-4"
          title="Top detections"
          subtitle={`${detections.length} firings, ${detections.filter((d) => !d.suppressed).length} opened an incident, the rest were deduplicated`}
          table={
            <DataTable
              caption="Top detections"
              rows={ruleRows}
              rowKey={(r) => r.rule}
              columns={[
                { key: 'rule', label: 'rule', render: (r) => <code>{r.rule}</code> },
                { key: 'f', label: 'firings', numeric: true, render: (r) => r.firings, sortValue: (r) => r.firings },
                { key: 's', label: 'suppressed', numeric: true, render: (r) => r.suppressed },
                { key: 'i', label: 'incidents', numeric: true, render: (r) => r.incidents.size },
              ]}
            />
          }
        >
          {ruleRows.length ? (
            <BarList ariaLabel="Detection firings by rule" labelWidth={196} items={ruleRows.slice(0, 7).map((r) => ({ key: r.rule, label: <code className="rule-name">{r.rule}</code>, value: r.firings, color: 'var(--series-1)' }))} />
          ) : (
            <p className="empty">No detections fired in this range.</p>
          )}
        </Panel>

        <Panel className="span-8" title="Workload health" subtitle="lab-workloads, CPU over the last 24 hours" actions={<Link className="btn btn-ghost btn-sm" to="/health">Details</Link>}>
          <div className="mini-health">
            {WORKLOADS.map((w) => (
              <Link key={w.name} to={`/health?w=${w.name}`} className={`mini-health-item status-${w.status}`}>
                <div className="mini-health-head">
                  <span className="mono">{w.name}</span>
                  <HealthBadge status={w.status} />
                </div>
                <Sparkline values={w.metrics.cpu} max={100} accent="var(--series-4)" ariaLabel={`${w.name} CPU, last 24 hours`} format={(v) => `CPU ${v.toFixed(0)}%`} />
                <div className="mini-health-foot">
                  <span>CPU {w.metrics.cpu[w.metrics.cpu.length - 1].toFixed(0)}%</span>
                  <span>
                    {w.replicas.ready}/{w.replicas.desired} ready
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </Panel>

        <Panel
          className="span-4"
          title="Platform controls"
          subtitle="Safety state of the agent itself"
          table={
            <DataTable
              caption="Policy decisions"
              rows={decisionCounts}
              rowKey={(r) => r.d}
              columns={[
                { key: 'd', label: 'decision', render: (r) => <DecisionBadge decision={r.d} /> },
                { key: 'n', label: 'count', numeric: true, render: (r) => r.n },
              ]}
            />
          }
        >
          <dl className="kv kv-compact">
            <dt>Operating mode</dt>
            <dd>{titleCase(mode)}</dd>
            <dt>Emergency stop</dt>
            <dd className={emergencyStop ? 'text-bad' : undefined}>{emergencyStop ? 'Engaged' : 'Released'}</dd>
            <dt>Policy</dt>
            <dd className="mono">policy-2026.10.3</dd>
            <dt>Model provider</dt>
            <dd>Not configured. Rule-based baseline only.</dd>
            <dt>Budget per incident</dt>
            <dd>25 tool calls, 15 minutes</dd>
          </dl>
          <h3 className="subhead">Policy decisions in range</h3>
          <BarList
            ariaLabel="Policy decisions by outcome"
            labelWidth={168}
            items={decisionCounts.map((r) => ({ key: r.d, label: <DecisionBadge decision={r.d} />, value: r.n, color: decisionColor(r.d), onClick: () => navigate('/audit?event=policy_decision') }))}
          />
        </Panel>
      </div>
    </div>
  )
}
