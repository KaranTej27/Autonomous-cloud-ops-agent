import { ChevronDown, ChevronRight, ExternalLink, Search as SearchIcon, UserPlus } from 'lucide-react'
import { Fragment, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { DomainBadge, SimBadge, StateBadge, UrgencyBadge, urgencyColor } from '../components/Badges'
import { PageHeader } from '../components/Shell'
import { TimeRangePicker } from '../components/TimeRangePicker'
import { URGENCIES, type Incident, type Urgency } from '../data/types'
import { integer, relative, splunkTime, titleCase } from '../lib/format'
import { NOW, getRange, type RangeKey } from '../lib/time'
import { CURRENT_USER, useApp } from '../state/AppState'
import { isOpen, rangeFor, searchHref, useIncidents } from '../state/selectors'

const STATUS_FILTERS = [
  { key: 'all', label: 'All statuses', test: () => true },
  { key: 'open', label: 'Open', test: (i: Incident) => isOpen(i) },
  { key: 'awaiting_approval', label: 'Awaiting approval', test: (i: Incident) => i.state === 'awaiting_approval' },
  { key: 'investigating', label: 'Investigating or diagnosed', test: (i: Incident) => ['investigating', 'diagnosed', 'correlating', 'detected'].includes(i.state) },
  { key: 'escalated', label: 'Escalated', test: (i: Incident) => i.state === 'escalated' },
  { key: 'done', label: 'Resolved or closed', test: (i: Incident) => !isOpen(i) },
] as const

const OWNERS = ['k.analyst', 'm.okafor', 's.lindqvist']

export function IncidentReview() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const { assignOwner, notify } = useApp()
  const incidents = useIncidents()

  const range = getRange(params.get('range') ?? '7d')
  const urgency = (params.get('urgency') as Urgency | null) ?? null
  const status = params.get('status') ?? 'all'
  const domain = params.get('domain') ?? 'all'
  const owner = params.get('owner') ?? 'all'
  const [text, setText] = useState(params.get('q') ?? '')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selected, setSelected] = useState<Set<string>>(new Set())

  function update(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value === null || value === 'all' || value === '') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  const base = useMemo(() => {
    const from = NOW - range.ms
    const q = text.trim().toLowerCase()
    const statusTest = STATUS_FILTERS.find((s) => s.key === status)?.test ?? (() => true)
    return incidents.filter(
      (i) =>
        i.updatedAt >= from &&
        statusTest(i) &&
        (domain === 'all' || i.domain === domain) &&
        (owner === 'all' || (owner === 'unassigned' ? !i.owner : i.owner === owner)) &&
        (!q || `${i.id} ${i.title} ${i.rule} ${i.entities.map((e) => e.name).join(' ')}`.toLowerCase().includes(q)),
    )
  }, [incidents, range.ms, status, domain, owner, text])

  const rows = urgency ? base.filter((i) => i.urgency === urgency) : base
  const sorted = [...rows].sort((a, b) => b.createdAt - a.createdAt)

  function toggle(set: Set<string>, id: string, setter: (s: Set<string>) => void) {
    const next = new Set(set)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setter(next)
  }

  function assignSelectedToMe() {
    selected.forEach((id) => assignOwner(id, CURRENT_USER))
    notify({ tone: 'success', title: `Assigned ${selected.size} incident${selected.size === 1 ? '' : 's'} to ${CURRENT_USER}` })
    setSelected(new Set())
  }

  const allChecked = sorted.length > 0 && sorted.every((i) => selected.has(i.id))

  return (
    <div className="page">
      <PageHeader title="Incident Review" description="Triage correlated incidents. Each row links to its evidence, hypotheses, and proposed response.">
        <TimeRangePicker value={range.key} onChange={(k: RangeKey) => update('range', k)} />
      </PageHeader>

      <div className="urgency-strip" role="group" aria-label="Filter by urgency">
        {URGENCIES.map((u) => {
          const n = base.filter((i) => i.urgency === u).length
          const on = urgency === u
          return (
            <button key={u} type="button" className={`urgency-tile${on ? ' is-on' : ''}`} style={{ ['--u' as string]: urgencyColor(u) }} aria-pressed={on} onClick={() => update('urgency', on ? null : u)}>
              <UrgencyBadge urgency={u} />
              <span className="urgency-count">{n}</span>
            </button>
          )
        })}
        <div className="urgency-total">
          <span className="muted">Total</span>
          <strong>{base.length}</strong>
        </div>
      </div>

      <div className="filter-bar">
        <label className="input-icon">
          <SearchIcon size={14} aria-hidden="true" />
          <input
            type="search"
            placeholder="Filter by ID, title, rule, or entity"
            value={text}
            onChange={(e) => {
              setText(e.target.value)
              update('q', e.target.value)
            }}
            aria-label="Filter incidents"
          />
        </label>
        <select className="select" value={status} onChange={(e) => update('status', e.target.value)} aria-label="Status">
          {STATUS_FILTERS.map((s) => (
            <option key={s.key} value={s.key}>
              {s.label}
            </option>
          ))}
        </select>
        <select className="select" value={domain} onChange={(e) => update('domain', e.target.value)} aria-label="Domain">
          <option value="all">All domains</option>
          <option value="cloudops">CloudOps</option>
          <option value="soc">SOC</option>
          <option value="mixed">CloudOps + SOC</option>
        </select>
        <select className="select" value={owner} onChange={(e) => update('owner', e.target.value)} aria-label="Owner">
          <option value="all">All owners</option>
          <option value="unassigned">Unassigned</option>
          {OWNERS.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {(urgency || status !== 'all' || domain !== 'all' || owner !== 'all' || text) && (
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => {
              setText('')
              setParams(range.key === '7d' ? {} : { range: range.key }, { replace: true })
            }}
          >
            Clear filters
          </button>
        )}
        <div className="filter-spacer" />
        <button type="button" className="btn btn-sm" disabled={selected.size === 0} onClick={assignSelectedToMe}>
          <UserPlus size={14} aria-hidden="true" /> Assign {selected.size || ''} to me
        </button>
      </div>

      <section className="panel">
        <div className="table-wrap">
          <table className="data-table review-table">
            <caption className="sr-only">Incidents</caption>
            <thead>
              <tr>
                <th style={{ width: 34 }}>
                  <input
                    type="checkbox"
                    aria-label="Select all"
                    checked={allChecked}
                    onChange={() => setSelected(allChecked ? new Set() : new Set(sorted.map((i) => i.id)))}
                  />
                </th>
                <th style={{ width: 30 }}>
                  <span className="sr-only">Expand</span>i
                </th>
                <th style={{ width: 130 }}>Time</th>
                <th style={{ width: 120 }}>Urgency</th>
                <th>Title</th>
                <th style={{ width: 130 }}>Domain</th>
                <th style={{ width: 170 }}>State</th>
                <th style={{ width: 120 }}>Owner</th>
                <th style={{ width: 90 }} className="num">
                  Events
                </th>
              </tr>
            </thead>
            <tbody>
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={9} className="table-empty">
                    No incidents match these filters.
                  </td>
                </tr>
              )}
              {sorted.map((i) => {
                const open = expanded.has(i.id)
                const t = splunkTime(i.createdAt)
                return (
                  <Fragment key={i.id}>
                    <tr className={`review-row${open ? ' is-open' : ''}`} style={{ ['--u' as string]: urgencyColor(i.urgency) }}>
                      <td>
                        <input type="checkbox" aria-label={`Select ${i.id}`} checked={selected.has(i.id)} onChange={() => toggle(selected, i.id, setSelected)} />
                      </td>
                      <td>
                        <button type="button" className="icon-btn" aria-expanded={open} aria-label={`${open ? 'Collapse' : 'Expand'} ${i.id}`} onClick={() => toggle(expanded, i.id, setExpanded)}>
                          {open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                        </button>
                      </td>
                      <td className="nowrap">
                        <div>{t.date}</div>
                        <div className="muted small">{t.time}</div>
                      </td>
                      <td>
                        <UrgencyBadge urgency={i.urgency} />
                      </td>
                      <td>
                        <span className="cell-title">
                          <Link to={`/incidents/${i.id}`}>{i.title}</Link>
                          <span className="mono muted small">
                            {i.id} · {i.rule}
                          </span>
                        </span>
                      </td>
                      <td>
                        <DomainBadge domain={i.domain} />
                      </td>
                      <td>
                        <StateBadge state={i.state} />
                      </td>
                      <td className={i.owner ? undefined : 'muted'}>{i.owner ?? 'unassigned'}</td>
                      <td className="num">{integer(i.eventCount)}</td>
                    </tr>
                    {open && (
                      <tr className="review-detail">
                        <td />
                        <td colSpan={8}>
                          <div className="review-detail-grid">
                            <div>
                              <h3 className="subhead">Summary</h3>
                              <p>{i.summary}</p>
                              <h3 className="subhead">Current assessment</h3>
                              <p>{i.assessment}</p>
                            </div>
                            <div>
                              <h3 className="subhead">Entities</h3>
                              <div className="chip-row">
                                {i.entities.map((e) => (
                                  <span key={e.name} className="chip">
                                    <span className="chip-kind">{e.type}</span>
                                    <span className="mono">{e.name}</span>
                                  </span>
                                ))}
                              </div>
                              <dl className="kv kv-compact">
                                <dt>Scenario</dt>
                                <dd>
                                  <span className="mono">{i.scenarioId}</span> <SimBadge />
                                </dd>
                                <dt>Detected</dt>
                                <dd>
                                  {relative(i.createdAt)}, {Math.round((i.createdAt - i.firstSignalAt) / 60000)}m after the first signal
                                </dd>
                                <dt>Owner</dt>
                                <dd>
                                  <select className="select select-sm" value={i.owner ?? ''} onChange={(e) => e.target.value && assignOwner(i.id, e.target.value)} aria-label={`Owner for ${i.id}`}>
                                    <option value="">unassigned</option>
                                    {OWNERS.map((o) => (
                                      <option key={o} value={o}>
                                        {o}
                                      </option>
                                    ))}
                                  </select>
                                </dd>
                              </dl>
                              <div className="btn-row">
                                <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/incidents/${i.id}`)}>
                                  Open investigation
                                </button>
                                <Link className="btn btn-sm" to={searchHref(i.searchQuery, rangeFor(i))}>
                                  <ExternalLink size={13} aria-hidden="true" /> {integer(i.eventCount)} contributing events
                                </Link>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="table-foot muted small">
          {sorted.length} of {incidents.length} incidents · {titleCase(range.label)} by last update
        </div>
      </section>
    </div>
  )
}
