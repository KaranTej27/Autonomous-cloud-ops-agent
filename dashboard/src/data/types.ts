// Shapes follow docs/architecture.md. When the backend API exists, these become its response types.

export type Urgency = 'critical' | 'high' | 'medium' | 'low' | 'informational'
export const URGENCIES: Urgency[] = ['critical', 'high', 'medium', 'low', 'informational']

export type Domain = 'cloudops' | 'soc' | 'mixed'

export type IncidentState =
  | 'detected'
  | 'correlating'
  | 'investigating'
  | 'diagnosed'
  | 'response_proposed'
  | 'awaiting_approval'
  | 'executing'
  | 'verifying'
  | 'resolved'
  | 'closed'
  | 'escalated'

export const LIFECYCLE: IncidentState[] = [
  'detected',
  'correlating',
  'investigating',
  'diagnosed',
  'response_proposed',
  'awaiting_approval',
  'executing',
  'verifying',
  'resolved',
]

export const TERMINAL_STATES: IncidentState[] = ['resolved', 'closed']

export type Mode = 'observe' | 'dry-run' | 'supervised' | 'lab-autonomous'

export type EvidenceKind =
  | 'metric'
  | 'log'
  | 'kubernetes_event'
  | 'audit_event'
  | 'deployment'
  | 'identity'
  | 'network'
  | 'process'

export interface Evidence {
  id: string
  kind: EvidenceKind
  source: string
  scope: string
  summary: string
  collectedAt: number
  redactions: string[]
  preview: string
}

export type Confidence = 'low' | 'medium' | 'high'

export interface Hypothesis {
  id: string
  statement: string
  category: 'operational' | 'security' | 'benign' | 'unknown'
  confidence: Confidence
  status: 'leading' | 'competing' | 'rejected'
  supporting: string[]
  contradicting: string[]
  missing: string[]
  producedBy: string
}

export interface Fact {
  text: string
  evidence: string[]
}

export type LinkStrength = 'strong' | 'weak'

export interface TimelineEntry {
  t: number
  kind: 'signal' | 'detection' | 'platform' | 'human'
  source: string
  title: string
  detail?: string
  evidenceId?: string
  link?: { key: string; strength: LinkStrength }
}

export type Decision = 'allow' | 'require_approval' | 'deny'

export interface Proposal {
  id: string
  version: number
  actionType: string
  actionLabel: string
  target: string
  parameters: Record<string, string | number>
  rationale: string
  hypothesisIds: string[]
  expectedImpact: string
  riskTier: 0 | 1 | 2 | 3 | 4
  reversible: boolean
  rollbackPlan: string
  verificationPlan: string
  decision: Decision
  matchedRules: string[]
  decisionReasons: string[]
  policyVersion: string
  proposedAt: number
  expiresAt?: number
  status: 'pending' | 'approved' | 'rejected' | 'executed' | 'expired'
  decidedBy?: string
  decidedAt?: number
  verification?: { result: 'verified' | 'not_verified' | 'inconclusive'; detail: string }
}

export interface Entity {
  type: 'workload' | 'identity' | 'resource' | 'deployment' | 'address' | 'process'
  name: string
}

export interface SignalSeries {
  key: string
  label: string
  unit: string
  values: number[]
  threshold?: number
}

export interface SignalSet {
  start: number
  step: number
  series: SignalSeries[]
  markers: { t: number; label: string }[]
}

export interface Incident {
  id: string
  title: string
  domain: Domain
  state: IncidentState
  urgency: Urgency
  owner: string | null
  scenarioId: string
  rule: string
  firstSignalAt: number
  createdAt: number
  updatedAt: number
  resolvedAt?: number
  summary: string
  assessment: string
  entities: Entity[]
  eventCount: number
  searchQuery: string
  facts: Fact[]
  evidence: Evidence[]
  hypotheses: Hypothesis[]
  timeline: TimelineEntry[]
  proposal?: Proposal
  signals?: SignalSet
}

export interface LogEvent {
  id: number
  time: number
  index: string
  sourcetype: string
  source: string
  host: string
  fields: Record<string, string | number>
  raw: string
}

export type HealthStatus = 'healthy' | 'degraded' | 'critical'

export interface Workload {
  name: string
  namespace: string
  kind: 'Deployment' | 'StatefulSet'
  status: HealthStatus
  statusNote: string
  incidentId?: string
  version: string
  replicas: { ready: number; desired: number }
  restarts24h: number
  start: number
  step: number
  metrics: { cpu: number[]; memory: number[]; latency: number[]; errors: number[] }
}

export interface AuditRecord {
  id: number
  t: number
  actor: string
  event: string
  incidentId?: string
  details: string
  prevHash: string
  hash: string
}

export interface DetectionFiring {
  rule: string
  domain: 'cloudops' | 'soc'
  t: number
  incidentId?: string
  suppressed: boolean
}

export interface PolicyDecisionRecord {
  t: number
  proposal: string
  action: string
  decision: Decision
  reason: string
  incidentId?: string
}
