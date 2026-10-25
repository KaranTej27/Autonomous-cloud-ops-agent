import type { LogEvent } from '../data/types'

// A small subset of SPL, enough to explore the synthetic events:
//   field=value  field!=value  "quoted phrase"  term  wildcards (*)  NOT  OR  AND  ( )
//   | head N   | stats count [by f1, f2]   | top [limit=N] field   | table f1, f2
// Precedence follows Splunk: NOT, then OR, then AND (implicit between terms).

type Node =
  | { t: 'and'; c: Node[] }
  | { t: 'or'; c: Node[] }
  | { t: 'not'; c: Node }
  | { t: 'cmp'; field: string; op: '=' | '!='; value: string }
  | { t: 'term'; value: string }
  | { t: 'all' }

export interface TableResult {
  columns: string[]
  rows: (string | number)[][]
}

export interface SearchResult {
  events: LogEvent[]
  table?: TableResult
  terms: string[]
  error?: string
  commands: string[]
}

export class QueryError extends Error {}

const TOP_LEVEL = new Set(['index', 'sourcetype', 'source', 'host'])

export function fieldValue(e: LogEvent, field: string): string | number | undefined {
  if (TOP_LEVEL.has(field)) return e[field as 'index']
  if (field === '_raw') return e.raw
  return e.fields[field]
}

function splitPipes(q: string): string[] {
  const parts: string[] = []
  let cur = ''
  let quoted = false
  for (const ch of q) {
    if (ch === '"') quoted = !quoted
    if (ch === '|' && !quoted) {
      parts.push(cur)
      cur = ''
    } else cur += ch
  }
  parts.push(cur)
  return parts.map((p) => p.trim())
}

type Token = { k: 'lp' | 'rp' | 'word' | 'phrase'; v: string }

function tokenize(s: string): Token[] {
  const out: Token[] = []
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (/\s/.test(ch)) {
      i++
    } else if (ch === '(') {
      out.push({ k: 'lp', v: ch })
      i++
    } else if (ch === ')') {
      out.push({ k: 'rp', v: ch })
      i++
    } else if (ch === '"') {
      const end = s.indexOf('"', i + 1)
      if (end < 0) throw new QueryError('Unbalanced quotes.')
      out.push({ k: 'phrase', v: s.slice(i + 1, end) })
      i = end + 1
    } else {
      let w = ''
      while (i < s.length && !/[\s()]/.test(s[i])) {
        if (s[i] === '"') {
          const end = s.indexOf('"', i + 1)
          if (end < 0) throw new QueryError('Unbalanced quotes.')
          w += s.slice(i + 1, end)
          i = end + 1
        } else {
          w += s[i++]
        }
      }
      out.push({ k: 'word', v: w })
    }
  }
  return out
}

function parseFilter(s: string): Node {
  const tokens = tokenize(s)
  let pos = 0
  const peek = () => tokens[pos]
  const isOp = (v: string) => peek()?.k === 'word' && peek()?.v === v

  function primary(): Node {
    const tok = tokens[pos++]
    if (!tok) throw new QueryError('The search ended where a term was expected.')
    if (tok.k === 'lp') {
      const inner = andExpr()
      if (tokens[pos]?.k !== 'rp') throw new QueryError('Missing closing parenthesis.')
      pos++
      return inner
    }
    if (tok.k === 'rp') throw new QueryError('Unexpected closing parenthesis.')
    if (tok.k === 'phrase') return { t: 'term', value: tok.v }
    const m = /^([A-Za-z_][\w.:-]*)(!=|=)(.*)$/.exec(tok.v)
    if (m) return { t: 'cmp', field: m[1], op: m[2] as '=' | '!=', value: m[3] }
    return { t: 'term', value: tok.v }
  }

  function notExpr(): Node {
    if (isOp('NOT')) {
      pos++
      return { t: 'not', c: notExpr() }
    }
    return primary()
  }

  function orExpr(): Node {
    const c = [notExpr()]
    while (isOp('OR')) {
      pos++
      c.push(notExpr())
    }
    return c.length === 1 ? c[0] : { t: 'or', c }
  }

  function andExpr(): Node {
    const c: Node[] = []
    while (pos < tokens.length && peek().k !== 'rp') {
      if (isOp('AND')) {
        pos++
        continue
      }
      c.push(orExpr())
    }
    if (c.length === 0) return { t: 'all' }
    return c.length === 1 ? c[0] : { t: 'and', c }
  }

  const node = andExpr()
  if (pos < tokens.length) throw new QueryError('Unexpected closing parenthesis.')
  return node
}

const regexCache = new Map<string, RegExp>()

function wildcard(value: string, anchored: boolean): RegExp {
  const key = `${anchored ? 'a' : 'u'}:${value}`
  let re = regexCache.get(key)
  if (!re) {
    const body = value
      .split('*')
      .map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
      .join('.*')
    re = new RegExp(anchored ? `^${body}$` : body, 'i')
    regexCache.set(key, re)
  }
  return re
}

function matches(node: Node, e: LogEvent): boolean {
  switch (node.t) {
    case 'all':
      return true
    case 'and':
      return node.c.every((c) => matches(c, e))
    case 'or':
      return node.c.some((c) => matches(c, e))
    case 'not':
      return !matches(node.c, e)
    case 'term':
      if (node.value === '*') return true
      return wildcard(node.value, false).test(e.raw)
    case 'cmp': {
      const v = fieldValue(e, node.field)
      if (v === undefined || v === '') return false
      if (node.value === '*') return node.op === '='
      const hit = wildcard(node.value, true).test(String(v))
      return node.op === '=' ? hit : !hit
    }
  }
}

