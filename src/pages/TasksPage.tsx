import { useTaskStore, useSettingsStore, useAuthStore } from '@/stores';
import { TaskList } from '@/components/features/TaskList';
import { Calendar } from 'lucide-react';
import { getNowInTimezone } from '@/lib/notifications';
import { downloadICS } from '@/lib/calendarExport';
import { useState, useEffect } from 'react';
import { AddTaskSheet } from '@/components/features/AddTaskInput';
import { updateUserLastActive } from '@/lib/userTracking';

export default function TasksPage() {
  const timers = useTaskStore(s => s.timers);
  const tasks = useTaskStore(s => s.tasks);
  const timezone = useSettingsStore(s => s.timezone);
  const user = useAuthStore(s => s.user);
  const [showAdd, setShowAdd] = useState(false);
  const [now, setNow] = useState(getNowInTimezone(timezone));

  const handleExportCalendar = () => {
    const tasksWithDeadline = tasks.filter(t => t.deadline);
    if (tasksWithDeadline.length === 0) {
      alert('Không có việc nào có hạn chót để xuất');
      return;
    }
    downloadICS(tasksWithDeadline);
  };

  const checkAndMarkOverdue = useTaskStore(s => s.checkAndMarkOverdue);
  useEffect(() => {
    const i = setInterval(() => {
      setNow(getNowInTimezone(timezone));
      checkAndMarkOverdue();
    }, 1000);
    return () => clearInterval(i);
  }, [timezone, checkAndMarkOverdue]);

  // Update last active
  useEffect(() => {
    if (user) updateUserLastActive(user.id);
  }, [user]);

  const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const dayName = dayNames[now.getDay()];
  const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const hasActiveTimer = timers.some(t => t.isRunning || t.isPaused);
  // Height per active timer row (~40px) + header (~24px)
  const timerBarHeight = hasActiveTimer ? 24 + timers.filter(t => t.isRunning || t.isPaused).length * 40 : 0;

  return (
    <div className="flex flex-col h-full px-4" style={{ paddingTop: hasActiveTimer ? `calc(${timerBarHeight}px + env(safe-area-inset-top, 0px))` : 'max(12px, env(safe-area-inset-top, 12px))' }}>
      {/* Header - notch-safe */}
      <div className="flex items-center justify-between pb-2">
        <div>
          <p className="text-[11px] text-[var(--text-muted)] font-medium">{dayName}</p>
          <p className="text-base font-bold text-[var(--text-primary)]">{dateStr}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExportCalendar} className="size-8 rounded-xl bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-secondary)]" title="Xuất lịch">
            <Calendar size={14} />
          </button>
          <div className="text-right">
            <p className="text-lg font-mono font-bold text-[var(--accent-primary)] tabular-nums">{timeStr}</p>
          </div>
        </div>
      </div>

      <TaskList />

      {showAdd && <AddTaskSheet onClose={() => setShowAdd(false)} />}
    </div>
  );
}
