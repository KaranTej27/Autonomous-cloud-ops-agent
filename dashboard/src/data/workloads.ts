import { Rng } from '../lib/random'
import { HOUR, MINUTE, NOW } from '../lib/time'
import type { Workload } from './types'

// 24 hours of metrics at 10-minute steps for each lab workload.
const STEP = 10 * MINUTE
const N = 145
const START = NOW - 24 * HOUR
const rng = new Rng(31337)

const at = (msAgo: number) => Math.round((NOW - msAgo - START) / STEP)

function diurnal(i: number): number {
  const t = START + i * STEP
  const hour = new Date(t).getUTCHours() + new Date(t).getUTCMinutes() / 60
  return 1 + 0.3 * Math.sin(((hour - 9) / 24) * 2 * Math.PI)
}

function gen(fn: (i: number) => number, noise: number, floor = 0, ceil = Infinity): number[] {
  return Array.from({ length: N }, (_, i) => {
    const v = fn(i) + rng.noise(noise)
    return Number(Math.min(ceil, Math.max(floor, v)).toFixed(2))
  })
}

const between = (i: number, fromAgo: number, toAgo: number) => i >= at(fromAgo) && i <= at(toAgo)

function steady(cpu: number, mem: number, latency: number, errors: number) {
  return {
    cpu: gen((i) => cpu * diurnal(i), cpu * 0.08, 1, 100),
    memory: gen(() => mem, 1.4, 1, 100),
    latency: gen((i) => latency * diurnal(i), latency * 0.1, 1),
    errors: gen(() => errors, errors * 0.4, 0, 100),
  }
}

