import { Activity, ArrowLeft, Check, CircleUser, ExternalLink, FileText, Info, Network, ScrollText, ShieldAlert, UserPlus } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { ConfidenceBadge, DomainBadge, SimBadge, StateBadge, UrgencyBadge } from '../components/Badges'
import { LineChart } from '../components/charts/LineChart'
import { DataTable } from '../components/DataTable'
import { ProposalCard } from '../components/ProposalCard'
import { INCIDENTS } from '../data/incidents'
import { LIFECYCLE, type Evidence, type Hypothesis, type Incident, type TimelineEntry } from '../data/types'
import { duration, fullTime, integer, relative, splunkTime, timeWithSeconds, titleCase } from '../lib/format'
import { CURRENT_USER, useApp } from '../state/AppState'
import { rangeFor, searchHref, useIncident } from '../state/selectors'

type Tab = 'summary' | 'timeline' | 'evidence' | 'hypotheses' | 'response' | 'audit'

const SERIES_COLOR = ['var(--series-4)', 'var(--series-2)', 'var(--series-3)']

function formatSignal(v: number): string {
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(v < 10 ? 1 : 0)
}

export function IncidentDetail() {
  const { id } = useParams()
  const inc = useIncident(id)
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab | null) ?? 'summary'
  const [focusEvidence, setFocusEvidence] = useState<string | null>(null)
  const { assignOwner, notify, audit } = useApp()

  if (!inc) {
    return (
      <div className="page">
        <div className="empty-state">
          <h1>Incident not found</h1>
          <p className="muted">There is no incident with ID {id} in the synthetic data set.</p>
          <Link to="/incidents" className="btn">
            Back to Incident Review
          </Link>
        </div>
      </div>
    )
  }

  const setTab = (t: Tab) => {
    const next = new URLSearchParams(params)
    next.set('tab', t)
    setParams(next, { replace: true })
  }
  const showEvidence = (eid: string) => {
    setFocusEvidence(eid)
    setTab('evidence')
    window.setTimeout(() => document.getElementById(`ev-${eid}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 40)
  }

  const records = audit.filter((r) => r.incidentId === inc.id).sort((a, b) => b.id - a.id)
  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'summary', label: 'Summary' },
    { key: 'timeline', label: 'Timeline', count: inc.timeline.length },
    { key: 'evidence', label: 'Evidence', count: inc.evidence.length },
    { key: 'hypotheses', label: 'Hypotheses', count: inc.hypotheses.length },
    { key: 'response', label: 'Response', count: inc.proposal ? 1 : 0 },
    { key: 'audit', label: 'Audit', count: records.length },
  ]

  return (
    <div className="page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link to="/incidents">
          <ArrowLeft size={14} aria-hidden="true" /> Incident Review
        </Link>
        <span aria-hidden="true">/</span>
        <span className="mono">{inc.id}</span>
      </nav>

      <header className="incident-head" style={{ ['--u' as string]: `var(--sev-${inc.urgency === 'informational' ? 'info' : inc.urgency})` }}>
        <div className="incident-head-main">
          <div className="badge-row">
            <UrgencyBadge urgency={inc.urgency} />
            <StateBadge state={inc.state} />
            <DomainBadge domain={inc.domain} />
            <SimBadge />
            <span className="mono muted small">
              {inc.id} · scenario {inc.scenarioId}
            </span>
          </div>
          <h1>{inc.title}</h1>
          <p className="incident-summary">{inc.summary}</p>
        </div>
        <div className="incident-head-actions">
          <Link className="btn" to={searchHref(inc.searchQuery, rangeFor(inc))}>
            <ExternalLink size={14} aria-hidden="true" /> Open in Search
          </Link>
          {inc.owner !== CURRENT_USER && (
            <button
              type="button"
              className="btn"
              onClick={() => {
                assignOwner(inc.id, CURRENT_USER)
                notify({ tone: 'success', title: `${inc.id} assigned to ${CURRENT_USER}` })
              }}
            >
              <UserPlus size={14} aria-hidden="true" /> Assign to me
            </button>
          )}
        </div>
      </header>

      <Lifecycle incident={inc} />

      <div className="assessment">
        <Info size={16} aria-hidden="true" />
        <div>
          <strong>Current assessment.</strong> {inc.assessment}
        </div>
      </div>

      <div className="fact-strip">
        <Fact label="First signal" value={fullTime(inc.firstSignalAt)} />
        <Fact label="Detected" value={relative(inc.createdAt)} sub={`${duration(inc.createdAt - inc.firstSignalAt)} after the first signal`} />
        <Fact label="Last update" value={relative(inc.updatedAt)} />
        <Fact label="Owner" value={inc.owner ?? 'unassigned'} />
        <Fact label="Contributing events" value={integer(inc.eventCount)} />
        <Fact label="Rule" value={<span className="mono">{inc.rule}</span>} />
      </div>

      <div className="tabs" role="tablist" aria-label="Incident sections">
        {tabs.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'is-active' : undefined} onClick={() => setTab(t.key)}>
            {t.label}
            {t.count !== undefined && <span className="tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      <div role="tabpanel" className="tab-panel">
        {tab === 'summary' && <SummaryTab incident={inc} onEvidence={showEvidence} />}
        {tab === 'timeline' && <TimelineTab incident={inc} onEvidence={showEvidence} />}
        {tab === 'evidence' && <EvidenceTab incident={inc} focus={focusEvidence} />}
        {tab === 'hypotheses' && <HypothesesTab incident={inc} onEvidence={showEvidence} />}
        {tab === 'response' &&
          (inc.proposal ? (
            <ProposalCard incident={inc} proposal={inc.proposal} />
          ) : (
            <div className="empty-state small">
              <p>No response has been proposed yet. The investigation is still collecting evidence.</p>
            </div>
          ))}
        {tab === 'audit' && (
          <section className="panel">
            <DataTable
              caption="Audit records for this incident"
              rows={records}
              rowKey={(r) => String(r.id)}
              columns={[
                { key: 'id', label: '#', numeric: true, render: (r) => r.id, width: 60 },
                { key: 't', label: 'Time', render: (r) => <span className="nowrap">{fullTime(r.t)}</span>, width: 190 },
                { key: 'a', label: 'Actor', render: (r) => <span className="mono">{r.actor}</span>, width: 150 },
                { key: 'e', label: 'Event', render: (r) => <code className="chip mono">{r.event}</code>, width: 180 },
                { key: 'd', label: 'Details', render: (r) => r.details },
              ]}
            />
          </section>
        )}
      </div>
    </div>
  )
}

function Fact({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="fact">
      <div className="fact-label">{label}</div>
      <div className="fact-value">{value}</div>
      {sub && <div className="fact-sub">{sub}</div>}
    </div>
  )
}

function Lifecycle({ incident }: { incident: Incident }) {
  const terminal = incident.state === 'closed' || incident.state === 'escalated'
  const reached = new Set(incident.timeline.map((e) => e.source))
  let current = LIFECYCLE.indexOf(incident.state)
  if (current < 0) {
    // Escalated or closed: show how far the workflow got before it left the main path.
    current = incident.proposal ? 4 : reached.has('diagnosis') || incident.hypotheses.length ? 3 : 2
  }
  return (
    <ol className="lifecycle" aria-label="Incident lifecycle">
      {LIFECYCLE.map((s, i) => {
        const state = i < current ? 'done' : i === current ? (terminal ? 'left' : 'current') : 'todo'
        return (
          <li key={s} className={`step step-${state}`} aria-current={state === 'current' ? 'step' : undefined}>
            <span className="step-dot" aria-hidden="true">
              {state === 'done' ? <Check size={12} strokeWidth={3} /> : i + 1}
            </span>
            <span className="step-label">{titleCase(s)}</span>
          </li>
        )
      })}
      {terminal && (
        <li className={`step step-terminal tone-${incident.state === 'escalated' ? 'serious' : 'neutral'}`}>
          <span className="step-dot" aria-hidden="true">
            !
          </span>
          <span className="step-label">{titleCase(incident.state)}</span>
        </li>
      )}
    </ol>
  )
}

function EvidenceChips({ ids, onEvidence, tone }: { ids: string[]; onEvidence: (id: string) => void; tone?: 'support' | 'contra' }) {
  if (!ids.length) return <span className="muted small">None</span>
  return (
    <span className="chip-row">
      {ids.map((id) => (
        <button key={id} type="button" className={`chip chip-btn mono${tone ? ` chip-${tone}` : ''}`} onClick={() => onEvidence(id)}>
          {id}
        </button>
      ))}
    </span>
  )
}

function SummaryTab({ incident, onEvidence }: { incident: Incident; onEvidence: (id: string) => void }) {
  const related = INCIDENTS.filter((o) => o.id !== incident.id && o.entities.some((e) => incident.entities.some((x) => x.name === e.name)))
  return (
    <div className="grid">
      <section className="panel span-7">
        <header className="panel-head">
          <div className="panel-titles">
            <h2>Observed facts</h2>
            <p className="panel-sub">What the collectors returned. No inference.</p>
          </div>
        </header>
        <ul className="facts">
          {incident.facts.map((f) => (
            <li key={f.text}>
              <span className="fact-marker" aria-hidden="true" />
              <div>
                <p>{f.text}</p>
                <EvidenceChips ids={f.evidence} onEvidence={onEvidence} />
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel span-5">
        <header className="panel-head">
          <div className="panel-titles">
            <h2>Hypotheses</h2>
            <p className="panel-sub">Inferred explanations. Each cites its evidence.</p>
          </div>
        </header>
        <div className="hyp-compact">
          {incident.hypotheses.map((h) => (
            <div key={h.id} className={`hyp-mini status-${h.status}`}>
              <div className="hyp-mini-head">
                <span className="mono small">{h.id}</span>
                <span className={`badge badge-cat cat-${h.category}`}>{titleCase(h.category)}</span>
                <span className={`badge badge-hstatus hs-${h.status}`}>{titleCase(h.status)}</span>
              </div>
              <p>{h.statement}</p>
              <ConfidenceBadge confidence={h.confidence} />
            </div>
          ))}
        </div>
      </section>

      {incident.signals && (
        <section className="panel span-12">
          <header className="panel-head">
            <div className="panel-titles">
              <h2>Signals around the incident</h2>
              <p className="panel-sub">Small multiples on separate axes. Each measure has its own scale.</p>
            </div>
          </header>
          <div className="multiples">
            {incident.signals.series.map((s, i) => (
              <div key={s.key} className="multiple">
                <div className="multiple-head">
                  <span className="key-line" style={{ background: SERIES_COLOR[i] }} />
                  <strong>{s.label}</strong>
                  <span className="muted small">{s.unit}</span>
                  <span className="multiple-now">
                    now {formatSignal(s.values[s.values.length - 1])} {s.unit}
                  </span>
                </div>
                <LineChart
                  start={incident.signals!.start}
                  step={incident.signals!.step}
                  values={s.values}
                  color={SERIES_COLOR[i]}
                  label={s.label}
                  unit={s.unit}
                  threshold={s.threshold}
                  markers={incident.signals!.markers}
                  height={160}
                  ariaLabel={`${s.label} for ${incident.id}`}
                  formatValue={(v) => `${formatSignal(v)} ${s.unit}`}
                />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel span-12">
        <header className="panel-head">
          <div className="panel-titles">
            <h2>Entities</h2>
            <p className="panel-sub">Workloads, identities, resources, and addresses linked to this incident.</p>
          </div>
        </header>
        <div className="entity-grid">
          {incident.entities.map((e) => {
            const shared = related.filter((o) => o.entities.some((x) => x.name === e.name))
            return (
              <div className="entity" key={e.name}>
                <EntityIcon type={e.type} />
                <div>
                  <div className="chip-kind">{e.type}</div>
                  <div className="mono">{e.name}</div>
                  {shared.length > 0 && (
                    <div className="entity-shared">
                      Also in{' '}
                      {shared.map((o, i) => (
                        <span key={o.id}>
                          {i > 0 && ', '}
                          <Link to={`/incidents/${o.id}`}>{o.id}</Link>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}

function EntityIcon({ type }: { type: string }) {
  const Icon = { workload: Activity, identity: CircleUser, resource: FileText, deployment: ScrollText, address: Network, process: ShieldAlert }[type] ?? Info
  return (
    <span className="entity-icon" aria-hidden="true">
      <Icon size={16} />
    </span>
  )
}

const KIND_LABEL: Record<TimelineEntry['kind'], string> = { signal: 'Signal', detection: 'Detection', platform: 'Platform', human: 'Human' }

function TimelineTab({ incident, onEvidence }: { incident: Incident; onEvidence: (id: string) => void }) {
  const entries = [...incident.timeline].sort((a, b) => a.t - b.t)
  return (
    <section className="panel">
      <ol className="timeline">
        {entries.map((e, i) => {
          return (
            <li key={i} className={`tl-item kind-${e.kind}`}>
              <div className="tl-time">
                <div>{timeWithSeconds(e.t)}</div>
                <div className="muted small">{splunkTime(e.t).date}</div>
              </div>
              <div className="tl-dot" aria-hidden="true" />
              <div className="tl-body">
                <div className="tl-meta">
                  <span className={`badge badge-kind kind-${e.kind}`}>{KIND_LABEL[e.kind]}</span>
                  <code className="mono small">{e.source}</code>
                  {e.link && (
                    <span className={`link-chip strength-${e.link.strength}`} title={e.link.strength === 'weak' ? 'Time proximity only. Not evidence of cause.' : 'Shares an entity with the incident.'}>
                      {e.link.key} · {e.link.strength} link
                    </span>
                  )}
                </div>
                <div className="tl-title">{e.title}</div>
                {e.detail && <div className="tl-detail muted">{e.detail}</div>}
                {e.evidenceId && (
                  <button type="button" className="chip chip-btn mono" onClick={() => onEvidence(e.evidenceId!)}>
                    {e.evidenceId}
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

function EvidenceTab({ incident, focus }: { incident: Incident; focus: string | null }) {
  return (
    <div className="evidence-list">
      {incident.evidence.map((ev: Evidence) => (
        <article key={ev.id} id={`ev-${ev.id}`} className={`panel evidence${focus === ev.id ? ' is-focus' : ''}`}>
          <header className="evidence-head">
            <span className="mono strong">{ev.id}</span>
            <span className="badge badge-kind">{titleCase(ev.kind)}</span>
            <span className="muted small">{ev.source}</span>
            <span className="muted small evidence-time">collected {relative(ev.collectedAt)}</span>
          </header>
          <p className="evidence-summary">{ev.summary}</p>
          <div className="evidence-scope">
            <span className="muted small">Scope</span>
            <code>{ev.scope}</code>
          </div>
          <pre className="evidence-preview">{ev.preview}</pre>
          <div className="evidence-foot small">
            {ev.redactions.length ? (
              <span className="redacted">Redacted before storage: {ev.redactions.join(', ')}</span>
            ) : (
              <span className="muted">No redactions needed</span>
            )}
            <span className="muted">Collected content is untrusted data. It is shown as text and never treated as instructions.</span>
          </div>
        </article>
      ))}
    </div>
  )
}

function HypothesesTab({ incident, onEvidence }: { incident: Incident; onEvidence: (id: string) => void }) {
  return (
    <div className="hyp-list">
      <p className="note tone-info">
        <Info size={14} aria-hidden="true" /> Confidence is a label, not a probability. It has not been calibrated against labelled scenarios yet.
      </p>
      {incident.hypotheses.map((h: Hypothesis) => (
        <article key={h.id} className={`panel hyp status-${h.status}`}>
          <header className="hyp-head">
            <span className="mono strong">{h.id}</span>
            <span className={`badge badge-cat cat-${h.category}`}>{titleCase(h.category)}</span>
            <span className={`badge badge-hstatus hs-${h.status}`}>{titleCase(h.status)}</span>
            <ConfidenceBadge confidence={h.confidence} />
            <span className="muted small hyp-by">produced by {h.producedBy}</span>
          </header>
          <p className="hyp-statement">{h.statement}</p>
          <div className="hyp-grid">
            <div>
              <h4>Supporting evidence</h4>
              <EvidenceChips ids={h.supporting} onEvidence={onEvidence} tone="support" />
            </div>
            <div>
              <h4>Contradicting evidence</h4>
              <EvidenceChips ids={h.contradicting} onEvidence={onEvidence} tone="contra" />
            </div>
            <div>
              <h4>Missing information</h4>
              {h.missing.length ? (
                <ul className="list-tight">
                  {h.missing.map((m) => (
                    <li key={m}>{m}</li>
                  ))}
                </ul>
              ) : (
                <span className="muted small">Nothing outstanding</span>
              )}
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
