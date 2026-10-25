import { useMemo } from 'react'
import { EVENTS } from '../data/events'
import { INCIDENTS } from '../data/incidents'
import type { Incident, Proposal } from '../data/types'
import { runSearch } from '../lib/search'
import { MINUTE, NOW, RANGES, type RangeKey } from '../lib/time'
import { useApp, type SessionApproval } from './AppState'

// Event counts come from running each incident's search over its window, so the numbers
// on incident pages match what the Search view returns.
const EVENT_COUNTS = new Map(
  INCIDENTS.map((inc) => {
    const from = inc.firstSignalAt - 30 * MINUTE
    const to = inc.resolvedAt ?? NOW
    const scoped = EVENTS.filter((e) => e.time >= from && e.time <= to)
    return [inc.id, runSearch(inc.searchQuery, scoped).events.length]
  }),
)

export function proposalStatus(p: Proposal, now = Date.now()): Proposal['status'] {
  if (p.status === 'pending' && p.expiresAt !== undefined && now > p.expiresAt) return 'expired'
  return p.status
}

function applySession(inc: Incident, owners: Record<string, string>, approvals: Record<string, SessionApproval>): Incident {
  const owner = owners[inc.id] ?? inc.owner
  let proposal = inc.proposal
  let state = inc.state
  const a = proposal ? approvals[proposal.id] : undefined
  if (proposal && a && a.version === proposal.version) {
    proposal = { ...proposal, status: a.decision, decidedBy: a.by, decidedAt: a.at }
    if (a.decision === 'rejected') state = 'diagnosed'
  }
  return { ...inc, owner, proposal, state, eventCount: EVENT_COUNTS.get(inc.id) ?? inc.eventCount }
}

export function useIncidents(): Incident[] {
  const { owners, approvals } = useApp()
  return useMemo(() => INCIDENTS.map((i) => applySession(i, owners, approvals)), [owners, approvals])
}

export function useIncident(id: string | undefined): Incident | undefined {
  const all = useIncidents()
  return all.find((i) => i.id === id)
}

/** Smallest preset that covers the incident window, for "Open in Search" links. */
export function rangeFor(inc: Incident): RangeKey {
  const need = NOW - (inc.firstSignalAt - 30 * MINUTE)
  return (RANGES.find((r) => r.ms >= need) ?? RANGES[RANGES.length - 1]).key
}

export function searchHref(query: string, range: RangeKey): string {
  return `/search?q=${encodeURIComponent(query)}&range=${range}`
}

export function isOpen(inc: Incident): boolean {
  return inc.state !== 'resolved' && inc.state !== 'closed'
}

export function pendingApprovals(incidents: Incident[]): Incident[] {
  return incidents.filter((i) => i.proposal && i.proposal.decision === 'require_approval' && proposalStatus(i.proposal) === 'pending')
}
