import { shortHash } from '../lib/random'
import { DAY, HOUR, MINUTE, NOW } from '../lib/time'
import { INCIDENTS, POLICY_DECISIONS } from './incidents'
import type { AuditRecord, TimelineEntry } from './types'

// The audit trail is derived from incident timelines plus platform events.
// The hash chain here only illustrates the proposed design in docs/architecture.md.

type Draft = Omit<AuditRecord, 'id' | 'hash' | 'prevHash'>

const EVENT_BY_SOURCE: Record<string, string> = {
  policy: 'policy_decision',
  response_planner: 'proposal_created',
  orchestrator: 'investigation_step',
  correlation: 'correlation_link',
  diagnosis: 'hypotheses_recorded',
  executor: 'action_executed',
  verification: 'verification_result',
}

function fromTimeline(incidentId: string, e: TimelineEntry): Draft | null {
  if (e.kind === 'human') return { t: e.t, actor: e.source, event: 'human_decision', incidentId, details: e.title }
  if (e.kind === 'platform') return { t: e.t, actor: e.source, event: EVENT_BY_SOURCE[e.source] ?? 'platform_event', incidentId, details: e.title }
  if (e.kind === 'detection') return { t: e.t, actor: e.source, event: 'detection_fired', incidentId, details: e.title }
  return null
}

export function sealRecord(prevHash: string, id: number, d: Draft): AuditRecord {
  const hash = shortHash(`${prevHash}|${d.t}|${d.actor}|${d.event}|${d.incidentId ?? ''}|${d.details}`)
  return { ...d, id, prevHash, hash }
}

function build(): AuditRecord[] {
  const drafts: Draft[] = []
  for (const inc of INCIDENTS) {
    drafts.push({ t: inc.createdAt, actor: 'orchestrator', event: 'incident_opened', incidentId: inc.id, details: `${inc.id} opened from ${inc.rule} (urgency ${inc.urgency})` })
    for (const e of inc.timeline) {
      const d = fromTimeline(inc.id, e)
      if (d) drafts.push(d)
    }
    if (inc.resolvedAt) drafts.push({ t: inc.resolvedAt, actor: 'orchestrator', event: 'incident_closed', incidentId: inc.id, details: `${inc.id} moved to ${inc.state}` })
  }
  for (const p of POLICY_DECISIONS) {
    if (p.decision === 'deny') drafts.push({ t: p.t, actor: 'policy', event: 'policy_decision', incidentId: p.incidentId, details: `deny ${p.action} (${p.proposal}): ${p.reason}` })
  }
  drafts.push(
    { t: NOW - DAY - 6 * HOUR, actor: 'm.okafor', event: 'policy_updated', details: 'policy-2026.10.2 replaced by policy-2026.10.3 (reviewed change)' },
    { t: NOW - DAY - 2 * HOUR, actor: 'k.analyst', event: 'mode_changed', details: 'Operating mode changed from dry-run to supervised' },
    { t: NOW - 3 * DAY, actor: 'm.okafor', event: 'emergency_stop_engaged', details: 'Emergency stop engaged (scheduled drill)' },
    { t: NOW - 3 * DAY + 4 * MINUTE, actor: 'm.okafor', event: 'emergency_stop_released', details: 'Emergency stop released after drill' },
  )
  drafts.sort((a, b) => a.t - b.t)

  const out: AuditRecord[] = []
  let prev = '00000000'
  drafts.forEach((d, i) => {
    const rec = sealRecord(prev, i + 1, d)
    out.push(rec)
    prev = rec.hash
  })
  return out
}

export const BASE_AUDIT: AuditRecord[] = build()
