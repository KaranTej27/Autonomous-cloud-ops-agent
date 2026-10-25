# Security policy

## Project status

Autonomous CloudOps + AI SOC is experimental software for learning, research, and defensive security engineering. It is not ready for production. Do not connect it to production infrastructure or to real security-sensitive systems.

## Supported versions

There are no releases yet. Only the `main` branch receives security fixes.

| Version | Supported |
|---|---|
| `main` | Yes |
| Anything else | No |

## Reporting a vulnerability

Do not report a vulnerability in a public issue, pull request, or discussion.

Report it privately through GitHub:

1. Open the repository's **Security** tab.
2. Select **Report a vulnerability**.
3. Fill in the form.

Maintainers: enable private vulnerability reporting in the repository settings, under **Security**, so this option appears.

Include in your report:

- The affected module or file.
- What an attacker could do, and what access they would need first.
- Steps to reproduce in a local lab, using synthetic data.
- A suggested fix or mitigation, if you have one.

Leave real credentials, private logs, and personal data out of the report.

## What to expect

The maintainers are volunteers. They will acknowledge your report, investigate it, and tell you what they find. The maintainer team will publish response-time targets here once it agrees on them.

When a fix is ready, the maintainers will publish an advisory and credit you, unless you prefer to stay anonymous.

## What counts as a vulnerability

The platform can change infrastructure, so a flaw in its safety controls matters as much as a classic bug. Examples:

- Bypassing policy so the executor runs an action that policy should deny or hold for approval.
- Forging, replaying, or reusing an approval.
- Collected content, such as a log line or audit event, steering the model into tool calls or actions outside its permitted scope (prompt injection).
- A collector reading data outside its configured scope.
- Secrets or personal data leaking into model prompts, platform logs, the dashboard, or the incident store.
- Changing or deleting audit records without detection.
- Authentication or authorization flaws in the API or dashboard.
- CI workflows that expose secrets or run untrusted code with elevated permissions.
- RBAC or IAM definitions in [deploy/](deploy/) that grant more access than the docs say.

## Out of scope

- Vulnerabilities in third-party dependencies with no effect specific to this project. Report those upstream, and tell us if one affects this project.
- Findings that depend on running the project against production systems, which the docs tell you not to do.
- Detection gaps, such as a rule that misses a technique. Open a normal issue for these. Gaps are expected while the detections are young.
- Social engineering of maintainers or contributors.

## Testing rules

- Test only in your own local or isolated lab environment.
- Use synthetic identities, events, and data.
- Do not scan, probe, or attack systems you don't own or have written permission to test.

## Related documents

[docs/safety-model.md](docs/safety-model.md) and [docs/threat-model.md](docs/threat-model.md) describe the controls this policy protects.
