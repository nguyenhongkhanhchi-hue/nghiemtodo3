import { useMemo, useState } from 'react';
import { useTaskStore } from '@/stores';
import { Play, Pause, Check, Clock } from 'lucide-react';
import type { Task } from '@/types';
import { TaskViewModal } from './TaskViewModal';
import { TaskEditModal } from './TaskEditModal';

const HOUR_HEIGHT = 60; // pixels per hour

export function DailySchedule24h() {
  const tasks = useTaskStore(s => s.tasks);
  const timer = useTaskStore(s => s.timer);
  const startTimer = useTaskStore(s => s.startTimer);
  const pauseTimer = useTaskStore(s => s.pauseTimer);
  const resumeTimer = useTaskStore(s => s.resumeTimer);
  const completeTask = useTaskStore(s => s.completeTask);
  
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

  // Lọc tasks có startTime và startDate = hôm nay
  const todayTasks = useMemo(() => {
    return tasks.filter(t => t.startTime && t.startDate === todayStr);
  }, [tasks, todayStr]);

  // Parse startTime to get position and height
  const getTaskPosition = (task: Task) => {
    if (!task.startTime) return { top: 0, height: HOUR_HEIGHT };
    
    const [hours, minutes] = task.startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const top = (startMinutes / 60) * HOUR_HEIGHT;
    
    // Chiều cao: nếu đang chạy timer thì dùng elapsed, không thì dùng duration hoặc mặc định 30 phút
    let heightMinutes = 30; // mặc định 30 phút
    if (timer.taskId === task.id && timer.isRunning) {
      heightMinutes = Math.max(30, Math.ceil(timer.elapsed / 60));
    } else if (task.duration && task.duration > 0) {
      heightMinutes = Math.max(30, Math.ceil(task.duration / 60));
    }
    
    const height = (heightMinutes / 60) * HOUR_HEIGHT;
    
    return { top, height };
  };

  const isTimerActive = (taskId: string) => {
    return timer.taskId === taskId && (timer.isRunning || timer.isPaused);
  };

  return (
    <div className="flex-1 overflow-y-auto pb-24">
      <div className="relative" style={{ height: `${HOUR_HEIGHT * 24}px` }}>
        {/* Hour grid */}
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="absolute left-0 right-0 border-t border-[var(--border-subtle)]"
            style={{ top: `${h * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}>
            <div className="flex items-start gap-2 px-2 pt-1">
              <span className="text-[10px] text-[var(--text-muted)] font-mono w-12 flex-shrink-0">
                {String(h).padStart(2, '0')}:00
              </span>
              <div className="flex-1 relative">
                {/* Tasks at this hour */}
                {todayTasks
                  .filter(t => {
                    if (!t.startTime) return false;
                    const [taskHour] = t.startTime.split(':').map(Number);
                    return taskHour === h;
                  })
                  .map(task => {
                    const { top, height } = getTaskPosition(task);
                    const isActive = isTimerActive(task.id);
                    const isDone = task.status === 'done';
                    
                    return (
                      <div key={task.id}
                        className={`absolute left-0 right-0 rounded-lg border transition-all overflow-hidden ${
                          isActive ? 'border-[var(--accent-primary)] shadow-lg bg-[rgba(0,229,204,0.08)]' :
                          isDone ? 'border-[var(--success)] bg-[rgba(52,211,153,0.05)] opacity-60' :
                          'border-[var(--border-subtle)] bg-[var(--bg-elevated)]'
                        }`}
                        style={{
                          top: `${top - h * HOUR_HEIGHT}px`,
                          height: `${height}px`,
                          minHeight: '40px'
                        }}
                        onClick={() => setViewTask(task)}>
                        <div className="p-2 h-full flex flex-col">
                          <div className="flex items-start gap-1.5 flex-1 min-h-0">
                            <div className="flex-1 min-w-0">
                              <p className={`text-xs font-medium truncate ${isDone ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>
                                {task.title}
                              </p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className="text-[9px] text-[var(--text-muted)] font-mono">{task.startTime}</span>
                                {task.duration && task.duration > 0 && (
                                  <span className="text-[9px] text-[var(--text-muted)]">
                                    • {Math.floor(task.duration / 60)}:{String(task.duration % 60).padStart(2, '0')}
                                  </span>
                                )}
                              </div>
                            </div>
                            {!isDone && (
                              <div className="flex gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                {isActive && timer.isPaused ? (
                                  <button onClick={() => resumeTimer()}
                                    className="size-6 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent-primary)]">
                                    <Play size={10} fill="currentColor" />
                                  </button>
                                ) : isActive && timer.isRunning ? (
                                  <button onClick={() => pauseTimer()}
                                    className="size-6 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent-primary)]">
                                    <Pause size={10} />
                                  </button>
                                ) : (
                                  <button onClick={() => startTimer(task.id)}
                                    className="size-6 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
                                    <Play size={10} />
                                  </button>
                                )}
                                <button onClick={() => completeTask(task.id)}
                                  className="size-6 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
                                  <Check size={10} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          </div>
        ))}

        {/* Current time indicator */}
        {(() => {
          const currentMinutes = now.getHours() * 60 + now.getMinutes();
          const currentTop = (currentMinutes / 60) * HOUR_HEIGHT;
          return (
            <div className="absolute left-0 right-0 h-0.5 bg-[var(--accent-primary)] z-10 flex items-center"
              style={{ top: `${currentTop}px` }}>
              <div className="size-2 rounded-full bg-[var(--accent-primary)] -ml-1" />
              <div className="flex-1 h-full" style={{ background: 'linear-gradient(90deg, var(--accent-primary), transparent)' }} />
            </div>
          );
        })()}
      </div>

      {/* Empty state */}
      {todayTasks.length === 0 && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8">
          <Clock size={48} className="text-[var(--text-muted)] mb-3 opacity-30" />
          <p className="text-sm text-[var(--text-muted)]">Chưa có việc nào được lên lịch hôm nay</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Thêm việc từ thư viện MẪU với thời điểm bắt đầu</p>
        </div>
      )}

      {viewTask && <TaskViewModal task={viewTask} onClose={() => setViewTask(null)} onEdit={() => { setEditTask(viewTask); setViewTask(null); }} />}
      {editTask && <TaskEditModal task={editTask} onClose={() => setEditTask(null)} />}
    </div>
  );
}
