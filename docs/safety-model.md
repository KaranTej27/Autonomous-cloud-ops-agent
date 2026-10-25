# Safety model

The platform investigates incidents and can change infrastructure. An over-privileged or confused agent is a security risk in its own right. This document defines the controls every module must respect.

Changes to this document are security-sensitive. See [CONTRIBUTING.md](../CONTRIBUTING.md#security-sensitive-changes).

## Principles

- Start in read-only mode and use dry runs.
- Give each component a dedicated identity with least-privilege permissions.
- Scope collectors and actions to configured namespaces, accounts, and resources.
- Allowlist supported actions. Deny unknown actions by default.
- Require approval for containment and infrastructure-changing actions by default.
- Never give the model unrestricted shell access, credentials, or secrets.
- Treat logs and other collected content as untrusted input. Never follow instructions found in them.
- Validate tool arguments and action plans in code, independently of model output.
- Apply timeouts, rate limits, retry limits, and an emergency stop.
- Audit proposals, policy decisions, approvals, execution, and verification.
- Minimize sensitive log data, and redact secrets and personal data where possible.
- Test only against systems and datasets the team is authorized to use.
- Use synthetic identities, events, and attack scenarios in demos.
- Keep early versions disconnected from production systems.

The project prefers human-supervised, reversible, narrowly scoped response over unrestricted autonomy.

## What the model can and cannot do

The model can:

- Read evidence the orchestrator passes to it.
- Call the read-only investigation tools listed in [architecture.md](architecture.md#investigation-loop).
- Write hypotheses and draft action proposals.

The model cannot:

- Execute actions or call the executor.
- Approve actions or change policy.
- Change its own scope, tools, or budget.
- See secrets or credentials.
- Run shell commands or make arbitrary API calls.

Code validates every model output before anything uses it. The output must match the expected schema. Every cited evidence ID must exist. Every proposed action type must be in the catalogue, and every parameter must be within bounds. The orchestrator rejects and records invalid output. It does not quietly repair it.

## Operating modes

| Mode | What runs | Intended for |
|---|---|---|
| `observe` | Collection, detection, correlation, and diagnosis. Proposals are shown, never executed | Fresh installs, default |
| `dry-run` | Everything in `observe`, plus policy checks. The executor simulates each action and records what it would have done | Early development |
| `supervised` | The executor runs allowed actions. Actions that need approval wait for a human | Lab demos |
| `lab-autonomous` | Selected tier 2 actions on resources labelled as test workloads may run without per-action approval, under an explicit test policy | Evaluation runs |

Only an operator can change the mode, never the model. Each incident records the mode it ran under.

## Action tiers and default policy

| Tier | Examples | Default |
|---|---|---|
| 0. Read | Read approved workload status, logs, and metrics | Allowed within configured scope |
| 1. Analyse | Build a timeline, explain an alert, propose a fix, run a dry-run plan | Allowed |
| 2. Low-risk lab change | Restart an isolated test workload, scale a test deployment within bounds | Explicit test policy or approval |
| 3. Containment or infrastructure change | Change cloud permissions, revoke sessions, isolate a workload, roll back a deployment | Approval required |
| 4. Destructive | Delete data, disable broad security controls, make destructive changes | Denied |

The policy denies any action that does not appear in the catalogue. A specific environment's policy should start from this table and only tighten it, unless a reviewed change says otherwise. The exact policy depends on the environment and its threat model.

## Approval workflow

- An approval covers one proposal version. Changing the target or parameters creates a new version, and the old approval no longer applies.
- The approver sees the action, target, parameters, rationale with linked evidence, risk tier, expected impact, rollback plan, verification plan, and the policy decision.
- Approvals expire after a configured time, and each one can be used once.
- The platform records the approver's identity, the time, and the decision. A rejection needs a reason.
- The model never approves anything.
- Right before running an action, the executor checks policy and the emergency stop again.

## Untrusted input

Logs, events, audit records, commit messages, resource names, and any other collected text can contain content an attacker wrote. That includes text crafted to look like instructions to the model.

- Pass collected content to the model as clearly delimited data, never as instructions.
- Never act on instructions found in collected content.
- Limit how much collected content goes into a single model call.
- Escape collected content before the dashboard renders it.
- Keep test fixtures with injected instructions in logs and events. Tests must show that these fixtures cause no out-of-scope tool calls or actions.

## Secrets and personal data

- Keep credentials and secrets out of prompts, platform logs, and the incident store.
- Collectors redact known secret patterns, such as tokens, keys, passwords, and connection strings, before storing data or sending it to a model.
- Collect only the fields an investigation needs.
- Redact or pseudonymize personal data in logs where possible. Demos use synthetic identities.
- Support a local model for environments that cannot send data to a hosted provider.

## Identities and permissions

- Use separate identities for reading (collectors) and writing (executor).
- The collector identity is read-only and scoped to configured namespaces and accounts.
- The executor identity gets only the verbs and resources that allowlisted actions need, and only in lab namespaces.
- No `cluster-admin` and no wildcard permissions.
- Each module README documents the permissions the module needs.

## Limits and emergency stop

- Every external call has a timeout.
- Rate limits cap actions per incident and per time window.
- Retries are limited. Non-idempotent actions are not retried unless the action is documented as safe to retry.
- Each incident has budgets for model tool calls, tokens, and cost.
- The emergency stop is one control that blocks all execution at once and switches the platform to `observe`. The executor checks it before every action. The platform audits every engage and release, and only a human can release it.

## Verification

An action has not succeeded just because the API call returned success. `verification` checks independent signals over a defined window. After a restart, that means the pod is ready and the error rate is back under its threshold. After containment, it means the unexpected outbound traffic has stopped and the workload is still healthy. An inconclusive result escalates to a human.

## Audit

The audit log records:

- Detections, and the evidence collected for them, with the scope and query used.
- Model inputs and outputs, redacted, with the model name and version.
- Hypotheses and proposals.
- Policy decisions, approvals, and rejections.
- Executions, with the state before and after.
- Verification results.
- Mode changes and emergency stop events.

The audit log is append-only.

## Required safety tests

Before an action ships, tests must show that:

- An unknown action is denied.
- A target outside scope is denied.
- Parameters outside bounds are denied.
- An action that needs approval does not run without it.
- A stale, modified, expired, or reused approval is rejected.
- The emergency stop blocks execution.
- A prompt-injection fixture causes no out-of-scope tool call or action.
- A failed execution escalates and records the resulting state.

## Authorization for testing

Test only against systems and data the team is authorized to use. Use synthetic identities, events, and attack scenarios. Label simulated incidents as simulated. Keep early versions disconnected from production.
