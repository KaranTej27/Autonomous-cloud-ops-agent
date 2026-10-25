# `correlation`

Links related events and detections into incidents, timelines, and entity relationships.

Status: planned.

## Responsibility

- Group detections and events that belong to the same incident.
- Attach new events to open incidents, and merge incidents that turn out to be one.
- Build an ordered timeline for each incident.
- Maintain links between workloads, identities, deployments, resources, and network destinations.
- Deduplicate repeated alerts.

## Correlation keys

| Key | Example |
|---|---|
| Time window | Events within a few minutes of each other |
| Workload | Same namespace and deployment |
| Identity | Same user, service account, or role |
| Resource | Same storage bucket, database, or secret |
| Deployment | Events after a specific rollout |
| Network destination | Same external address |

## Link strength

Every link stores the key that produced it and a strength:

- Strong: the events share an entity, such as the same identity or workload.
- Weak: the events are close in time only.

Time proximity alone is weak evidence. A weak link can put events on the same timeline, but `diagnosis` must not treat it as a causal connection.

## Must not

- Infer causes. Correlation says events are related, not that one caused another.
- Drop the reason for a link. Every link must be explainable on the dashboard.

## Outputs

- Incident candidates for `orchestrator`.
- Timeline entries.
- Entity links, each with its key and strength.

## Testing

- Related events from a scenario end up in one incident.
- Unrelated events at the same time stay in separate incidents.
- A benign event that shares only a time window with a suspicious one gets a weak link and nothing more.
