import { CircleCheck, CircleDashed, CircleDot, CircleX, Hourglass, Info, OctagonAlert, TriangleAlert } from 'lucide-react'
import type { Confidence, Decision, Domain, HealthStatus, IncidentState, Urgency } from '../data/types'
import { titleCase } from '../lib/format'

// Status colour never carries meaning alone: every badge pairs an icon shape with a text label.

const URGENCY_ICON = {
  critical: OctagonAlert,
  high: TriangleAlert,
  medium: TriangleAlert,
  low: CircleDot,
  informational: Info,
}

const URGENCY_VAR: Record<Urgency, string> = {
  critical: 'var(--sev-critical)',
  high: 'var(--sev-high)',
  medium: 'var(--sev-medium)',
  low: 'var(--sev-low)',
  informational: 'var(--sev-info)',
}

export function urgencyColor(u: Urgency): string {
  return URGENCY_VAR[u]
}

export function UrgencyBadge({ urgency, compact }: { urgency: Urgency; compact?: boolean }) {
  const Icon = URGENCY_ICON[urgency]
  return (
    <span className={`badge badge-urgency${compact ? ' is-compact' : ''}`}>
      <Icon size={14} strokeWidth={2.4} color={URGENCY_VAR[urgency]} aria-hidden="true" />
      <span>{titleCase(urgency)}</span>
    </span>
  )
}

const STATE_TONE: Partial<Record<IncidentState, string>> = {
  awaiting_approval: 'warning',
  escalated: 'serious',
  resolved: 'good',
  closed: 'neutral',
}

export function stateLabel(s: IncidentState): string {
  return titleCase(s)
}

export function StateBadge({ state }: { state: IncidentState }) {
  const tone = STATE_TONE[state] ?? 'info'
  return (
    <span className={`badge badge-state tone-${tone}`}>
      <span className="dot" aria-hidden="true" />
      {stateLabel(state)}
    </span>
  )
}

const DOMAIN_LABEL: Record<Domain, string> = { cloudops: 'CloudOps', soc: 'SOC', mixed: 'CloudOps + SOC' }

export function DomainBadge({ domain }: { domain: Domain }) {
  return <span className={`badge badge-domain domain-${domain}`}>{DOMAIN_LABEL[domain]}</span>
}

export function SimBadge() {
  return (
    <span className="badge badge-sim" title="Synthetic data from the scenario catalogue. Not a real incident.">
      <CircleDashed size={12} strokeWidth={2.4} aria-hidden="true" />
      Simulated
    </span>
  )
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const level = { low: 1, medium: 2, high: 3 }[confidence]
  return (
    <span className="badge badge-confidence" title="A label, not a probability. Calibration has not been evaluated.">
      <span className="pips" aria-hidden="true">
        {[1, 2, 3].map((i) => (
          <span key={i} className={i <= level ? 'pip on' : 'pip'} />
        ))}
      </span>
      Confidence: {confidence}
    </span>
  )
}

const DECISION = {
  allow: { Icon: CircleCheck, tone: 'good', label: 'Allow' },
  require_approval: { Icon: Hourglass, tone: 'warning', label: 'Requires approval' },
  deny: { Icon: CircleX, tone: 'critical', label: 'Deny' },
} as const

export function DecisionBadge({ decision }: { decision: Decision }) {
  const { Icon, tone, label } = DECISION[decision]
  return (
    <span className={`badge badge-decision tone-${tone}`}>
      <Icon size={14} strokeWidth={2.4} aria-hidden="true" />
      {label}
    </span>
  )
}

export function decisionColor(d: Decision): string {
  return { allow: 'var(--status-good)', require_approval: 'var(--status-warning)', deny: 'var(--status-critical)' }[d]
}

const HEALTH = {
  healthy: { Icon: CircleCheck, tone: 'good', label: 'Healthy' },
  degraded: { Icon: TriangleAlert, tone: 'warning', label: 'Degraded' },
  critical: { Icon: OctagonAlert, tone: 'critical', label: 'Critical' },
} as const

export function HealthBadge({ status }: { status: HealthStatus }) {
  const { Icon, tone, label } = HEALTH[status]
  return (
    <span className={`badge badge-health tone-${tone}`}>
      <Icon size={14} strokeWidth={2.4} aria-hidden="true" />
      {label}
    </span>
  )
}

export function TierBadge({ tier }: { tier: number }) {
  const names = ['Read', 'Analyse', 'Low-risk lab change', 'Containment or infrastructure change', 'Destructive']
  return (
    <span className="badge badge-tier" title={names[tier]}>
      Tier {tier}: {names[tier]}
    </span>
  )
}
