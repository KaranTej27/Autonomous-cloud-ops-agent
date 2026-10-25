import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'
import { BASE_AUDIT, sealRecord } from '../data/audit'
import type { AuditRecord, Mode } from '../data/types'

// Client-side state for the prototype. Nothing here reaches a backend: approvals, mode changes,
// and the emergency stop are recorded in this browser session only.

export const CURRENT_USER = 'k.analyst'

export interface SessionApproval {
  proposalId: string
  version: number
  decision: 'approved' | 'rejected'
  reason?: string
  at: number
  by: string
}

export interface Toast {
  id: number
  tone: 'info' | 'success' | 'warning' | 'critical'
  title: string
  body?: string
}

type Theme = 'dark' | 'light'

interface AppState {
  theme: Theme
  setTheme: (t: Theme) => void
  mode: Mode
  setMode: (m: Mode) => void
  emergencyStop: boolean
  setEmergencyStop: (on: boolean) => void
  approvals: Record<string, SessionApproval>
  decide: (a: Omit<SessionApproval, 'at' | 'by'>) => void
  owners: Record<string, string>
  assignOwner: (incidentId: string, owner: string) => void
  audit: AuditRecord[]
  toasts: Toast[]
  notify: (t: Omit<Toast, 'id'>) => void
  dismiss: (id: number) => void
}

const Ctx = createContext<AppState | null>(null)

function readTheme(): Theme {
  try {
    const v = window.localStorage.getItem('cloudops-soc.theme')
    if (v === 'light' || v === 'dark') return v
  } catch {
    // Storage may be blocked; fall back to the attribute set by theme-init.js.
  }
  return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
}

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readTheme)
  const [mode, setModeState] = useState<Mode>('supervised')
  const [emergencyStop, setStop] = useState(false)
  const [approvals, setApprovals] = useState<Record<string, SessionApproval>>({})
  const [owners, setOwners] = useState<Record<string, string>>({})
  const [audit, setAudit] = useState<AuditRecord[]>(BASE_AUDIT)
  const [toasts, setToasts] = useState<Toast[]>([])
  const toastId = useRef(1)

  const appendAudit = useCallback((event: string, details: string, incidentId?: string) => {
    setAudit((prev) => {
      const last = prev[prev.length - 1]
      return [...prev, sealRecord(last?.hash ?? '00000000', (last?.id ?? 0) + 1, { t: Date.now(), actor: CURRENT_USER, event, details, incidentId })]
    })
  }, [])

  const notify = useCallback((t: Omit<Toast, 'id'>) => {
    const id = toastId.current++
    setToasts((prev) => [...prev, { ...t, id }])
    window.setTimeout(() => setToasts((prev) => prev.filter((x) => x.id !== id)), 6500)
  }, [])

  const dismiss = useCallback((id: number) => setToasts((prev) => prev.filter((x) => x.id !== id)), [])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    document.documentElement.setAttribute('data-theme', t)
    try {
      window.localStorage.setItem('cloudops-soc.theme', t)
    } catch {
      // Not persisted when storage is blocked.
    }
  }, [])

  const modeRef = useRef<Mode>(mode)

  const setMode = useCallback(
    (m: Mode) => {
      const prev = modeRef.current
      if (prev === m) return
      modeRef.current = m
      setModeState(m)
      appendAudit('mode_changed', `Operating mode changed from ${prev} to ${m}`)
    },
    [appendAudit],
  )

  const setEmergencyStop = useCallback(
    (on: boolean) => {
      setStop(on)
      appendAudit(on ? 'emergency_stop_engaged' : 'emergency_stop_released', on ? 'Emergency stop engaged. All execution blocked.' : 'Emergency stop released.')
      if (on && modeRef.current !== 'observe') {
        appendAudit('mode_changed', `Operating mode changed from ${modeRef.current} to observe (emergency stop)`)
        modeRef.current = 'observe'
        setModeState('observe')
      }
    },
    [appendAudit],
  )

  const decide = useCallback(
    (a: Omit<SessionApproval, 'at' | 'by'>) => {
      setApprovals((prev) => ({ ...prev, [a.proposalId]: { ...a, at: Date.now(), by: CURRENT_USER } }))
      appendAudit(
        'human_decision',
        a.decision === 'approved' ? `Approved ${a.proposalId} v${a.version}` : `Rejected ${a.proposalId} v${a.version}: ${a.reason ?? ''}`,
        a.proposalId.replace('P-', 'INC-'),
      )
    },
    [appendAudit],
  )

  const assignOwner = useCallback(
    (incidentId: string, owner: string) => {
      setOwners((prev) => ({ ...prev, [incidentId]: owner }))
      appendAudit('owner_assigned', `${incidentId} assigned to ${owner}`, incidentId)
    },
    [appendAudit],
  )

  const value = useMemo<AppState>(
    () => ({ theme, setTheme, mode, setMode, emergencyStop, setEmergencyStop, approvals, decide, owners, assignOwner, audit, toasts, notify, dismiss }),
    [theme, setTheme, mode, setMode, emergencyStop, setEmergencyStop, approvals, decide, owners, assignOwner, audit, toasts, notify, dismiss],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp(): AppState {
  const v = useContext(Ctx)
  if (!v) throw new Error('useApp must be used inside AppStateProvider')
  return v
}
