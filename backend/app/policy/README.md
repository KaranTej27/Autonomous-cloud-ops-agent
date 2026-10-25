# `policy`

Decides, in deterministic code, whether a proposed action is allowed, needs approval, or is denied.

Status: planned. Open question: our own rule evaluator over a YAML file, or a policy engine such as Open Policy Agent.

## Responsibility

Evaluate each proposal version and return a decision in the format from [docs/architecture.md](../../../docs/architecture.md#policy-decision): `allow`, `require_approval`, or `deny`, with the matched rules and reasons.

## Checks

A proposal must pass all of these:

| Check | Fails when |
|---|---|
| Allowlist | The action type is not in the catalogue |
| Scope | The target is outside configured namespaces, accounts, or resources |
| Bounds | A parameter is outside its limit, for example a replica count above the maximum |
| Mode | The operating mode does not permit execution |
| Rate limit | Too many actions for this incident or time window |
| Emergency stop | The emergency stop is engaged |
| Tier | Tier 3 needs approval; tier 4 is always denied |

Unknown actions are denied. Defaults follow the tiers in [docs/safety-model.md](../../../docs/safety-model.md#action-tiers-and-default-policy).

## Policy configuration

- Lives in a versioned, reviewed configuration file.
- Every decision records the policy version it used.
- Changes are security-sensitive.

## Must not

- Depend on model output to reach a decision. The model may explain a decision to a user. It never makes one.
- Allow by default when a check errors. An error means `deny`.

## Testing

- Unknown action: denied.
- Target out of scope: denied.
- Parameter out of bounds: denied.
- Tier 3 action: requires approval.
- Tier 4 action: denied, even with an approval.
- Emergency stop engaged: denied.
- A check that throws an error: denied.
