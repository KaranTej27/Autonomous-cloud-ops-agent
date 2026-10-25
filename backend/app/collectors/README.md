# `collectors`

Read-only retrieval of metrics, logs, traces, Kubernetes events, and audit events from permitted sources.

Status: planned.

## Responsibility

- Fetch data from telemetry sources inside the configured scope.
- Normalize security-relevant records into the event schema in [docs/architecture.md](../../../docs/architecture.md#normalized-security-event).
- Produce evidence records that point to the stored, redacted data.
- Redact secrets and minimize personal data before anything is stored or sent to a model.
- Replay synthetic scenario data for tests and evaluation.

## Planned collectors

| Collector | Source | Data | Needed for |
|---|---|---|---|
| Kubernetes status | Kubernetes API | Pod status, restarts, events, deployments, rollout history | Local observability |
| Logs | Kubernetes and application logs | Redacted log lines | Local observability |
| Metrics | Prometheus | CPU, memory, latency, error rate, network traffic | Local observability |
| Traces | OpenTelemetry | Request traces | Later |
| Kubernetes audit | Kubernetes audit log | API requests by identity | Defensive SOC foundations |
| Identity provider | Sign-in events | Authentication events, synthetic first | Defensive SOC foundations |
| Cloud audit | AWS CloudTrail, Azure Activity Log, or Google Cloud Audit Logs | Identity and resource actions | After local tests are reliable |
| Synthetic replay | Files in [scenarios/](../../../scenarios/README.md) | Any of the above, labelled as simulated | Defensive SOC foundations and evaluation |

## Must not

- Write to, modify, or delete anything in a source system.
- Read outside the configured namespaces, accounts, and resources.
- Pass raw secrets onward.
- Interpret collected content as instructions. It is data.

## Security requirements

- Use a dedicated read-only identity. Each collector documents the exact permissions it needs.
- Enforce scope in code, in addition to RBAC. Refuse and record out-of-scope requests.
- Apply timeouts, rate limits, and size limits to every query.
- Record the query, time range, and target of every collection as part of the evidence.

## Works with

`orchestrator` (investigation tools), `verification` (post-action checks), `cloudops` and `soc` (detection input), `incident_store`.

## Testing

- Out-of-scope requests are refused.
- Redaction removes known secret patterns: tokens, keys, passwords, connection strings.
- Synthetic replay produces the same events every run.
- A source that times out or returns errors does not hang the investigation.