export const WORKLOADS: Workload[] = [
  {
    name: 'payments-api',
    namespace: 'lab-workloads',
    kind: 'Deployment',
    status: 'critical',
    statusNote: 'CrashLoopBackOff on v2.14.0 pods',
    incidentId: 'INC-1041',
    version: 'v2.14.0 (rolling)',
    replicas: { ready: 2, desired: 3 },
    restarts24h: 14,
    start: START,
    step: STEP,
    metrics: {
      cpu: gen((i) => (i >= at(51 * MINUTE) ? 34 : 22 * diurnal(i)), 3, 1, 100),
      memory: gen(() => 41, 1.5, 1, 100),
      latency: gen((i) => (i >= at(47 * MINUTE) ? 820 : 182 * diurnal(i)), 22, 1),
      errors: gen((i) => (i >= at(47 * MINUTE) ? 27 : 0.3), 0.3, 0, 100),
    },
  },
  {
    name: 'checkout-worker',
    namespace: 'lab-workloads',
    kind: 'Deployment',
    status: 'critical',
    statusNote: 'CPU above 95% for 2 hours',
    incidentId: 'INC-1042',
    version: 'v1.18.3',
    replicas: { ready: 3, desired: 3 },
    restarts24h: 0,
    start: START,
    step: STEP,
    metrics: {
      cpu: gen((i) => (i >= at(2 * HOUR + 13 * MINUTE) ? 97 : 34 * diurnal(i)), 2.2, 1, 99.6),
      memory: gen((i) => (i >= at(2 * HOUR + 13 * MINUTE) ? 61 : 52), 1.5, 1, 100),
      latency: gen((i) => (i >= at(2 * HOUR + 13 * MINUTE) ? 2100 : 620 * diurnal(i)), 60, 1),
      errors: gen(() => 0.2, 0.1, 0, 100),
    },
  },
  {
    name: 'orders-api',
    namespace: 'lab-workloads',
    kind: 'Deployment',
    status: 'degraded',
    statusNote: 'Connection pool at 86% of its limit',
    incidentId: 'INC-1038',
    version: 'v3.8.0',
    replicas: { ready: 3, desired: 3 },
    restarts24h: 0,
    start: START,
    step: STEP,
    metrics: {
      cpu: gen((i) => 41 * diurnal(i) + (between(i, 9 * HOUR + 12 * MINUTE, 8 * HOUR + 52 * MINUTE) ? 25 : 0), 3, 1, 100),
      memory: gen(() => 58, 1.5, 1, 100),
      latency: gen((i) => (between(i, 9 * HOUR + 12 * MINUTE, 8 * HOUR + 52 * MINUTE) ? 900 : i > at(8 * HOUR + 52 * MINUTE) ? 210 : 140 * diurnal(i)), 14, 1),
      errors: gen((i) => (between(i, 9 * HOUR + 12 * MINUTE, 8 * HOUR + 52 * MINUTE) ? 14 : i > at(8 * HOUR + 52 * MINUTE) ? 1.2 : 0.4), 0.2, 0, 100),
    },
  },
  {
    name: 'search-api',
    namespace: 'lab-workloads',
    kind: 'Deployment',
    status: 'healthy',
    statusNote: 'Scaled to 5 replicas 14h ago (INC-1037)',
    version: 'v2.3.1',
    replicas: { ready: 5, desired: 5 },
    restarts24h: 0,
    start: START,
    step: STEP,
    metrics: {
      cpu: gen((i) => (between(i, 14 * HOUR + 20 * MINUTE, 14 * HOUR + 2 * MINUTE) ? 90 : i > at(14 * HOUR + 2 * MINUTE) ? 38 * diurnal(i) : 45 * diurnal(i)), 3, 1, 100),
      memory: gen(() => 47, 1.2, 1, 100),
      latency: gen((i) => (between(i, 14 * HOUR + 20 * MINUTE, 14 * HOUR + 2 * MINUTE) ? 610 : 95 * diurnal(i)), 9, 1),
      errors: gen(() => 0.2, 0.1, 0, 100),
    },
  },
  { name: 'recommendations', namespace: 'lab-workloads', kind: 'Deployment', status: 'healthy', statusNote: 'Running v4.1.7 since the rollback 2d ago', version: 'v4.1.7', replicas: { ready: 3, desired: 3 }, restarts24h: 0, start: START, step: STEP, metrics: steady(28, 44, 120, 0.2) },
  { name: 'notifications-svc', namespace: 'lab-workloads', kind: 'Deployment', status: 'healthy', statusNote: 'No open incidents', version: 'v1.9.0', replicas: { ready: 2, desired: 2 }, restarts24h: 0, start: START, step: STEP, metrics: steady(12, 31, 160, 0.1) },
  { name: 'ledger-sync', namespace: 'lab-workloads', kind: 'Deployment', status: 'healthy', statusNote: 'No open incidents', version: 'v0.9.4', replicas: { ready: 1, desired: 1 }, restarts24h: 0, start: START, step: STEP, metrics: steady(18, 30, 340, 0.1) },
  { name: 'report-gen', namespace: 'lab-workloads', kind: 'Deployment', status: 'healthy', statusNote: 'Service account linked to INC-1039', incidentId: 'INC-1039', version: 'v1.2.0', replicas: { ready: 1, desired: 1 }, restarts24h: 0, start: START, step: STEP, metrics: steady(8, 20, 900, 0.1) },
  { name: 'ledger-db', namespace: 'lab-workloads', kind: 'StatefulSet', status: 'healthy', statusNote: 'Primary and 1 replica in sync', version: 'postgres 16.4', replicas: { ready: 2, desired: 2 }, restarts24h: 0, start: START, step: STEP, metrics: steady(36, 68, 4, 0.01) },
]

export const METRIC_DEFS = [
  { key: 'cpu', label: 'CPU', unit: '%', threshold: 90 },
  { key: 'memory', label: 'Memory', unit: '%', threshold: 90 },
  { key: 'latency', label: 'p95 latency', unit: 'ms' },
  { key: 'errors', label: '5xx error rate', unit: '%', threshold: 1 },
] as const

export type MetricKey = (typeof METRIC_DEFS)[number]['key']
