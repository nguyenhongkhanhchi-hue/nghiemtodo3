import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores';
import { Bell, X, CheckCheck, Trash2 } from 'lucide-react';
import type { AppNotification } from '@/types';

export default function NotificationsPage() {
  const user = useAuthStore(s => s.user);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
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

  const deleteNotification = (id: string) => {
    const updated = notifications.filter(n => n.id !== id);
    saveNotifications(updated);
  };

  return (
    <div className="flex flex-col h-full px-4 pb-24 overflow-y-auto" style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 12px))' }}>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Thông báo ({unreadCount})</h1>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <button onClick={markAllAsRead} className="px-2 py-1 rounded-lg text-[10px] text-[var(--accent-primary)] bg-[var(--accent-dim)]">
              <CheckCheck size={12} className="inline mr-0.5" /> Đọc tất cả
            </button>
          )}
        </div>
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <Bell size={48} className="text-[var(--text-muted)] mb-3" />
          <p className="text-sm text-[var(--text-muted)]">Chưa có thông báo nào</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.sort((a, b) => b.timestamp - a.timestamp).map(notif => (
            <div key={notif.id} onClick={() => { markAsRead(notif.id); if (notif.actionUrl) window.location.href = notif.actionUrl; }}
              className={`p-3 rounded-xl border cursor-pointer active:opacity-70 relative group ${
                notif.read ? 'bg-[var(--bg-surface)] border-transparent opacity-60' : 'bg-[var(--accent-dim)] border-[var(--border-accent)]'
              }`}>
              <div className="flex items-start gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">{notif.title}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{notif.message}</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">{new Date(notif.timestamp).toLocaleString('vi-VN')}</p>
                </div>
                {!notif.read && <div className="size-2 rounded-full bg-[var(--accent-primary)] flex-shrink-0 mt-1" />}
                <button onClick={(e) => { e.stopPropagation(); deleteNotification(notif.id); }}
                  className="absolute top-2 right-2 size-6 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--error)] opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {notifications.length > 0 && (
        <div className="mt-4">
          <button onClick={clearAll} className="w-full py-3 rounded-xl text-sm text-[var(--text-muted)] bg-[var(--bg-surface)]">
            <Trash2 size={14} className="inline mr-1" /> Xóa tất cả
          </button>
        </div>
      )}
    </div>
  );
}
