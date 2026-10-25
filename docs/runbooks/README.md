# Runbooks

Runbooks are written procedures for the people who operate the platform and the local lab. They also describe how to investigate common incident types by hand. That manual process is the baseline the automated investigation should match or beat.

Treat runbooks as reviewed, trusted content. If the investigation engine ever uses them as context, changes to them need the same review as code.

## Planned runbooks

| Runbook | Domain | Purpose |
|---|---|---|
| `lab-setup-and-reset.md` | Platform | Create, verify, and tear down the local lab |
| `emergency-stop.md` | Platform | Halt all execution and return to `observe` mode |
| `rotate-credentials.md` | Platform | Rotate model API keys and lab service-account tokens |
| `failed-action-recovery.md` | Platform | Roll back or escalate after a failed or unverified action |
| `crashloopbackoff.md` | CloudOps | Investigate pods stuck restarting |
| `high-cpu-or-memory.md` | CloudOps | Tell load spikes, leaks, and resource abuse apart |
| `database-connection-exhaustion.md` | CloudOps | Investigate connection pool saturation |
| `suspicious-login-sequence.md` | SOC | Failed logins followed by an unusual success |
| `unexpected-privilege-change.md` | SOC | Role binding or IAM policy changes outside the normal process |
| `unexpected-outbound-traffic.md` | SOC | Workload connecting to destinations outside its baseline |

Write each runbook when the feature it covers lands. A runbook written ahead of its feature goes stale before anyone uses it.

## Writing a runbook

Copy [TEMPLATE.md](TEMPLATE.md), rename it, and fill in every section. If a section doesn't apply, say why instead of deleting it.
