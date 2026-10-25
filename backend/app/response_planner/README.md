# `response_planner`

Turns a diagnosis into typed remediation or containment proposals and explains their impact.

Status: planned.

## Responsibility

- Choose actions from a fixed action catalogue.
- Fill in each proposal with the fields in [docs/architecture.md](../../../docs/architecture.md#action-proposal): target, parameters, rationale, expected impact, risk tier, rollback plan, and verification plan.
- Propose "collect more evidence", "escalate", or "no action" when no action is justified.
- Create a new proposal version whenever the target or parameters change.

## Planned action catalogue

| Action | Domain | Reversible | Default policy |
|---|---|---|---|
| Notify or open a ticket | Both | Not applicable | Allowed |
| Collect more evidence | Both | Not applicable | Allowed |
| Restart a pod in a test workload | CloudOps | Yes | Test policy or approval |
| Scale a deployment within bounds | CloudOps | Yes | Test policy or approval |
| Roll back a deployment to its previous revision | CloudOps | Yes | Approval |
| Isolate a workload with a network policy | SOC | Yes | Approval |
| Revoke sessions or disable an access key | SOC | Partly | Approval (cloud integration, later) |

Deleting data or resources, and disabling security controls, are not in the catalogue. Policy denies anything outside it.

Adding an action to the catalogue is security-sensitive. See [CONTRIBUTING.md](../../../CONTRIBUTING.md#a-response-action).

## Must not

- Invent action types that are not in the catalogue.
- Mark its own proposals as approved.
- Call `executor`.

## Testing

- Each scenario produces the expected proposal, or the expected "no action".
- Proposals always include a rollback plan and a verification plan.
- A proposal for an action outside the catalogue cannot be built.
