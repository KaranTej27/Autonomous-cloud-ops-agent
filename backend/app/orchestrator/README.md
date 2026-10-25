# `orchestrator`

Owns the incident state machine and drives each incident through the investigation workflow.

Status: planned. Open question: a plain Python state machine, or LangGraph behind the same interface.

## Responsibility

- Move incidents between the states defined in [docs/architecture.md](../../../docs/architecture.md#incident-lifecycle). No other module changes incident state.
- Call the other modules in order: detection, correlation, investigation, diagnosis, response planning, policy, approval, execution, verification.
- Run the investigation loop. Offer the model a fixed set of read-only tools, validate each tool call, and record each result as evidence.
- Enforce per-incident budgets: tool calls, wall-clock time, and model tokens or cost.
- Escalate to a human with partial findings when a budget runs out, a step fails, or someone engages the emergency stop.
- Write every state transition to `incident_store`.

## Must not

- Decide whether an action is allowed. That belongs to `policy`.
- Execute actions itself.
- Let the model add tools, widen scope, or raise its own budget.
- Keep going after a budget runs out.

## Investigation tools

The tools the model may call are listed in [docs/architecture.md](../../../docs/architecture.md#investigation-loop). Each one wraps a collector. Before a call runs, the orchestrator checks that:

- The tool is on the list.
- The arguments match the tool's schema.
- The target is inside the configured scope.
- The budget allows another call.

## Inputs and outputs

| Direction | What |
|---|---|
| In | Detections from `cloudops` and `soc`; incident candidates from `correlation`; approval decisions from `api` |
| Out | State transitions, evidence requests, calls to `diagnosis`, `response_planner`, `policy`, `executor`, and `verification` |

## Testing

- Every state transition, including the paths into `escalated`.
- Budget exhaustion stops the loop and escalates.
- A tool call with an out-of-scope target is refused and recorded.
- A model response that cites nonexistent evidence is rejected.
- The emergency stop halts work in progress.
