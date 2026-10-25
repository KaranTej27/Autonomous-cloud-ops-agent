# Backend tests

Status: planned. No tests exist yet.

## Test types

| Type | What it covers | Runs in |
|---|---|---|
| Unit | One module in isolation | Every pull request |
| Contract | The interfaces between modules, and the API responses the dashboard depends on | Every pull request |
| Scenario | Replays a scenario from [scenarios/](../../scenarios/README.md) and checks detection, correlation, diagnosis, and proposals against its ground truth | Every pull request, using replayed data |
| Safety | Denied actions, out-of-scope targets, approval misuse, the emergency stop, prompt-injection fixtures | Every pull request |
| Integration | The backend running against a local kind cluster | Marked separately; run locally, later in CI |

## Layout

Organize tests by module, matching the folders in `backend/app/`. Keep shared synthetic fixtures in one place so scenarios and tests use the same data.

## Rules

- No network calls to real cloud services.
- Mock model calls, or replay recorded responses, so tests are deterministic.
- Fixtures are synthetic. Use documentation IP ranges and reserved domains such as `example.com`.
- Every detection rule has a test that it fires and a test that it stays quiet on a benign lookalike.
- Every action has the safety tests listed in [docs/safety-model.md](../../docs/safety-model.md#required-safety-tests).
- A bug fix comes with a test that fails without the fix.
