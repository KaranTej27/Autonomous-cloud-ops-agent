# Architecture

Status: design draft. Nothing described here is implemented yet. When an implementation changes an interface or data model, update this document in the same pull request.

## Goal

The platform brings operational telemetry and defensive security signals into one investigation workflow. Every incident follows the same path, whether the cause turns out to be a bad deployment or a compromised credential.

```text
OBSERVE
   ↓
DETECT
   ↓
CORRELATE
   ↓
INVESTIGATE
   ↓
DIAGNOSE WITH EVIDENCE
   ↓
PLAN RESPONSE
   ↓
CHECK POLICY + APPROVAL
   ↓
EXECUTE ALLOWED ACTION
   ↓
VERIFY + AUDIT
```

## Design principles

- One backend application with clear module boundaries. Split modules into services only when scaling or ownership requires it.
- Code enforces safety. Detection rules, policy checks, scope checks, and argument validation are deterministic code. The model helps investigate, and it never decides whether an action is allowed.
- Every claim points to evidence. Hypotheses cite evidence records by ID.
- Every action is typed and constrained. The executor runs a fixed set of allowlisted action implementations. It has no generic shell or API passthrough.
- Collected data is untrusted. Logs and events can contain text an attacker wrote.
- Local first. Everything runs in Docker and kind or minikube before any cloud integration.

## System diagram

```text
                   Dashboard / Analyst Console
                               |
                               v
                            API Layer
                               |
                               v
                    Incident Orchestrator
                               |
             +-----------------+-----------------+
             |                 |                 |
             v                 v                 v
       CloudOps Engine     SOC Engine      Event Correlator
       Service health     Security rules    Timeline / graph
       Metrics & logs     Audit events      Entity relations
             |                 |                 |
             +-----------------+-----------------+
                               |
                               v
                      Investigation Engine
              Evidence + hypotheses + confidence
                               |
                               v
                     Response / Remediation Plan
                               |
                               v
                        Policy Enforcement
                               |
                      Human approval if needed
                               |
                               v
                     Restricted Action Executor
                               |
               +---------------+---------------+
               |               |               |
               v               v               v
          Kubernetes       Cloud APIs     Alert / ticket
               |
               v
         Health & containment verification
               |
               v
        Incident report + audit trail
```

## Modules

Each module has a README that acts as its spec.

| Module | Responsibility |
|---|---|
| [`api`](../backend/app/api/README.md) | HTTP interface for the dashboard and integrations |
| [`orchestrator`](../backend/app/orchestrator/README.md) | Incident state machine and investigation loop |
| [`collectors`](../backend/app/collectors/README.md) | Read-only retrieval of metrics, logs, traces, Kubernetes events, and audit events |
| [`cloudops`](../backend/app/cloudops/README.md) | Reliability detections and investigation playbooks |
| [`soc`](../backend/app/soc/README.md) | Defensive security detection rules and investigations |
| [`correlation`](../backend/app/correlation/README.md) | Links related events by time, identity, workload, and resource |
| [`diagnosis`](../backend/app/diagnosis/README.md) | Evidence-backed hypotheses with stated uncertainty |
| [`response_planner`](../backend/app/response_planner/README.md) | Typed remediation and containment proposals |
| [`policy`](../backend/app/policy/README.md) | Allowlists, scope, bounds, and approval requirements |
| [`executor`](../backend/app/executor/README.md) | Runs narrowly scoped, authorized actions |
| [`verification`](../backend/app/verification/README.md) | Confirms recovery or containment using independent signals |
| [`incident_store`](../backend/app/incident_store/README.md) | Persists incidents, evidence, decisions, actions, and the audit log |
| [`evaluation`](../evaluation/README.md) | Repeatable scenario runs and metrics |
| [`dashboard`](../dashboard/README.md) | Alerts, timelines, evidence, approvals, and outcomes |

## Dependency rules

```text
api --> orchestrator --> collectors --> telemetry sources (read-only)
            |
            +--> cloudops / soc --> correlation
            +--> diagnosis --> model interface
            +--> response_planner
            +--> policy --> executor --> Kubernetes / cloud APIs
            +--> verification --> collectors

all modules --> incident_store
```

