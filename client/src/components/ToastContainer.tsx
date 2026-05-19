import { CheckCircle2, Info, TriangleAlert, X, XCircle } from 'lucide-react'
import { useApp } from '../context/AppContext'

export default function ToastContainer() {
  const { toasts, dismissToast } = useApp()

  const icons = {
    success: CheckCircle2,
    error: XCircle,
    warning: TriangleAlert,
    info: Info,
  }

  const iconColors = {
    success: 'color: var(--bb-emerald)',
    error: 'color: #ad3f70',
    warning: 'color: #996b1d',
    info: 'color: var(--bb-rose)',
  }

  return (
    <div className="toast-container">
      {toasts.map(toast => {
        const Icon = icons[toast.type] || icons.info
        return (
          <div key={toast.id} className="toast">
            <Icon size={18} style={{ color: toast.type === 'success' ? 'var(--bb-emerald)' : toast.type === 'error' ? '#ad3f70' : toast.type === 'warning' ? '#996b1d' : 'var(--bb-rose)' }} />
            <span>{toast.message}</span>
            <button
              aria-label="Dismiss toast"
              onClick={() => dismissToast(toast.id)}
              style={{ width: 24, height: 24, display: 'grid', placeItems: 'center', border: 0, borderRadius: '50%', background: 'transparent', color: 'var(--bb-muted)', cursor: 'pointer' }}
            >
              <X size={15} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
