# `api`

The HTTP interface for the dashboard, analysts, and integrations, built with FastAPI.

Status: planned.

## Responsibility

- Expose incidents, timelines, evidence, hypotheses, proposals, and audit records.
- Accept approval and rejection decisions from authorized users.
- Expose platform controls: the operating mode and the emergency stop.
- Start lab scenario runs, in the lab only.
- Report service health.

## Planned endpoint groups

| Group | Purpose | Writes |
|---|---|---|
| Health | Liveness and readiness | No |
| Incidents | List, filter, and view incidents and their timelines | No |
| Evidence | View evidence records and their source references | No |
| Proposals and approvals | View proposals with their policy decisions; approve or reject | Yes |
| Controls | View and change the operating mode; engage or release the emergency stop | Yes |
| Scenarios | Start and list lab scenario runs | Yes, lab only |
| Audit | Read audit records | No |

## Must not

- Hold investigation, detection, or policy logic. It calls `orchestrator` and reads from `incident_store`.
- Call `executor`.
- Return secrets or unredacted sensitive data.

## Security requirements

- Authentication on every endpoint except health.
- Role-based authorization. Approving actions and changing controls each need a specific role.
- Every approval request names the exact proposal version it approves.
- Validate all input, and reject unknown fields.
- Restrictive CORS, and rate limits on write endpoints.
- Write an audit record for every write.

## Works with

`orchestrator`, `incident_store`, and the [dashboard](../../../dashboard/README.md).

## Testing

- Authorization tests for every write endpoint.
- Approving a stale or modified proposal fails.
- Contract tests for the responses the dashboard depends on.
