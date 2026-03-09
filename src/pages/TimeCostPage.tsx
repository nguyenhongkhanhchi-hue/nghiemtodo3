import { useMemo, useState } from 'react';
import { useTaskStore, useSettingsStore, useTimeLogStore } from '@/stores';
import { getNowInTimezone } from '@/lib/notifications';
import { 
  Clock, DollarSign, Battery, Brain, TrendingUp, TrendingDown, 
  AlertTriangle, CheckCircle, XCircle, Plus, Minus, Calendar,
  ChevronLeft, ChevronRight, Target, Zap, Wallet, Heart, Moon, Coffee
} from 'lucide-react';
import type { TimeLogType } from '@/types';

// Types
interface DailyStats {
  date: string;
  trackedTime: number;      // seconds
  untrackedTime: number;    // seconds  
  totalCost: number;        // VND
  taskCount: number;
  completedTasks: number;
  additionalCosts: {
    money: number;
    energy: number;
    mental: number;
  };
  declarationRate: number;   // 0-100%
  isComplete: boolean;
}

interface TimeEntry {
  id: string;
  taskId: string;
  taskTitle: string;
  startTime: number;
  endTime: number;
  duration: number;
}

// Helper functions
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function formatMoney(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ';
}

function getDateString(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Calculate cost per second
function getCostPerSecond(dailyCost: number): number {
  return dailyCost / (24 * 3600); // 24 hours in seconds
}

// Get day of week label
function getDayLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  return days[date.getDay()];
}

