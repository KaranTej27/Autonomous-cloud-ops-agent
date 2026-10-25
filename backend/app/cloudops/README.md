# `cloudops`

Detects and investigates reliability incidents.

Status: planned.

## Responsibility

- Run deterministic detections on workload health signals.
- Define, for each incident type, which evidence the investigation should collect.
- Hand detections to `correlation` and evidence requests to `orchestrator`.

## Planned detections

| Detection | Signal | Evidence to collect | Benign lookalikes |
|---|---|---|---|
| CrashLoopBackOff | Restart count rising; pod in CrashLoopBackOff | Recent logs, last exit code, recent deployment and config changes | Restarts during a planned rollout |
| Failed rollout | Rollout past its progress deadline | Rollout history, events, image pull errors | A slow but healthy rollout |
| High CPU | CPU above threshold for the window | Request rate, recent deployments, outbound traffic | Real traffic spike; scheduled batch job |
| Memory exhaustion | Memory near limit; OOMKilled | Memory trend, recent deployments, restarts | Expected cache warm-up |
| Database connection exhaustion | Connection errors; pool saturation | Application logs, database connection metrics, replica count | Short spike during a deploy |
| Latency or error rate increase | p95 latency or 5xx rate above baseline | Traces, dependency health, recent deployments | Planned maintenance on an upstream dependency |
| Readiness failures | Readiness probe failing | Probe configuration, logs, dependency health | Slow startup |
| Insufficient replicas | Available replicas below desired | Events, node resources, autoscaler status | Scheduled scale-down |
| Disk exhaustion | Volume usage above threshold | Usage trend, log volume | Expected data growth |

Thresholds and windows are configuration, not constants.

## Rule documentation

Every detection documents:

- The signal and the threshold.
- The time window.
- The evidence to collect when it fires.
- Known benign lookalikes.
- The scenarios in [scenarios/cloudops/](../../../scenarios/cloudops/README.md) that test it.

## Must not

- Label an incident as a security incident. High CPU alone is a reliability signal. `correlation` and `diagnosis` decide whether security signals are related.
- Propose or run actions. That belongs to `response_planner` and `executor`.

## Testing

- Each detection fires on its scenario and stays quiet on its benign lookalike.
- Thresholds behave correctly at their edges.
