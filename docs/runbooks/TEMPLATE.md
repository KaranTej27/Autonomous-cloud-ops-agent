# Runbook: <title>

| Field | Value |
|---|---|
| Domain | CloudOps, SOC, or Platform |
| Owner | |
| Last reviewed | YYYY-MM-DD |
| Related detections | |
| Related scenarios | |

## When to use this runbook

The alert, detection, or situation that sends someone here.

## Before you start

- Confirm you are in the lab. For Kubernetes, `kubectl config current-context` must print the lab context.
- List the permissions this runbook needs.
- Note the current operating mode and whether the emergency stop is engaged.

## Signals

What the person usually sees first: alerts, dashboard panels, metrics, or events.

## Investigation steps

1. Step.
2. Step.
3. Step.

For each step, say what to check, where to find it, what normal looks like, and what abnormal looks like.

## Competing explanations

| Explanation | Evidence for | Evidence against | How to tell them apart |
|---|---|---|---|
| | | | |

## Response options

| Action | Tier | Reversible | Rollback | Verification |
|---|---|---|---|---|
| | | | | |

Tiers follow [safety-model.md](../safety-model.md#action-tiers-and-default-policy).

## Verification

The independent signals that show the service recovered or the activity was contained, and how long to watch them.

## Escalation

When to stop and hand over, and to whom.

## What to record

What goes into the incident record: timeline, evidence, decisions, actions, and outcome.

## Notes and history

Changes to this runbook and lessons from past use.
