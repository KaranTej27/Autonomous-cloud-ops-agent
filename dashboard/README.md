# Dashboard

The analyst console for Autonomous CloudOps + AI SOC. It shows alerts, incident timelines, evidence, hypotheses, approvals, workload health, and the audit trail.

Status: working UI prototype. It runs on synthetic data and has no backend. Expect the layout and data shapes to change once the backend [`api`](../backend/app/api/README.md) exists.

## Run it

With Docker, from the repository root:

```bash
docker compose -f deploy/docker/compose.yaml up --build
```

Open http://localhost:8080. Stop it with `docker compose -f deploy/docker/compose.yaml down`.

Without Docker, using Node.js 24:

```bash
cd dashboard
npm ci
npm run dev       # http://localhost:5173
npm run build     # type check and production build into dist/
```

## Views

| View | Route | What it does |
|---|---|---|
| Overview | `/` | KPI tiles, event volume by sourcetype, open incidents by urgency, notable incidents, top detections, workload health, platform controls |
| Incident Review | `/incidents` | Splunk ES style triage: urgency strip, filters, expandable rows, owner assignment |
| Investigation | `/incidents/:id` | Lifecycle stepper, current assessment, observed facts, hypotheses with evidence, timeline, evidence records, proposal, audit |
| Search | `/search` | SPL-style search bar, event histogram with click-to-zoom, field sidebar with top values, event list, Statistics and Visualization tabs, CSV export |
| Approvals | `/approvals` | Pending and past proposals, policy decisions, approve and reject with confirmation |
| Workload health | `/health` | Workload cards, 24-hour small multiples, CPU heatmap by workload and hour |
| Audit trail | `/audit` | Filterable audit records with a hash chain you can verify in the browser |

The top bar holds the operating mode switch, the emergency stop, pending approvals, the theme toggle (dark and light), and a link to the safety model.

## Search syntax

The search bar accepts a small subset of SPL:

| Syntax | Example |
|---|---|
| Field match, with `*` wildcards | `sourcetype=idp:auth host=checkout-worker*` |
| Exclusion | `level!=INFO` or `NOT outcome=success` |
| Free text and phrases | `BackOff` or `"connection pool exhausted"` |
| Boolean logic | `verb=create OR verb=update`, with parentheses |
| `head` | `index=* \| head 50` |
| `stats count` | `sourcetype=idp:auth \| stats count by user, src_ip` |
| `top` | `index=cloudops \| top limit=5 service` |
| `table` | `index=security \| table user, src_ip` |

Like Splunk, `NOT` binds tightest, then `OR`, then the implicit `AND` between terms.

## What is real and what is not

Real:

- Every view, filter, chart interaction, and search runs against the synthetic data in the browser.
- Audit chain verification recomputes every hash, including records you create in the session.

Not real:

- There is no backend. Approvals, rejections, owner changes, the operating mode, and the emergency stop live in memory in the browser tab and reset on reload.
- No executor is connected, so an approval never runs anything.
- No model provider is configured. Hypotheses are written into the synthetic data.

## Data

[`src/data/`](src/data/) generates seven days of synthetic events and twelve incidents from the [scenario catalogue](../scenarios/README.md), including benign lookalikes and the MIX-001 case with two competing explanations. A seeded generator keeps the data identical on every load, and timestamps are relative to when the page opened.

Addresses come from documentation ranges, identities use `example.com`, and every incident carries a Simulated badge. One `checkout-worker` log line is a prompt-injection fixture. Search for `fixture=prompt_injection` to see how the console flags it.

The types in [`src/data/types.ts`](src/data/types.ts) follow the data models in [docs/architecture.md](../docs/architecture.md#data-models), so they can become the API response types.

## Design

- The look is a dense dark console modelled on Splunk: a black top bar, an app bar with tabs, panels with a visualization and table switch, and an SPL-style search with a line gutter and syntax colours. It uses no Splunk branding or assets.
- All colours are tokens in [`src/styles/theme.css`](src/styles/theme.css). Chart series palettes were checked with a colour-vision-deficiency validator in both themes.
- Severity and status always pair an icon and a text label with the colour.
- Every chart has a table view. Tooltips work on hover and with the keyboard (focus a chart, then use the arrow keys).
- The safety model shows up in the UI: facts are separated from hypotheses, confidence is a label rather than a percentage, approvals name an exact proposal version and expire, collected content is rendered as text, and the emergency stop locks the mode to Observe.

## Layout

```text
dashboard/
├── Dockerfile          multi-stage build: Node builds, nginx serves
├── nginx.conf          SPA routing, /healthz, security headers
├── public/             favicon and the pre-paint theme script
└── src/
    ├── components/     shell, badges, panels, tables, proposal card
    │   └── charts/     column, line, sparkline, bar list, heatmap
    ├── data/           synthetic incidents, events, workloads, audit trail
    ├── lib/            formatting, time ranges, the search engine
    ├── pages/          one file per view
    ├── state/          session state and selectors
    └── styles/         theme tokens and component styles
```

## Container

- Build stage: `node:24.22.1-alpine3.24` runs `npm ci` and `npm run build`.
- Runtime stage: `nginxinc/nginx-unprivileged:1.29.8-alpine3.23` serves the static build as uid 101 on port 8080.
- `GET /healthz` backs the Docker healthcheck.
- [`nginx.conf`](nginx.conf) sets a Content Security Policy (`script-src 'self'`), `X-Frame-Options: DENY`, `nosniff`, and `no-referrer`, and caches hashed assets for a year.
- The Compose service runs with a read-only root filesystem, drops all Linux capabilities, sets `no-new-privileges`, and binds to `127.0.0.1` only.

## Next steps

- Replace `src/data/` with calls to the backend API once it exists.
- Add authentication and roles. Approving actions and changing controls need specific roles.
- Confirm the framework choice. This prototype is a Vite and React single-page app.
- Add component tests and browser tests to CI.
