import { DAY, HOUR, MINUTE, NOW } from './time'

const dateFmt = new Intl.DateTimeFormat('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' })
const timeFmt = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  second: '2-digit',
  fractionalSecondDigits: 3,
  hour12: true,
})
const shortTimeFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
const secondsFmt = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true })

export function timeWithSeconds(t: number): string {
  return secondsFmt.format(t)
}
const dayFmt = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
const dayTimeFmt = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
})

/** Splunk-style event time, split into a date line and a time line. */
export function splunkTime(t: number): { date: string; time: string } {
  return { date: dateFmt.format(t), time: timeFmt.format(t) }
}

export function fullTime(t: number): string {
  const { date, time } = splunkTime(t)
  return `${date} ${time}`
}

export function shortTime(t: number): string {
  return shortTimeFmt.format(t)
}

export function dayLabel(t: number): string {
  return dayFmt.format(t)
}

export function dayTime(t: number): string {
  return dayTimeFmt.format(t)
}

/** Axis label for a bucket start, chosen by the bucket width. */
export function axisLabel(t: number, bucketMs: number): string {
  if (bucketMs >= 6 * HOUR) return dayFmt.format(t)
  return shortTimeFmt.format(t)
}

export function relative(t: number, now = NOW): string {
  const diff = now - t
  const future = diff < 0
  const abs = Math.abs(diff)
  let text: string
  if (abs < MINUTE) text = 'just now'
  else if (abs < HOUR) text = `${Math.round(abs / MINUTE)}m`
  else if (abs < DAY) text = `${Math.floor(abs / HOUR)}h ${Math.round((abs % HOUR) / MINUTE)}m`
  else text = `${Math.floor(abs / DAY)}d ${Math.floor((abs % DAY) / HOUR)}h`
  if (text === 'just now') return text
  return future ? `in ${text}` : `${text} ago`
}

export function duration(ms: number): string {
  const s = Math.round(ms / 1000)
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  const rs = s % 60
  if (m < 60) return rs ? `${m}m ${rs}s` : `${m}m`
  const h = Math.floor(m / 60)
  return `${h}h ${m % 60}m`
}

export function compact(n: number): string {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return `${trim(n / 1_000_000)}M`
  if (abs >= 1_000) return `${trim(n / 1_000)}K`
  return `${Math.round(n)}`
}

function trim(n: number): string {
  return n >= 100 ? n.toFixed(0) : n.toFixed(1).replace(/\.0$/, '')
}

export function integer(n: number): string {
  return Math.round(n).toLocaleString('en-US')
}

export function pct(n: number, digits = 1): string {
  return `${n.toFixed(digits).replace(/\.0$/, '')}%`
}

export function titleCase(s: string): string {
  return s.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase())
}
