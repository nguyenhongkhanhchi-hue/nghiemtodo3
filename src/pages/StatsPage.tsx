import { useMemo, useState } from 'react';
import { useTaskStore, useGamificationStore, useSettingsStore } from '@/stores';
import { getNowInTimezone } from '@/lib/notifications';
import { generateDailySummary } from '@/lib/dataUtils';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Clock, Award, Target, Flame, Share2, Copy, Check, ChevronLeft, ChevronRight, Calendar, Trophy } from 'lucide-react';
import type { EisenhowerQuadrant } from '@/types';
import { QUADRANT_LABELS } from '@/types';

const QUADRANT_NAMES: Record<EisenhowerQuadrant, string> = { do_first: 'Hôm nay', schedule: 'Lên lịch', delegate: 'Ủy thác', eliminate: 'Loại bỏ', overdue: 'Quá hạn' };
const PIE_COLORS = ['#F87171', '#60A5FA', '#FBBF24', '#5A5A6E', '#DC2626'];
const HEATMAP_COLORS = ['var(--bg-surface)', 'rgba(0,229,204,0.2)', 'rgba(0,229,204,0.4)', 'rgba(0,229,204,0.6)', 'rgba(0,229,204,0.9)'];

function CalendarHeatmap() {
  const tasks = useTaskStore(s => s.tasks);
  const timezone = useSettingsStore(s => s.timezone);
  const now = getNowInTimezone(timezone);
  const [monthOffset, setMonthOffset] = useState(0);
  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
  const year = viewDate.getFullYear(); const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthName = viewDate.toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' });

  const dailyCounts = useMemo(() => {
    const c: Record<number, number> = {};
    tasks.forEach(t => {
      if (t.status === 'done' && t.completedAt) {
        const d = new Date(t.completedAt);
        if (d.getFullYear() === year && d.getMonth() === month) c[d.getDate()] = (c[d.getDate()] || 0) + 1;
      }
    });
    return c;
  }, [tasks, year, month]);

  const maxCount = Math.max(...Object.values(dailyCounts), 1);
  const getColor = (count: number) => count === 0 ? HEATMAP_COLORS[0] : HEATMAP_COLORS[Math.min(4, Math.ceil((count / maxCount) * 4))];
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)] mb-3">
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => setMonthOffset(p => p - 1)} className="size-7 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><ChevronLeft size={12} /></button>
        <h2 className="text-xs font-semibold text-[var(--text-primary)] capitalize">{monthName}</h2>
        <button onClick={() => setMonthOffset(p => Math.min(p + 1, 0))} disabled={monthOffset >= 0} className="size-7 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)] disabled:opacity-30"><ChevronRight size={12} /></button>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'].map(d => <div key={d} className="text-center text-[8px] text-[var(--text-muted)] pb-0.5">{d}</div>)}
        {cells.map((day, i) => (
          <div key={i} className="aspect-square flex items-center justify-center rounded text-[9px]"
            style={{ backgroundColor: day ? getColor(dailyCounts[day] || 0) : 'transparent' }}>
            {day && <span className={dailyCounts[day] ? 'text-[var(--text-primary)] font-medium' : 'text-[var(--text-muted)]'}>{day}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function DailySummary() {
  const tasks = useTaskStore(s => s.tasks);
  const gamState = useGamificationStore(s => s.state);
  const timezone = useSettingsStore(s => s.timezone);
  const [copied, setCopied] = useState(false);
  const now = getNowInTimezone(timezone);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const todayEnd = todayStart + 86400000;
  const todayDone = tasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt >= todayStart && t.completedAt < todayEnd);
  const todayPending = tasks.filter(t => t.status === 'pending' || t.status === 'in_progress' || t.status === 'paused');
  const totalTime = todayDone.reduce((s, t) => s + (t.duration || 0), 0);
  const fmt = (s: number) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h${m}m` : `${m}m`; };

  const handleShare = async () => {
    const text = generateDailySummary(tasks, gamState, timezone);
    if (navigator.share) { try { await navigator.share({ text }); } catch {} }
    else { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }
  };

  return (
    <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-accent)] mb-3 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[rgba(0,229,204,0.04)] to-transparent" />
      <div className="relative">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-[var(--text-primary)]">Hôm nay</h2>
          <button onClick={handleShare} className="flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] bg-[var(--accent-dim)] text-[var(--accent-primary)] min-h-[26px]">
            {copied ? <Check size={10} /> : <Share2 size={10} />} {copied ? 'Đã sao' : 'Chia sẻ'}
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="text-center"><p className="text-base font-bold text-[var(--accent-primary)] font-mono tabular-nums">{todayDone.length}</p><p className="text-[8px] text-[var(--text-muted)]">Xong</p></div>
          <div className="text-center"><p className="text-base font-bold text-[var(--warning)] font-mono tabular-nums">{todayPending.length}</p><p className="text-[8px] text-[var(--text-muted)]">Còn lại</p></div>
          <div className="text-center"><p className="text-base font-bold text-[var(--text-primary)] font-mono tabular-nums">{fmt(totalTime)}</p><p className="text-[8px] text-[var(--text-muted)]">Thời gian</p></div>
          <div className="text-center"><p className="text-base font-bold text-[var(--success)] font-mono tabular-nums">{gamState.streak}</p><p className="text-[8px] text-[var(--text-muted)]">Streak</p></div>
        </div>
      </div>
    </div>
  );
}

function WeeklyReview() {
  const tasks = useTaskStore(s => s.tasks);
  const timezone = useSettingsStore(s => s.timezone);
  const [weekOffset, setWeekOffset] = useState(0);
  const now = getNowInTimezone(timezone);
  const weekStart = new Date(now); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 + weekOffset * 7); weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7);
  const weekLabel = `${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${new Date(weekEnd.getTime() - 86400000).getDate()}/${new Date(weekEnd.getTime() - 86400000).getMonth() + 1}`;
  const weekTasks = useMemo(() => tasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt >= weekStart.getTime() && t.completedAt < weekEnd.getTime()), [tasks, weekStart.getTime()]);
  const totalTime = weekTasks.reduce((s, t) => s + (t.duration || 0), 0);
  const fmt = (s: number) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h${m}m` : `${m}m`; };

  const dailyData = useMemo(() => {
    return ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((label, i) => {
      const ds = new Date(weekStart); ds.setDate(ds.getDate() + i);
      const de = new Date(ds); de.setDate(de.getDate() + 1);
      return { name: label, tasks: weekTasks.filter(t => t.completedAt! >= ds.getTime() && t.completedAt! < de.getTime()).length };
    });
  }, [weekTasks, weekStart.getTime()]);

  return (
    <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)] mb-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1"><Calendar size={12} /> Tuần</h2>
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekOffset(p => p - 1)} className="size-6 rounded bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)] text-[10px]">←</button>
          <span className="text-[10px] text-[var(--text-secondary)] px-1">{weekLabel}</span>
          <button onClick={() => setWeekOffset(p => Math.min(p + 1, 0))} disabled={weekOffset >= 0} className="size-6 rounded bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)] text-[10px] disabled:opacity-30">→</button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-2">
        <div className="text-center p-2 rounded-lg bg-[var(--bg-surface)]"><p className="text-sm font-bold text-[var(--text-primary)] font-mono">{weekTasks.length}</p><p className="text-[8px] text-[var(--text-muted)]">Việc xong</p></div>
        <div className="text-center p-2 rounded-lg bg-[var(--bg-surface)]"><p className="text-sm font-bold text-[var(--accent-primary)] font-mono">{fmt(totalTime)}</p><p className="text-[8px] text-[var(--text-muted)]">Thời gian</p></div>
      </div>
      {weekTasks.length > 0 && (
        <div className="h-24">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={dailyData}>
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} width={20} />
              <Bar dataKey="tasks" fill="var(--accent-primary)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

// Achievements Summary
function AchievementsSummary() {
  const gamState = useGamificationStore(s => s.state);
  const unlocked = gamState.achievements.filter(a => a.unlockedAt).length;
  const total = gamState.achievements.length;

  return (
    <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)] mb-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1"><Trophy size={12} /> Thành tích</h2>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="text-center p-2 rounded-lg bg-[var(--bg-surface)]">
          <p className="text-base font-bold text-[var(--accent-primary)] font-mono">{gamState.level}</p>
          <p className="text-[8px] text-[var(--text-muted)]">Level</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-[var(--bg-surface)]">
          <p className="text-base font-bold text-[var(--warning)] font-mono">{gamState.xp}</p>
          <p className="text-[8px] text-[var(--text-muted)]">XP</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-[var(--bg-surface)]">
          <p className="text-base font-bold text-[var(--success)] font-mono">{unlocked}/{total}</p>
          <p className="text-[8px] text-[var(--text-muted)]">Mở khóa</p>
        </div>
      </div>
    </div>
  );
}

export default function StatsPage() {
  const tasks = useTaskStore(s => s.tasks);
  const stats = useMemo(() => {
    const done = tasks.filter(t => t.status === 'done').length;
    const total = tasks.length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const totalTime = tasks.filter(t => t.duration).reduce((s, t) => s + (t.duration || 0), 0);
    const avgTime = done > 0 ? Math.round(totalTime / done) : 0;
    const byQuadrant = (['do_first', 'schedule', 'delegate', 'eliminate', 'overdue'] as EisenhowerQuadrant[])
      .map(q => ({ name: QUADRANT_NAMES[q], value: tasks.filter(t => t.quadrant === q).length }))
      .filter(d => d.value > 0);
    return { done, completionRate, totalTime, avgTime, byQuadrant };
  }, [tasks]);

  const fmt = (s: number) => { const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); if (h > 0) return `${h}h${m}m`; return `${m}m`; };

  return (
    <div className="flex flex-col h-full px-4 pt-3 pb-24 overflow-y-auto">
      <h1 className="text-lg font-bold text-[var(--text-primary)] mb-3">Thống kê</h1>
      <DailySummary />
      <AchievementsSummary />
      <CalendarHeatmap />
      <WeeklyReview />

      <div className="grid grid-cols-4 gap-2 mb-3">
        {[
          { icon: Award, label: 'Xong', value: String(stats.done), color: 'var(--success)' },
          { icon: Clock, label: 'Tổng', value: fmt(stats.totalTime), color: 'var(--accent-primary)' },
          { icon: TrendingUp, label: 'TB/việc', value: fmt(stats.avgTime), color: 'var(--warning)' },
          { icon: Target, label: 'Tỷ lệ', value: `${stats.completionRate}%`, color: 'var(--info)' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-[var(--bg-elevated)] rounded-xl p-2.5 border border-[var(--border-subtle)] text-center">
            <Icon size={14} style={{ color }} className="mx-auto mb-1" />
            <p className="text-sm font-bold text-[var(--text-primary)] font-mono tabular-nums">{value}</p>
            <p className="text-[8px] text-[var(--text-muted)]">{label}</p>
          </div>
        ))}
      </div>

      {stats.byQuadrant.length > 0 && (
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)] mb-3">
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] mb-2 flex items-center gap-1"><Flame size={12} /> Eisenhower</h2>
          <div className="h-28">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.byQuadrant} cx="50%" cy="50%" innerRadius={25} outerRadius={50} dataKey="value" strokeWidth={0}>
                  {stats.byQuadrant.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: 'var(--bg-surface)', border: '1px solid var(--border-default)', borderRadius: '8px', fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-1">
            {stats.byQuadrant.map((d, i) => (
              <div key={d.name} className="flex items-center gap-1">
                <div className="size-2 rounded-full" style={{ backgroundColor: PIE_COLORS[i] }} />
                <span className="text-[9px] text-[var(--text-muted)]">{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
