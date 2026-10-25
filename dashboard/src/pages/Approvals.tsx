import { Clock } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { DecisionBadge, StateBadge, UrgencyBadge } from '../components/Badges'
import { ProposalCard } from '../components/ProposalCard'
import { PageHeader } from '../components/Shell'
import { relative } from '../lib/format'
import { proposalStatus, useIncidents } from '../state/selectors'

const ORDER = { pending: 0, approved: 1, rejected: 2, executed: 3, expired: 4 }

export function Approvals() {
  const incidents = useIncidents()
  const [params, setParams] = useSearchParams()
  const withProposals = incidents
    .filter((i) => i.proposal)
    .sort((a, b) => ORDER[proposalStatus(a.proposal!)] - ORDER[proposalStatus(b.proposal!)] || b.proposal!.proposedAt - a.proposal!.proposedAt)
  const pending = withProposals.filter((i) => i.proposal!.decision === 'require_approval' && proposalStatus(i.proposal!) === 'pending')
  const selectedId = params.get('p') ?? pending[0]?.proposal?.id ?? withProposals[0]?.proposal?.id
  const selected = withProposals.find((i) => i.proposal!.id === selectedId)

  return (
    <div className="page">
      <PageHeader
        title="Approvals"
        description="Every action that changes infrastructure needs a decision from policy, and tier 3 actions also need a human. An approval covers one proposal version and expires."
      />
      <div className="approvals-layout">
        <aside className="panel approvals-list" aria-label="Proposals">
          <div className="list-head">
            <strong>{pending.length} waiting</strong>
            <span className="muted small">{withProposals.length} proposals in total</span>
          </div>
          <ul>
            {withProposals.map((i) => {
              const p = i.proposal!
              const status = proposalStatus(p)
              return (
                <li key={p.id}>
                  <button type="button" className={`approval-item${p.id === selectedId ? ' is-selected' : ''}`} onClick={() => setParams({ p: p.id })} aria-current={p.id === selectedId}>
                    <div className="approval-item-top">
                      <span className="mono small">
                        {p.id} v{p.version}
                      </span>
                      <span className={`pill status-${status}`}>{status}</span>
                    </div>
                    <div className="approval-item-title">{p.actionLabel}</div>
                    <div className="mono muted small ellipsis">{p.target}</div>
                    <div className="approval-item-meta">
                      <UrgencyBadge urgency={i.urgency} compact />
                      <DecisionBadge decision={p.decision} />
                      {status === 'pending' && p.expiresAt && (
                        <span className="muted small nowrap">
                          <Clock size={12} aria-hidden="true" /> {relative(p.expiresAt, Date.now())}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        </aside>
        <div className="approvals-detail">
          {selected ? (
            <>
              <div className="approval-context">
                <span className="muted small">For incident</span>
                <Link to={`/incidents/${selected.id}`} className="strong">
                  {selected.id}: {selected.title}
                </Link>
                <StateBadge state={selected.state} />
              </div>
              <ProposalCard incident={selected} proposal={selected.proposal!} />
            </>
          ) : (
            <div className="empty-state">
              <p>No proposals yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
