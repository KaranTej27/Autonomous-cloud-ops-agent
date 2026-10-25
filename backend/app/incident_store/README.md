# `incident_store`

Persists incident records, evidence references, decisions, actions, outcomes, and the audit log in PostgreSQL.

Status: planned.

## Responsibility

- Store the records defined in [docs/architecture.md](../../../docs/architecture.md#data-models): incidents, evidence, hypotheses, proposals, policy decisions, approvals, executions, verification results, and audit records.
- Keep the audit log append-only.
- Manage schema migrations.
- Answer read queries from `api`.

## Data handling

- Store redacted data, and references to raw data, rather than large raw copies. Whether to keep redacted excerpts at all is an open question in [docs/architecture.md](../../../docs/architecture.md#open-questions).
- Flag simulated data so it never mixes silently with real data in reports.
- Define a retention period for incident data before the project handles anything other than synthetic data.

## Audit log integrity

- Modules can add audit records but cannot change or delete them.
- Proposed: each record stores the hash of the previous record, so tampering is detectable.
- Back up the audit log separately from incident data.

## Must not

- Store secrets or credentials.
- Let any module change audit records after they are written.

## Testing

- Migrations apply cleanly to an empty database and upgrade an existing one.
- An attempt to change or delete an audit record fails.
- Simulated records stay flagged across every query.
