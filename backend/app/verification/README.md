# `verification`

Checks whether an action recovered the service or contained the activity, using signals independent of the executor.

Status: planned.

## Responsibility

- Run the verification plan attached to each proposal.
- Fetch fresh signals through `collectors` over the planned window.
- Return `verified`, `not_verified`, or `inconclusive`, with the evidence used.
- Escalate `not_verified` and `inconclusive` results to a human.

## Examples

| Action | Verified when |
|---|---|
| Restart a test workload | Pods are ready, and the error rate stays below its threshold for the whole window |
| Roll back a deployment | The previous revision is running, and latency and error rate return to baseline |
| Isolate a workload | Unexpected outbound traffic stops, and other workloads stay healthy |
| Scale a deployment | Available replicas match desired, and latency returns to baseline |

## Must not

- Treat the executor's success response as proof.
- Mark an incident resolved when the result is inconclusive.

## Testing

- Each scenario's expected outcome is verified correctly.
- A scenario where the action "succeeds" but the problem continues returns `not_verified`.
- Missing data returns `inconclusive`, not `verified`.
