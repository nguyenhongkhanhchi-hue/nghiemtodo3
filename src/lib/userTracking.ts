import type { AppUser } from '@/types';

export interface UserActivity {
  userId: string;
  username: string;
  action: 'login' | 'logout' | 'add_task' | 'complete_task' | 'delete_task' | 'chat_message' | 'page_view';
  details?: string;
  timestamp: number;
}

export function logUserActivity(activity: Omit<UserActivity, 'timestamp'>) {
  const activities = getUserActivities();
  activities.push({ ...activity, timestamp: Date.now() });
  // Keep last 500 activities
  if (activities.length > 500) activities.shift();
  localStorage.setItem('nw_user_activities', JSON.stringify(activities));
}

export function getUserActivities(): UserActivity[] {
  const stored = localStorage.getItem('nw_user_activities');
  return stored ? JSON.parse(stored) : [];
}

export function getRecentActivitiesForUser(userId: string, limit = 20): UserActivity[] {
  return getUserActivities()
    .filter(a => a.userId === userId)
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, limit);
}

export function updateUserLastActive(userId: string) {
  const users = getStoredUsers();
  const updated = users.map(u => u.id === userId ? { ...u, lastActive: Date.now() } : u);
  localStorage.setItem('nw_users', JSON.stringify(updated));
}

export function getStoredUsers(): AppUser[] {
  const stored = localStorage.getItem('nw_users');
  if (!stored) {
    const defaultUsers: AppUser[] = [
      { id: 'admin', email: 'admin@nghiemwork.local', username: 'Admin', role: 'admin', createdAt: Date.now(), lastActive: Date.now() },
    ];
    localStorage.setItem('nw_users', JSON.stringify(defaultUsers));
    return defaultUsers;
  }
  return JSON.parse(stored);
}

export function getOnlineUsers(thresholdMinutes = 5): AppUser[] {
  const now = Date.now();
  const threshold = thresholdMinutes * 60 * 1000;
  return getStoredUsers().filter(u => u.lastActive && (now - u.lastActive) < threshold);
}
