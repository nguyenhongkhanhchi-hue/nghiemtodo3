import type { Task } from '@/types';

// Request notification permission
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;

  const result = await Notification.requestPermission();
  return result === 'granted';
}

// Check if notifications are supported and granted
export function canSendNotification(): boolean {
  return 'Notification' in window && Notification.permission === 'granted';
}

// Send a push notification via service worker
export async function sendNotification(title: string, body: string, tag?: string): Promise<void> {
  if (!canSendNotification()) return;

  try {
    const registration = await navigator.serviceWorker?.ready;
    if (registration) {
      await registration.showNotification(title, {
        body,
        icon: '/og-image.jpg',
        badge: '/og-image.jpg',
        tag: tag || 'taskflow-notification',
        vibrate: [200, 100, 200],
        renotify: true,
        requireInteraction: false,
        silent: false,
      });
    } else {
      new Notification(title, { body, icon: '/og-image.jpg', tag: tag || 'taskflow-notification' });
    }
  } catch {
    // Fallback to basic notification
    try { new Notification(title, { body }); } catch { /* silent */ }
  }
}

// Get current time in a specific timezone
export function getNowInTimezone(timezone: string): Date {
  const now = new Date();
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(now);
  const get = (type: string) => parts.find(p => p.type === type)?.value || '0';
  return new Date(`${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`);
}

// Format time remaining until deadline
export function formatTimeRemaining(deadline: number, timezone: string): { text: string; urgent: boolean; overdue: boolean } {
  const now = getNowInTimezone(timezone).getTime();
  const diff = deadline - now;

  if (diff < 0) {
    const absDiff = Math.abs(diff);
    if (absDiff < 60000) return { text: 'Vừa quá hạn', urgent: true, overdue: true };
    if (absDiff < 3600000) return { text: `Quá hạn ${Math.floor(absDiff / 60000)} phút`, urgent: true, overdue: true };
    if (absDiff < 86400000) return { text: `Quá hạn ${Math.floor(absDiff / 3600000)} giờ`, urgent: true, overdue: true };
    return { text: `Quá hạn ${Math.floor(absDiff / 86400000)} ngày`, urgent: true, overdue: true };
  }

  if (diff < 60000) return { text: 'Sắp hết hạn', urgent: true, overdue: false };
  if (diff < 900000) return { text: `Còn ${Math.floor(diff / 60000)} phút`, urgent: true, overdue: false };
  if (diff < 3600000) return { text: `Còn ${Math.floor(diff / 60000)} phút`, urgent: true, overdue: false };
  if (diff < 86400000) return { text: `Còn ${Math.floor(diff / 3600000)} giờ`, urgent: diff < 7200000, overdue: false };
  return { text: `Còn ${Math.floor(diff / 86400000)} ngày`, urgent: false, overdue: false };
}

// Format a timestamp to readable date in timezone
export function formatDeadlineDisplay(ts: number, timezone: string): string {
  const date = new Date(ts);
  return date.toLocaleString('vi-VN', {
    timeZone: timezone,
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Check tasks and send deadline notifications
export function checkDeadlineNotifications(
  tasks: Task[],
  timezone: string,
  minutesBefore: number,
  notifiedSet: Set<string>,
): void {
  if (!canSendNotification()) return;

  const now = getNowInTimezone(timezone).getTime();

  tasks.forEach(task => {
    if (task.status !== 'pending' && task.status !== 'in_progress') return;
    if (!task.deadline) return;

    const timeUntil = task.deadline - now;
    const notifyKey = `${task.id}_${minutesBefore}`;

    // Notify X minutes before deadline
    if (timeUntil > 0 && timeUntil <= minutesBefore * 60 * 1000 && !notifiedSet.has(notifyKey)) {
      const minsLeft = Math.ceil(timeUntil / 60000);
      sendNotification(
        `⏰ Sắp hết hạn: ${task.title}`,
        `Còn ${minsLeft} phút nữa là hết hạn!`,
        `deadline-${task.id}`,
      );
      notifiedSet.add(notifyKey);
    }

    // Notify when overdue
    const overdueKey = `${task.id}_overdue`;
    if (timeUntil < 0 && timeUntil > -120000 && !notifiedSet.has(overdueKey)) {
      sendNotification(
        `🔴 Quá hạn: ${task.title}`,
        'Việc này đã quá hạn!',
        `overdue-${task.id}`,
      );
      notifiedSet.add(overdueKey);
    }
  });
}