// Main component
export default function TimeCostPage() {
  const tasks = useTaskStore(s => s.tasks);
  const { 
    dailyTimeCost, 
    sleepHours, 
    workingHours, 
    additionalCosts,
    setDailyTimeCost,
    setSleepHours,
    setWorkingHours,
    addAdditionalCost,
    removeAdditionalCost,
    timezone 
  } = useSettingsStore();
  const { addTimeLog, getTimeLogsForDate } = useTimeLogStore();
  
  const [selectedDate, setSelectedDate] = useState(getDateString(getNowInTimezone(timezone)));
  const [showAddCost, setShowAddCost] = useState(false);
  const [newCost, setNewCost] = useState({ type: 'money' as 'money' | 'energy' | 'mental', amount: 0, description: '' });
  const [showSettings, setShowSettings] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualEntry, setManualEntry] = useState<{ taskId: string; taskTitle: string; startTime: number; endTime: number; notes: string }>({
    taskId: '',
    taskTitle: '',
    startTime: 0,
    endTime: 0,
    notes: '',
  });
  const [entryType, setEntryType] = useState<TimeLogType>('activity');
  
  const costPerSecond = getCostPerSecond(dailyTimeCost);
  const costPerMinute = costPerSecond * 60;
  const costPerHour = costPerSecond * 3600;

  // Get all time entries from completed tasks for selected date
  const timeEntries = useMemo((): TimeEntry[] => {
    const dateStart = new Date(selectedDate);
    dateStart.setHours(0, 0, 0, 0);
    const dateEnd = new Date(dateStart);
    dateEnd.setDate(dateEnd.getDate() + 1);
    
    const taskEntries = tasks
      .filter(t => t.status === 'done' && t.completedAt && t.duration && t.duration > 0)
      .filter(t => t.completedAt! >= dateStart.getTime() && t.completedAt! < dateEnd.getTime())
      .map(t => ({
        id: t.id,
        taskId: t.id,
        taskTitle: t.title,
        startTime: t.completedAt! - (t.duration || 0) * 1000,
        endTime: t.completedAt!,
        duration: t.duration || 0,
      }));

    const manualEntries = getTimeLogsForDate(selectedDate).map(log => ({
      id: log.id,
      taskId: log.taskId || '',
      taskTitle: log.title,
      startTime: log.startTime,
      endTime: log.endTime,
      duration: log.duration,
    }));
    
    return [...taskEntries, ...manualEntries]
      .sort((a, b) => a.startTime - b.startTime);
  }, [tasks, selectedDate, getTimeLogsForDate]);

  // Calculate daily stats
  const dailyStats = useMemo((): DailyStats => {
    // Get manual time entries for the selected date
    const manualLogs = getTimeLogsForDate(selectedDate);
    
    // Separate tracked time from manual entries (activity, break, other)
    const manualTrackedTime = manualLogs
      .filter(log => log.type !== 'sleep')
      .reduce((sum, log) => sum + log.duration, 0);
    
    // Get sleep time from manual entries
    const manualSleepTime = manualLogs
      .filter(log => log.type === 'sleep')
      .reduce((sum, log) => sum + log.duration, 0);
    
    // Use manual sleep time if available, otherwise use default sleep hours
    const effectiveSleepSeconds = manualSleepTime > 0 
      ? manualSleepTime 
      : sleepHours * 3600;
    
    const trackedTime = timeEntries.reduce((sum, e) => sum + e.duration, 0) + manualTrackedTime;
    
    // Total time in a day = 24 hours = 86400 seconds
    const totalTimeInDay = 24 * 3600;
    
    // Untracked time = 24h - tracked time - sleep time
    let untrackedTime = totalTimeInDay - trackedTime - effectiveSleepSeconds;
    if (untrackedTime < 0) untrackedTime = 0;
    
    const totalCost = trackedTime * costPerSecond;
    
    // Count tasks
    const taskCount = tasks.filter(t => {
      const created = new Date(t.createdAt);
      const dateStr = getDateString(created);
      return dateStr === selectedDate;
    }).length;
    
    const completedTasks = timeEntries.length + manualLogs.filter(l => l.type !== 'sleep').length;
    
    // Additional costs for this date
    const dayAdditionalCosts = additionalCosts.filter(c => c.date === selectedDate);
    const moneyCost = dayAdditionalCosts.filter(c => c.type === 'money').reduce((s, c) => s + c.amount, 0);
    const energyCost = dayAdditionalCosts.filter(c => c.type === 'energy').reduce((s, c) => s + c.amount, 0);
    const mentalCost = dayAdditionalCosts.filter(c => c.type === 'mental').reduce((s, c) => s + c.amount, 0);
    
    // Declaration rate: how much of 24h is accounted for (tracked + sleep)
    const accountedTime = trackedTime + effectiveSleepSeconds;
    const declarationRate = Math.round((accountedTime / totalTimeInDay) * 100);
    
    // Is complete if tracked >= 80% of active time (24h - sleep)
    const activeTime = totalTimeInDay - effectiveSleepSeconds;
    const isComplete = activeTime > 0 && trackedTime >= activeTime * 0.8;
    
    return {
      date: selectedDate,
      trackedTime,
      untrackedTime,
      totalCost,
      taskCount,
      completedTasks,
      additionalCosts: { money: moneyCost, energy: energyCost, mental: mentalCost },
      declarationRate,
      isComplete,
    };
  }, [timeEntries, tasks, selectedDate, sleepHours, costPerSecond, additionalCosts, getTimeLogsForDate]);

  // Get historical stats for the week
  const weekStats = useMemo(() => {
    const stats: DailyStats[] = [];
    const now = getNowInTimezone(timezone);
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = getDateString(date);
      
      // Calculate stats for this date
      const dateStart = new Date(dateStr);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(dateStart);
      dateEnd.setDate(dateEnd.getDate() + 1);
      
      const dayTasks = tasks.filter(t => t.status === 'done' && t.completedAt && t.duration);
      const dayTimeEntries = dayTasks
        .filter(t => t.completedAt! >= dateStart.getTime() && t.completedAt! < dateEnd.getTime())
        .map(t => ({ duration: t.duration || 0 }));
      
      // Get manual time logs for this date
      const manualLogs = getTimeLogsForDate(dateStr);
      const manualTrackedTime = manualLogs
        .filter(log => log.type !== 'sleep')
        .reduce((sum, log) => sum + log.duration, 0);
      const manualSleepTime = manualLogs
        .filter(log => log.type === 'sleep')
        .reduce((sum, log) => sum + log.duration, 0);
      
      const effectiveSleepSeconds = manualSleepTime > 0 ? manualSleepTime : sleepHours * 3600;
      
      const trackedTime = [...dayTimeEntries, ...manualLogs.filter(l => l.type !== 'sleep').map(l => ({ duration: l.duration }))].reduce((s, e) => s + e.duration, 0);
      
      const totalTimeInDay = 24 * 3600;
      let untrackedTime = totalTimeInDay - trackedTime - effectiveSleepSeconds;
      if (untrackedTime < 0) untrackedTime = 0;
      
      const totalCost = trackedTime * costPerSecond;
      const dayAdditionalCosts = additionalCosts.filter(c => c.date === dateStr);
      const moneyCost = dayAdditionalCosts.filter(c => c.type === 'money').reduce((s, c) => s + c.amount, 0);
      const energyCost = dayAdditionalCosts.filter(c => c.type === 'energy').reduce((s, c) => s + c.amount, 0);
      const mentalCost = dayAdditionalCosts.filter(c => c.type === 'mental').reduce((s, c) => s + c.amount, 0);
      
      const accountedTime = trackedTime + effectiveSleepSeconds;
      const declarationRate = Math.round((accountedTime / totalTimeInDay) * 100);
      
      stats.push({
        date: dateStr,
        trackedTime,
        untrackedTime,
        totalCost,
        taskCount: 0,
        completedTasks: dayTimeEntries.length + manualLogs.filter(l => l.type !== 'sleep').length,
        additionalCosts: { money: moneyCost, energy: energyCost, mental: mentalCost },
        declarationRate,
        isComplete: declarationRate >= 80,
      });
    }
    return stats;
  }, [tasks, sleepHours, costPerSecond, additionalCosts, timezone, getTimeLogsForDate]);

  // Navigation
  const navigateDate = (direction: 'prev' | 'next') => {
    const current = new Date(selectedDate);
    if (direction === 'prev') {
      current.setDate(current.getDate() - 1);
    } else {
      current.setDate(current.getDate() + 1);
    }
    setSelectedDate(getDateString(current));
  };

  // Add additional cost
  const handleAddCost = () => {
    if (newCost.amount <= 0) return;
    const cost = {
      id: Date.now().toString(36),
      type: newCost.type,
      amount: newCost.amount,
      description: newCost.description,
      date: selectedDate,
      createdAt: Date.now(),
    };
    addAdditionalCost(cost);
    setNewCost({ type: 'money', amount: 0, description: '' });
    setShowAddCost(false);
  };

  // Add manual time entry
  const handleAddManualEntry = () => {
    if (!manualEntry.taskTitle || manualEntry.startTime >= manualEntry.endTime) return;
    
    const duration = Math.floor((manualEntry.endTime - manualEntry.startTime) / 1000);
    
    addTimeLog({
      title: manualEntry.taskTitle,
      startTime: manualEntry.startTime,
      endTime: manualEntry.endTime,
      duration,
      date: selectedDate,
      taskId: manualEntry.taskId || undefined,
      notes: manualEntry.notes || '',
      type: entryType,
    });
    setManualEntry({
      taskId: '',
      taskTitle: '',
      startTime: 0,
      endTime: 0,
      notes: '',
    });
    setEntryType('activity');
    setShowManualEntry(false);
  };

  // Today's summary
  const todayStr = getDateString(getNowInTimezone(timezone));
  const isToday = selectedDate === todayStr;

  return (
    <div className="flex flex-col h-full px-4 pt-3 pb-24 overflow-y-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Chi Phí Thời Gian</h1>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setShowManualEntry(!showManualEntry)}
            className="p-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
          >
            <Calendar size={18} />
          </button>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-[var(--bg-elevated)] text-[var(--text-secondary)]"
          >
            <Target size={18} />
          </button>
        </div>
      </div>

      {/* Manual Entry Panel */}
      {showManualEntry && (
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 mb-4 border border-[var(--border-accent)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Nhập thời gian thủ công</h3>
          <div className="space-y-3">
            {/* Entry Type Selector */}
            <div className="flex gap-2 mb-3">
              {[
                { type: 'activity' as TimeLogType, label: 'Hoạt động', icon: Zap, color: 'text-blue-500 bg-blue-500/10' },
                { type: 'sleep' as TimeLogType, label: 'Ngủ', icon: Moon, color: 'text-purple-500 bg-purple-500/10' },
                { type: 'break' as TimeLogType, label: 'Nghỉ', icon: Coffee, color: 'text-yellow-500 bg-yellow-500/10' },
                { type: 'other' as TimeLogType, label: 'Khác', icon: Clock, color: 'text-gray-500 bg-gray-500/10' },
              ].map(({ type, label, icon: Icon, color }) => (
                <button
                  key={type}
                  onClick={() => setEntryType(type)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex flex-col items-center gap-1 transition-all ${
                    entryType === type ? color : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                  }`}
                >
                  <Icon size={16} />
                  {label}
                </button>
              ))}
            </div>
            <input
              type="text"
              placeholder={entryType === 'sleep' ? 'Ví dụ: Ngủ đêm, Ngủ trưa' : 'Tên công việc'}
              value={manualEntry.taskTitle}
              onChange={(e) => setManualEntry({ ...manualEntry, taskTitle: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--text-muted)]">Bắt đầu</label>
                <input
                  type="datetime-local"
                  value={manualEntry.startTime ? new Date(manualEntry.startTime).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setManualEntry({ ...manualEntry, startTime: new Date(e.target.value).getTime() })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)]">Kết thúc</label>
                <input
                  type="datetime-local"
                  value={manualEntry.endTime ? new Date(manualEntry.endTime).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setManualEntry({ ...manualEntry, endTime: new Date(e.target.value).getTime() })}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm"
                />
              </div>
            </div>
            <input
              type="text"
              placeholder="Ghi chú (tùy chọn)"
              value={manualEntry.notes}
              onChange={(e) => setManualEntry({ ...manualEntry, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
            />
            <button
              onClick={handleAddManualEntry}
              className="w-full py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium"
            >
              Thêm
            </button>
          </div>
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 mb-4 border border-[var(--border-accent)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Cài đặt chi phí</h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[var(--text-muted)]">Chi phí/ngày (VND)</label>
              <input
                type="number"
                value={dailyTimeCost}
                onChange={(e) => setDailyTimeCost(Number(e.target.value))}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-[var(--text-muted)]">Giờ ngủ/ngày</label>
                <input
                  type="number"
                  value={sleepHours}
                  onChange={(e) => setSleepHours(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  min={0}
                  max={24}
                />
              </div>
              <div>
                <label className="text-xs text-[var(--text-muted)]">Giờ làm việc/ngày</label>
                <input
                  type="number"
                  value={workingHours}
                  onChange={(e) => setWorkingHours(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
                  min={0}
                  max={24}
                />
              </div>
            </div>
            
            <div className="pt-2 border-t border-[var(--border-subtle)]">
              <p className="text-xs text-[var(--text-muted)]">
                <span className="text-[var(--accent-primary)]">{formatMoney(costPerHour)}/giờ</span>
                {' | '}
                <span className="text-[var(--warning)]">{formatMoney(costPerMinute)}/phút</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Date Navigator */}
      <div className="flex items-center justify-between mb-4 bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)]">
        <button onClick={() => navigateDate('prev')} className="p-2 rounded-lg hover:bg-[var(--bg-surface)]">
          <ChevronLeft size={20} className="text-[var(--text-secondary)]" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            {isToday ? 'Hôm nay' : new Date(selectedDate).toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'numeric' })}
          </p>
          <p className="text-xs text-[var(--text-muted)]">{selectedDate}</p>
        </div>
        <button onClick={() => navigateDate('next')} className="p-2 rounded-lg hover:bg-[var(--bg-surface)]" disabled={isToday}>
          <ChevronRight size={20} className={`text-[var(--text-secondary)] ${isToday ? 'opacity-30' : ''}`} />
        </button>
      </div>

      {/* Main Stats Cards */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Tracked Time Card */}
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--accent-primary)]">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={16} className="text-[var(--accent-primary)]" />
            <span className="text-xs text-[var(--text-muted)]">Thời gian đã theo dõi</span>
          </div>
          <p className="text-2xl font-bold text-[var(--accent-primary)] font-mono">{formatTime(dailyStats.trackedTime)}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">{dailyStats.completedTasks} việc đã hoàn thành</p>
        </div>

        {/* Total Cost Card */}
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--warning)]">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={16} className="text-[var(--warning)]" />
            <span className="text-xs text-[var(--text-muted)]">Tổng chi phí thời gian</span>
          </div>
          <p className="text-2xl font-bold text-[var(--warning)] font-mono">{formatMoney(dailyStats.totalCost)}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Đã sử dụng</p>
        </div>
      </div>

      {/* Untracked Time & Declaration Rate */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* Untracked Time */}
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-[var(--error)]" />
            <span className="text-xs text-[var(--text-muted)]">Khoảng trống</span>
          </div>
          <p className="text-xl font-bold text-[var(--text-primary)] font-mono">{formatTime(dailyStats.untrackedTime)}</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">Chưa khai báo</p>
        </div>

        {/* Declaration Rate */}
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)]">
          <div className="flex items-center gap-2 mb-2">
            {dailyStats.isComplete ? (
              <CheckCircle size={16} className="text-[var(--success)]" />
            ) : (
              <XCircle size={16} className="text-[var(--error)]" />
            )}
            <span className="text-xs text-[var(--text-muted)]">Mức khai báo</span>
          </div>
          <p className={`text-xl font-bold font-mono ${dailyStats.isComplete ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
            {dailyStats.declarationRate}%
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {dailyStats.isComplete ? 'Hoàn thành tốt!' : 'Cần cải thiện'}
          </p>
        </div>
      </div>

      {/* Additional Costs Section */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4 mb-4 border border-[var(--border-subtle)]">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">Chi phí bổ sung</h3>
          <button 
            onClick={() => setShowAddCost(!showAddCost)}
            className="p-1.5 rounded-lg bg-[var(--accent-primary)] text-white"
          >
            <Plus size={16} />
          </button>
        </div>

        {showAddCost && (
          <div className="mb-3 p-3 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <div className="flex gap-2 mb-2">
              {(['money', 'energy', 'mental'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setNewCost({ ...newCost, type })}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium ${
                    newCost.type === type 
                      ? type === 'money' ? 'bg-green-500/20 text-green-500' 
                        : type === 'energy' ? 'bg-yellow-500/20 text-yellow-500'
                        : 'bg-purple-500/20 text-purple-500'
                      : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                  }`}
                >
                  {type === 'money' ? 'Tiền' : type === 'energy' ? 'Năng lượng' : 'Tinh thần'}
                </button>
              ))}
            </div>
            <input
              type="number"
              placeholder={newCost.type === 'money' ? 'Số tiền (VND)' : 'Mức độ (1-10)'}
              value={newCost.amount || ''}
              onChange={(e) => setNewCost({ ...newCost, amount: Number(e.target.value) })}
              className="w-full mb-2 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm"
            />
            <input
              type="text"
              placeholder="Mô tả (tùy chọn)"
              value={newCost.description}
              onChange={(e) => setNewCost({ ...newCost, description: e.target.value })}
              className="w-full mb-2 px-3 py-2 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-[var(--text-primary)] text-sm"
            />
            <button
              onClick={handleAddCost}
              className="w-full py-2 rounded-lg bg-[var(--accent-primary)] text-white text-sm font-medium"
            >
              Thêm chi phí
            </button>
          </div>
        )}

        {/* Cost Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 rounded-lg bg-green-500/10">
            <Wallet size={16} className="mx-auto text-green-500 mb-1" />
            <p className="text-sm font-bold text-green-500">{formatMoney(dailyStats.additionalCosts.money)}</p>
            <p className="text-[10px] text-[var(--text-muted)]">Tiền bạc</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-yellow-500/10">
            <Battery size={16} className="mx-auto text-yellow-500 mb-1" />
            <p className="text-sm font-bold text-yellow-500">{dailyStats.additionalCosts.energy}/10</p>
            <p className="text-[10px] text-[var(--text-muted)]">Năng lượng</p>
          </div>
          <div className="text-center p-2 rounded-lg bg-purple-500/10">
            <Brain size={16} className="mx-auto text-purple-500 mb-1" />
            <p className="text-sm font-bold text-purple-500">{dailyStats.additionalCosts.mental}/10</p>
            <p className="text-[10px] text-[var(--text-muted)]">Tinh thần</p>
          </div>
        </div>
      </div>

      {/* Week Overview */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4 mb-4 border border-[var(--border-subtle)]">
        <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Tuần này</h3>
        <div className="flex justify-between gap-1">
          {weekStats.map((day) => (
            <div key={day.date} className="flex-1 text-center">
              <p className="text-[10px] text-[var(--text-muted)] mb-1">{getDayLabel(day.date)}</p>
              <div 
                className={`w-8 h-8 mx-auto rounded-lg flex items-center justify-center ${
                  day.isComplete 
                    ? 'bg-green-500/20 text-green-500' 
                    : day.declarationRate > 0 
                      ? 'bg-yellow-500/20 text-yellow-500'
                      : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                }`}
              >
                {day.declarationRate}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Time Entries List */}
      {timeEntries.length > 0 && (
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 mb-4 border border-[var(--border-subtle)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-3">Hoạt động đã theo dõi</h3>
          <div className="space-y-2">
            {timeEntries.map((entry) => (
              <div key={entry.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--bg-surface)]">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[var(--text-primary)] truncate">{entry.taskTitle}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">
                    {new Date(entry.startTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - 
                    {new Date(entry.endTime).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-[var(--accent-primary)]">{formatTime(entry.duration)}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{formatMoney(entry.duration * costPerSecond)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Insight */}
      <div className="bg-gradient-to-r from-[var(--accent-primary)]/20 to-[var(--warning)]/20 rounded-xl p-4 border border-[var(--accent-primary)]/30">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-[var(--accent-primary)]/20">
            <TrendingUp size={20} className="text-[var(--accent-primary)]" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[var(--text-primary)]">Phân tích hôm nay</h4>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              {dailyStats.declarationRate >= 80 
                ? 'Bạn đã khai báo tốt thời gian hôm nay! Hãy tiếp tục duy trì.'
                : `Bạn còn ${formatTime(dailyStats.untrackedTime)} chưa được khai báo. Hãy thêm các hoạt động còn thiếu.`
              }
              {' '}
              Tổng chi phí thời gian: <span className="text-[var(--warning)] font-semibold">{formatMoney(dailyStats.totalCost)}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}