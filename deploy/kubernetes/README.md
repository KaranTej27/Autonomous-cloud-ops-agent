# Kubernetes

Manifests for the local lab on kind or minikube.

Status: planned.

## Planned layout

| Namespace | Contents |
|---|---|
| `cloudops-soc-system` | The platform: backend, PostgreSQL, and the observability stack |
| `lab-workloads` | The sample workload and anything scenarios deploy |

## Service accounts

| Account | Used by | Permissions |
|---|---|---|
| Collector | `collectors` | Read-only: get, list, and watch on pods, events, deployments, and logs, in `lab-workloads` only |
| Executor | `executor` | Only the verbs the allowlisted actions need, for example patching or scaling deployments and deleting pods, in `lab-workloads` only |

No `cluster-admin`. No wildcard verbs or resources. No permissions in `kube-system`. Every change to these definitions is security-sensitive.

## Sample workload

A small service with switches that scenarios can flip:

- Exit at startup (CrashLoopBackOff).
- Allocate memory until the limit (OOMKilled).
- Burn CPU.
- Exhaust its database connection pool.
- Fail its readiness probe.
- Add latency or errors to responses.

## Network policies

Restrict traffic between namespaces. The workload isolation action relies on network policies, so the lab cluster must use a network plugin that enforces them.

## Rules

- Apply these manifests only to the lab cluster. Run `kubectl config current-context` first.
- Never apply them to a shared or production cluster.
