import { useEffect, useState } from 'react';
import { toastManager } from '@/lib/toast';
import { CheckCircle, XCircle, Info, AlertTriangle, X } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration: number;
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const unsubscribe = toastManager.subscribe(setToasts);
    return unsubscribe;
  }, []);

  const icons = {
    success: CheckCircle,
    error: XCircle,
    info: Info,
    warning: AlertTriangle,
  };

  const colors = {
    success: { bg: 'rgba(52,211,153,0.15)', border: 'var(--success)', icon: 'var(--success)' },
    error: { bg: 'rgba(248,113,113,0.15)', border: 'var(--error)', icon: 'var(--error)' },
    info: { bg: 'rgba(96,165,250,0.15)', border: 'var(--info)', icon: 'var(--info)' },
    warning: { bg: 'rgba(251,191,36,0.15)', border: '#FBBF24', icon: '#FBBF24' },
  };

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] flex flex-col gap-2 px-4 pointer-events-none"
      style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 12px))' }}>
      {toasts.map(toast => {
        const Icon = icons[toast.type];
        const color = colors[toast.type];
        return (
          <div key={toast.id}
            className="flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl backdrop-blur-xl border pointer-events-auto animate-slide-down"
            style={{ backgroundColor: color.bg, borderColor: color.border }}>
            <Icon size={18} style={{ color: color.icon }} className="flex-shrink-0" />
            <p className="flex-1 text-sm text-[var(--text-primary)] font-medium">{toast.message}</p>
            <button onClick={() => toastManager.remove(toast.id)}
              className="size-6 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-surface)]">
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
