# Scenarios

Repeatable, authorized test scenarios with known ground truth. Tests replay them, the lab runs them, and [evaluation](../evaluation/README.md) scores the platform against them.

Status: planned. The fixture file format will be defined together with the event schema.

## Folders

| Folder | Contents |
|---|---|
| [`cloudops/`](cloudops/README.md) | Reliability failures |
| [`soc/`](soc/README.md) | Defensive security scenarios, and cross-domain scenarios until they need a folder of their own |

Proposed layout for one scenario: `scenarios/<domain>/<id>-<short-name>/`, holding a README with the fields below and the fixture files.

## Scenario fields

| Field | Description |
|---|---|
| ID | `CO-001` for CloudOps, `SOC-001` for SOC, `MIX-001` for cross-domain |
| Title | Short name |
| Domain | `cloudops`, `soc`, or `mixed` |
| Description | What happens, in a few sentences |
| Simulated | Always true |
| Setup | Lab resources the scenario needs |
| Trigger | How the signals are produced: failure injection, a load generator, or replayed synthetic events |
| Fixtures | Synthetic data files |
| Ground truth | The real cause, and the classification: operational, security, or benign |
| Expected detections | Which rules should fire, and which must not |
| Expected hypotheses | The correct top hypothesis, and the competing ones the system should consider and reject |
| Expected proposal | The action and its policy decision, or "no action" |
| Expected verification | What a successful outcome looks like |
| Benign lookalike | ID of the paired scenario that looks similar but is benign |
| Scoring | How evaluation scores the run |

## Rules

- Everything is synthetic. No real logs, identities, or credentials.
- Use the documentation IP ranges `192.0.2.0/24`, `198.51.100.0/24`, and `203.0.113.0/24`, and reserved domains such as `example.com`.
- Flag every event as simulated, and label every incident built from them as simulated.
- Run scenarios only in the local lab.
- Simulated attack activity is produced by replaying events, not by running real attack tools against anything.
- Pair suspicious scenarios with benign lookalikes. High CPU alone must not be labelled a security incident.

## Cross-domain scenarios

| ID | Scenario | Ground truth |
|---|---|---|
| MIX-001a | CPU near 98%, an outbound traffic spike, a new process in a container, and an unfamiliar identity accessing resources | Service overload. The identity is a new, approved automation account; the process is a legitimate worker |
| MIX-001b | The same signals | Simulated compromise. The identity used stolen credentials; the process mines cryptocurrency |

The pair tests whether the platform keeps both explanations open, asks for the right evidence, and separates the two cases without jumping to "attack confirmed".
