# Backend

The backend is one Python and FastAPI application that holds every platform module. Modules talk through clear interfaces inside one process. They can be split into services later if scaling or ownership requires it.

Status: planned. Each module folder holds a README that acts as the module's spec. No code exists yet.

## Layout

| Folder | Responsibility |
|---|---|
| [`app/api/`](app/api/README.md) | HTTP interface for the dashboard and integrations |
| [`app/orchestrator/`](app/orchestrator/README.md) | Incident state machine and investigation loop |
| [`app/collectors/`](app/collectors/README.md) | Read-only retrieval of telemetry and audit events |
| [`app/cloudops/`](app/cloudops/README.md) | Reliability detections and investigation playbooks |
| [`app/soc/`](app/soc/README.md) | Defensive security detection rules |
| [`app/correlation/`](app/correlation/README.md) | Groups related events into incidents and timelines |
| [`app/diagnosis/`](app/diagnosis/README.md) | Evidence-backed hypotheses and the model interface |
| [`app/response_planner/`](app/response_planner/README.md) | Typed remediation and containment proposals |
| [`app/policy/`](app/policy/README.md) | Decides allow, require approval, or deny |
| [`app/executor/`](app/executor/README.md) | Runs authorized, allowlisted actions |
| [`app/verification/`](app/verification/README.md) | Confirms recovery or containment |
| [`app/incident_store/`](app/incident_store/README.md) | PostgreSQL persistence and the audit log |
| [`tests/`](tests/README.md) | Unit, integration, scenario, and safety tests |

## Boundaries

The full rules are in [docs/architecture.md](../docs/architecture.md#dependency-rules). The ones that matter most:

- Only `executor` changes infrastructure, and only after a `policy` decision or an approval bound to the exact proposal version.
- `collectors` are read-only.
- `diagnosis` and `response_planner` produce data. They have no path to `executor`.
- `api` never calls `executor` directly.

## Where to start

Build the modules needed for the first end-to-end CloudOps workflow first: `collectors`, `cloudops`, `orchestrator`, `diagnosis` with the rule-based baseline only, `incident_store`, and a read-only `api`. Leave `executor` in dry-run until `policy` and its tests exist.

## Related documents

- [docs/development-setup.md](../docs/development-setup.md)
- [docs/safety-model.md](../docs/safety-model.md)
- [CONTRIBUTING.md](../CONTRIBUTING.md)
