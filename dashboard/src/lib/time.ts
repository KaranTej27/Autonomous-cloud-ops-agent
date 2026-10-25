export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

// Every synthetic timestamp is relative to this anchor, so the data always looks current.
export const NOW = Math.floor(Date.now() / MINUTE) * MINUTE

export type RangeKey = '15m' | '60m' | '4h' | '24h' | '7d'

export interface TimeRange {
  key: RangeKey
  label: string
  ms: number
  bucketMs: number
  bucketLabel: string
}

export const RANGES: TimeRange[] = [
  { key: '15m', label: 'Last 15 minutes', ms: 15 * MINUTE, bucketMs: MINUTE, bucketLabel: '1 minute per column' },
  { key: '60m', label: 'Last 60 minutes', ms: HOUR, bucketMs: 5 * MINUTE, bucketLabel: '5 minutes per column' },
  { key: '4h', label: 'Last 4 hours', ms: 4 * HOUR, bucketMs: 10 * MINUTE, bucketLabel: '10 minutes per column' },
  { key: '24h', label: 'Last 24 hours', ms: DAY, bucketMs: 30 * MINUTE, bucketLabel: '30 minutes per column' },
  { key: '7d', label: 'Last 7 days', ms: 7 * DAY, bucketMs: 6 * HOUR, bucketLabel: '6 hours per column' },
]

export function getRange(key: string | null | undefined): TimeRange {
  return RANGES.find((r) => r.key === key) ?? RANGES[3]
}

export interface Bucket {
  start: number
  end: number
}

export function makeBuckets(start: number, end: number, bucketMs: number): Bucket[] {
  const first = Math.floor(start / bucketMs) * bucketMs
  const out: Bucket[] = []
  for (let t = first; t < end; t += bucketMs) out.push({ start: t, end: t + bucketMs })
  return out
}
