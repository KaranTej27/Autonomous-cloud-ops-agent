# CI workflows

Status: no workflows exist yet. The first ones arrive with the backend code in the open-source foundation milestone. This file lists the planned workflows and the rules each one must follow.

GitHub Actions reads only `.yml` and `.yaml` files in this folder, so this README has no effect on CI.

## Planned workflows

| Workflow | Trigger | What it does |
|---|---|---|
| `ci` | Pull requests, pushes to `main` | Format check, lint, type check, unit tests |
| `docs` | Pull requests that change Markdown | Markdown lint, link check |
| `container` | Pull requests, pushes to `main` | Build the backend image and scan it for known vulnerabilities (Trivy proposed) |
| `dependencies` | Weekly schedule, pull requests | Check Python and JavaScript dependencies for known vulnerabilities |
| `integration` | Later milestone | Create a throwaway kind cluster inside the runner, deploy the lab, and run scenario tests |

## Rules for every workflow

- Set the default `GITHUB_TOKEN` permissions to read-only. Grant more to a single job only when that job needs it.
- Pin third-party actions to a full commit SHA, not a tag.
- Keep cloud credentials out of CI during the early milestones. CI never deploys to real infrastructure.
- Do not use `pull_request_target` to run code from forks with access to secrets.
- Never print secrets or dump the environment in logs.
- Treat any change to a workflow as security-sensitive. See [CONTRIBUTING.md](../../CONTRIBUTING.md#security-sensitive-changes).
