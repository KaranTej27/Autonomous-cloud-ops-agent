---
name: Scenario proposal
about: Propose a CloudOps or SOC test scenario with known ground truth
title: "[Scenario] "
labels: "area: evaluation"
assignees: ""
---

<!--
Scenarios must be synthetic and run only in the local lab.
Use documentation IP ranges (192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24)
and reserved domains such as example.com. Label simulated security events as simulated.
-->

## Domain

- [ ] CloudOps
- [ ] SOC
- [ ] Cross-domain

## Summary

What happens in this scenario, in two or three sentences?

## Ground truth

What is the real cause? What is the correct classification (operational, security, or benign)?

## How it is triggered

How does the lab produce the signals? For example: a deployment with a broken config, a load generator, or replayed synthetic audit events.

## Expected signals

Which metrics, logs, events, or audit records should appear?

## Expected detection and diagnosis

- Which rule or detection should fire?
- What should the top hypothesis be?
- Which competing hypotheses should the system consider and reject?

## Benign lookalike

Describe a similar-looking situation that must not be classified the same way.

## Expected response

Which action, if any, should the planner propose? Which policy decision should it get?

## Success criteria

How do we score this scenario in `evaluation/`?
