import { CircleCheck, Info, OctagonAlert, TriangleAlert, X } from 'lucide-react'
import { useApp } from '../state/AppState'

const ICON = { info: Info, success: CircleCheck, warning: TriangleAlert, critical: OctagonAlert }

export function Toasts() {
  const { toasts, dismiss } = useApp()
  return (
    <div className="toasts" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICON[t.tone]
        return (
          <div key={t.id} className={`toast tone-${t.tone}`}>
            <Icon size={18} className="toast-icon" aria-hidden="true" />
            <div className="toast-text">
              <strong>{t.title}</strong>
              {t.body && <p>{t.body}</p>}
            </div>
            <button type="button" className="icon-btn" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
