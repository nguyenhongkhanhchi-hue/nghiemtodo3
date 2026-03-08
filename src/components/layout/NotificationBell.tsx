import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores';
import { Bell, X, CheckCheck } from 'lucide-react';
import type { AppNotification } from '@/types';

export function NotificationBell() {
  const user = useAuthStore(s => s.user);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  // Load notifications
  useEffect(() => {
    if (!user) return;
    const key = `nw_notifications_${user.id}`;
    const stored = localStorage.getItem(key);
    if (stored) setNotifications(JSON.parse(stored));
  }, [user?.id]);

  const saveNotifications = (notifs: AppNotification[]) => {
    if (!user) return;
    const key = `nw_notifications_${user.id}`;
    localStorage.setItem(key, JSON.stringify(notifs));
    setNotifications(notifs);
  };

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => n.id === id ? { ...n, read: true } : n);
    saveNotifications(updated);
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    saveNotifications(updated);
  };

  const clearAll = () => {
    saveNotifications([]);
  };

  return (
    <>
      <button onClick={() => setShowPanel(!showPanel)}
        className="relative size-9 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] border border-[var(--border-subtle)]">
        <Bell size={16} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 size-4 rounded-full bg-[var(--error)] text-white text-[9px] font-bold flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showPanel && (
        <div className="fixed inset-0 z-[100] flex items-start justify-end bg-black/50 p-4" onClick={() => setShowPanel(false)}
          style={{ paddingTop: 'max(60px, env(safe-area-inset-top, 60px))' }}>
          <div className="w-full max-w-sm max-h-[80vh] bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)] flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[var(--border-subtle)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Thông báo ({unreadCount})</h3>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button onClick={markAllAsRead} className="px-2 py-1 rounded-lg text-[10px] text-[var(--accent-primary)] bg-[var(--accent-dim)]">
                    <CheckCheck size={12} className="inline mr-0.5" /> Đọc tất cả
                  </button>
                )}
                <button onClick={() => setShowPanel(false)} className="size-7 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
                  <X size={14} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Bell size={32} className="text-[var(--text-muted)] mb-2" />
                  <p className="text-xs text-[var(--text-muted)]">Chưa có thông báo nào</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {notifications.sort((a, b) => b.timestamp - a.timestamp).map(notif => (
                    <div key={notif.id} onClick={() => { markAsRead(notif.id); if (notif.actionUrl) window.location.href = notif.actionUrl; }}
                      className={`p-3 rounded-xl border cursor-pointer active:opacity-70 ${
                        notif.read ? 'bg-[var(--bg-surface)] border-transparent opacity-60' : 'bg-[var(--accent-dim)] border-[var(--border-accent)]'
                      }`}>
                      <div className="flex items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[var(--text-primary)] mb-0.5">{notif.title}</p>
                          <p className="text-[10px] text-[var(--text-secondary)]">{notif.message}</p>
                          <p className="text-[9px] text-[var(--text-muted)] mt-1">{new Date(notif.timestamp).toLocaleString('vi-VN')}</p>
                        </div>
                        {!notif.read && <div className="size-2 rounded-full bg-[var(--accent-primary)] flex-shrink-0 mt-1" />}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {notifications.length > 0 && (
              <div className="p-3 border-t border-[var(--border-subtle)]">
                <button onClick={clearAll} className="w-full py-2 rounded-lg text-xs text-[var(--text-muted)] bg-[var(--bg-surface)]">
                  Xóa tất cả
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
