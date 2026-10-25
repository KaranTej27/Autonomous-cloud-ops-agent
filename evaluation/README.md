# Evaluation

Repeatable measurement of how well the platform detects, diagnoses, and responds, using the scenarios in [scenarios/](../scenarios/README.md).

Status: planned. There are no results yet.

## Principle

Do not invent accuracy numbers. Publish only results from repeatable runs, explain how they were produced, and include the failures.

## CloudOps metrics

| Metric | Definition |
|---|---|
| Detection rate | Share of CloudOps scenarios where the expected detection fired |
| Root-cause accuracy | Share of scenarios where the top hypothesis matches the ground truth. Also report whether the correct cause appears anywhere in the list |
| Evidence relevance | Share of cited evidence that a reviewer judges relevant, using a written rubric |
| Remediation success | Share of executed actions that `verification` confirmed |
| Time to detect | From the first injected signal to incident creation |
| Time to recover | From incident creation to verified recovery |

## SOC metrics

| Metric | Definition |
|---|---|
| Precision and recall | Per rule and overall, on labelled scenarios |
| False positives | Per scenario run, or per simulated hour of benign activity |
| Time to detect | From the first simulated event to incident creation |
| Correlation quality | Share of scenario events grouped into the correct incident, and share of unrelated events kept out |
| Benign versus suspicious | Share of benign lookalikes correctly classified as benign |

## Safety and system metrics

| Metric | Definition |
|---|---|
| Prohibited-action attempts | Proposals for actions outside the catalogue or scope. These should be blocked, and every one should be investigated |
| Policy enforcement | Share of proposals where the policy decision matched the expected decision |
| Approval outcomes | Approved, rejected, and expired counts |
| Verification success | Share of actions with a `verified` outcome |
| Model latency and cost | Per incident, with the model name and version |
| Failure handling | Share of injected failures (timeouts, errors, budget exhaustion) that escalated correctly |
| Audit completeness | Share of incidents whose audit trail contains every required record |

## Method

1. Run each scenario several times, because model output varies between runs.
2. Record every output: detections, hypotheses, proposals, policy decisions, and verification results.
3. Compare each output with the scenario's ground truth.
4. Run the rules-only baseline on the same scenarios.
5. Report the AI-assisted results next to the baseline.

Evaluate CloudOps and SOC separately, then together on the cross-domain scenarios.

## Report contents

Every published report includes:

- The commit evaluated, the model name and version, and the configuration.
- The scenario list, and the number of runs per scenario.
- Results per metric for the baseline and the AI-assisted path.
- Each failed scenario, and why it failed.
- Known limitations of the scenario set, for example how closely synthetic events match real ones.

## Using results

Quote a metric, in the README or anywhere else, only after it has been measured on a documented test suite. Name the scenario count and the conditions next to the number.
