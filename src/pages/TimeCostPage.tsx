import { useMemo, useState } from 'react';
import { useTaskStore, useSettingsStore, useTimeLogStore } from '@/stores';
import { getNowInTimezone } from '@/lib/notifications';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, CartesianGrid, LineChart, Line,
} from 'recharts';
import {
  TrendingUp, TrendingDown, ArrowLeftRight,
  Plus, X, Clock,
  Calendar as CalendarIcon, Zap, ChevronLeft, ChevronRight,
  DollarSign, CheckCircle2, Circle
} from 'lucide-react';

type Period = 'week' | 'month' | 'all';
type ViewMode = 'overview' | 'calendar' | 'forecast' | 'transactions';

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  work: { label: 'Công việc', icon: '💼', color: '#60A5FA' },
  personal: { label: 'Cá nhân', icon: '👤', color: '#F472B6' },
  health: { label: 'Sức khỏe', icon: '💪', color: '#34D399' },
  learning: { label: 'Học tập', icon: '📚', color: '#A78BFA' },
  finance: { label: 'Tài chính', icon: '💰', color: '#FBBF24' },
  social: { label: 'Xã hội', icon: '👥', color: '#FB923C' },
  other: { label: 'Khác', icon: '📌', color: '#8B8B9E' },
};

function formatMoney(n: number) {
  const rounded = Math.round(n);
  const absN = Math.abs(rounded);
  const sign = rounded > 0 ? '+' : rounded < 0 ? '-' : '';
  if (absN >= 1_000_000) return `${sign}${(absN / 1_000_000).toFixed(1)}M`;
  if (absN >= 1_000) return `${sign}${(absN / 1_000).toFixed(0)}k`;
  return sign + absN.toLocaleString('vi-VN');
}

// ─── Summary Card ───
function SummaryCard({ label, value, icon: Icon, color, sub }: { label: string; value: number; icon: any; color: string; sub?: string }) {
  return (
    <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 border border-[var(--border-subtle)] relative overflow-hidden">
      <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-10" style={{ background: color, transform: 'translate(30%, -30%)' }} />
      <div className="flex items-start justify-between mb-2">
        <div className="size-9 rounded-xl flex items-center justify-center" style={{ background: `${color}20` }}>
          <Icon size={16} style={{ color }} />
        </div>
      </div>
      <p className="text-xl font-bold font-mono tabular-nums" style={{ color }}>{formatMoney(value)}</p>
      <p className="text-[10px] text-[var(--text-muted)] mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-[var(--text-secondary)] mt-1">{sub}</p>}
    </div>
  );
}

