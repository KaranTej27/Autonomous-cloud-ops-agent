import { ChevronDown, ChevronLeft, ChevronRight, CircleCheck, Download, Link2, ListFilter, OctagonAlert, Search as SearchIcon, X } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { BarList } from '../components/charts/BarList'
import { ColumnChart, type ColumnDatum } from '../components/charts/ColumnChart'
import { DataTable } from '../components/DataTable'
import { TimeRangePicker } from '../components/TimeRangePicker'
import { EVENTS } from '../data/events'
import type { LogEvent } from '../data/types'
import { axisLabel, dayTime, fullTime, integer, pct, shortTime, splunkTime } from '../lib/format'
import { fieldValue, highlightSpl, runSearch, type TableResult } from '../lib/search'
import { NOW, getRange, makeBuckets, type RangeKey } from '../lib/time'
import { useApp } from '../state/AppState'

const DEFAULT_QUERY = 'index=*'
const SELECTED_FIELDS = ['host', 'source', 'sourcetype']
const EXAMPLES = [
  'sourcetype=idp:auth outcome=failure | stats count by user, src_ip',
  'index=cloudops level=ERROR | top limit=5 service',
  'sourcetype=kube:audit verb=create OR verb=update',
  'host=checkout-worker* OR user="automation-7f3a@lab.example.com"',
  'fixture=prompt_injection',
]

type Tab = 'events' | 'statistics' | 'visualization'

interface FieldSummary {
  name: string
  numeric: boolean
  coverage: number
  distinct: number
  top: { value: string; count: number }[]
}

function summarizeFields(events: LogEvent[]): FieldSummary[] {
  const map = new Map<string, Map<string, number>>()
  const numeric = new Map<string, boolean>()
  const add = (k: string, v: string | number) => {
    let m = map.get(k)
    if (!m) map.set(k, (m = new Map()))
    const s = String(v)
    m.set(s, (m.get(s) ?? 0) + 1)
    if (typeof v !== 'number') numeric.set(k, false)
    else if (!numeric.has(k)) numeric.set(k, true)
  }
  for (const e of events) {
    add('host', e.host)
    add('source', e.source)
    add('sourcetype', e.sourcetype)
    add('index', e.index)
    for (const [k, v] of Object.entries(e.fields)) if (v !== '') add(k, v)
  }
  const n = events.length || 1
  return [...map.entries()].map(([name, values]) => {
    const total = [...values.values()].reduce((a, b) => a + b, 0)
    return {
      name,
      numeric: numeric.get(name) ?? false,
      coverage: total / n,
      distinct: values.size,
      top: [...values.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([value, count]) => ({ value, count })),
    }
  })
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function Highlighted({ text, terms }: { text: string; terms: string[] }) {
  const usable = terms.filter((t) => t.length > 1).slice(0, 12)
  if (!usable.length) return <>{text}</>
  const re = new RegExp(`(${usable.map(escapeRe).join('|')})`, 'gi')
  const parts = text.split(re)
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="hl">
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  )
}

