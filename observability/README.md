# Observability

Configuration for Prometheus, Grafana, and the OpenTelemetry Collector in the local lab.

Status: planned.

## Planned contents

| Item | Purpose |
|---|---|
| Prometheus configuration | Scrape targets for the sample workload, Kubernetes, and the platform itself |
| Alerting rules | Optional. Detection logic belongs in `cloudops`, but Prometheus alerts can feed it |
| Grafana dashboards | Workload health, and the platform's own metrics |
| OpenTelemetry Collector configuration | Receive traces and metrics from the sample workload |

## Workload metrics

CPU, memory, restarts, request rate, latency, error rate, outbound traffic, and database connections.

## Platform metrics

The platform should be as observable as the workloads it watches:

- Incidents opened, by domain and state.
- Time from event arrival to incident creation.
- Model latency, tokens, and estimated cost per incident.
- Investigation budget exhaustion count.
- Policy decisions, by outcome.
- Actions executed, and verification outcomes.
- Emergency stop state.

## Rules

- Dashboards and alerts must not show secrets or unredacted personal data.
- Keep configuration in files in this folder, so changes go through review.