- `api` calls `orchestrator` and reads from `incident_store`. It never calls `executor`.
- `orchestrator` is the only module that moves an incident between states.
- `collectors` are read-only, and they are the only modules that read telemetry sources.
- `diagnosis` and `response_planner` produce data (hypotheses and proposals). They have no path to `executor`.
- `executor` accepts a proposal only when it carries an `allow` decision from `policy`, or a recorded approval bound to that exact proposal version.
- `verification` asks `collectors` for fresh signals after an action. It does not trust the executor's own success report.
- Modules write through `incident_store`. The audit log is append-only.

## Incident lifecycle

Proposed states for the orchestrator's state machine:

| State | Meaning | Next states |
|---|---|---|
| `detected` | A CloudOps or SOC rule fired | `correlating` |
| `correlating` | Grouping with related events and open incidents | `investigating`, `merged` |
| `merged` | Folded into another incident | none |
| `investigating` | Collecting scoped evidence | `diagnosed`, `escalated` |
| `diagnosed` | Hypotheses with evidence and confidence exist | `response_proposed`, `closed`, `escalated` |
| `response_proposed` | A typed proposal exists and policy has evaluated it | `awaiting_approval`, `executing`, `escalated` |
| `awaiting_approval` | Waiting for a human decision | `executing`, `diagnosed` (rejected), `escalated` (expired) |
| `executing` | The executor is running the action | `verifying`, `escalated` (failed) |
| `verifying` | Checking independent signals | `resolved`, `escalated` |
| `resolved` | Verification passed | none |
| `closed` | No action needed, for example benign activity or a false positive | none |
| `escalated` | Handed to a human with the findings so far | `closed`, `resolved` (by a human) |

Any state can move to `escalated` when a budget or timeout runs out, or when someone engages the emergency stop. A `deny` policy decision also leads to `escalated`.

## Investigation loop

The agentic part runs inside `investigating` and `diagnosed`. The orchestrator gives the model a fixed set of read-only tools, each backed by a collector:

| Tool | Returns |
|---|---|
| `get_workload_metrics` | Metrics for one workload over a time range |
| `get_recent_workload_logs` | Redacted log lines for one workload |
| `get_scoped_audit_events` | Audit events for an in-scope workload, identity, or resource |
| `get_deployment_history` | Recent rollouts and configuration changes |
| `get_identity_history` | Recent activity for one identity |
| `build_timeline` | Ordered events for the incident |

For every tool call, the orchestrator validates the arguments, checks scope, applies a timeout, and records the result as evidence. Each incident has budgets for tool calls, wall-clock time, and model tokens or cost. When a budget runs out, the incident escalates with its partial findings.

## Data models

These fields are a proposal. The open-source foundation milestone includes finalizing them, including names and types.

### Normalized security event

| Field | Description |
|---|---|
| `event_id` | Unique ID |
| `timestamp` | When the event happened, in UTC |
| `ingested_at` | When the platform received it |
| `source` | `application`, `identity`, `kubernetes_audit`, `cloud_audit`, `network`, or `runtime` |
| `category` | `authentication`, `authorization`, `privilege_change`, `resource_access`, `network`, or `process` |
| `action` | What happened, for example `login`, `create_role_binding`, `get_object` |
| `outcome` | `success`, `failure`, or `unknown` |
| `actor` | Identity ID and type (user, service account, role) |
| `target` | Resource acted on |
| `workload` | Namespace, workload, pod, and container, when known |
| `network` | Source and destination address and port, when known |
| `raw_ref` | Pointer to the original record |
| `is_simulated` | True for synthetic scenario events |

### Incident

| Field | Description |
|---|---|
| `incident_id` | Unique ID |
| `title` | Short description |
| `domain` | `cloudops`, `soc`, or `mixed` |
| `state` | Lifecycle state |
| `severity` | Proposed scale: `low`, `medium`, `high`, `critical` |
| `entities` | Linked workloads, identities, resources, and deployments |
| `events` | References to detections and events |
| `evidence`, `hypotheses`, `proposals` | Linked records |
| `mode` | Operating mode when the incident opened |
| `is_simulated` | True for scenario runs |
| `created_at`, `updated_at` | Timestamps |

