import { ArrowDown, ArrowUp } from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

export interface Column<T> {
  key: string
  label: string
  render: (row: T) => ReactNode
  align?: 'left' | 'right'
  width?: number | string
  sortValue?: (row: T) => string | number
  numeric?: boolean
}

interface Props<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  empty?: ReactNode
  initialSort?: { key: string; dir: 'asc' | 'desc' }
  caption?: string
}

export function DataTable<T>({ columns, rows, rowKey, onRowClick, empty = 'No results found.', initialSort, caption }: Props<T>) {
  const [sort, setSort] = useState(initialSort)

  const sorted = useMemo(() => {
    const col = columns.find((c) => c.key === sort?.key)
    if (!col?.sortValue || !sort) return rows
    const get = col.sortValue
    const dir = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const va = get(a)
      const vb = get(b)
      return (va < vb ? -1 : va > vb ? 1 : 0) * dir
    })
  }, [rows, columns, sort])

  return (
    <div className="table-wrap">
      <table className="data-table">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr>
            {columns.map((c) => {
              const active = sort?.key === c.key
              return (
                <th key={c.key} style={{ width: c.width, textAlign: c.align ?? (c.numeric ? 'right' : 'left') }} aria-sort={active ? (sort?.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                  {c.sortValue ? (
                    <button
                      type="button"
                      className="th-sort"
                      onClick={() => setSort({ key: c.key, dir: active && sort?.dir === 'desc' ? 'asc' : 'desc' })}
                    >
                      {c.label}
                      {active ? sort?.dir === 'asc' ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" /> : null}
                    </button>
                  ) : (
                    c.label
                  )}
                </th>
              )
            })}
          </tr>
        </thead>
        <tbody>
          {sorted.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="table-empty">
                {empty}
              </td>
            </tr>
          ) : (
            sorted.map((r) => (
              <tr key={rowKey(r)} className={onRowClick ? 'is-clickable' : undefined} onClick={onRowClick ? () => onRowClick(r) : undefined}>
                {columns.map((c) => (
                  <td key={c.key} className={c.numeric ? 'num' : undefined} style={{ textAlign: c.align ?? (c.numeric ? 'right' : 'left') }}>
                    {c.render(r)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
