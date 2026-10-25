import { Bell, Check, ChevronDown, CircleDashed, CircleQuestionMark, Moon, OctagonX, Power, Server, Sun } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import type { Mode } from '../data/types'
import { useApp, CURRENT_USER } from '../state/AppState'
import { isOpen, pendingApprovals, useIncidents } from '../state/selectors'
import { Modal } from './Modal'
import { Popover } from './Popover'
import { Toasts } from './Toasts'

const DOCS = 'https://github.com/KaranTej27/Autonomous-cloud-ops-agent/blob/main/docs/safety-model.md'

const MODES: { key: Mode; label: string; tone: string; description: string }[] = [
  { key: 'observe', label: 'Observe', tone: 'neutral', description: 'Collect, detect, correlate, and diagnose. Proposals are shown, never executed.' },
  { key: 'dry-run', label: 'Dry run', tone: 'info', description: 'Adds policy checks. The executor simulates each action and records what it would do.' },
  { key: 'supervised', label: 'Supervised', tone: 'warning', description: 'Allowed actions run. Actions that need approval wait for a human.' },
  { key: 'lab-autonomous', label: 'Lab autonomous', tone: 'serious', description: 'Selected tier 2 actions on labelled test workloads run without per-action approval.' },
]

function BrandMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 32 32" aria-hidden="true">
      <path d="M16 4.5 26 10.25v11.5L16 27.5 6 21.75v-11.5z" fill="none" stroke="var(--accent-bright)" strokeWidth="2.6" strokeLinejoin="round" />
      <path d="M10.5 17.5h3.2l2.2-5.4 2.6 8.4 1.6-3h1.6" fill="none" stroke="var(--topbar-text)" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ModeMenu() {
  const { mode, setMode, emergencyStop, notify } = useApp()
  const [confirm, setConfirm] = useState<Mode | null>(null)
  const current = MODES.find((m) => m.key === mode) ?? MODES[0]

  function choose(m: Mode, close: () => void) {
    close()
    if (m === mode) return
    if (emergencyStop) {
      notify({ tone: 'warning', title: 'Mode is locked', body: 'Release the emergency stop before changing the operating mode.' })
      return
    }
    if (m === 'lab-autonomous') {
      setConfirm(m)
      return
    }
    setMode(m)
    notify({ tone: 'info', title: `Mode changed to ${MODES.find((x) => x.key === m)?.label}`, body: 'Recorded in the audit trail for this session.' })
  }

  return (
    <>
      <Popover
        align="right"
        trigger={({ open, toggle }) => (
          <button type="button" className="topbar-btn mode-btn" aria-haspopup="menu" aria-expanded={open} onClick={toggle}>
            <span className={`mode-dot tone-${current.tone}`} aria-hidden="true" />
            <span className="mode-label">
              Mode: <strong>{current.label}</strong>
            </span>
            <ChevronDown size={14} aria-hidden="true" />
          </button>
        )}
      >
        {(close) => (
          <div className="menu menu-mode" role="menu" aria-label="Operating mode">
            <div className="menu-heading">Operating mode</div>
            {MODES.map((m) => (
              <button key={m.key} type="button" role="menuitemradio" aria-checked={m.key === mode} className={`menu-item menu-item-rich${m.key === mode ? ' is-selected' : ''}`} onClick={() => choose(m.key, close)}>
                <span className="menu-check">{m.key === mode && <Check size={16} strokeWidth={3} aria-hidden="true" />}</span>
                <span>
                  <span className="menu-item-title">
                    <span className={`mode-dot tone-${m.tone}`} aria-hidden="true" />
                    {m.label}
                  </span>
                  <span className="menu-item-desc">{m.description}</span>
                </span>
              </button>
            ))}
            <div className="menu-footer">Only an operator can change the mode. The model never can.</div>
          </div>
        )}
      </Popover>
      {confirm && (
        <Modal
          title="Switch to lab autonomous?"
          onClose={() => setConfirm(null)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setConfirm(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setMode(confirm)
                  setConfirm(null)
                  notify({ tone: 'warning', title: 'Mode changed to Lab autonomous', body: 'Tier 2 actions on test workloads can now run without per-action approval.' })
                }}
              >
                Switch mode
              </button>
            </>
          }
        >
          <p>Tier 2 actions on resources labelled as test workloads will run without a per-action approval, under the lab test policy.</p>
          <p className="muted">Tier 3 actions still need approval and tier 4 actions stay denied.</p>
        </Modal>
      )}
    </>
  )
}

