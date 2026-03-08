import { useState, useMemo, useRef, useEffect } from 'react';
import { useTaskStore, useAuthStore } from '@/stores';
import { TaskViewModal } from '@/components/features/TaskViewModal';
import { TaskEditModal } from '@/components/features/TaskEditModal';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { QUADRANT_LABELS, CATEGORY_LABELS } from '@/types';
import type { Task, EisenhowerQuadrant, TaskStatus, TaskCategory } from '@/types';
import { isTaskOverdue } from '@/lib/autoQuadrant';
import { toast } from '@/lib/toast';
import { Play, Pause, Check, Trash2, RotateCcw, ChevronDown, Search, X, AlertCircle, ArrowUpDown } from 'lucide-react';

// Tab types
type ActiveTab = EisenhowerQuadrant | 'overdue';
type DoFirstTab = 'pending' | 'in_progress' | 'paused' | 'done' | 'overdue';
type ScheduleTab = 'tomorrow' | '3days' | 'week' | 'month' | 'year' | 'overdue';
type DelegateTab = string; // 'all' | 'overdue' | userId
type EliminateTab = 'all' | 'overdue';

export function TaskList() {
  const tasks = useTaskStore(s => s.tasks);
  const timer = useTaskStore(s => s.timer);
  const startTimer = useTaskStore(s => s.startTimer);
  const pauseTimer = useTaskStore(s => s.pauseTimer);
  const resumeTimer = useTaskStore(s => s.resumeTimer);
  const completeTask = useTaskStore(s => s.completeTask);
  const removeTask = useTaskStore(s => s.removeTask);
  const restoreTask = useTaskStore(s => s.restoreTask);
  const reorderTasks = useTaskStore(s => s.reorderTasks);
  const user = useAuthStore(s => s.user);

  const [activeTab, setActiveTab] = useState<ActiveTab>('do_first');
  const [doFirstTab, setDoFirstTab] = useState<DoFirstTab>('pending');
  const [scheduleTab, setScheduleTab] = useState<ScheduleTab>('tomorrow');
  const [delegateTab, setDelegateTab] = useState<DelegateTab>('all');
  const [eliminateTab, setEliminateTab] = useState<EliminateTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [sortBy, setSortBy] = useState<'deadline' | 'title' | 'created' | 'none'>('none');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortMenuOpen, setSortMenuOpen] = useState(false);
  const [viewTask, setViewTask] = useState<Task | null>(null);
  const [editTask, setEditTask] = useState<Task | null>(null);
  const [quadrantChangeTask, setQuadrantChangeTask] = useState<Task | null>(null);
  const [lastClickTime, setLastClickTime] = useState<{ [key: string]: number }>({});
  const DOUBLE_CLICK_DELAY = 300;

  const now = Date.now();

  // ✅ Get tasks by active tab
  const tabTasks = useMemo(() => {
    if (activeTab === 'overdue') {
      // Overdue: Runtime filter - tất cả việc quá hạn (trừ done và eliminate)
      return tasks.filter(t => isTaskOverdue(t));
    }
    // Tab LÀM NGAY: gồm cả việc quá hạn (subtab Quá hạn sẽ lọc)
    if (activeTab === 'do_first') {
      return tasks.filter(t => t.quadrant === 'do_first');
    }
    return tasks.filter(t => t.quadrant === activeTab);
  }, [tasks, activeTab]);

  // Get users who have been delegated tasks (for Delegate tabs)
  const delegatedUsers = useMemo(() => {
    const userMap = new Map<string, { id: string; name: string; count: number }>();
    tasks.filter(t => t.quadrant === 'delegate' && t.sharedWith && t.sharedWith.length > 0).forEach(t => {
      t.sharedWith?.forEach(userId => {
        const existing = userMap.get(userId);
        if (existing) existing.count++;
        else userMap.set(userId, { id: userId, name: `User ${userId.slice(0, 6)}`, count: 1 });
      });
    });
    return Array.from(userMap.values());
  }, [tasks]);

  // ✅ Count overdue tasks - dùng isTaskOverdue() helper
  const overdueCount = useMemo(() => {
    return tasks.filter(isTaskOverdue).length;
  }, [tasks]);

  // Filter tasks based on active tab and sub-tab
  const filteredTasks = useMemo(() => {
    let result = tabTasks;

    // Filter by tab-specific sub-tab
    if (activeTab === 'do_first') {
      if (doFirstTab === 'overdue') {
        result = result.filter(t => isTaskOverdue(t));
      } else {
        result = result.filter(t => t.status === doFirstTab && (doFirstTab !== 'pending' || !isTaskOverdue(t)));
      }
    } else if (activeTab === 'schedule') {
      const tomorrow = new Date(now + 86400000);
      tomorrow.setHours(23, 59, 59, 999);
      const threeDays = new Date(now + 259200000);
      threeDays.setHours(23, 59, 59, 999);
      const week = new Date(now + 604800000);
      week.setHours(23, 59, 59, 999);
      const month = new Date(now + 2592000000);
      month.setHours(23, 59, 59, 999);
      const year = new Date();
      year.setFullYear(year.getFullYear() + 1);
      year.setMonth(0, 1);
      year.setHours(0, 0, 0, 0);

      switch (scheduleTab) {
        case 'overdue':
          result = result.filter(t => isTaskOverdue(t));
          break;
        case 'tomorrow':
          result = result.filter(t => t.deadline && t.deadline <= tomorrow.getTime());
          break;
        case '3days':
          result = result.filter(t => t.deadline && t.deadline > tomorrow.getTime() && t.deadline <= threeDays.getTime());
          break;
        case 'week':
          result = result.filter(t => t.deadline && t.deadline > threeDays.getTime() && t.deadline <= week.getTime());
          break;
        case 'month':
          result = result.filter(t => t.deadline && t.deadline > week.getTime() && t.deadline <= month.getTime());
          break;
        case 'year':
          result = result.filter(t => t.deadline && t.deadline > month.getTime() && t.deadline <= year.getTime());
          break;
      }
    } else if (activeTab === 'delegate') {
      if (delegateTab === 'overdue') {
        result = result.filter(t => isTaskOverdue(t));
      } else if (delegateTab !== 'all') {
        result = result.filter(t => t.sharedWith?.includes(delegateTab));
      }
    } else if (activeTab === 'eliminate') {
      if (eliminateTab === 'overdue') {
        result = result.filter(t => isTaskOverdue(t));
      }
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.title.toLowerCase().includes(q) || t.notes?.toLowerCase().includes(q));
    }

    // Sort
    if (sortBy !== 'none') {
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'deadline') {
          const da = a.deadline ?? Infinity;
          const db = b.deadline ?? Infinity;
          cmp = da - db;
        } else if (sortBy === 'title') {
          cmp = (a.title || '').localeCompare(b.title || '');
        } else if (sortBy === 'created') {
          cmp = (a.createdAt ?? 0) - (b.createdAt ?? 0);
        }
        return sortOrder === 'asc' ? cmp : -cmp;
      });
    }

    return result;
  }, [tabTasks, activeTab, doFirstTab, scheduleTab, delegateTab, eliminateTab, searchQuery, sortBy, sortOrder]);

  const { draggedIndex, handleDragStart, handleDragOver, handleDrop } = useDragAndDrop(filteredTasks, reorderTasks);

  const handleTaskAction = (task: Task, action: 'view' | 'edit' | 'start' | 'pause' | 'resume' | 'complete' | 'delete' | 'restore') => {
    switch (action) {
      case 'view': setViewTask(task); break;
      case 'edit': setEditTask(task); break;
      case 'start': startTimer(task.id); break;
      case 'pause': pauseTimer(); break;
      case 'resume': resumeTimer(); break;
      case 'complete': completeTask(task.id); break;
      case 'delete': removeTask(task.id); break;
      case 'restore':
        // ✅ Restore: auto-recalculate quadrant trong store
        restoreTask(task.id);
        break;
    }
  };

  const isTimerActive = (taskId: string) => {
    return timer.taskId === taskId && (timer.isRunning || timer.isPaused);
  };

  const canStartTimer = (task: Task) => {
    // ✅ Cho phép bấm giờ: LÀM NGAY HOẶC việc OVERDUE
    return task.quadrant === 'do_first' || isTaskOverdue(task);
  };

  const handleTaskClick = (task: Task) => {
    const now = Date.now();
    const lastClick = lastClickTime[task.id] || 0;
    if (now - lastClick < DOUBLE_CLICK_DELAY) {
      // Double click detected
      setQuadrantChangeTask(task);
      setLastClickTime({ ...lastClickTime, [task.id]: 0 });
    } else {
      // Single click - view task
      setLastClickTime({ ...lastClickTime, [task.id]: now });
      setTimeout(() => {
        if (Date.now() - now >= DOUBLE_CLICK_DELAY) {
          setViewTask(task);
        }
      }, DOUBLE_CLICK_DELAY);
    }
  };

  const formatTimeRemaining = (deadline: number): { text: string; color: string; urgent: boolean } => {
    const remaining = deadline - now;
    if (remaining < 0) {
      const abs = Math.abs(remaining);
      const mins = Math.max(1, Math.floor(abs / 60000));
      const hrs = Math.floor(abs / 3600000);
      const days = Math.floor(abs / 86400000);
      if (days > 0) return { text: `Quá hạn ${days} ngày`, color: 'var(--error)', urgent: true };
      if (hrs > 0) return { text: `Quá hạn ${hrs} giờ`, color: 'var(--error)', urgent: true };
      return { text: `Quá hạn ${mins} phút`, color: 'var(--error)', urgent: true };
    }
    const hours = Math.floor(remaining / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const days = Math.floor(hours / 24);
    if (hours < 1) return { text: `Còn ${minutes} phút`, color: '#F87171', urgent: true };
    if (hours < 24) return { text: `Còn ${hours} giờ ${minutes % 60} phút`, color: '#FBBF24', urgent: true };
    if (days < 7) return { text: `Còn ${days} ngày`, color: '#60A5FA', urgent: false };
    return { text: `Còn ${days} ngày`, color: 'var(--text-muted)', urgent: false };
  };

  return (
    <>
      {/* Main Tabs - Overdue first */}
      <div className="flex gap-0.5 mb-2 p-0.5 bg-[var(--bg-elevated)] rounded-xl overflow-x-auto">
        {/* Overdue Tab - FIRST */}
        <button onClick={() => setActiveTab('overdue')}
          className={`flex-shrink-0 flex-1 py-2 rounded-lg text-[10px] font-medium min-h-[36px] flex flex-col items-center justify-center gap-0.5 ${activeTab === 'overdue' ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}
          style={activeTab === 'overdue' ? { backgroundColor: 'rgba(248,113,113,0.15)', color: '#F87171' } : {}}>
          <span>🔥</span>
          <span className="leading-none">Quá hạn</span>
          {overdueCount > 0 && <span className="text-[8px] font-mono bg-[var(--bg-base)] px-1 rounded">{overdueCount}</span>}
        </button>
        {/* Other quadrants */}
        {(Object.keys(QUADRANT_LABELS) as EisenhowerQuadrant[])
          .filter(q => q !== 'overdue') // Loại bỏ overdue vì đã có button riêng ở trên
          .map(q => {
          const cfg = QUADRANT_LABELS[q];
          const count = tasks.filter(t => t.quadrant === q && t.status !== 'done').length;
          return (
            <button key={q} onClick={() => setActiveTab(q)}
              className={`flex-shrink-0 flex-1 py-2 rounded-lg text-[10px] font-medium min-h-[36px] flex flex-col items-center justify-center gap-0.5 ${activeTab === q ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}
              style={activeTab === q ? { backgroundColor: `${cfg.color}15`, color: cfg.color } : {}}>
              <span>{cfg.icon}</span>
              <span className="leading-none">{cfg.label}</span>
              {count > 0 && <span className="text-[8px] font-mono bg-[var(--bg-base)] px-1 rounded">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Sub-tabs + Search */}
      <div className="relative mb-2">
        <div className="flex items-center gap-1">
          {/* Sub-tabs for Do First */}
          {activeTab === 'do_first' && (
            <div className="flex-1 flex gap-1 overflow-x-auto pb-0.5">
              {([
                { key: 'pending' as DoFirstTab, label: 'Chưa làm', icon: '⏳' },
                { key: 'in_progress' as DoFirstTab, label: 'Đang làm', icon: '▶️' },
                { key: 'paused' as DoFirstTab, label: 'Tạm dừng', icon: '⏸️' },
                { key: 'done' as DoFirstTab, label: 'Xong', icon: '✅' },
                { key: 'overdue' as DoFirstTab, label: 'Quá hạn', icon: '🔥' },
              ]).map(tab => {
                const count = tab.key === 'overdue'
                  ? tabTasks.filter(t => isTaskOverdue(t)).length
                  : tabTasks.filter(t => t.status === tab.key && (tab.key !== 'pending' || !isTaskOverdue(t))).length;
                return (
                  <button key={tab.key} onClick={() => setDoFirstTab(tab.key)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-medium min-h-[32px] flex items-center gap-1 ${doFirstTab === tab.key ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                    {tab.icon} {tab.label} {count > 0 && <span className="font-mono">({count})</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Sub-tabs for Schedule */}
          {activeTab === 'schedule' && (
            <div className="flex-1 flex gap-1 overflow-x-auto pb-0.5">
              {([
                { key: 'tomorrow' as ScheduleTab, label: 'Ngày mai', icon: '📅' },
                { key: '3days' as ScheduleTab, label: '3 ngày tới', icon: '📆' },
                { key: 'week' as ScheduleTab, label: 'Tuần tới', icon: '🗓️' },
                { key: 'month' as ScheduleTab, label: 'Tháng tới', icon: '📊' },
                { key: 'year' as ScheduleTab, label: 'Trong năm', icon: '🗓️' },
                { key: 'overdue' as ScheduleTab, label: 'Quá hạn', icon: '🔥' },
              ]).map(tab => {
                const tomorrow = new Date(now + 86400000).setHours(23, 59, 59, 999);
                const threeDays = new Date(now + 259200000).setHours(23, 59, 59, 999);
                const week = new Date(now + 604800000).setHours(23, 59, 59, 999);
                const month = new Date(now + 2592000000).setHours(23, 59, 59, 999);
                const year = new Date();
                year.setFullYear(year.getFullYear() + 1);
                year.setMonth(0, 1);
                year.setHours(0, 0, 0, 0);
                const yearTimestamp = year.getTime();

                let count = 0;
                switch (tab.key) {
                  case 'overdue': count = tabTasks.filter(t => isTaskOverdue(t)).length; break;
                  case 'tomorrow': count = tabTasks.filter(t => t.deadline && t.deadline <= tomorrow).length; break;
                  case '3days': count = tabTasks.filter(t => t.deadline && t.deadline > tomorrow && t.deadline <= threeDays).length; break;
                  case 'week': count = tabTasks.filter(t => t.deadline && t.deadline > threeDays && t.deadline <= week).length; break;
                  case 'month': count = tabTasks.filter(t => t.deadline && t.deadline > week && t.deadline <= month).length; break;
                  case 'year': count = tabTasks.filter(t => t.deadline && t.deadline > month && t.deadline <= yearTimestamp).length; break;
                }

                return (
                  <button key={tab.key} onClick={() => setScheduleTab(tab.key)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-medium min-h-[32px] flex items-center gap-1 ${scheduleTab === tab.key ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                    {tab.icon} {tab.label} {count > 0 && <span className="font-mono">({count})</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* Sub-tabs for Delegate */}
          {activeTab === 'delegate' && (
            <div className="flex-1 flex gap-1 overflow-x-auto pb-0.5">
              <button onClick={() => setDelegateTab('all')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-medium min-h-[32px] flex items-center gap-1 ${delegateTab === 'all' ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                👥 Tất cả ({tabTasks.length})
              </button>
              <button onClick={() => setDelegateTab('overdue')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-medium min-h-[32px] flex items-center gap-1 ${delegateTab === 'overdue' ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                🔥 Quá hạn ({tabTasks.filter(t => isTaskOverdue(t)).length})
              </button>
              {delegatedUsers.map(u => (
                <button key={u.id} onClick={() => setDelegateTab(u.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-medium min-h-[32px] flex items-center gap-1 ${delegateTab === u.id ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                  👤 {u.name} ({u.count})
                </button>
              ))}
              {delegatedUsers.length === 0 && (
                <span className="text-[10px] text-[var(--text-muted)] px-2 py-1">Chưa ủy thác cho ai</span>
              )}
            </div>
          )}

          {activeTab === 'eliminate' && (
            <div className="flex-1 flex gap-1 overflow-x-auto pb-0.5">
              <button onClick={() => setEliminateTab('all')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-medium min-h-[32px] flex items-center gap-1 ${eliminateTab === 'all' ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                Tất cả ({tabTasks.length})
              </button>
              <button onClick={() => setEliminateTab('overdue')}
                className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-[10px] font-medium min-h-[32px] flex items-center gap-1 ${eliminateTab === 'overdue' ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                🔥 Quá hạn ({tabTasks.filter(t => isTaskOverdue(t)).length})
              </button>
            </div>
          )}

          {/* Sort */}
          <div className="relative flex-shrink-0">
            <button onClick={() => setSortMenuOpen(!sortMenuOpen)}
              className={`size-8 rounded-lg flex items-center justify-center ${sortBy !== 'none' ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
              <ArrowUpDown size={14} />
            </button>
            {sortMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setSortMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 py-1 min-w-[140px] bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-xl shadow-lg z-20">
                  <button onClick={() => { setSortBy('none'); setSortMenuOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-xs ${sortBy === 'none' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
                    Không sắp xếp
                  </button>
                  <button onClick={() => { setSortBy('deadline'); setSortMenuOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-xs ${sortBy === 'deadline' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
                    Theo hạn chót
                  </button>
                  <button onClick={() => { setSortBy('title'); setSortMenuOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-xs ${sortBy === 'title' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
                    Theo tên
                  </button>
                  <button onClick={() => { setSortBy('created'); setSortMenuOpen(false); }}
                    className={`w-full px-3 py-2 text-left text-xs ${sortBy === 'created' ? 'text-[var(--accent-primary)]' : 'text-[var(--text-primary)]'}`}>
                    Theo ngày tạo
                  </button>
                  <hr className="my-1 border-[var(--border-subtle)]" />
                  <button onClick={() => { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); }}
                    className="w-full px-3 py-2 text-left text-xs text-[var(--text-primary)]">
                    {sortOrder === 'asc' ? '↑ Tăng dần' : '↓ Giảm dần'}
                  </button>
                </div>
              </>
            )}
          </div>
          {/* Search Icon */}
          <button onClick={() => setSearchExpanded(!searchExpanded)}
            className={`size-8 rounded-lg flex items-center justify-center flex-shrink-0 ${searchExpanded ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
            <Search size={14} />
          </button>
        </div>

        {/* Search Input - expand when clicked */}
        {searchExpanded && (
          <div className="mt-1 relative animate-slide-up">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              autoFocus
              placeholder={`Tìm trong ${activeTab === 'overdue' ? 'Quá hạn' : QUADRANT_LABELS[activeTab as EisenhowerQuadrant]?.label || 'tất cả'}...`}
              className="w-full bg-[var(--bg-elevated)] rounded-xl pl-9 pr-9 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--accent-primary)] min-h-[36px]"
            />
            <button onClick={() => { setSearchQuery(''); setSearchExpanded(false); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 size-6 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-surface)]">
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto pb-24 space-y-1.5">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <span className="text-2xl mb-2">{activeTab === 'overdue' ? '🔥' : QUADRANT_LABELS[activeTab as EisenhowerQuadrant]?.icon || ''}</span>
            <p className="text-xs text-[var(--text-muted)]">
              {searchQuery ? 'Không tìm thấy việc nào' : activeTab === 'overdue' ? 'Không có việc quá hạn' : `Chưa có việc trong ${QUADRANT_LABELS[activeTab as EisenhowerQuadrant]?.label || ''}`}
            </p>
          </div>
        ) : (
          filteredTasks.map((task, index) => {
            const isActive = isTimerActive(task.id);
            const canTimer = canStartTimer(task);
            const isDone = task.status === 'done';
            const taskIsOverdue = isTaskOverdue(task);
            const cfg = QUADRANT_LABELS[task.quadrant];

            return (
              <div key={task.id}
                draggable={task.status === 'pending'}
                onDragStart={() => handleDragStart(index)}
                onDragOver={e => handleDragOver(e, index)}
                onDrop={handleDrop}
                className={`bg-[var(--bg-elevated)] rounded-xl border p-3 transition-all ${draggedIndex === index ? 'opacity-50 scale-95' : ''} ${isActive ? 'border-[var(--accent-primary)] shadow-lg' : 'border-[var(--border-subtle)]'}`}>
                <div className="flex items-start gap-2">
                  {/* Status checkbox */}
                  <button onClick={() => handleTaskAction(task, isDone ? 'restore' : 'complete')}
                    className={`size-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${isDone ? 'bg-[var(--success)] border-[var(--success)]' : taskIsOverdue ? 'border-[var(--error)]' : 'border-[var(--text-muted)]'}`}>
                    {isDone && <Check size={12} className="text-white" />}
                  </button>

                  {/* Task Info */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleTaskClick(task)}>
                    <p className={`text-sm font-medium ${isDone ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'} break-words`}>
                      {task.title}
                    </p>
                    {/* Time Remaining - chỉ hiện khi chưa quá hạn */}
                    {task.deadline && !isDone && !taskIsOverdue && (activeTab === 'do_first' || activeTab === 'overdue') && (() => {
                      const timeInfo = formatTimeRemaining(task.deadline);
                      return (
                        <div className={`flex items-center gap-1 mt-1 px-2 py-1 rounded-lg ${timeInfo.urgent ? 'bg-[rgba(248,113,113,0.15)]' : 'bg-[var(--bg-surface)]'}`}>
                          <span className="text-lg" style={{ color: timeInfo.color }}>⏰</span>
                          <span className="text-sm font-bold" style={{ color: timeInfo.color }}>{timeInfo.text}</span>
                        </div>
                      );
                    })()}
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {task.deadline && (
                        <>
                          <span className={`text-[9px] ${taskIsOverdue ? 'text-[var(--error)]' : 'text-[var(--text-muted)]'}`}>
                            ⏰ {new Date(task.deadline).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {taskIsOverdue && (
                            <span className="text-[9px] text-[var(--error)]">
                              {formatTimeRemaining(task.deadline).text}
                            </span>
                          )}
                        </>
                      )}
                      {task.duration && task.duration > 0 && (
                        <span className="text-[9px] text-[var(--text-muted)]">
                          ⏱️ {Math.floor(task.duration / 60)}:{String(task.duration % 60).padStart(2, '0')}
                        </span>
                      )}
                      {task.finance && (
                        <span className={`text-[9px] font-mono ${task.finance.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                          {task.finance.type === 'income' ? '+' : '-'}{task.finance.amount.toLocaleString('vi-VN')}đ
                        </span>
                      )}
                      {task.category && (
                        <span className="text-[9px]">{CATEGORY_LABELS[task.category].icon}</span>
                      )}
                      {task.isGroup && (
                        <span className="text-[9px] text-[var(--text-muted)]">📂 Nhóm</span>
                      )}
                      {task.sharedWith && task.sharedWith.length > 0 && (
                        <span className="text-[9px] text-[var(--text-muted)]">👥 {task.sharedWith.length}</span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canTimer && !isDone && (
                      <>
                        {isActive && timer.isPaused ? (
                          <button onClick={() => handleTaskAction(task, 'resume')}
                            className="size-7 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent-primary)]">
                            <Play size={12} />
                          </button>
                        ) : isActive && timer.isRunning ? (
                          <button onClick={() => handleTaskAction(task, 'pause')}
                            className="size-7 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent-primary)]">
                            <Pause size={12} />
                          </button>
                        ) : (
                          <button onClick={() => handleTaskAction(task, 'start')}
                            className="size-7 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
                            <Play size={12} />
                          </button>
                        )}
                      </>
                    )}
                    {/* Overdue & Eliminate: Restore + Delete buttons */}
                    {(activeTab === 'eliminate' || activeTab === 'overdue') ? (
                      <>
                        <button onClick={() => handleTaskAction(task, 'restore')}
                          className="size-7 rounded-lg bg-[rgba(52,211,153,0.1)] flex items-center justify-center text-[var(--success)]">
                          <RotateCcw size={12} />
                        </button>
                        <button onClick={() => handleTaskAction(task, 'delete')}
                          className="size-7 rounded-lg bg-[rgba(248,113,113,0.1)] flex items-center justify-center text-[var(--error)]">
                          <Trash2 size={12} />
                        </button>
                      </>
                    ) : (
                      <button onClick={() => handleTaskAction(task, 'delete')}
                        className="size-7 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {viewTask && <TaskViewModal task={viewTask} onClose={() => setViewTask(null)} onEdit={() => { setEditTask(viewTask); setViewTask(null); }} />}
      {editTask && <TaskEditModal task={editTask} onClose={() => setEditTask(null)} />}
    </>
  );
}
