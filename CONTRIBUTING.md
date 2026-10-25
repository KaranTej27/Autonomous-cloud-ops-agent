# Contributing to Autonomous CloudOps + AI SOC

Thanks for your interest. Contributors work on this project asynchronously, so this guide aims for one thing: you should be able to pick up a focused issue, work on it alone, and open a pull request without understanding every module.

Before you start, read:

- [README.md](README.md) for the project goals.
- [docs/architecture.md](docs/architecture.md) for module boundaries and data models.
- [docs/safety-model.md](docs/safety-model.md) for the rules every change must respect.
- [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## Project status

The project is in early design. Most modules exist only as a folder with a README that describes what the module will do. Treat that README as the spec. If you implement a module, keep its README in sync with what you built.

## Ways to contribute

| Workstream | Example tasks |
|---|---|
| AI and orchestration | Investigation workflow, evidence-grounded summaries, model interface |
| CloudOps | Kubernetes collectors, service-health checks, failure scenarios |
| SOC and defensive security | Event schemas, detection rules, incident correlation, threat-model review |
| Observability | Metrics, logs, traces, dashboards |
| Backend and data | API, incident schema, storage, migrations |
| Frontend and developer experience | Incident views, evidence panel, approval workflow, setup guides |
| Testing and evaluation | Scenario fixtures, labelled data, baselines, regression tests |

These are workstreams, not job titles. Move between them as your interest and time allow.

You don't need to write backend code to help. Reviewing the threat model, writing a test scenario with known ground truth, or documenting false positives for a detection rule all move the project forward.

## Finding work

| Label | Meaning |
|---|---|
| `good first issue` | Small, well-scoped, good for a first contribution |
| `help wanted` | Maintainers would like someone to pick this up |
| `area: cloudops` | Reliability detection, Kubernetes, service health |
| `area: soc` | Security events, detection rules, investigations |
| `area: ai` | Model interface, investigation loop, prompts |
| `area: observability` | Prometheus, Grafana, OpenTelemetry |
| `area: backend` | API, data models, storage |
| `area: frontend` | Dashboard |
| `area: evaluation` | Scenarios, metrics, baselines |
| `type: documentation` | Docs only |
| `type: bug` | Something does not work as documented |
| `type: feature` | New capability |
| `security-sensitive` | Needs review from a maintainer who knows the threat model |

If you are new, start with `good first issue`. Comment on an issue before you begin so two people don't build the same thing.

## Workflow

1. Find an issue, or open one that proposes a focused change.
2. For architectural or security-sensitive changes, agree on the design in the issue before you write code.
3. Fork the repository or create a branch.
4. Make the change. Add tests and documentation where they apply.
5. Run formatting, linting, type checks, and tests locally.
6. Open a pull request. The template asks for the purpose, design, test evidence, and limitations.
7. Address review comments. Keep the pull request focused, and split unrelated changes into separate pull requests.

### Branch names

Use a short prefix and a description, for example `feat/soc-failed-login-rule`, `fix/collector-timeout`, or `docs/threat-model-executor`.

### Commit messages

Write the first line as a short summary in the imperative mood, such as "Add failed-login detection rule". Reference the issue number in the body when there is one.

## Conventions (proposed)

Agreeing on coding conventions is part of the open-source foundation milestone. Until the maintainers confirm them, use these defaults:

| Area | Proposed default |
|---|---|
| Python version | 3.12 or later |
| Formatting and linting | Ruff |
| Type checking | mypy, with type hints on public functions |
| Tests | pytest |
| Frontend | Decided together with the dashboard framework (React or Next.js) |
| Markdown | Sentence-case headings, relative links, one topic per file |

CI will run these tools once the backend exists. See [.github/workflows/README.md](.github/workflows/README.md).

## What a good pull request includes

- One logical change.
- Tests for new behaviour, including failure paths. A detection rule needs at least one benign lookalike that must not fire.
- Updated docs. Update the module README if behaviour changed, [docs/architecture.md](docs/architecture.md) if an interface changed, and [docs/threat-model.md](docs/threat-model.md) if a trust boundary changed.
- Test evidence in the description: what you ran and what happened.
- Known limitations, stated plainly.

## Security-sensitive changes

Some changes can make the platform itself dangerous. Label them `security-sensitive` and ask a maintainer who knows the threat model to review before merge. A change is security-sensitive if it touches any of these:

- `policy` rules, defaults, or how the module evaluates decisions.
- `executor`, including any new action or a change to how actions run.
- Permissions, such as RBAC manifests, cloud IAM roles, service accounts, or collector scope.
- Approval flows, authentication, or authorization in the API or dashboard.
- How collected content reaches the model, including prompts, tool definitions, and redaction.
- The integrity of the audit trail or incident store.
- CI workflows, especially their permissions, secrets, and triggers.

For these changes, update [docs/threat-model.md](docs/threat-model.md) or explain in the pull request why it needs no update.

## Data rules

Never commit:

- API keys, tokens, passwords, or kubeconfigs.
- Private logs, real incident data, or real personal data.
- Real security-sensitive material, such as captured credentials or exploit code aimed at real systems.

Use synthetic fixtures and documented placeholder configuration. Mark simulated security events as simulated. For IP addresses, use the documentation ranges `192.0.2.0/24`, `198.51.100.0/24`, and `203.0.113.0/24`. For hosts and identities, use reserved domains such as `example.com`.

If you commit a secret by accident, treat it as leaked. Rotate it first, then remove it from history. Rewriting history does not undo the exposure.

## Adding specific things

### A detection rule

- Document the signal, the logic in plain language, the data sources, and the time window.
- Explain why the rule fires and which evidence is still missing when it does.
- List known false positives.
- Add a scenario under [scenarios/](scenarios/) that triggers the rule, plus a benign lookalike that must not.

### A response action

- Open an issue first. Every new action is security-sensitive.
- Describe the target, parameters, reversibility, rollback plan, and verification plan.
- Propose its default policy tier from [docs/safety-model.md](docs/safety-model.md).
- Build the dry-run behaviour along with the real action.
- Add tests for denied, out-of-scope, and failed execution.

### A collector

- Document the exact read-only permissions it needs.
- Enforce the configured scope inside the collector, in addition to RBAC.
- Redact secrets before data is stored or sent to a model.

### A scenario

- Follow the format in [scenarios/README.md](scenarios/README.md).
- Include ground truth, and a benign lookalike where one makes sense.

## Reporting vulnerabilities

Do not open a public issue. Follow [SECURITY.md](SECURITY.md).

## License

This project uses the [MIT License](LICENSE). By contributing, you agree to license your contributions under the same terms.