function EmergencyStop() {
  const { emergencyStop, setEmergencyStop, notify } = useApp()
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" className={`topbar-btn estop-btn${emergencyStop ? ' is-engaged' : ''}`} onClick={() => setOpen(true)}>
        {emergencyStop ? <OctagonX size={15} aria-hidden="true" /> : <Power size={15} aria-hidden="true" />}
        <span className="estop-label">{emergencyStop ? 'Stop engaged' : 'Emergency stop'}</span>
      </button>
      {open && (
        <Modal
          title={emergencyStop ? 'Release the emergency stop?' : 'Engage the emergency stop?'}
          tone="danger"
          onClose={() => setOpen(false)}
          footer={
            <>
              <button type="button" className="btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className={emergencyStop ? 'btn btn-primary' : 'btn btn-danger'}
                onClick={() => {
                  setEmergencyStop(!emergencyStop)
                  setOpen(false)
                  notify(
                    emergencyStop
                      ? { tone: 'info', title: 'Emergency stop released', body: 'The mode stays on Observe until an operator changes it.' }
                      : { tone: 'critical', title: 'Emergency stop engaged', body: 'All execution is blocked and the mode is Observe.' },
                  )
                }}
              >
                {emergencyStop ? 'Release stop' : 'Engage stop'}
              </button>
            </>
          }
        >
          {emergencyStop ? (
            <p>The executor will accept allowed actions again. The operating mode stays on Observe until you change it.</p>
          ) : (
            <>
              <p>The executor will refuse every action immediately, and the platform switches to Observe mode.</p>
              <ul className="list-tight">
                <li>Detection, correlation, and diagnosis keep running.</li>
                <li>Approvals can still be recorded, but nothing runs.</li>
                <li>Only a human can release the stop.</li>
              </ul>
            </>
          )}
        </Modal>
      )}
    </>
  )
}

function TopBar() {
  const { theme, setTheme } = useApp()
  const incidents = useIncidents()
  const pending = pendingApprovals(incidents).length
  return (
    <header className="topbar">
      <div className="topbar-left">
        <Link to="/" className="brand" aria-label="CloudOps SOC home">
          <BrandMark />
          <span className="brand-name">cloudops</span>
          <span className="brand-tag">SOC</span>
        </Link>
        <span className="env-chip" title="Synthetic lab environment">
          <Server size={12} aria-hidden="true" />
          lab · kind-cloudops-soc-lab
        </span>
      </div>
      <div className="topbar-right">
        <ModeMenu />
        <EmergencyStop />
        <span className="topbar-sep" aria-hidden="true" />
        <Link to="/approvals" className="topbar-btn icon-only" aria-label={`${pending} pending approvals`} title="Pending approvals">
          <Bell size={16} aria-hidden="true" />
          {pending > 0 && <span className="topbar-count">{pending}</span>}
        </Link>
        <button type="button" className="topbar-btn icon-only" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} title="Toggle theme">
          {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
        </button>
        <a className="topbar-btn icon-only" href={DOCS} target="_blank" rel="noreferrer" aria-label="Safety model documentation" title="Safety model docs">
          <CircleQuestionMark size={16} aria-hidden="true" />
        </a>
        <span className="topbar-user">
          <span className="avatar" aria-hidden="true">
            KA
          </span>
          <span className="user-name">{CURRENT_USER}</span>
          <span className="user-role">operator</span>
        </span>
      </div>
    </header>
  )
}

function AppBar() {
  const incidents = useIncidents()
  const open = incidents.filter(isOpen).length
  const pending = pendingApprovals(incidents).length
  const items: { to: string; label: string; count?: number; tone?: string; end?: boolean }[] = [
    { to: '/', label: 'Overview', end: true },
    { to: '/incidents', label: 'Incident Review', count: open },
    { to: '/search', label: 'Search' },
    { to: '/approvals', label: 'Approvals', count: pending, tone: 'warning' },
    { to: '/health', label: 'Workload Health' },
    { to: '/audit', label: 'Audit Trail' },
  ]
  return (
    <nav className="appbar" aria-label="Primary">
      <ul className="appnav">
        {items.map((it) => (
          <li key={it.to}>
            <NavLink to={it.to} end={it.end} className={({ isActive }) => (isActive ? 'is-active' : undefined)}>
              {it.label}
              {it.count ? <span className={`nav-count${it.tone ? ` tone-${it.tone}` : ''}`}>{it.count}</span> : null}
            </NavLink>
          </li>
        ))}
      </ul>
      <div className="appbar-title">Autonomous CloudOps + AI SOC</div>
    </nav>
  )
}

function Banners() {
  const { emergencyStop } = useApp()
  return (
    <>
      {emergencyStop && (
        <div className="banner banner-critical" role="alert">
          <OctagonX size={16} aria-hidden="true" />
          <span>
            <strong>Emergency stop engaged.</strong> The executor refuses every action and the mode is locked to Observe.
          </span>
        </div>
      )}
      <div className="banner banner-sim">
        <CircleDashed size={14} aria-hidden="true" />
        <span>
          Prototype with synthetic data from the scenario catalogue. It has no backend: approvals and mode changes stay in this browser tab, and nothing touches real infrastructure.
        </span>
      </div>
    </>
  )
}

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <TopBar />
      <AppBar />
      <Banners />
      <main className="main" id="main" tabIndex={-1}>
        {children}
      </main>
      <Toasts />
    </div>
  )
}

export function PageHeader({ title, description, children }: { title: string; description?: ReactNode; children?: ReactNode }) {
  return (
    <div className="page-head">
      <div>
        <h1>{title}</h1>
        {description && <p className="page-desc">{description}</p>}
      </div>
      {children && <div className="page-controls">{children}</div>}
    </div>
  )
}
