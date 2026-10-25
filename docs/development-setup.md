# Development setup

Status: the repository holds documentation only. This guide describes the planned local environment. Each section marked "planned" gets filled in when the matching milestone lands.

## Ground rules

- Work in a local or isolated environment. Never point any part of this project at production infrastructure.
- Use a dedicated local Kubernetes cluster for the lab. Check your current `kubectl` context before you run anything that talks to a cluster.
- Never commit `.env` files, kubeconfigs, or credentials.

## Prerequisites

| Tool | Version | Needed from |
|---|---|---|
| Git | Any recent version | Now |
| Python | 3.12 or later | Open-source foundation (backend) |
| Docker | Docker Desktop or Docker Engine | Open-source foundation |
| kind or minikube | Latest stable | Local observability |
| kubectl | Close to the cluster's version | Local observability |
| Node.js | Current LTS | Dashboard work |

On Windows, use WSL 2 for Docker and kind.

## 1. Get the code

```bash
git clone https://github.com/YOUR_USERNAME/autonomous-cloudops-ai-soc.git
cd autonomous-cloudops-ai-soc
```

Replace `YOUR_USERNAME` with the repository owner's GitHub username.

## 2. Python environment (planned)

Create a virtual environment in the repository root.

Linux, macOS, or WSL:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Windows PowerShell:

```powershell
py -3.12 -m venv .venv
.venv\Scripts\Activate.ps1
```

Dependency installation steps will be added with the first backend code.

## 3. Configuration (planned)

A `.env.example` file will list every setting with placeholder values. Copy it to `.env` and fill in local values. `.env` stays out of Git.

Expected settings:

| Setting group | Purpose | Safe default |
|---|---|---|
| Database | PostgreSQL connection for `incident_store` | Local container |
| Model provider | Hosted or local model, and its credentials | None configured |
| Collector scope | Namespaces and accounts the collectors may read | Lab namespace only |
| Operating mode | `observe`, `dry-run`, `supervised`, or `lab-autonomous` | `observe` |
| Emergency stop | Blocks all execution | Engaged on first start (proposed) |

A fresh setup starts read-only, with no model provider. See [safety-model.md](safety-model.md#operating-modes).

## 4. Local lab cluster (planned)

Create a cluster used only for this project:

```bash
kind create cluster --name cloudops-soc-lab
kubectl config current-context
```

The second command should print `kind-cloudops-soc-lab`. If it prints anything else, stop and switch context before you continue.

Lab manifests will live in [deploy/kubernetes/](../deploy/kubernetes/README.md).

## 5. Observability stack (planned)

Prometheus, Grafana, and the OpenTelemetry Collector. See [observability/](../observability/README.md).

## 6. Running checks (planned)

Format, lint, type check, and test, following the conventions in [CONTRIBUTING.md](../CONTRIBUTING.md#conventions-proposed). The exact commands arrive with the backend.

## 7. Running scenarios (planned)

Scenario definitions live in [scenarios/](../scenarios/README.md). The evaluation runner and reports live in [evaluation/](../evaluation/README.md).

## Resetting the lab

Delete the cluster and create it again:

```bash
kind delete cluster --name cloudops-soc-lab
```

## Troubleshooting

No entries yet. When you hit a setup problem, add it here with the symptom, the cause, and the fix.