function prettyRaw(raw: string): string {
  if (!raw.startsWith('{')) return raw
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function quoteValue(v: string): string {
  return /^[\w.:@/*-]+$/.test(v) ? v : `"${v.replace(/"/g, '\\"')}"`
}

function toCsv(columns: string[], rows: (string | number)[][]): string {
  const esc = (v: string | number) => {
    const s = String(v)
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return [columns.map(esc).join(','), ...rows.map((r) => r.map(esc).join(','))].join('\n')
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function Search() {
  const [params, setParams] = useSearchParams()
  const { notify } = useApp()
  const q = params.get('q') ?? DEFAULT_QUERY
  const range = getRange(params.get('range'))
  const [draft, setDraft] = useState(q)
  const [tab, setTab] = useState<Tab>('events')
  const [zoom, setZoom] = useState<number | null>(null)
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(20)
  const [showFields, setShowFields] = useState(true)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [openField, setOpenField] = useState<string | null>(null)
  const editorRef = useRef<HTMLTextAreaElement>(null)

  const from = NOW - range.ms
  const scoped = useMemo(() => EVENTS.filter((e) => e.time >= from && e.time <= NOW), [from])

  const { result, elapsed } = useMemo(() => {
    const t0 = performance.now()
    const r = runSearch(q, scoped)
    return { result: r, elapsed: (performance.now() - t0) / 1000 }
  }, [q, scoped])

  useEffect(() => {
    setDraft(q)
    setTab(result.table ? 'statistics' : 'events')
    setPage(1)
    setZoom(null)
    setExpanded(new Set())
    setOpenField(null)
    // Reset the view only when the submitted search changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, range.key])

  const buckets = useMemo<ColumnDatum[]>(() => {
    const bs = makeBuckets(from, NOW, range.bucketMs).map((b) => ({ ...b, values: { events: 0 } }))
    const first = bs[0]?.start ?? from
    for (const e of result.events) {
      const b = bs[Math.floor((e.time - first) / range.bucketMs)]
      if (b) b.values.events++
    }
    return bs
  }, [result.events, from, range.bucketMs])

  const visible = useMemo(() => {
    if (zoom === null) return result.events
    const b = buckets[zoom]
    return b ? result.events.filter((e) => e.time >= b.start && e.time < b.end) : result.events
  }, [result.events, zoom, buckets])

  const fields = useMemo(() => summarizeFields(visible), [visible])
  const selectedFields = SELECTED_FIELDS.map((f) => fields.find((x) => x.name === f)).filter(Boolean) as FieldSummary[]
  const interesting = fields.filter((f) => !SELECTED_FIELDS.includes(f.name) && f.coverage >= 0.15).sort((a, b) => a.name.localeCompare(b.name))
  const pages = Math.max(1, Math.ceil(visible.length / perPage))
  const pageEvents = visible.slice((page - 1) * perPage, page * perPage)

  function submit(next = draft) {
    const query = next.trim() || '*'
    const p = new URLSearchParams(params)
    p.set('q', query)
    p.set('range', range.key)
    setParams(p)
  }

  function addFilter(field: string, value: string, negate = false) {
    const [filter, ...rest] = q.split('|')
    const term = `${negate ? 'NOT ' : ''}${field}=${quoteValue(value)}`
    const base = filter.trim() === '*' || filter.trim() === '' ? '' : `${filter.trim()} `
    submit([`${base}${term}`, ...rest].join(' |').replace(/\s+\|/g, ' |'))
  }

  function onEditorKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  function exportCsv() {
    if (tab !== 'events' && result.table) download('search-results.csv', toCsv(result.table.columns, result.table.rows))
    else download('search-events.csv', toCsv(['_time', 'index', 'sourcetype', 'host', 'source', '_raw'], visible.map((e) => [new Date(e.time).toISOString(), e.index, e.sourcetype, e.host, e.source, e.raw])))
    notify({ tone: 'success', title: 'Export ready', body: 'The CSV contains synthetic data only.' })
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      notify({ tone: 'success', title: 'Link copied', body: 'The link opens this search and time range.' })
    } catch {
      notify({ tone: 'warning', title: 'Could not copy the link', body: 'Copy it from the address bar instead.' })
    }
  }

  const tokens = highlightSpl(draft)

  return (
    <div className="page page-search">
      <div className="search-title-row">
        <h1>New Search</h1>
        <div className="btn-row">
          <button type="button" className="btn btn-sm" onClick={copyLink}>
            <Link2 size={13} aria-hidden="true" /> Share
          </button>
          <button type="button" className="btn btn-sm" onClick={exportCsv} disabled={!visible.length && !result.table}>
            <Download size={13} aria-hidden="true" /> Export
          </button>
        </div>
      </div>

      <div className="search-bar">
        <div className="spl" onClick={() => editorRef.current?.focus()}>
          <span className="spl-gutter" aria-hidden="true">
            {draft.split('\n').map((_, i) => (
              <span key={i}>{i + 1}</span>
            ))}
          </span>
          <div className="spl-editor">
            <pre className="spl-highlight" aria-hidden="true">
              {tokens.map((t, i) => (
                <span key={i} className={`spl-${t.kind}`}>
                  {t.text}
                </span>
              ))}
              {'\n'}
            </pre>
            <textarea
              ref={editorRef}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={onEditorKey}
              spellCheck={false}
              autoCapitalize="off"
              autoCorrect="off"
              aria-label="Search query. Press Enter to search, Shift and Enter for a new line."
              placeholder="enter search here..."
            />
          </div>
        </div>
        <TimeRangePicker
          value={range.key}
          onChange={(k: RangeKey) => {
            const p = new URLSearchParams(params)
            p.set('range', k)
            p.set('q', draft.trim() || '*')
            setParams(p)
          }}
        />
        <button type="button" className="btn btn-primary btn-search" onClick={() => submit()} aria-label="Run search">
          <SearchIcon size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="examples">
        <span className="muted small">Try</span>
        {EXAMPLES.map((ex) => (
          <button key={ex} type="button" className="chip chip-btn mono" onClick={() => submit(ex)}>
            {ex}
          </button>
        ))}
      </div>

      {result.error ? (
        <div className="search-error" role="alert">
          <OctagonAlert size={16} aria-hidden="true" />
          <div>
            <strong>Error in search:</strong> {result.error}
          </div>
        </div>
      ) : (
        <div className="job-bar">
          <CircleCheck size={15} className="job-ok" aria-hidden="true" />
          <span>
            <strong>{integer(result.events.length)} events</strong> ({fullTime(from)} to {fullTime(NOW)})
          </span>
          <span className="muted">No event sampling</span>
          <span className="job-spacer" />
          <span className="muted small">
            Search ran in {elapsed < 0.001 ? 'under 0.001' : elapsed.toFixed(3)} s over {integer(scoped.length)} events in range
          </span>
        </div>
      )}

      <div className="tabs tabs-search" role="tablist" aria-label="Result views">
        <button type="button" role="tab" aria-selected={tab === 'events'} className={tab === 'events' ? 'is-active' : undefined} onClick={() => setTab('events')}>
          Events <span className="tab-count">{integer(visible.length)}</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === 'statistics'} className={tab === 'statistics' ? 'is-active' : undefined} onClick={() => setTab('statistics')}>
          Statistics {result.table && <span className="tab-count">{integer(result.table.rows.length)}</span>}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'visualization'} className={tab === 'visualization' ? 'is-active' : undefined} onClick={() => setTab('visualization')}>
          Visualization
        </button>
      </div>

      {tab === 'events' && (
        <>
          <section className="timeline-panel">
            <div className="timeline-toolbar">
              <span className="muted small">Timeline</span>
              {zoom !== null && buckets[zoom] && (
                <span className="zoom-chip">
                  {dayTime(buckets[zoom].start)} to {shortTime(buckets[zoom].end)}
                  <button type="button" className="icon-btn" onClick={() => setZoom(null)} aria-label="Clear time selection">
                    <X size={13} />
                  </button>
                </span>
              )}
              <span className="job-spacer" />
              <span className="muted small">{range.bucketLabel}</span>
            </div>
            <ColumnChart
              data={buckets}
              series={[{ key: 'events', label: 'events', color: 'var(--series-1)' }]}
              height={112}
              ariaLabel="Event count over time for this search. Use arrow keys to move and Enter to zoom."
              formatTick={(t) => axisLabel(t, range.bucketMs)}
              formatRange={(d) => `${dayTime(d.start)} to ${shortTime(d.end)}`}
              selected={zoom}
              onSelect={(i) => {
                setZoom(i)
                setPage(1)
              }}
            />
          </section>

          <div className={`search-body${showFields ? '' : ' no-fields'}`}>
            {showFields && (
              <aside className="fields" aria-label="Fields">
                <div className="fields-head">
                  <button type="button" className="link-btn" onClick={() => setShowFields(false)}>
                    <ChevronLeft size={14} aria-hidden="true" /> Hide fields
                  </button>
                  <span className="muted small">{fields.length} fields</span>
                </div>
                <FieldGroup title="Selected fields" fields={selectedFields} open={openField} setOpen={setOpenField} total={visible.length} onAdd={addFilter} onCommand={(c) => submit(`${q.split('|')[0].trim()} | ${c}`)} />
                <FieldGroup title="Interesting fields" fields={interesting} open={openField} setOpen={setOpenField} total={visible.length} onAdd={addFilter} onCommand={(c) => submit(`${q.split('|')[0].trim()} | ${c}`)} />
              </aside>
            )}

            <section className="events" aria-label="Events">
              <div className="events-toolbar">
                {!showFields && (
                  <button type="button" className="link-btn" onClick={() => setShowFields(true)}>
                    <ListFilter size={14} aria-hidden="true" /> Show fields
                  </button>
                )}
                <label className="small muted per-page">
                  <select className="select select-sm" value={perPage} onChange={(e) => (setPerPage(Number(e.target.value)), setPage(1))}>
                    {[10, 20, 50, 100].map((n) => (
                      <option key={n} value={n}>
                        {n} per page
                      </option>
                    ))}
                  </select>
                </label>
                <span className="job-spacer" />
                <Pager page={page} pages={pages} onPage={setPage} />
              </div>

              {pageEvents.length === 0 ? (
                <div className="empty-state small">
                  <p>No results found. Try a wider time range or a broader search.</p>
                </div>
              ) : (
                <table className="event-table">
                  <thead>
                    <tr>
                      <th style={{ width: 28 }}>i</th>
                      <th style={{ width: 132 }}>Time</th>
                      <th>Event</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageEvents.map((e) => {
                      const t = splunkTime(e.time)
                      const isOpen = expanded.has(e.id)
                      return (
                        <tr key={e.id} className={isOpen ? 'is-open' : undefined}>
                          <td>
                            <button
                              type="button"
                              className="icon-btn"
                              aria-expanded={isOpen}
                              aria-label={isOpen ? 'Collapse event' : 'Expand event'}
                              onClick={() => {
                                const next = new Set(expanded)
                                if (isOpen) next.delete(e.id)
                                else next.add(e.id)
                                setExpanded(next)
                              }}
                            >
                              {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          </td>
                          <td className="event-time">
                            <div>{t.date}</div>
                            <div>{t.time}</div>
                          </td>
                          <td className="event-cell">
                            <pre className="event-raw">
                              <Highlighted text={isOpen ? prettyRaw(e.raw) : e.raw} terms={result.terms} />
                            </pre>
                            {e.fields.fixture === 'prompt_injection' && (
                              <div className="event-warning">
                                <OctagonAlert size={13} aria-hidden="true" /> Test fixture: this line contains text aimed at the model. Collected content is data, never instructions.
                              </div>
                            )}
                            <div className="event-meta">
                              {(['host', 'source', 'sourcetype'] as const).map((f) => (
                                <button key={f} type="button" className="meta-btn" onClick={() => addFilter(f, e[f])} title={`Add ${f}=${e[f]} to the search`}>
                                  <span className="muted">{f} =</span> {e[f]}
                                </button>
                              ))}
                            </div>
                            {isOpen && <EventFields event={e} onAdd={addFilter} />}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              )}
              <div className="events-toolbar is-bottom">
                <span className="job-spacer" />
                <Pager page={page} pages={pages} onPage={setPage} />
              </div>
            </section>
          </div>
        </>
      )}

      {tab === 'statistics' && <StatisticsView table={result.table} onExample={(ex) => submit(ex)} />}
      {tab === 'visualization' && <VisualizationView table={result.table} onExample={(ex) => submit(ex)} />}
    </div>
  )
}

function FieldGroup({
  title,
  fields,
  open,
  setOpen,
  total,
  onAdd,
  onCommand,
}: {
  title: string
  fields: FieldSummary[]
  open: string | null
  setOpen: (f: string | null) => void
  total: number
  onAdd: (field: string, value: string, negate?: boolean) => void
  onCommand: (c: string) => void
}) {
  return (
    <div className="field-group">
      <h3>{title}</h3>
      <ul>
        {fields.map((f) => (
          <li key={f.name} className={open === f.name ? 'is-open' : undefined}>
            <button type="button" className="field-btn" onClick={() => setOpen(open === f.name ? null : f.name)} aria-expanded={open === f.name}>
              <span className="field-type">{f.numeric ? '#' : 'a'}</span>
              <span className="field-name">{f.name}</span>
              <span className="field-count">{f.distinct > 99 ? '100+' : f.distinct}</span>
            </button>
            {open === f.name && (
              <div className="field-pop" role="dialog" aria-label={`Field ${f.name}`}>
                <div className="field-pop-head">
                  <strong className="mono">{f.name}</strong>
                  <button type="button" className="icon-btn" onClick={() => setOpen(null)} aria-label="Close field summary">
                    <X size={14} />
                  </button>
                </div>
                <div className="muted small">
                  {f.distinct > 99 ? '100+' : f.distinct} values, {pct(f.coverage * 100)} of events
                </div>
                <div className="field-pop-actions">
                  <button type="button" className="link-btn" onClick={() => onCommand(`top limit=10 ${f.name}`)}>
                    Top values
                  </button>
                  <button type="button" className="link-btn" onClick={() => onCommand(`stats count by ${f.name}`)}>
                    Count by value
                  </button>
                </div>
                <table className="field-values">
                  <thead>
                    <tr>
                      <th>Top 10 values</th>
                      <th className="num">Count</th>
                      <th className="num">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {f.top.map((v) => (
                      <tr key={v.value}>
                        <td>
                          <button type="button" className="link-btn mono" onClick={() => onAdd(f.name, v.value)} title={`Add ${f.name}=${v.value}`}>
                            {v.value}
                          </button>
                          <span className="value-bar" style={{ width: `${(v.count / (total || 1)) * 100}%` }} />
                        </td>
                        <td className="num">{integer(v.count)}</td>
                        <td className="num">{pct((v.count / (total || 1)) * 100, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function EventFields({ event, onAdd }: { event: LogEvent; onAdd: (field: string, value: string, negate?: boolean) => void }) {
  const rows: [string, string | number][] = [
    ['index', event.index],
    ['sourcetype', event.sourcetype],
    ['source', event.source],
    ['host', event.host],
    ...Object.entries(event.fields).filter(([, v]) => v !== ''),
  ]
  return (
    <table className="event-fields">
      <thead>
        <tr>
          <th>Field</th>
          <th>Value</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td className="mono">{k}</td>
            <td className="mono">{String(v)}</td>
            <td className="nowrap">
              <button type="button" className="link-btn" onClick={() => onAdd(k, String(fieldValue(event, k) ?? v))}>
                Add to search
              </button>
              <button type="button" className="link-btn" onClick={() => onAdd(k, String(v), true)}>
                Exclude
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function Pager({ page, pages, onPage }: { page: number; pages: number; onPage: (p: number) => void }) {
  if (pages <= 1) return null
  const nums: (number | '…')[] = []
  for (let p = 1; p <= pages; p++) {
    if (p === 1 || p === pages || Math.abs(p - page) <= 2) nums.push(p)
    else if (nums[nums.length - 1] !== '…') nums.push('…')
  }
  return (
    <nav className="pager" aria-label="Pages">
      <button type="button" className="pager-btn" disabled={page === 1} onClick={() => onPage(page - 1)}>
        <ChevronLeft size={14} aria-hidden="true" /> Prev
      </button>
      {nums.map((n, i) =>
        n === '…' ? (
          <span key={`gap${i}`} className="pager-gap">
            …
          </span>
        ) : (
          <button key={n} type="button" className={`pager-btn${n === page ? ' is-current' : ''}`} aria-current={n === page ? 'page' : undefined} onClick={() => onPage(n)}>
            {n}
          </button>
        ),
      )}
      <button type="button" className="pager-btn" disabled={page === pages} onClick={() => onPage(page + 1)}>
        Next <ChevronRight size={14} aria-hidden="true" />
      </button>
    </nav>
  )
}

function NoStats({ onExample }: { onExample: (q: string) => void }): ReactNode {
  return (
    <div className="empty-state">
      <p>Your search isn't generating any statistic or visualization results. Here are some possible ways to get results.</p>
      <div className="chip-row center">
        {['index=* | stats count by sourcetype', 'index=security | top limit=10 user', 'index=cloudops | stats count by service, level'].map((ex) => (
          <button key={ex} type="button" className="chip chip-btn mono" onClick={() => onExample(ex)}>
            {ex}
          </button>
        ))}
      </div>
    </div>
  )
}

function StatisticsView({ table, onExample }: { table?: TableResult; onExample: (q: string) => void }) {
  if (!table) return <NoStats onExample={onExample} />
  const numericCols = new Set(table.columns.filter((_, i) => table.rows.length > 0 && table.rows.every((r) => typeof r[i] === 'number')))
  return (
    <section className="panel">
      <DataTable
        caption="Statistics"
        rows={table.rows.slice(0, 500).map((r, i) => ({ r, i }))}
        rowKey={(x) => String(x.i)}
        columns={table.columns.map((c, ci) => ({
          key: c,
          label: c,
          numeric: numericCols.has(c),
          render: (x: { r: (string | number)[] }) => (numericCols.has(c) ? integer(Number(x.r[ci])) : <span className="mono">{String(x.r[ci])}</span>),
          sortValue: (x: { r: (string | number)[] }) => x.r[ci],
        }))}
      />
      {table.rows.length > 500 && <div className="table-foot muted small">Showing the first 500 of {integer(table.rows.length)} rows.</div>}
    </section>
  )
}

function VisualizationView({ table, onExample }: { table?: TableResult; onExample: (q: string) => void }) {
  const countIdx = table ? table.columns.indexOf('count') : -1
  if (!table || countIdx < 1) return <NoStats onExample={onExample} />
  const labelCols = table.columns.slice(0, countIdx)
  const rows = table.rows.slice(0, 15)
  return (
    <section className="panel">
      <header className="panel-head">
        <div className="panel-titles">
          <h2>count by {labelCols.join(', ')}</h2>
          <p className="panel-sub">
            Top {rows.length} of {integer(table.rows.length)} rows. Switch to Statistics for the full table.
          </p>
        </div>
      </header>
      <div className="panel-body">
        <BarList
          ariaLabel={`count by ${labelCols.join(', ')}`}
          labelWidth={260}
          items={rows.map((r, i) => ({ key: String(i), label: <span className="mono">{labelCols.map((_, j) => String(r[j])).join(' · ')}</span>, value: Number(r[countIdx]), color: 'var(--series-1)' }))}
        />
      </div>
    </section>
  )
}
