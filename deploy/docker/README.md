# Docker

Container images and a local Compose stack for development.

Status: the dashboard prototype runs in Compose today. The backend, PostgreSQL, Prometheus, Grafana, and the sample workload are still planned.

## Run the stack

From the repository root:

```bash
docker compose -f deploy/docker/compose.yaml up --build
```

Open http://localhost:8080 for the dashboard. Stop the stack with `docker compose -f deploy/docker/compose.yaml down`.

## Contents

| Item | Status | Purpose |
|---|---|---|
| [`compose.yaml`](compose.yaml) | Available | Local stack, currently the dashboard only |
| Dashboard image | Available | Built from [`dashboard/Dockerfile`](../../dashboard/Dockerfile); static build served by nginx |
| Backend image | Planned | Runs the FastAPI application |
| Sample workload image | Planned | A small application with failure-injection switches for scenarios |
| PostgreSQL, Prometheus, Grafana | Planned | Join the Compose stack with their milestones |

## Image rules

- Run as a non-root user. The dashboard runs as uid 101.
- Pin base images to a specific version. The dashboard uses `node:24.22.1-alpine3.24` and `nginxinc/nginx-unprivileged:1.29.8-alpine3.23`.
- Keep secrets out of images. Pass configuration at runtime from `.env`.
- Keep images small. Leave out build tools and shells the runtime does not need. The dashboard runtime image is about 82 MB.
- Scan every image for known vulnerabilities. The planned `container` workflow will do this in CI. See [.github/workflows/README.md](../../.github/workflows/README.md).

## Compose hardening

Each service should use the settings the dashboard already has:

- `read_only: true`, with a `tmpfs` for paths that must be writable.
- `cap_drop: [ALL]` and `no-new-privileges:true`.
- Ports bound to `127.0.0.1`, so nothing is exposed on the network.

## Scope

This stack is for local development only. It is not a production deployment.
