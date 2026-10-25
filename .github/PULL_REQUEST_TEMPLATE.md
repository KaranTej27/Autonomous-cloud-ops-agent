## Purpose

What does this pull request change, and why?

Closes #

## Design

How does it work? Call out any change to an interface, data model, event schema, or policy.

## Test evidence

What did you run, and what happened? Paste the relevant output.

For a detection rule, include the result for the benign lookalike scenario as well as the scenario that should fire.

## Limitations

What does this not handle yet? What follow-up work is needed?

## Checklist

- [ ] The change is focused on one thing.
- [ ] I added or updated tests.
- [ ] I updated the docs that this change affects (module README, `docs/architecture.md`, `docs/threat-model.md`).
- [ ] Formatting, linting, type checks, and tests pass locally.
- [ ] I committed no secrets, kubeconfigs, private logs, or real personal data.
- [ ] Fixtures are synthetic, and simulated security events are labelled as simulated.

## Safety review

- [ ] This pull request is security-sensitive.

It is security-sensitive if it touches policy, the executor, permissions, approvals, authentication, how collected content reaches the model, the audit trail, or CI workflows. If you checked the box, add the `security-sensitive` label, request review from a maintainer who knows the threat model, and describe the effect on the safety model below.

Effect on the safety model:
