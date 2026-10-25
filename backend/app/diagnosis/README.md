# `diagnosis`

Produces hypotheses about an incident's cause, each tied to evidence, with uncertainty stated.

Status: planned.

## Responsibility

- Generate one or more hypotheses per incident, using the record format in [docs/architecture.md](../../../docs/architecture.md#hypothesis).
- Separate observed facts from inferred hypotheses.
- List supporting evidence, contradicting evidence, and missing information for each hypothesis.
- Offer competing hypotheses when the evidence allows more than one explanation, for example service overload versus suspicious activity.
- Provide a provider-neutral model interface for hosted or local models.
- Keep a rule-based baseline that works with no model.

## Rule-based baseline

Each CloudOps detection and SOC rule maps to a default hypothesis. The baseline:

- Runs when no model is configured.
- Gives evaluation something to compare the model against.
- Stays available after the model-assisted path ships.

## Model interface

- One interface for hosted and local models. Configuration chooses which one.
- Every model output records the model name and version.
- Collected content goes into prompts as clearly delimited data, never as instructions.
- Secrets never go into prompts.
- Prompt size has a hard limit.

## Output validation

Code checks every model output before anything uses it:

- The output matches the hypothesis schema.
- Every cited evidence ID exists on this incident.
- Every hypothesis has at least one supporting evidence ID.
- Confidence uses the allowed labels.

The module rejects and records invalid output. It does not repair it.

## Confidence

Confidence is a label (`low`, `medium`, `high`), not a probability. Do not present it as calibrated until [evaluation](../../../evaluation/README.md) has measured calibration on labelled scenarios.

## Must not

- Say an attack is confirmed when the evidence is insufficient.
- Hide contradicting evidence.
- Propose or run actions.

## Testing

- The baseline produces the expected hypothesis for each scenario.
- Output that cites missing evidence is rejected.
- A prompt-injection fixture does not change the tools called or the hypotheses produced beyond what the evidence supports.
- Benign lookalike scenarios are not classified as security incidents.
