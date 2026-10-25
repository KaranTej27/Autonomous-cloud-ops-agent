# `soc`

Applies defensive detection rules to normalized security events and builds security investigations.

Status: planned.

## Responsibility

- Run transparent, rule-based detections on security events.
- Explain why each rule fired and which evidence is still missing.
- Hand detections to `correlation`.

## Planned rules

| Rule | Logic in plain language | Data sources | Common false positives |
|---|---|---|---|
| Failed logins, then success | Several failed logins for one identity in a short window, followed by a success, especially from a new source | Identity provider and authentication events | User mistyping a password; a password manager syncing |
| Unexpected privilege change | A role binding or IAM policy grants elevated permissions outside the known change process | Kubernetes audit, cloud audit | Approved change made by infrastructure automation |
| Unusual storage access | One identity reads far more objects or data than its baseline | Cloud audit | Backup or analytics job |
| Suspicious API activity | A burst of list and describe calls across many resource types | Cloud audit, Kubernetes audit | Inventory or compliance tooling |
| Unexpected outbound traffic | A workload connects to destinations outside its baseline, or traffic volume spikes | Network metrics, flow logs | New dependency added in a deploy |
| Unexpected process | A process outside the workload's baseline starts in a container | Runtime events (later) | An engineer debugging with `kubectl exec` |
| Possible resource abuse | Sustained high CPU plus an unexpected process plus new outbound destinations | Metrics, runtime events, network | Legitimate batch job |
| Possible credential compromise | An unusual login, a privilege change, and unusual access by the same identity within a window | Correlated events | A new administrator being onboarded |

## Rule documentation

Every rule documents:

- An ID and a one-line description.
- The logic in plain language, the data sources, the window, and the thresholds.
- What the rule explains when it fires, and what it cannot tell you.
- The evidence still missing.
- Known false positives.
- The scenarios in [scenarios/soc/](../../../scenarios/soc/README.md) that test it, including a benign lookalike.
- Optionally, the MITRE ATT&CK technique it relates to.

## Language

Rules report "suspicious activity detected" and list the evidence. They never report "attack confirmed". Only a human can confirm an attack after reviewing the investigation.

## Must not

- Scan, probe, or contact external systems.
- Run offensive actions of any kind.
- Propose or run responses. That belongs to `response_planner` and `executor`.

## Testing

- Each rule fires on its scenario and stays quiet on its benign lookalike.
- Every simulated event is flagged as simulated, and incidents built from it say so.
