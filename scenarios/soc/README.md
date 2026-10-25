# SOC scenarios

Defensive security scenarios built from replayed, synthetic events. Each one follows the format in [scenarios/README.md](../README.md#scenario-fields).

Status: planned.

Every event in these scenarios is simulated. No scenario runs real attack tools, scans anything, or contacts external systems. Cross-domain scenarios (`MIX-*`) live here too, for now. See [scenarios/README.md](../README.md#cross-domain-scenarios).

## Planned scenarios

| ID | Scenario | Ground truth | Benign lookalike |
|---|---|---|---|
| SOC-001 | Repeated failed logins, then a success from a new source address | Simulated credential guessing that succeeded | A user mistypes a password three times, then logs in from their usual address |
| SOC-002 | A service account gains cluster-wide permissions | Simulated privilege escalation | The same change made by infrastructure automation with a matching change record |
| SOC-003 | One identity reads far more storage objects than usual | Simulated data access by a compromised identity | Scheduled backup job running under its own identity |
| SOC-004 | A burst of list and describe calls across many resource types | Simulated enumeration with stolen credentials | Inventory tool running its weekly scan |
| SOC-005 | A workload connects to new external destinations | Simulated data exfiltration | A deploy that added a new, documented external dependency |
| SOC-006 | An unexpected process starts in a container | Simulated attacker activity in the workload | An engineer debugging with `kubectl exec`, recorded in the audit log |
| SOC-007 | Sustained high CPU, a new process, and new outbound connections | Simulated cryptomining | A legitimate batch job with the same CPU profile (pairs with CO-004) |
| SOC-008 | An unusual login, then a privilege change, then unusual storage access, by one identity | Simulated credential compromise | A new administrator being onboarded through the documented process |

## What each scenario checks

- The right rule fires on the scenario and stays quiet on its benign lookalike.
- `correlation` links the events into one incident, with the reason for each link.
- `diagnosis` lists the supporting evidence, the contradicting evidence, and what is still missing.
- No output says "attack confirmed".
- Proposals that change permissions or isolate workloads require approval.
- Every incident is labelled as simulated.

## Data rules

- Identities use reserved domains, such as `alice@example.com`.
- Addresses come from `192.0.2.0/24`, `198.51.100.0/24`, and `203.0.113.0/24`.
- Never put real credentials, even revoked ones, in fixtures.
