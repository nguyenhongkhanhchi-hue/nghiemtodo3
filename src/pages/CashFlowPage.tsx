import { useMemo, useState } from 'react';
import { useTaskStore, useSettingsStore } from '@/stores';
import { getNowInTimezone } from '@/lib/notifications';
import { Wallet, TrendingUp, TrendingDown, Clock, ChevronLeft, ChevronRight, AlertCircle, BarChart3, Plus, Trash2 } from 'lucide-react';
import type { FinanceCategory, CostItem } from '@/types';

function formatVND(amount: number): string {
  return amount.toLocaleString('vi-VN') + 'đ';
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? m + 'm' : ''}`;
  if (m > 0) return `${m}m`;
  return `${seconds}s`;
}

export default function CashFlowPage() {
  const tasks = useTaskStore(s => s.tasks);
  const timezone = useSettingsStore(s => s.timezone);
  const financeCategories = useSettingsStore(s => s.financeCategories);
  const costItems = useSettingsStore(s => s.costItems);
  const now = getNowInTimezone(timezone);
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month'>('today');
  const [monthOffset, setMonthOffset] = useState(0);

  // Calculate time range
  const { rangeStart, rangeEnd, rangeLabel } = useMemo(() => {
    const n = getNowInTimezone(timezone);
    if (dateRange === 'today') {
      const start = new Date(n.getFullYear(), n.getMonth(), n.getDate()).getTime();
      return { rangeStart: start, rangeEnd: start + 86400000, rangeLabel: 'Hôm nay' };
    }
    if (dateRange === 'week') {
      const weekStart = new Date(n);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
      weekStart.setHours(0, 0, 0, 0);
      return { rangeStart: weekStart.getTime(), rangeEnd: weekStart.getTime() + 7 * 86400000, rangeLabel: 'Tuần này' };
    }
    // month
    const d = new Date(n.getFullYear(), n.getMonth() + monthOffset, 1);
    const start = d.getTime();
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59).getTime();
    const label = d.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });
    return { rangeStart: start, rangeEnd: end, rangeLabel: label };
  }, [dateRange, monthOffset, timezone]);

  // ✅ #9: Calculate cost per second from costItems
  const costPerSecond = useMemo(() => {
    const totalPerMonth = costItems.reduce((s, i) => s + i.amount, 0);
    return totalPerMonth / (30 * 24 * 3600); // per second
  }, [costItems]);

  const costPerHour = costPerSecond * 3600;
  const costPerMinute = costPerSecond * 60;

  // ✅ #10: Aggregate completed tasks in range
  const completedInRange = useMemo(() =>
    tasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt >= rangeStart && t.completedAt <= rangeEnd),
    [tasks, rangeStart, rangeEnd]
  );

  // Income by categories
  const incomeCategories = financeCategories.filter(c => c.type === 'income');
  const expenseCategories = financeCategories.filter(c => c.type === 'expense');

  const totalIncome = useMemo(() =>
    completedInRange.reduce((s, t) => {
      if (t.finance?.type === 'income') return s + (t.finance.amount || 0);
      return s;
    }, 0), [completedInRange]);

  const totalExpense = useMemo(() =>
    completedInRange.reduce((s, t) => {
      if (t.finance?.type === 'expense') return s + (t.finance.amount || 0);
      return s;
    }, 0), [completedInRange]);

  // ✅ #10: Time cost = tracked seconds × cost/second
  const totalTrackedSeconds = useMemo(() =>
    completedInRange.reduce((s, t) => s + (t.duration || 0), 0),
    [completedInRange]
  );

  const timeCost = Math.round(totalTrackedSeconds * costPerSecond);

  // ✅ #10: Daily time efficiency (only for today/week use today's tracked)
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 86400000;
  const todayTrackedSeconds = useMemo(() =>
    tasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt >= todayStart && t.completedAt < todayEnd)
      .reduce((s, t) => s + (t.duration || 0), 0),
    [tasks, todayStart]
  );
  const DAY_SECONDS = 24 * 3600;
  const unTrackedSeconds = Math.max(0, DAY_SECONDS - todayTrackedSeconds);
  const trackingEfficiency = Math.round((todayTrackedSeconds / DAY_SECONDS) * 100);

  const netProfit = totalIncome - totalExpense - timeCost;

  // Task breakdown
  const taskRows = completedInRange.filter(t => t.finance || t.duration);

  return (
    <div className="flex flex-col h-full px-4 pb-24 overflow-y-auto" style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 12px))' }}>
      <h1 className="text-lg font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
        <Wallet size={18} className="text-[var(--accent-primary)]" /> Dòng tiền
      </h1>

      {/* Date range selector */}
      <div className="flex gap-1.5 mb-3">
        {(['today', 'week', 'month'] as const).map(r => (
          <button key={r} onClick={() => setDateRange(r)}
            className={`flex-1 py-2 rounded-xl text-xs font-medium min-h-[36px] ${dateRange === r ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)] border border-[var(--border-accent)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
            {r === 'today' ? 'Hôm nay' : r === 'week' ? 'Tuần này' : 'Tháng'}
          </button>
        ))}
        {dateRange === 'month' && (
          <div className="flex items-center gap-1 ml-1">
            <button onClick={() => setMonthOffset(p => p - 1)} className="size-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)]">
              <ChevronLeft size={12} />
            </button>
            <button onClick={() => setMonthOffset(p => Math.min(p + 1, 0))} disabled={monthOffset >= 0} className="size-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] disabled:opacity-30">
              <ChevronRight size={12} />
            </button>
          </div>
        )}
      </div>

      {dateRange === 'month' && (
        <p className="text-xs text-[var(--text-muted)] text-center mb-2 capitalize">{rangeLabel}</p>
      )}

      {/* Cost per time display */}
      {costItems.length > 0 && (
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)] mb-3">
          <p className="text-[10px] text-[var(--text-muted)] mb-2">Chi phí thời gian (dựa trên cài đặt chi phí)</p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-[var(--bg-surface)] rounded-lg">
              <p className="text-xs font-bold text-[var(--error)] font-mono">{formatVND(Math.round(costPerHour))}</p>
              <p className="text-[8px] text-[var(--text-muted)]">/giờ</p>
            </div>
            <div className="p-2 bg-[var(--bg-surface)] rounded-lg">
              <p className="text-xs font-bold text-[var(--error)] font-mono">{formatVND(Math.round(costPerMinute))}</p>
              <p className="text-[8px] text-[var(--text-muted)]">/phút</p>
            </div>
            <div className="p-2 bg-[var(--bg-surface)] rounded-lg">
              <p className="text-xs font-bold text-[var(--error)] font-mono">{formatVND(Math.round(costPerSecond * 100) / 100)}</p>
              <p className="text-[8px] text-[var(--text-muted)]">/giây</p>
            </div>
          </div>
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={12} className="text-[var(--success)]" />
            <span className="text-[10px] text-[var(--text-muted)]">Thu nhập</span>
          </div>
          <p className="text-base font-bold text-[var(--success)] font-mono">+{formatVND(totalIncome)}</p>
        </div>
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)]">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingDown size={12} className="text-[var(--error)]" />
            <span className="text-[10px] text-[var(--text-muted)]">Chi phí</span>
          </div>
          <p className="text-base font-bold text-[var(--error)] font-mono">-{formatVND(totalExpense)}</p>
        </div>
        {costItems.length > 0 && (
          <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)]">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock size={12} className="text-[var(--warning)]" />
              <span className="text-[10px] text-[var(--text-muted)]">Chi phí thời gian ({formatTime(totalTrackedSeconds)})</span>
            </div>
            <p className="text-base font-bold text-[var(--warning)] font-mono">-{formatVND(timeCost)}</p>
          </div>
        )}
        <div className={`bg-[var(--bg-elevated)] rounded-xl p-3 border ${netProfit >= 0 ? 'border-[var(--border-accent)]' : 'border-[rgba(248,113,113,0.4)]'}`}>
          <div className="flex items-center gap-1.5 mb-1">
            <Wallet size={12} className={netProfit >= 0 ? 'text-[var(--accent-primary)]' : 'text-[var(--error)]'} />
            <span className="text-[10px] text-[var(--text-muted)]">Lời/Lỗ</span>
          </div>
          <p className={`text-base font-bold font-mono ${netProfit >= 0 ? 'text-[var(--accent-primary)]' : 'text-[var(--error)]'}`}>
            {netProfit >= 0 ? '+' : ''}{formatVND(netProfit)}
          </p>
        </div>
      </div>

      {/* ✅ #10: Time efficiency report (today) */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)] mb-3">
        <div className="flex items-center gap-1.5 mb-2">
          <BarChart3 size={12} className="text-[var(--accent-primary)]" />
          <span className="text-xs font-semibold text-[var(--text-primary)]">Hiệu suất thời gian hôm nay</span>
        </div>
        <div className="w-full bg-[var(--bg-surface)] rounded-full h-3 mb-2 overflow-hidden">
          <div className="h-full bg-[var(--accent-primary)] rounded-full transition-all"
            style={{ width: `${trackingEfficiency}%` }} />
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <p className="text-sm font-bold text-[var(--accent-primary)] font-mono">{formatTime(todayTrackedSeconds)}</p>
            <p className="text-[8px] text-[var(--text-muted)]">Theo dõi được</p>
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-muted)] font-mono">{formatTime(unTrackedSeconds)}</p>
            <p className="text-[8px] text-[var(--text-muted)]">Không theo dõi</p>
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--success)] font-mono">{trackingEfficiency}%</p>
            <p className="text-[8px] text-[var(--text-muted)]">Hiệu suất</p>
          </div>
        </div>
        {unTrackedSeconds > 0 && (
          <div className="mt-2 flex items-start gap-1.5 bg-[rgba(251,191,36,0.08)] rounded-lg p-2">
            <AlertCircle size={10} className="text-[var(--warning)] mt-0.5 flex-shrink-0" />
            <p className="text-[9px] text-[var(--text-muted)]">
              {formatTime(unTrackedSeconds)} không được ghi nhận — thời gian lãng phí không theo dõi được
              {costItems.length > 0 && ` (tương đương ${formatVND(Math.round(unTrackedSeconds * costPerSecond))} chi phí)`}
            </p>
          </div>
        )}
      </div>

      {/* Task breakdown */}
      {taskRows.length > 0 && (
        <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] mb-3 overflow-hidden">
          <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
            <p className="text-xs font-semibold text-[var(--text-primary)]">Chi tiết từng việc</p>
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {taskRows.map(task => {
              const tCost = task.duration ? Math.round(task.duration * costPerSecond) : 0;
              const income = task.finance?.type === 'income' ? task.finance.amount : 0;
              const expense = task.finance?.type === 'expense' ? task.finance.amount : 0;
              const net = income - expense - tCost;
              return (
                <div key={task.id} className="px-3 py-2">
                  <p className="text-xs font-medium text-[var(--text-primary)] mb-1 truncate">{task.title}</p>
                  <div className="flex flex-wrap gap-2 text-[10px]">
                    {task.duration ? (
                      <span className="text-[var(--text-muted)]">⏱ {formatTime(task.duration)}</span>
                    ) : null}
                    {income > 0 && <span className="text-[var(--success)]">+{formatVND(income)}</span>}
                    {expense > 0 && <span className="text-[var(--error)]">-{formatVND(expense)}</span>}
                    {tCost > 0 && <span className="text-[var(--warning)]">-{formatVND(tCost)} (thời gian)</span>}
                    <span className={`font-bold ${net >= 0 ? 'text-[var(--accent-primary)]' : 'text-[var(--error)]'}`}>
                      = {net >= 0 ? '+' : ''}{formatVND(net)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {completedInRange.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Wallet size={32} className="text-[var(--text-muted)] mb-2 opacity-40" />
          <p className="text-sm text-[var(--text-muted)]">Chưa có việc hoàn thành trong khoảng thời gian này</p>
        </div>
      )}
    </div>
  );
}