export default function TimeCostPage() {
  const tasks = useTaskStore(s => s.tasks);
  const timer = useTaskStore(s => s.timer);
  const timeLogs = useTimeLogStore(s => s.timeLogs);
  const { timezone, dailyTimeCost } = useSettingsStore();
  const [period, setPeriod] = useState<Period>('month');
  const [view, setView] = useState<ViewMode>('overview');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  
  // Calendar state
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  
  // Date picker popup for "Hôm nay" button
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMonth, setDatePickerMonth] = useState(new Date());

  const now = getNowInTimezone(timezone);
  const costPerSecond = dailyTimeCost / (24 * 3600);

  const cutoffTime = useMemo(() => {
    const cutoff = period === 'week' ? 7 : period === 'month' ? 30 : 9999;
    return now.getTime() - cutoff * 86400000;
  }, [period, now.getTime()]);

  // Helper to format duration with seconds
  const formatDuration = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  const formatMoneyPrecise = (n: number, type?: 'income' | 'expense') => {
    const val = Math.floor(Math.abs(n));
    const sign = type === 'income' || n > 0 ? '+' : type === 'expense' || n < 0 ? '-' : '';
    return sign + val.toLocaleString('vi-VN') + 'đ';
  };

  // First day of use: earliest task createdAt or time log
  const firstDayOfUse = useMemo(() => {
    let earliest = Date.now();
    tasks.forEach(t => { if (t.createdAt && t.createdAt < earliest) earliest = t.createdAt; });
    timeLogs.forEach(l => {
      const t = new Date(l.date).getTime();
      if (t < earliest) earliest = t;
    });
    const d = new Date(earliest); d.setHours(0, 0, 0, 0);
    return d.getTime();
  }, [tasks, timeLogs]);

  // Jump to a past date - show inline detail
  const openDateInCalendar = (date: Date) => {
    setSelectedDay(date.toISOString());
    setShowDatePicker(false);
  };

  // 1. Process Completed Transactions (Past & Present)
  const completedTx = useMemo(() => {
    const txs: any[] = [];
    
    // From Tasks
    tasks.forEach(t => {
      if (t.status === 'done' && t.finance && t.completedAt) {
        if (Array.isArray(t.finance)) {
          t.finance.forEach(f => {
            if (f.amount > 0) {
              txs.push({
                id: f.id || `${t.id}-${Math.random()}`,
                type: f.type,
                amount: f.amount,
                note: f.note ? `${t.title} - ${f.note}` : t.title,
                category: f.category || t.category || 'other',
                date: t.completedAt!,
                source: 'task',
                taskId: t.id
              });
            }
          });
        } else {
          const f = t.finance as any;
          if (f.amount > 0) {
            txs.push({
              id: t.id,
              type: f.type,
              amount: f.amount,
              note: t.title,
              category: t.category || 'other',
              date: t.completedAt!,
              source: 'task',
              taskId: t.id
            });
          }
        }
      }
    });

    return txs.sort((a, b) => b.date - a.date);
  }, [tasks]);

  // 2. Process Forecast Transactions (Future)
  const forecastTx = useMemo(() => {
    const txs: any[] = [];
    const futureLimit = new Date(now);
    futureLimit.setDate(futureLimit.getDate() + 30); // Look ahead 30 days

    tasks.forEach(t => {
      // A. Pending tasks with deadline (Existing)
      if (t.status !== 'done' && t.finance && t.deadline && t.deadline > now.getTime() && t.deadline <= futureLimit.getTime()) {
         if (Array.isArray(t.finance)) {
          t.finance.forEach(f => {
            if (f.amount > 0) {
              txs.push({
                id: `forecast-${t.id}-${f.id}`,
                type: f.type,
                amount: f.amount,
                note: `[Dự kiến] ${t.title}`,
                category: f.category || t.category || 'other',
                date: t.deadline!,
                source: 'forecast',
                taskId: t.id
              });
            }
          });
        }
      }
      
      // B. Recurring tasks projection
      if (t.recurring && t.recurring.type !== 'none' && t.finance) {
        const startDate = new Date(t.createdAt);
        let nextDate = new Date(now);
        // Start checking from tomorrow to avoid overlap with today's actual tracking
        nextDate.setDate(nextDate.getDate() + 1);
        nextDate.setHours(0,0,0,0);

        // Project for next 30 days
        while (nextDate <= futureLimit) {
          let isValid = false;
          const day = nextDate.getDay(); // 0 = Sun
          const dateNum = nextDate.getDate();
          
          switch (t.recurring.type) {
            case 'daily': 
              isValid = true; 
              break;
            case 'weekdays': 
              isValid = day >= 1 && day <= 5; 
              break;
            case 'weekly': 
              isValid = day === startDate.getDay(); 
              break;
            case 'biweekly': {
              const msPerDay = 24 * 60 * 60 * 1000;
              const daysDiff = Math.floor((nextDate.getTime() - startDate.getTime()) / msPerDay);
              isValid = daysDiff % 14 === 0;
              break;
            }
            case 'monthly': 
              isValid = dateNum === startDate.getDate(); 
              break;
            case 'custom': 
              isValid = t.recurring.customDays?.includes(day) || false; 
              break;
          }

          if (isValid) {
             if (Array.isArray(t.finance)) {
              t.finance.forEach(f => {
                if (f.amount > 0) {
                  txs.push({
                    id: `recurring-${t.id}-${nextDate.getTime()}-${f.id}`,
                    type: f.type,
                    amount: f.amount,
                    note: `[Lặp lại] ${t.title}`,
                    category: f.category || t.category || 'other',
                    date: nextDate.getTime(),
                    source: 'forecast',
                    taskId: t.id
                  });
                }
              });
            }
          }

          // Advance date
          nextDate.setDate(nextDate.getDate() + 1);
        }
      }
    });
    
    return txs.sort((a, b) => a.date - b.date);
  }, [tasks, now]);

  // Filtered transactions for current view
  const allTx = useMemo(() => completedTx.filter(tx => tx.date >= cutoffTime), [completedTx, cutoffTime]);
  
  // Filtered logs for current period
  const filteredLogs = useMemo(() => {
    return timeLogs.filter(log => {
      const logDate = new Date(log.date).getTime();
      return logDate >= cutoffTime;
    });
  }, [timeLogs, cutoffTime]);

  const filtered = useMemo(() =>
    filterType === 'all' ? allTx : allTx.filter(tx => tx.type === filterType),
    [allTx, filterType]);

  const stats = useMemo(() => {
    let income = 0, expense = 0;
    allTx.forEach(tx => { if (tx.type === 'income') income += tx.amount; else expense += tx.amount; });
    
    let trackedSeconds = filteredLogs.reduce((acc, log) => acc + log.duration, 0);
    
    // Add live timer if applicable to current period
    if (timer.isRunning && timer.taskId) {
       trackedSeconds += timer.elapsed;
    }

    const usedTimeCost = Math.round(trackedSeconds * costPerSecond);
    
    // Calculate actual days elapsed in this period up to today
    const startOfNow = new Date(now); startOfNow.setHours(0,0,0,0);
    const startOfCutoff = new Date(cutoffTime); startOfCutoff.setHours(0,0,0,0);
    
    // Find earliest data point to not over-deduct for new users
    const earliestTx = allTx.length > 0 ? Math.min(...allTx.map(tx => tx.date)) : now.getTime();
    const earliestLog = filteredLogs.length > 0 ? Math.min(...filteredLogs.map(l => new Date(l.date).getTime())) : now.getTime();
    const actualStart = Math.max(startOfCutoff.getTime(), Math.min(earliestTx, earliestLog));
    
    const msDiff = startOfNow.getTime() - new Date(actualStart).setHours(0,0,0,0);
    const daysElapsed = Math.floor(msDiff / 86400000) + 1; // +1 to include today
    
    const maxDays = period === 'week' ? 7 : period === 'month' ? 30 : 9999;
    const daysInPeriod = Math.min(daysElapsed, maxDays);
    
    const totalTimeCost = Math.round(dailyTimeCost * daysInPeriod);
    const wastedTimeCost = Math.max(0, totalTimeCost - usedTimeCost);

    return { 
      income, expense, net: income - expense, 
      txCount: allTx.length, 
      timeCost: totalTimeCost, 
      usedTimeCost,
      wastedTimeCost,
      trackedSeconds,
      trueNet: (income - expense) - totalTimeCost 
    };
  }, [allTx, filteredLogs, dailyTimeCost, period, costPerSecond, timer.isRunning, timer.taskId, timer.elapsed, cutoffTime, now]);

  const dailyData = useMemo(() => {
    const days: Record<string, { date: string; income: number; expense: number; net: number; timeCost: number, usedTimeCost: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = `${d.getDate()}/${d.getMonth() + 1}`;
      days[key] = { date: key, income: 0, expense: 0, net: 0, timeCost: dailyTimeCost, usedTimeCost: 0 };
    }
    
    allTx.forEach(tx => {
      const d = new Date(tx.date);
      const key = `${d.getDate()}/${d.getMonth() + 1}`;
      if (days[key]) {
        if (tx.type === 'income') { days[key].income += tx.amount; days[key].net += tx.amount; }
        else { days[key].expense += tx.amount; days[key].net -= tx.amount; }
      }
    });

    filteredLogs.forEach(log => {
      const d = new Date(log.date);
      const key = `${d.getDate()}/${d.getMonth() + 1}`;
      if (days[key]) {
        days[key].usedTimeCost += log.duration * costPerSecond;
      }
    });

    // Add live timer to today's data
    if (timer.isRunning && timer.taskId) {
      const todayKey = `${now.getDate()}/${now.getMonth() + 1}`;
      if (days[todayKey]) {
        days[todayKey].usedTimeCost += timer.elapsed * costPerSecond;
      }
    }

    return Object.values(days);
  }, [allTx, filteredLogs, dailyTimeCost, costPerSecond, timer.isRunning, timer.taskId, timer.elapsed, now]);

  // Today Stats (Calculated separately for quick access)
  const todayStats = useMemo(() => {
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const startOfToday = new Date(now);
    startOfToday.setHours(0,0,0,0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23,59,59,999);

    const todayTx = completedTx.filter(tx => tx.date >= startOfToday.getTime() && tx.date <= endOfToday.getTime());
    const incomeTx = todayTx.filter(tx => tx.type === 'income');
    const expenseTx = todayTx.filter(tx => tx.type === 'expense');
    let income = 0, expense = 0;
    todayTx.forEach(tx => { if (tx.type === 'income') income += tx.amount; else expense += tx.amount; });

    const todayLogs = timeLogs.filter(log => log.date === todayStr);
    let trackedSeconds = todayLogs.reduce((acc, log) => acc + log.duration, 0);
    if (timer.isRunning && timer.taskId) trackedSeconds += timer.elapsed;

    const usedTimeCost = Math.round(trackedSeconds * costPerSecond);
    const net = Math.round(income - expense);
    const trueNet = Math.round(net - dailyTimeCost);

    const completedTasksToday = tasks.filter(t => 
      t.status === 'done' && 
      t.completedAt && 
      t.completedAt >= startOfToday.getTime() && 
      t.completedAt <= endOfToday.getTime()
    );

    return {
      income: Math.round(income), expense: Math.round(expense), net, trueNet,
      trackedSeconds, usedTimeCost, dailyTimeCost: Math.round(dailyTimeCost),
      completedTasksToday, incomeTx, expenseTx
    };
  }, [completedTx, timeLogs, now, timer.isRunning, timer.taskId, timer.elapsed, dailyTimeCost, costPerSecond, tasks]);

  // Calendar Helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];
    
    // Fill previous month days
    const startPadding = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1; // Start Monday
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    
    // Fill current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    
    return days;
  };

  const getDayStats = (date: Date) => {
    const start = new Date(date); start.setHours(0,0,0,0);
    const end = new Date(date); end.setHours(23,59,59,999);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    
    // Include completed transactions
    const txs = completedTx.filter(tx => tx.date >= start.getTime() && tx.date <= end.getTime());
    
    // Include forecast transactions if date is in future
    if (date > now) {
      const fTxs = forecastTx.filter(tx => tx.date >= start.getTime() && tx.date <= end.getTime());
      txs.push(...fTxs);
    }

    let income = 0, expense = 0;
    txs.forEach(tx => { if(tx.type === 'income') income += tx.amount; else expense += tx.amount; });
    
    // Time tracking for this day
    const dayLogs = timeLogs.filter(log => log.date === dateStr);
    let trackedSeconds = dayLogs.reduce((acc, log) => acc + log.duration, 0);
    
    // Add live timer if it's today
    const isToday = date.toDateString() === now.toDateString();
    if (isToday && timer.isRunning && timer.taskId) {
      trackedSeconds += timer.elapsed;
    }

    const usedTimeCost = Math.round(trackedSeconds * costPerSecond);
    const wastedTimeCost = Math.max(0, dailyTimeCost - usedTimeCost);

    const net = Math.round(income - expense);
    
    // Only subtract time cost if day is NOT in the future AND >= first day of use
    const startOfNow = new Date(now); startOfNow.setHours(0,0,0,0);
    const dayHasStarted = start.getTime() <= startOfNow.getTime() && start.getTime() >= firstDayOfUse;
    const currentDayCost = dayHasStarted ? Math.round(dailyTimeCost) : 0;
    
    const trueNet = Math.round(net - currentDayCost);
    
    return { 
      income: Math.round(income), 
      expense: Math.round(expense), 
      net, 
      trueNet, 
      txs, 
      trackedSeconds, 
      usedTimeCost, 
      wastedTimeCost, 
      dailyTimeCost: currentDayCost 
    };
  };

  return (
    <div className="flex flex-col h-full pb-24 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-strong border-b border-[var(--border-subtle)] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Dòng Tiền</h1>
            <p className="text-[10px] text-[var(--text-muted)]">Quản lý Tài chính & Thời gian</p>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* ── OVERVIEW TAB ── */}
        {view === 'overview' && (
          <>
            {/* Today Summary Section - Redesigned */}
            <div className="space-y-3">
              <div className="bg-[var(--bg-elevated)] rounded-2xl p-5 border border-[var(--border-subtle)] relative overflow-hidden shadow-sm">
                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-primary)] opacity-[0.03] rounded-full -translate-y-1/2 translate-x-1/2" />
                
                <div className="flex items-center justify-between mb-5 relative">
                  <div className="flex items-center gap-3">
                  <button onClick={() => setShowDatePicker(v => !v)}
                    className="size-10 rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent-primary)] hover:scale-105 transition-transform">
                    <Zap size={20} />
                  </button>
                  <div className="cursor-pointer" onClick={() => setShowDatePicker(v => !v)}>
                    <h2 className="text-sm font-bold text-[var(--text-primary)] hover:text-[var(--accent-primary)] transition-colors">HÔM NAY</h2>
                    <p className="text-[10px] text-[var(--text-muted)] font-medium">
                      {now.toLocaleDateString('vi-VN', { weekday: 'long', day: '2-digit', month: '2-digit' })}
                    </p>
                  </div>
                  </div>
  
                  {/* Date Picker Popup */}
                  {showDatePicker && (
                    <div className="fixed inset-0 z-40" onClick={() => setShowDatePicker(false)} />
                  )}
                  {showDatePicker && (
                    <div className="absolute top-14 left-4 z-50 bg-[var(--bg-elevated)] border border-[var(--border-subtle)] rounded-2xl shadow-2xl p-3 min-w-[280px]" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-2">
                      <button onClick={() => setDatePickerMonth(d => { const n = new Date(d); n.setMonth(n.getMonth()-1); return n; })} className="p-1.5 hover:bg-[var(--bg-surface)] rounded-lg">
                        <ChevronLeft size={14} className="text-[var(--text-secondary)]" />
                      </button>
                      <span className="text-xs font-bold text-[var(--text-primary)]">Tháng {datePickerMonth.getMonth()+1}/{datePickerMonth.getFullYear()}</span>
                      <button onClick={() => setDatePickerMonth(d => { const n = new Date(d); n.setMonth(n.getMonth()+1); return n; })} className="p-1.5 hover:bg-[var(--bg-surface)] rounded-lg" disabled={datePickerMonth.getMonth() >= now.getMonth() && datePickerMonth.getFullYear() >= now.getFullYear()}>
                        <ChevronRight size={14} className={datePickerMonth.getMonth() >= now.getMonth() && datePickerMonth.getFullYear() >= now.getFullYear() ? 'text-[var(--text-muted)] opacity-30' : 'text-[var(--text-secondary)]'} />
                      </button>
                    </div>
                    <div className="grid grid-cols-7 gap-0.5 text-center mb-1">
                      {['T2','T3','T4','T5','T6','T7','CN'].map(d => <div key={d} className="text-[9px] text-[var(--text-muted)] py-0.5">{d}</div>)}
                    </div>
                    <div className="grid grid-cols-7 gap-0.5">
                      {getDaysInMonth(datePickerMonth).map((d, i) => {
                        if (!d) return <div key={i} />;
                        const isPast = d <= now;
                        const isToday = d.toDateString() === now.toDateString();
                        return (
                          <button key={i} disabled={!isPast}
                            onClick={() => openDateInCalendar(d)}
                            className={`aspect-square rounded-lg text-[11px] font-medium transition-all ${
                              isToday ? 'bg-[var(--accent-primary)] text-white' :
                              isPast ? 'hover:bg-[var(--accent-dim)] text-[var(--text-primary)]' :
                              'text-[var(--text-muted)] opacity-30'
                            }`}>
                            {d.getDate()}
                          </button>
                        );
                      })}
                    </div>
                    <button onClick={() => setShowDatePicker(false)} className="w-full mt-2 text-[10px] text-[var(--text-muted)] py-1 hover:text-[var(--text-primary)]">Đóng</button>
                  </div>
                )}
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold tracking-tight ${todayStats.trueNet >= 0 ? 'bg-[var(--success)] text-white' : 'bg-[var(--error)] text-white'}`}>
                    {todayStats.trueNet >= 0 ? 'CÓ LÃI' : 'ĐANG LỖ'}
                  </div>
                </div>

                {/* ─── KẾT QUẢ TỔNG ─── */}
                <div className="flex items-end justify-between mb-5">
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] uppercase tracking-wider font-bold mb-1">Thực nhận hôm nay</p>
                    <p className={`text-3xl font-black font-mono tabular-nums ${todayStats.trueNet >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                      {todayStats.trueNet > 0 ? '+' : ''}{Math.floor(Math.abs(todayStats.trueNet)).toLocaleString('vi-VN')}đ
                    </p>
                  </div>
                  <div className="text-right text-[10px] text-[var(--text-muted)] space-y-0.5">
                    <p>Theo dõi: <span className="font-mono text-[var(--text-primary)]">{formatDuration(todayStats.trackedSeconds)}</span></p>
                    <p>Giá trị TG: <span className="font-mono text-[var(--success)]">+{Math.floor(todayStats.usedTimeCost).toLocaleString('vi-VN')}đ</span></p>
                  </div>
                </div>

                {/* ─── THU ─── */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-[var(--success)] uppercase tracking-widest">▲ THU</span>
                    <span className="text-sm font-bold font-mono text-[var(--success)]">+{Math.floor(todayStats.income).toLocaleString('vi-VN')}đ</span>
                  </div>
                  {todayStats.incomeTx.length === 0 ? (
                    <p className="text-[10px] text-[var(--text-muted)] italic pl-2">Chưa có khoản thu nào hôm nay</p>
                  ) : (
                    <div className="space-y-1">
                      {todayStats.incomeTx.map((tx: any) => (
                        <div key={tx.id} className="flex items-center justify-between pl-3 pr-2 py-1.5 rounded-lg bg-[rgba(52,211,153,0.06)] border border-[rgba(52,211,153,0.12)]">
                          <span className="text-[11px] text-[var(--text-primary)] truncate">{tx.note}</span>
                          <span className="text-[11px] font-mono font-bold text-[var(--success)] ml-2 flex-shrink-0">+{Math.floor(tx.amount).toLocaleString('vi-VN')}đ</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* ─── CHI ─── */}
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-[var(--error)] uppercase tracking-widest">▼ CHI</span>
                    <span className="text-sm font-bold font-mono text-[var(--error)]">-{Math.floor(todayStats.expense + todayStats.dailyTimeCost).toLocaleString('vi-VN')}đ</span>
                  </div>
                  <div className="space-y-1">
                    {/* Chi phí thời gian luôn hiển thị */}
                    <div className="flex items-center justify-between pl-3 pr-2 py-1.5 rounded-lg bg-[rgba(248,113,113,0.06)] border border-[rgba(248,113,113,0.12)]">
                      <span className="text-[11px] text-[var(--text-primary)]">⏱ Chi phí thời gian ({Math.round(todayStats.trackedSeconds/3600*10)/10}h / ngày)</span>
                      <span className="text-[11px] font-mono font-bold text-[var(--error)] ml-2 flex-shrink-0">-{Math.floor(todayStats.dailyTimeCost).toLocaleString('vi-VN')}đ</span>
                    </div>
                    {todayStats.expenseTx.map((tx: any) => (
                      <div key={tx.id} className="flex items-center justify-between pl-3 pr-2 py-1.5 rounded-lg bg-[rgba(248,113,113,0.06)] border border-[rgba(248,113,113,0.12)]">
                        <span className="text-[11px] text-[var(--text-primary)] truncate">{tx.note}</span>
                        <span className="text-[11px] font-mono font-bold text-[var(--error)] ml-2 flex-shrink-0">-{Math.floor(tx.amount).toLocaleString('vi-VN')}đ</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* ─── ĐỀ XUẤT ─── */}
                {(() => {
                  const needed = todayStats.dailyTimeCost + todayStats.expense - todayStats.income;
                  if (todayStats.trueNet >= 0) {
                    return (
                      <div className="px-3 py-2.5 rounded-xl bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.2)]">
                        <p className="text-[11px] text-[var(--success)] font-medium">✅ Hôm nay đang có lãi! Duy trì và tiếp tục.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="px-3 py-2.5 rounded-xl bg-[rgba(251,191,36,0.08)] border border-[rgba(251,191,36,0.2)] space-y-1">
                      <p className="text-[11px] font-bold text-[var(--warning)]">💡 Để hòa vốn hôm nay:</p>
                      <p className="text-[10px] text-[var(--text-secondary)]">Cần thu thêm <span className="font-mono font-bold text-[var(--warning)]">+{Math.floor(needed).toLocaleString('vi-VN')}đ</span> nữa</p>
                      <p className="text-[10px] text-[var(--text-muted)]">hoặc giảm chi phí, hoặc tăng năng suất làm việc.</p>
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <SummaryCard label="Thu nhập" value={stats.income} icon={TrendingUp} color="var(--success)" />
              <SummaryCard label="Chi tiêu" value={stats.expense} icon={TrendingDown} color="var(--error)" />
              <SummaryCard label="Ròng (Tiền)" value={stats.net} icon={ArrowLeftRight} color={stats.net >= 0 ? 'var(--success)' : 'var(--error)'} />
            </div>

            <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 border border-[var(--border-subtle)] relative overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Clock size={13} /> Hiệu quả Thời gian ({period === 'week' ? '7 ngày' : period === 'month' ? '30 ngày' : 'Tất cả'})
                </h2>
                <span className="text-[10px] font-mono text-[var(--text-muted)]">{formatDuration(stats.trackedSeconds)} tracked</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-[10px] text-[var(--text-muted)]">Đã dùng (Used)</p>
                  <p className="text-lg font-bold font-mono text-[var(--success)]">{formatMoneyPrecise(stats.usedTimeCost)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[var(--text-muted)]">Lãng phí (Wasted)</p>
                  <p className="text-lg font-bold font-mono text-[var(--error)]">{formatMoneyPrecise(stats.wastedTimeCost)}</p>
                </div>
              </div>

              <div className="w-full h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden flex">
                <div className="h-full bg-[var(--success)] transition-all duration-500" style={{ width: `${(stats.usedTimeCost / stats.timeCost) * 100}%` }} />
                <div className="h-full bg-[var(--error)] opacity-50 transition-all duration-500" style={{ width: `${(stats.wastedTimeCost / stats.timeCost) * 100}%` }} />
              </div>

              <div className="mt-4 pt-4 border-t border-[var(--border-subtle)] flex items-end justify-between">
                <div>
                  <p className="text-[10px] text-[var(--text-muted)]">Tổng Time Cost</p>
                  <p className="text-base font-bold font-mono text-[var(--text-primary)]">{formatMoneyPrecise(stats.timeCost)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-[var(--text-muted)]">True Net Worth</p>
                  <p className={`text-xl font-bold font-mono ${stats.trueNet >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                    {stats.trueNet >= 0 ? '+' : ''}{formatMoneyPrecise(stats.trueNet)}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 border border-[var(--border-subtle)]">
              <h2 className="text-xs font-bold text-[var(--text-secondary)] mb-3">Xu hướng Dòng tiền (14 ngày)</h2>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyData}>
                    <defs>
                      <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorUsed" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--success)" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="var(--success)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                     <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} width={28} tickFormatter={v => formatMoney(v)} />
                     <Tooltip 
                        contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '10px', fontSize: '11px' }}
                        formatter={(value: number) => [formatMoneyPrecise(value), '']}
                     />
                     <Area type="monotone" dataKey="net" stroke="var(--accent-primary)" fillOpacity={1} fill="url(#colorNet)" />
                     <Area type="monotone" dataKey="usedTimeCost" stroke="var(--success)" fillOpacity={1} fill="url(#colorUsed)" strokeDasharray="3 3" />
                     <Line type="monotone" dataKey="timeCost" stroke="var(--text-muted)" strokeDasharray="5 5" dot={false} strokeWidth={1} />
                   </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 mt-2">
                <div className="flex items-center gap-1.5">
                  <div className="size-2 rounded-full bg-[var(--accent-primary)]" />
                  <span className="text-[9px] text-[var(--text-muted)]">Ròng (Tiền)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="size-2 rounded-full bg-[var(--success)]" />
                  <span className="text-[9px] text-[var(--text-muted)]">Thời gian hữu ích</span>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── SELECTED DAY DETAIL (shown inline after picking from date picker) ── */}
        {selectedDay && view === 'overview' && (() => {
           const date = new Date(selectedDay);
           const dayStats = getDayStats(date);
           const isToday = date.toDateString() === now.toDateString();
           return (
             <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden animate-slide-up">
               <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-surface)] border-b border-[var(--border-subtle)]">
                 <div>
                   <h3 className="text-sm font-bold text-[var(--text-primary)]">
                     {isToday ? 'Hôm nay' : date.toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' })}
                   </h3>
                   <div className="flex items-center gap-2 mt-0.5">
                     <span className="text-[10px] text-[var(--text-muted)]">Theo dõi: {formatDuration(dayStats.trackedSeconds || 0)}</span>
                     {dayStats.dailyTimeCost > 0 && <>
                       <span className="text-[10px] text-[var(--text-muted)]">•</span>
                       <span className="text-[10px] text-[var(--error)]">Chi phí: -{formatMoneyPrecise(dayStats.dailyTimeCost)}</span>
                     </>}
                   </div>
                 </div>
                 <div className="flex items-center gap-2">
                   <div className="text-right">
                     <p className={`text-base font-bold font-mono ${dayStats.trueNet >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                       {dayStats.trueNet > 0 ? '+' : ''}{formatMoneyPrecise(dayStats.trueNet)}
                     </p>
                     <p className="text-[9px] text-[var(--text-muted)]">Thực nhận</p>
                   </div>
                   <button onClick={() => setSelectedDay(null)} className="size-7 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                     <X size={14} />
                   </button>
                 </div>
               </div>
               <div className="p-4">
                 {dayStats.txs.length === 0 ? (
                   <p className="text-xs text-[var(--text-muted)] text-center py-6">Không có dữ liệu giao dịch nào cho ngày này.</p>
                 ) : (
                   <div className="space-y-2">
                     {dayStats.txs.map((tx: any, idx: number) => (
                       <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--bg-surface)]">
                         <div className="flex items-center gap-2.5">
                           <span className="text-base">{CATEGORY_CONFIG[tx.category]?.icon || '📌'}</span>
                           <p className="text-xs font-medium text-[var(--text-primary)]">{tx.note}</p>
                         </div>
                         <span className={`text-xs font-bold font-mono ${tx.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                           {tx.type === 'income' ? '+' : '-'}{Math.floor(tx.amount).toLocaleString('vi-VN')}đ
                         </span>
                       </div>
                     ))}
                   </div>
                 )}
               </div>
             </div>
           );
        })()}
      </div>
    </div>
  );
}