import type { Task, TaskTemplate, GamificationState } from '@/types';
import { getNowInTimezone } from '@/lib/notifications';

/**
 * Export all app data as a JSON file
 */
export function exportData(
  tasks: Task[],
  templates: TaskTemplate[],
  gamification: GamificationState,
  settings: Record<string, unknown>,
): void {
  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    tasks,
    templates,
    gamification,
    settings,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nghiemwork-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Import data from a JSON backup file
 */
export async function importData(file: File): Promise<{
  tasks?: Task[];
  templates?: TaskTemplate[];
  gamification?: GamificationState;
  settings?: Record<string, unknown>;
  error?: string;
}> {
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    if (!data.version || !data.tasks) {
      return { error: 'File không hợp lệ. Vui lòng chọn file backup NghiemWork.' };
    }
    return {
      tasks: data.tasks || [],
      templates: data.templates || [],
      gamification: data.gamification,
      settings: data.settings,
    };
  } catch {
    return { error: 'Không thể đọc file. Vui lòng kiểm tra định dạng.' };
  }
}

/**
 * Generate a shareable daily summary text
 */
export function generateDailySummary(
  tasks: Task[],
  gamification: GamificationState,
  timezone: string,
): string {
  const now = getNowInTimezone(timezone);
  const todayStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 86400000;

  const completed = tasks.filter(t =>
    t.status === 'done' && t.completedAt && t.completedAt >= todayStart && t.completedAt < todayEnd
  );
  const pending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress');
  const overdue = tasks.filter(t => t.status === 'overdue');

  const totalTime = completed.reduce((sum, t) => sum + (t.duration || 0), 0);
  const formatTime = (secs: number) => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m} phút`;
  };

  // Daily achievements
  const todayAchievements = gamification.achievements.filter(
    a => a.unlockedAt && a.unlockedAt >= todayStart && a.unlockedAt < todayEnd
  );

  // Financial summary
  const incomeToday = completed.filter(t => t.finance?.type === 'income').reduce((s, t) => s + (t.finance?.amount || 0), 0);
  const expenseToday = completed.filter(t => t.finance?.type === 'expense').reduce((s, t) => s + (t.finance?.amount || 0), 0);

  let summary = `=== NGHIEMWORK - ${dayNames[now.getDay()]} ${todayStr} ===\n\n`;
  summary += `Hoàn thành: ${completed.length} việc\n`;
  summary += `Tổng thời gian: ${formatTime(totalTime)}\n`;
  summary += `Còn lại: ${pending.length} việc\n`;
  if (overdue.length > 0) summary += `Quá hạn: ${overdue.length} việc\n`;
  summary += `Streak: ${gamification.streak} ngày | Level ${gamification.level} | ${gamification.xp} XP\n`;

  if (incomeToday > 0 || expenseToday > 0) {
    summary += `\nThu chi hôm nay:\n`;
    if (incomeToday > 0) summary += `  + Thu: ${incomeToday.toLocaleString('vi-VN')}đ\n`;
    if (expenseToday > 0) summary += `  - Chi: ${expenseToday.toLocaleString('vi-VN')}đ\n`;
    summary += `  = Ròng: ${(incomeToday - expenseToday).toLocaleString('vi-VN')}đ\n`;
  }

  if (completed.length > 0) {
    summary += `\nViệc đã xong:\n`;
    completed.forEach(t => {
      summary += `  ✅ ${t.title}${t.duration ? ` (${formatTime(t.duration)})` : ''}\n`;
    });
  }

  if (todayAchievements.length > 0) {
    summary += `\nThành tích hôm nay:\n`;
    todayAchievements.forEach(a => {
      summary += `  ${a.icon} ${a.title}\n`;
    });
  }

  summary += `\n--- NghiemWork ---`;
  return summary;
}