### Evidence

| Field | Description |
|---|---|
| `evidence_id` | Unique ID that hypotheses cite |
| `kind` | `metric`, `log`, `trace`, `kubernetes_event`, `audit_event`, `deployment`, or `identity` |
| `source` | Which collector produced it |
| `scope` | Query, time range, and target used |
| `summary` | Short factual description |
| `data_ref` | Pointer to the stored, redacted data |
| `redactions` | What was redacted |
| `collected_at` | Timestamp |

### Hypothesis

| Field | Description |
|---|---|
| `hypothesis_id` | Unique ID |
| `statement` | The proposed explanation |
| `category` | `operational`, `security`, `benign`, or `unknown` |
| `supporting_evidence` | Evidence IDs |
| `contradicting_evidence` | Evidence IDs |
| `missing_information` | What would confirm or rule it out |
| `confidence` | `low`, `medium`, or `high`. A label, not a probability, until calibration is evaluated |
| `produced_by` | `rule`, `model` (with model name and version), or `human` |

### Action proposal

| Field | Description |
|---|---|
| `proposal_id`, `version` | A new version is created whenever target or parameters change |
| `action_type` | An entry from the action catalogue in `response_planner` |
| `target` | Namespace and resource |
| `parameters` | Typed and bounded |
| `rationale` | Linked hypothesis IDs |
| `expected_impact` | What changes, and for whom |
| `risk_tier` | Tier from [safety-model.md](safety-model.md) |
| `reversible`, `rollback_plan` | How to undo it |
| `verification_plan` | Signals and window that `verification` checks |

### Policy decision

| Field | Description |
|---|---|
| `decision` | `allow`, `require_approval`, or `deny` |
| `proposal_id`, `version` | What was evaluated |
| `matched_rules` | Policy rule IDs |
| `reasons` | Plain-language explanation |
| `policy_version` | Version of the policy configuration |
| `evaluated_at` | Timestamp |

### Approval

| Field | Description |
|---|---|
| `approval_id` | Unique ID |
| `proposal_id`, `version` | The exact proposal version approved |
| `approver` | Authenticated user |
| `decision` | `approved` or `rejected` |
| `reason` | Required for rejections |
| `expires_at` | After this time the approval is void |
| `used_at` | Set once; an approval is single-use |

### Audit record

| Field | Description |
|---|---|
| `record_id` | Unique, monotonic ID |
| `actor` | Module, model, or user |
| `event` | What happened, for example `policy_decision` or `emergency_stop_engaged` |
| `incident_id` | When applicable |
| `details` | Redacted inputs and results |
| `timestamp` | UTC |
| `previous_hash` | Proposed hash chain for tamper evidence |

## Technology choices

| Layer | Choice |
|---|---|
| Backend | Python and FastAPI |
| Workflow | Explicit state machine; LangGraph if it proves useful |
| Model access | Provider-neutral interface for hosted or local models |
| Infrastructure | Docker, Kubernetes, kind or minikube |
| Metrics | Prometheus |
| Dashboards | Grafana |
| Telemetry | OpenTelemetry |
| Logs | Kubernetes and application logs first; a log platform later |
| Security events | Normalized event schema (above) |
| Persistence | PostgreSQL |
| Frontend | React or Next.js |
| CI | GitHub Actions |
| Cloud | AWS, Azure, or GCP, after local tests are reliable |
| Infrastructure as code | Terraform, in a later milestone |

## Open questions

- Plain Python state machine or LangGraph for the orchestrator?
- Align the event schema with an existing one such as OCSF or Elastic Common Schema, or start minimal and map later?
- Policy format: rules in YAML evaluated by our own code, or a policy engine such as Open Policy Agent?
- Dashboard framework: React single-page app or Next.js?
- Should the incident store keep redacted copies of raw telemetry, or only references to it?
- How should approvers authenticate in a single-machine lab?
