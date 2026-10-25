# CloudOps scenarios

Reliability failures produced in the local lab with the sample workload's failure-injection switches. Each one follows the format in [scenarios/README.md](../README.md#scenario-fields).

Status: planned.

## Planned scenarios

| ID | Scenario | Trigger | Ground truth | Benign lookalike |
|---|---|---|---|---|
| CO-001 | CrashLoopBackOff after a deploy | New revision missing a required environment variable | Configuration regression | Pods restarting during a normal rolling update |
| CO-002 | Memory exhaustion | Switch makes the workload allocate memory until OOMKilled | Memory leak in the new revision | Expected cache warm-up after a restart |
| CO-003 | Database connection exhaustion | Pool size reduced, then load applied | Connection pool too small for the load | Short spike in connections during a deploy |
| CO-004 | High CPU from load | Load generator raises the request rate | Legitimate traffic increase | Same CPU curve with no change in request rate (pairs with SOC-007) |
| CO-005 | Readiness probe failures | Probe points at a dependency that is down | Unavailable downstream dependency | Slow startup that recovers within the probe's grace period |
| CO-006 | Insufficient replicas | Replicas scaled below the minimum | Configuration change reduced capacity | Scheduled scale-down during a quiet period |
| CO-007 | Disk exhaustion | Workload writes to its volume until full | Runaway log or data growth | Expected data growth with headroom left |
| CO-008 | Latency increase after a deploy | New revision adds a slow code path | Performance regression | Latency rise caused by upstream maintenance |

## Expected responses

| ID | Proposal | Policy decision |
|---|---|---|
| CO-001 | Roll back to the previous revision | Approval required |
| CO-002 | Roll back to the previous revision | Approval required |
| CO-003 | Notify, with the evidence; no automatic change | Allowed |
| CO-004 | Scale the deployment within bounds | Test policy or approval |
| CO-005 | Notify, and collect dependency health | Allowed |
| CO-006 | Scale back to the minimum | Test policy or approval |
| CO-007 | Notify; no automatic change | Allowed |
| CO-008 | Roll back to the previous revision | Approval required |

These are starting points. Adjust them as the action catalogue in [`response_planner`](../../backend/app/response_planner/README.md) settles.
