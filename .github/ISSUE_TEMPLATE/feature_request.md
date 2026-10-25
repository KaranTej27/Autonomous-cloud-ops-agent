---
name: Feature request
about: Propose a new capability or a change to an existing one
title: "[Feature] "
labels: "type: feature"
assignees: ""
---

<!--
Do not report security vulnerabilities here. Follow SECURITY.md instead.
-->

## Problem

What can't you do today, or what goes wrong?

## Proposal

What should the platform do? Keep it focused. Large proposals are easier to review when split into steps.

## Affected modules

<!-- For example: collectors, correlation, diagnosis, response_planner, dashboard -->

## Safety impact

- Does this add a new response action, permission, data source, or trust boundary?
- Does it change what the model can see or do?
- Does it change policy defaults or the approval flow?

If any answer is yes, this is security-sensitive. Discuss the design here before you start, and plan to update `docs/threat-model.md`.

## How we would test it

Which scenarios, fixtures, or tests would show that it works? Include benign cases that must not trigger it.

## Alternatives considered
