# `executor`

Runs narrowly scoped, explicitly authorized actions. It is the only module that changes infrastructure.

Status: planned. Every action ships in dry-run first.

## Responsibility

- Run an action only when all of these hold:
  - `policy` returned `allow` for this proposal version, or a valid approval exists for this exact version.
  - The emergency stop is not engaged.
  - The operating mode permits execution.
- Check policy and the emergency stop again immediately before running, in case anything changed after approval.
- Record the target's state before and after the action, for rollback and audit.
- Provide a dry-run implementation for every action that records what would have happened.

## How actions are built

- Each action in the [catalogue](../response_planner/README.md#planned-action-catalogue) is a fixed implementation with typed, bounded parameters.
- There is no shell access and no generic API passthrough.
- Each action documents the exact permissions it needs.

## Security requirements

- Use a dedicated identity, separate from the collectors' identity, with only the verbs and resources the allowlisted actions need, in lab namespaces only.
- Put a timeout on every call.
- Never retry a non-idempotent action unless the action is documented as safe to retry. Cap retries for the rest.
- Mark each approval as used once the action runs.

## Must not

- Accept instructions from the model directly.
- Run anything outside the catalogue.
- Report success based only on the API response. `verification` decides whether the action worked.

## Testing

- No policy decision: refuses to run.
- Approval for a different proposal version: refuses to run.
- Expired or already-used approval: refuses to run.
- Emergency stop engaged between approval and execution: refuses to run.
- Failed action: records the state and escalates.
- Dry-run: changes nothing and records the intended action.
