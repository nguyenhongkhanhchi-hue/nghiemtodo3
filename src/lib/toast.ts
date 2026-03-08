// Simple toast notification system
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

class ToastManager {
  private toasts: Toast[] = [];
  private listeners: ((toasts: Toast[]) => void)[] = [];

  show(message: string, type: ToastType = 'info', duration = 3000) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const toast: Toast = { id, message, type, duration };
    this.toasts.push(toast);
    this.notify();

    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  remove(id: string) {
    this.toasts = this.toasts.filter(t => t.id !== id);
    this.notify();
  }

  subscribe(listener: (toasts: Toast[]) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    this.listeners.forEach(listener => listener([...this.toasts]));
  }
}

export const toastManager = new ToastManager();

export const toast = {
  success: (message: string, duration?: number) => toastManager.show(message, 'success', duration),
  error: (message: string, duration?: number) => toastManager.show(message, 'error', duration),
  info: (message: string, duration?: number) => toastManager.show(message, 'info', duration),
  warning: (message: string, duration?: number) => toastManager.show(message, 'warning', duration),
};