function collectTerms(node: Node, out: string[], negated = false) {
  if (node.t === 'term' && !negated && node.value !== '*') out.push(node.value.replace(/\*/g, ''))
  if (node.t === 'cmp' && !negated && node.op === '=' && !node.value.includes('*')) out.push(node.value)
  if (node.t === 'and' || node.t === 'or') node.c.forEach((c) => collectTerms(c, out, negated))
  if (node.t === 'not') collectTerms(node.c, out, !negated)
}

function parseFieldList(s: string): string[] {
  return s
    .split(/[\s,]+/)
    .map((f) => f.trim())
    .filter(Boolean)
}

function countBy(events: LogEvent[], fields: string[]): TableResult {
  const counts = new Map<string, { values: (string | number)[]; n: number }>()
  for (const e of events) {
    const values = fields.map((f) => fieldValue(e, f))
    if (values.some((v) => v === undefined || v === '')) continue
    const key = values.join('\u0000')
    const entry = counts.get(key)
    if (entry) entry.n++
    else counts.set(key, { values: values as (string | number)[], n: 1 })
  }
  const rows = [...counts.values()].sort((a, b) => b.n - a.n).map((c) => [...c.values, c.n])
  return { columns: [...fields, 'count'], rows }
}

export function runSearch(query: string, events: LogEvent[]): SearchResult {
  const [filterText, ...commandTexts] = splitPipes(query)
  const commands = commandTexts.map((c) => c.split(/\s+/)[0]?.toLowerCase() ?? '')
  try {
    const filter = parseFilter(filterText)
    const terms: string[] = []
    collectTerms(filter, terms)

    let current = events.filter((e) => matches(filter, e))
    let table: TableResult | undefined

    for (const cmd of commandTexts) {
      if (!cmd) throw new QueryError('Empty command after a pipe.')
      const [name, ...rest] = cmd.split(/\s+/)
      const args = rest.join(' ')
      switch (name.toLowerCase()) {
        case 'head': {
          const n = args ? Number.parseInt(args, 10) : 10
          if (!Number.isFinite(n) || n < 0) throw new QueryError('head expects a positive number.')
          if (table) table = { ...table, rows: table.rows.slice(0, n) }
          else current = current.slice(0, n)
          break
        }
        case 'stats': {
          const m = /^count(?:\s+by\s+(.+))?$/i.exec(args.trim())
          if (!m) throw new QueryError('This console supports "stats count" and "stats count by <fields>".')
          table = m[1] ? countBy(current, parseFieldList(m[1])) : { columns: ['count'], rows: [[current.length]] }
          break
        }
        case 'top': {
          const limitMatch = /limit=(\d+)/i.exec(args)
          const limit = limitMatch ? Number.parseInt(limitMatch[1], 10) : 10
          const fields = parseFieldList(args.replace(/limit=\d+/i, ''))
          if (fields.length === 0) throw new QueryError('top needs a field name.')
          const counted = countBy(current, fields)
          const total = current.length || 1
          table = {
            columns: [...fields, 'count', 'percent'],
            rows: counted.rows.slice(0, limit).map((r) => [...r, Number((((r[r.length - 1] as number) / total) * 100).toFixed(2))]),
          }
          break
        }
        case 'table': {
          const fields = parseFieldList(args)
          if (fields.length === 0) throw new QueryError('table needs at least one field.')
          table = { columns: fields, rows: current.map((e) => fields.map((f) => fieldValue(e, f) ?? '')) }
          break
        }
        default:
          throw new QueryError(`Unknown search command "${name}". This console supports head, stats, top, and table.`)
      }
    }
    return { events: current, table, terms, commands }
  } catch (err) {
    const message = err instanceof QueryError ? err.message : 'The search could not be parsed.'
    return { events: [], terms: [], error: message, commands }
  }
}

/** Tokens for syntax highlighting in the search bar. */
export type SplToken = { text: string; kind: 'command' | 'keyword' | 'field' | 'string' | 'pipe' | 'text' }

export function highlightSpl(q: string): SplToken[] {
  const out: SplToken[] = []
  const re = /("(?:[^"\\]|\\.)*"?)|(\|)|\b(AND|OR|NOT|by|as|limit)\b|([A-Za-z_][\w.:-]*)(?=!?=)|(\s+)|([^\s|"]+?)(?=[\s|"]|$)|(.)/g
  let afterPipe = false
  let m: RegExpExecArray | null
  while ((m = re.exec(q))) {
    const [text, str, pipe, kw, field, ws] = m
    if (str) out.push({ text, kind: 'string' })
    else if (pipe) {
      out.push({ text, kind: 'pipe' })
      afterPipe = true
      continue
    } else if (ws) out.push({ text, kind: 'text' })
    else if (afterPipe) out.push({ text, kind: 'command' })
    else if (kw) out.push({ text, kind: 'keyword' })
    else if (field) out.push({ text, kind: 'field' })
    else out.push({ text, kind: 'text' })
    if (!ws) afterPipe = false
  }
  return out
}
