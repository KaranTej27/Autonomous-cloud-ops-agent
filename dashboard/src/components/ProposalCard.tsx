import { CircleCheck, CircleX, Hourglass, OctagonX, RotateCcw, ShieldCheck, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import type { Incident, Proposal } from '../data/types'
import { fullTime, relative } from '../lib/format'
import { useApp } from '../state/AppState'
import { proposalStatus } from '../state/selectors'
import { DecisionBadge, TierBadge } from './Badges'
import { Modal } from './Modal'

const STATUS_TEXT: Record<Proposal['status'], string> = {
  pending: 'Waiting for a human decision',
  approved: 'Approved',
  rejected: 'Rejected',
  executed: 'Executed',
  expired: 'Expired without a decision',
}

export function ProposalCard({ incident, proposal }: { incident: Incident; proposal: Proposal }) {
  const status = proposalStatus(proposal)
  const hyps = incident.hypotheses.filter((h) => proposal.hypothesisIds.includes(h.id))

  return (
    <article className="proposal">
      <header className="proposal-head">
        <div>
          <div className="eyebrow">
            {proposal.id} · version {proposal.version} · {proposal.actionType}
          </div>
          <h3>{proposal.actionLabel}</h3>
        </div>
        <div className="proposal-badges">
          <TierBadge tier={proposal.riskTier} />
          <DecisionBadge decision={proposal.decision} />
        </div>
      </header>

      <dl className="kv">
        <dt>Target</dt>
        <dd>
          <code>{proposal.target}</code>
        </dd>
        <dt>Parameters</dt>
        <dd>
          <div className="param-list">
            {Object.entries(proposal.parameters).map(([k, v]) => (
              <code key={k}>
                {k}=<strong>{String(v)}</strong>
              </code>
            ))}
          </div>
        </dd>
        <dt>Rationale</dt>
        <dd>
          {proposal.rationale}
          {hyps.length > 0 && (
            <div className="muted small">
              Addresses {hyps.map((h) => h.id).join(', ')}: {hyps[0].statement.split('.')[0]}.
            </div>
          )}
        </dd>
        <dt>Expected impact</dt>
        <dd>{proposal.expectedImpact}</dd>
        <dt>Rollback</dt>
        <dd>
          <span className="inline-flag">
            <RotateCcw size={13} aria-hidden="true" />
            {proposal.reversible ? 'Reversible' : 'Not reversible'}
          </span>{' '}
          {proposal.rollbackPlan}
        </dd>
        <dt>Verification</dt>
        <dd>{proposal.verificationPlan}</dd>
      </dl>

      <section className="policy-box">
        <div className="policy-title">
          <ShieldCheck size={15} aria-hidden="true" />
          Policy decision <span className="muted">({proposal.policyVersion}, evaluated in code)</span>
        </div>
        <ul className="list-tight">
          {proposal.decisionReasons.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        <div className="chip-row">
          {proposal.matchedRules.map((r) => (
            <code className="chip mono" key={r}>
              {r}
            </code>
          ))}
        </div>
      </section>

      <footer className="proposal-status">
        <StatusLine proposal={{ ...proposal, status }} />
        {proposal.verification && (
          <span className={`verify tone-${proposal.verification.result === 'verified' ? 'good' : 'warning'}`}>
            Verification: {proposal.verification.result.replace('_', ' ')}. {proposal.verification.detail}
          </span>
        )}
      </footer>

      {proposal.decision === 'require_approval' && status === 'pending' && <ApprovalControls incident={incident} proposal={proposal} />}
    </article>
  )
}

function StatusLine({ proposal }: { proposal: Proposal }) {
  const Icon = { pending: Hourglass, approved: CircleCheck, rejected: CircleX, executed: CircleCheck, expired: TriangleAlert }[proposal.status]
  const tone = { pending: 'warning', approved: 'good', rejected: 'critical', executed: 'good', expired: 'neutral' }[proposal.status]
  return (
    <span className={`status-line tone-${tone}`}>
      <Icon size={15} aria-hidden="true" />
      <strong>{STATUS_TEXT[proposal.status]}</strong>
      {proposal.decidedBy && proposal.decidedAt && (
        <span className="muted">
          by {proposal.decidedBy}, {fullTime(proposal.decidedAt)}
        </span>
      )}
      {proposal.status === 'pending' && proposal.expiresAt && <span className="muted">Expires {relative(proposal.expiresAt, Date.now())}</span>}
    </span>
  )
}

function ApprovalControls({ incident, proposal }: { incident: Incident; proposal: Proposal }) {
  const { decide, notify, emergencyStop, mode } = useApp()
  const [reviewed, setReviewed] = useState(false)
  const [dialog, setDialog] = useState<'approve' | 'reject' | null>(null)
  const [reason, setReason] = useState('')

  const executes = !emergencyStop && (mode === 'supervised' || mode === 'lab-autonomous')

  return (
    <div className="approval">
      {emergencyStop && (
        <p className="note tone-critical">
          <OctagonX size={14} aria-hidden="true" /> The emergency stop is engaged. You can record a decision, but the executor will not run it.
        </p>
      )}
      {!emergencyStop && !executes && (
        <p className="note tone-warning">
          <TriangleAlert size={14} aria-hidden="true" /> The platform is in {mode} mode, so an approved action would not be executed.
        </p>
      )}
      <label className="check">
        <input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} />
        I have read the evidence, the expected impact, and the rollback plan for {proposal.id} v{proposal.version}.
      </label>
      <div className="approval-actions">
        <button type="button" className="btn btn-primary" disabled={!reviewed} onClick={() => setDialog('approve')}>
          <CircleCheck size={15} aria-hidden="true" /> Approve v{proposal.version}
        </button>
        <button type="button" className="btn" onClick={() => setDialog('reject')}>
          <CircleX size={15} aria-hidden="true" /> Reject
        </button>
      </div>

      {dialog === 'approve' && (
        <Modal
          title={`Approve ${proposal.id} v${proposal.version}?`}
          onClose={() => setDialog(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setDialog(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  decide({ proposalId: proposal.id, version: proposal.version, decision: 'approved' })
                  setDialog(null)
                  notify({ tone: 'success', title: `Approved ${proposal.id} v${proposal.version}`, body: 'Recorded in this session. No executor is connected to the prototype, so nothing ran.' })
                }}
              >
                Confirm approval
              </button>
            </>
          }
        >
          <p>
            <strong>{proposal.actionLabel}</strong> on <code>{proposal.target}</code>
          </p>
          <div className="param-list">
            {Object.entries(proposal.parameters).map(([k, v]) => (
              <code key={k}>
                {k}=<strong>{String(v)}</strong>
              </code>
            ))}
          </div>
          <p className="muted">
            This approval covers version {proposal.version} only. Any change to the target or parameters creates a new version that needs its own approval. It expires {proposal.expiresAt ? relative(proposal.expiresAt, Date.now()) : 'when the incident closes'}.
          </p>
          <p className="muted">Incident {incident.id}: {incident.assessment}</p>
        </Modal>
      )}

      {dialog === 'reject' && (
        <Modal
          title={`Reject ${proposal.id} v${proposal.version}`}
          onClose={() => setDialog(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setDialog(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-danger"
                disabled={reason.trim().length < 10}
                onClick={() => {
                  decide({ proposalId: proposal.id, version: proposal.version, decision: 'rejected', reason: reason.trim() })
                  setDialog(null)
                  notify({ tone: 'info', title: `Rejected ${proposal.id} v${proposal.version}`, body: `${incident.id} returns to Diagnosed.` })
                }}
              >
                Reject proposal
              </button>
            </>
          }
        >
          <label className="field">
            <span>Reason (required, at least 10 characters)</span>
            <textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: isolation would block payment callbacks; collect the process hash first." />
          </label>
        </Modal>
      )}
    </div>
  )
}
