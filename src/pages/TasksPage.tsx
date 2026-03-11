import { useTaskStore, useSettingsStore, useAuthStore } from '@/stores';
import { DailySchedule24h } from '@/components/features/DailySchedule24h';
import { TaskList } from '@/components/features/TaskList';
import { Calendar, Clock, List } from 'lucide-react';
import { getNowInTimezone } from '@/lib/notifications';
import { downloadICS } from '@/lib/calendarExport';
import { useState, useEffect } from 'react';
import { AddTaskSheet } from '@/components/features/AddTaskInput';
import { updateUserLastActive } from '@/lib/userTracking';
import { useScreenDimming } from '@/hooks/useScreenDimming';

export default function TasksPage() {
  const timer = useTaskStore(s => s.timer);
  const tasks = useTaskStore(s => s.tasks);
  const timezone = useSettingsStore(s => s.timezone);
  const user = useAuthStore(s => s.user);
  const dimmingState = useScreenDimming();
  const [now, setNow] = useState(getNowInTimezone(timezone));
  const [viewMode, setViewMode] = useState<'list' | 'schedule'>('list');

  const handleExportCalendar = () => {
    const tasksWithDeadline = tasks.filter(t => t.deadline);
    if (tasksWithDeadline.length === 0) {
      alert('Không có việc nào có hạn chót để xuất');
      return;
    }
    downloadICS(tasksWithDeadline);
  };

  const handleTaskClick = (task: any) => {
    // Handle task click - could open edit modal or timer
    console.log('Task clicked:', task);
  };

  useEffect(() => {
    const i = setInterval(() => setNow(getNowInTimezone(timezone)), 1000);
    return () => clearInterval(i);
  }, [timezone]);

  // Update last active
  useEffect(() => {
    if (user) updateUserLastActive(user.id);
  }, [user]);

  const dayNames = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
  const dayName = dayNames[now.getDay()];
  const dateStr = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const hasTimer = timer.isRunning || timer.isPaused;

  return (
    <div className="flex flex-col h-full px-4" style={{ paddingTop: hasTimer ? 'calc(60px + env(safe-area-inset-top, 0px))' : 'max(12px, env(safe-area-inset-top, 12px))' }}>
      {/* Header - notch-safe */}
      <div className="flex items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-[11px] text-[var(--text-muted)] font-medium">{dayName}</p>
            <p className="text-base font-bold text-[var(--text-primary)]">{dateStr}</p>
          </div>
          {/* View Mode Toggle */}
          <div className="flex bg-[var(--bg-elevated)] rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'list' 
                  ? 'bg-[var(--accent-primary)] text-white' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <List size={16} className="inline mr-1" />
              Danh sách
            </button>
            <button
              onClick={() => setViewMode('schedule')}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                viewMode === 'schedule' 
                  ? 'bg-[var(--accent-primary)] text-white' 
                  : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Clock size={16} className="inline mr-1" />
              Lịch biểu
            </button>
          </div>
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

      {/* Content based on view mode */}
      {viewMode === 'list' ? (
        <TaskList />
      ) : (
        <DailySchedule24h />
      )}

      {/* Dimming overlay hint */}
      {dimmingState.isDimmed && (
        <div className="fixed inset-0 z-[9998] flex items-center justify-center pointer-events-none">
          <p className="text-xs text-white/60 bg-black/60 px-4 py-2 rounded-full animate-pulse">Vuốt để mở khóa</p>
        </div>
      )}
    </div>
  );
}
