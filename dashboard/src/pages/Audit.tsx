import { Search as SearchIcon, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { DataTable } from '../components/DataTable'
import { PageHeader } from '../components/Shell'
import { sealRecord } from '../data/audit'
import { fullTime, integer } from '../lib/format'
import { useApp } from '../state/AppState'

export function Audit() {
  const { audit, notify } = useApp()
  const [params, setParams] = useSearchParams()
  const [text, setText] = useState('')
  const event = params.get('event') ?? 'all'
  const actor = params.get('actor') ?? 'all'
  const [check, setCheck] = useState<{ ok: boolean; at: number; broken?: number } | null>(null)

  const events = useMemo(() => [...new Set(audit.map((r) => r.event))].sort(), [audit])
  const actors = useMemo(() => [...new Set(audit.map((r) => r.actor))].sort(), [audit])

  const rows = useMemo(() => {
    const q = text.trim().toLowerCase()
    return audit
      .filter((r) => (event === 'all' || r.event === event) && (actor === 'all' || r.actor === actor) && (!q || `${r.details} ${r.incidentId ?? ''} ${r.hash}`.toLowerCase().includes(q)))
      .sort((a, b) => b.id - a.id)
  }, [audit, event, actor, text])

  function set(k: string, v: string) {
    const next = new URLSearchParams(params)
    if (v === 'all') next.delete(k)
    else next.set(k, v)
    setParams(next, { replace: true })
  }

  function verify() {
    let prev = '00000000'
    for (const r of audit) {
      const expected = sealRecord(prev, r.id, { t: r.t, actor: r.actor, event: r.event, incidentId: r.incidentId, details: r.details })
      if (r.prevHash !== prev || r.hash !== expected.hash) {
        setCheck({ ok: false, at: Date.now(), broken: r.id })
        notify({ tone: 'critical', title: `Chain broken at record ${r.id}` })
        return
      }
      prev = r.hash
    }
    setCheck({ ok: true, at: Date.now() })
    notify({ tone: 'success', title: 'Audit chain intact', body: `${integer(audit.length)} records checked.` })
  }

  return (
    <div className="page">
      <PageHeader title="Audit trail" description="Append-only record of detections, decisions, approvals, and control changes. Each record stores the hash of the one before it.">
        <button type="button" className="btn" onClick={verify}>
          <ShieldCheck size={14} aria-hidden="true" /> Verify chain
        </button>
      </PageHeader>

      {check && (
        <p className={`note tone-${check.ok ? 'good' : 'critical'}`}>
          {check.ok ? <ShieldCheck size={14} aria-hidden="true" /> : <TriangleAlert size={14} aria-hidden="true" />}
          {check.ok ? `Chain intact across ${integer(audit.length)} records, checked ${fullTime(check.at)}.` : `Chain broken at record ${check.broken}.`} The hash here is FNV-1a for illustration only. The real design is an open question in docs/architecture.md.
        </p>
      )}

      <div className="filter-bar">
        <label className="input-icon">
          <SearchIcon size={14} aria-hidden="true" />
          <input type="search" placeholder="Filter details, incident, or hash" value={text} onChange={(e) => setText(e.target.value)} aria-label="Filter audit records" />
        </label>
        <select className="select" value={event} onChange={(e) => set('event', e.target.value)} aria-label="Event type">
          <option value="all">All events</option>
          {events.map((e) => (
            <option key={e} value={e}>
              {e}
            </option>
          ))}
        </select>
        <select className="select" value={actor} onChange={(e) => set('actor', e.target.value)} aria-label="Actor">
          <option value="all">All actors</option>
          {actors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <div className="filter-spacer" />
        <span className="muted small">
          {integer(rows.length)} of {integer(audit.length)} records
        </span>
      </div>

      <section className="panel">
        <DataTable
          caption="Audit records"
          rows={rows.slice(0, 300)}
          rowKey={(r) => String(r.id)}
          columns={[
            { key: 'id', label: '#', numeric: true, render: (r) => r.id, width: 60, sortValue: (r) => r.id },
            { key: 't', label: 'Time', render: (r) => <span className="nowrap">{fullTime(r.t)}</span>, width: 190, sortValue: (r) => r.t },
            { key: 'a', label: 'Actor', render: (r) => <span className="mono">{r.actor}</span>, width: 150, sortValue: (r) => r.actor },
            { key: 'e', label: 'Event', render: (r) => <code className={`chip mono ev-${r.event}`}>{r.event}</code>, width: 200, sortValue: (r) => r.event },
            { key: 'i', label: 'Incident', render: (r) => (r.incidentId ? <Link to={`/incidents/${r.incidentId}`} className="mono">{r.incidentId}</Link> : <span className="muted">none</span>), width: 100 },
            { key: 'd', label: 'Details', render: (r) => r.details },
            {
              key: 'h',
              label: 'Hash chain',
              render: (r) => (
                <span className="mono small hash">
                  <span className="muted">{r.prevHash}</span> → {r.hash}
                </span>
              ),
              width: 190,
            },
          ]}
        />
        {rows.length > 300 && <div className="table-foot muted small">Showing the newest 300 records.</div>}
      </section>
    </div>
  )
}
