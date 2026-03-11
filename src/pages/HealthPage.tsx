import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useHealthStore } from '@/stores/healthStore';
import { useAuthStore } from '@/stores';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ComposedChart, Line,
} from 'recharts';
import {
  Droplets, Weight, Ruler, Plus, Trash2, Settings2, ChevronDown,
  RotateCcw, Target, Bell, BellOff, Activity, Cloud, CloudOff,
  RefreshCw, FileText, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import type { HealthViewPeriod, HealthGoals, WaterReminderSettings } from '@/types/health';

// ── Helpers ──────────────────────────────────────────────────────────────────
function getDateLabel(timestamp: number, period: HealthViewPeriod): string {
  const d = new Date(timestamp);
  if (period === 'day') return `${d.getHours()}h`;
  if (period === 'week') return ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][d.getDay()];
  if (period === 'month') return `${d.getDate()}/${d.getMonth() + 1}`;
  return `T${d.getMonth() + 1}/${d.getFullYear().toString().slice(2)}`;
}

function filterByPeriod<T extends { timestamp: number }>(entries: T[], period: HealthViewPeriod): T[] {
  const now = Date.now();
  const ms: Record<HealthViewPeriod, number> = {
    day: 24 * 60 * 60 * 1000,
    week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000,
    year: 365 * 24 * 60 * 60 * 1000,
  };
  return entries.filter(e => now - e.timestamp <= ms[period]);
}

function aggregateByDay<T extends { timestamp: number; value?: number; amount?: number }>(
  entries: T[], period: HealthViewPeriod, field: 'value' | 'amount', mode: 'last' | 'sum'
): { label: string; value: number; timestamp: number }[] {
  const filtered = filterByPeriod(entries, period);
  if (filtered.length === 0) return [];

  if (period === 'day') {
    const hours: Record<number, T[]> = {};
    filtered.forEach(e => {
      const h = new Date(e.timestamp).getHours();
      if (!hours[h]) hours[h] = [];
      hours[h].push(e);
    });
    return Object.entries(hours).map(([h, items]) => {
      const sum = items.reduce((s, i) => s + ((i as any)[field] || 0), 0);
      const last = items[items.length - 1];
      return { label: `${h}h`, value: mode === 'sum' ? sum : (last as any)[field], timestamp: last.timestamp };
    }).sort((a, b) => a.timestamp - b.timestamp);
  }

  const groups: Record<string, T[]> = {};
  filtered.forEach(e => {
    const d = new Date(e.timestamp);
    let key: string;
    if (period === 'week' || period === 'month') {
      key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    } else {
      key = `${d.getFullYear()}-${d.getMonth() + 1}`;
    }
    if (!groups[key]) groups[key] = [];
    groups[key].push(e);
  });

  return Object.entries(groups).map(([, items]) => {
    const sorted = [...items].sort((a, b) => a.timestamp - b.timestamp);
    const sum = items.reduce((s, i) => s + ((i as any)[field] || 0), 0);
    const last = sorted[sorted.length - 1];
    return {
      label: getDateLabel(last.timestamp, period),
      value: mode === 'sum' ? sum : (last as any)[field],
      timestamp: last.timestamp,
    };
  }).sort((a, b) => a.timestamp - b.timestamp);
}

function calcBMI(weightKg: number, heightCm: number): number {
  if (!heightCm || heightCm <= 0) return 0;
  const h = heightCm / 100;
  return weightKg / (h * h);
}

function getBMICategory(bmi: number): { label: string; color: string; emoji: string } {
  if (bmi <= 0) return { label: '—', color: 'var(--text-muted)', emoji: '—' };
  if (bmi < 18.5) return { label: 'Thiếu cân', color: '#60A5FA', emoji: '🔵' };
  if (bmi < 25) return { label: 'Bình thường', color: '#34D399', emoji: '🟢' };
  if (bmi < 30) return { label: 'Thừa cân', color: '#FBBF24', emoji: '🟡' };
  return { label: 'Béo phì', color: '#F87171', emoji: '🔴' };
}

// ── Period Selector ──────────────────────────────────────────────────────────
function PeriodSelector({ value, onChange }: { value: HealthViewPeriod; onChange: (p: HealthViewPeriod) => void }) {
  const opts: { v: HealthViewPeriod; label: string }[] = [
    { v: 'day', label: 'Ngày' }, { v: 'week', label: 'Tuần' },
    { v: 'month', label: 'Tháng' }, { v: 'year', label: 'Năm' },
  ];
  return (
    <div className="flex gap-1 bg-[var(--bg-surface)] rounded-xl p-1">
      {opts.map(o => (
        <button key={o.v} onClick={() => onChange(o.v)}
          className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors min-h-[32px] ${value === o.v ? 'bg-[var(--accent-primary)] text-[var(--bg-base)]' : 'text-[var(--text-muted)]'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function CustomTooltip({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--border-accent)] rounded-xl px-3 py-2 text-xs shadow-lg">
      <p className="text-[var(--text-muted)] mb-0.5">{label}</p>
      <p className="font-bold text-[var(--accent-primary)]">{payload[0].value} {unit}</p>
    </div>
  );
}

function GoalProgress({ label, current, target, unit, color, lowerIsBetter }: {
  label: string; current: number; target: number; unit: string;
  color: string; lowerIsBetter?: boolean;
}) {
  if (!target || !current) return null;
  const diff = current - target;
  const achieved = lowerIsBetter ? current <= target : current >= target;
  const pct = Math.min(100, Math.round(lowerIsBetter
    ? target > 0 ? Math.min(100, (target / current) * 100) : 0
    : (current / target) * 100));
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl p-3 mb-3">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[11px] text-[var(--text-muted)]">{label}</span>
        <span className="text-[11px] font-bold" style={{ color }}>
          {current}{unit} / {target}{unit}
          <span className={`ml-1.5 text-[10px] ${achieved ? 'text-[var(--success)]' : diff > 0 && lowerIsBetter ? 'text-[var(--error)]' : 'text-[var(--warning)]'}`}>
            {achieved ? '✅ Đạt' : lowerIsBetter ? `còn ${Math.abs(diff).toFixed(1)}${unit} cần giảm` : `còn ${Math.abs(diff).toFixed(1)}${unit} cần tăng`}
          </span>
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-[var(--bg-elevated)] overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: achieved ? 'var(--success)' : color }} />
      </div>
    </div>
  );
}

function BMICard({ weightKg, heightCm }: { weightKg: number; heightCm: number }) {
  const bmi = calcBMI(weightKg, heightCm);
  const cat = getBMICategory(bmi);
  if (bmi <= 0) return null;
  return (
    <div className="flex items-center gap-3 bg-[var(--bg-surface)] rounded-xl px-3 py-2.5 mb-3 border border-[var(--border-subtle)]">
      <Activity size={16} style={{ color: cat.color }} />
      <div className="flex-1">
        <p className="text-[10px] text-[var(--text-muted)]">Chỉ số BMI</p>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-black font-mono tabular-nums" style={{ color: cat.color }}>
            {bmi.toFixed(1)}
          </span>
          <span className="text-xs font-semibold" style={{ color: cat.color }}>{cat.emoji} {cat.label}</span>
        </div>
      </div>
      <div className="text-[10px] text-[var(--text-muted)] text-right leading-tight">
        <p>Chiều cao</p>
        <p className="font-semibold text-[var(--text-primary)]">{heightCm}cm</p>
      </div>
    </div>
  );
}

// ── Cloud Sync Bar ────────────────────────────────────────────────────────────
function CloudSyncBar() {
  const { isSyncing, lastSynced, syncFromCloud, _userId } = useHealthStore();
  const isCloud = _userId && _userId !== 'admin';

  if (!isCloud) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] mb-4">
      {isSyncing ? (
        <RefreshCw size={13} className="text-[var(--accent-primary)] animate-spin" />
      ) : (
        <Cloud size={13} className="text-[var(--success)]" />
      )}
      <span className="text-[10px] text-[var(--text-muted)] flex-1">
        {isSyncing
          ? 'Đang đồng bộ cloud...'
          : lastSynced
            ? `Đồng bộ lúc ${new Date(lastSynced).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`
            : 'Chưa đồng bộ'}
      </span>
      <button
        onClick={() => syncFromCloud()}
        disabled={isSyncing}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--accent-dim)] text-[10px] font-medium text-[var(--accent-primary)] min-h-[26px] disabled:opacity-40">
        <RefreshCw size={10} className={isSyncing ? 'animate-spin' : ''} />
        Đồng bộ
      </button>
    </div>
  );
}

// ── Overview Chart (combined metrics) ────────────────────────────────────────
function OverviewChart() {
  const { state } = useHealthStore();
  const [period, setPeriod] = useState<HealthViewPeriod>('month');

  const weightData = useMemo(() => aggregateByDay(state.weightEntries, period, 'value', 'last'), [state.weightEntries, period]);
  const waistData = useMemo(() => aggregateByDay(state.waistEntries, period, 'value', 'last'), [state.waistEntries, period]);
  const waterData = useMemo(() => aggregateByDay(state.waterEntries, period, 'amount', 'sum'), [state.waterEntries, period]);

  // Merge all by label
  const combined = useMemo(() => {
    const map = new Map<string, { label: string; weight?: number; waist?: number; water?: number }>();
    weightData.forEach(d => {
      map.set(d.label, { ...map.get(d.label), label: d.label, weight: d.value });
    });
    waistData.forEach(d => {
      map.set(d.label, { ...map.get(d.label), label: d.label, waist: d.value });
    });
    waterData.forEach(d => {
      map.set(d.label, { ...map.get(d.label), label: d.label, water: Math.round(d.value / 100) / 10 }); // convert to L for display
    });
    return Array.from(map.values());
  }, [weightData, waistData, waterData]);

  const latestWeight = state.weightEntries[state.weightEntries.length - 1];
  const prevWeight = state.weightEntries[state.weightEntries.length - 2];
  const latestWaist = state.waistEntries[state.waistEntries.length - 1];
  const prevWaist = state.waistEntries[state.waistEntries.length - 2];
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayWater = state.waterEntries.filter(e => e.date === todayStr).reduce((s, e) => s + e.amount, 0);

  const bmi = latestWeight && state.goals.height ? calcBMI(latestWeight.value, state.goals.height) : 0;
  const bmiCat = getBMICategory(bmi);

  const weightDiff = latestWeight && prevWeight ? latestWeight.value - prevWeight.value : null;
  const waistDiff = latestWaist && prevWaist ? latestWaist.value - prevWaist.value : null;
  const waterPct = Math.round((todayWater / state.dailyWaterGoal) * 100);

  const metrics = [
    {
      label: 'Cân nặng', value: latestWeight?.value ?? '—', unit: state.weightUnit,
      diff: weightDiff, color: '#A78BFA', icon: Weight, lowerBetter: false,
    },
    {
      label: 'Vòng bụng', value: latestWaist?.value ?? '—', unit: 'cm',
      diff: waistDiff, color: '#FB923C', icon: Ruler, lowerBetter: true,
    },
    {
      label: 'Nước hôm nay', value: `${(todayWater / 1000).toFixed(1)}`, unit: 'L',
      diff: null, color: '#60A5FA', icon: Droplets, lowerBetter: false,
      sub: `${waterPct}% mục tiêu`,
    },
    ...(bmi > 0 ? [{
      label: 'BMI', value: bmi.toFixed(1), unit: '',
      diff: null, color: bmiCat.color, icon: Activity, lowerBetter: false,
      sub: bmiCat.label,
    }] : []),
  ];

  const hasData = combined.length > 0;

  return (
    <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden mb-4">
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <div className="size-9 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #34D399 0%, #60A5FA 100%)' }}>
            <TrendingUp size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">Tổng quan sức khoẻ</p>
            <p className="text-[10px] text-[var(--text-muted)]">Biểu đồ kết hợp • cân nặng & vòng bụng</p>
          </div>
        </div>

        {/* Metric Cards */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {metrics.map(m => (
            <div key={m.label} className="bg-[var(--bg-surface)] rounded-xl p-3 border border-[var(--border-subtle)]">
              <div className="flex items-center gap-1.5 mb-1">
                <m.icon size={12} style={{ color: m.color }} />
                <span className="text-[10px] text-[var(--text-muted)]">{m.label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-black font-mono tabular-nums" style={{ color: m.color }}>
                  {m.value}
                </span>
                <span className="text-[10px] text-[var(--text-muted)]">{m.unit}</span>
                {m.diff !== null && (
                  <span className={`text-[9px] font-semibold ml-auto ${
                    m.lowerBetter
                      ? m.diff < 0 ? 'text-[var(--success)]' : m.diff > 0 ? 'text-[var(--error)]' : 'text-[var(--text-muted)]'
                      : m.diff > 0 ? 'text-[var(--success)]' : m.diff < 0 ? 'text-[var(--error)]' : 'text-[var(--text-muted)]'
                  }`}>
                    {m.diff > 0 ? <TrendingUp size={9} className="inline" /> : m.diff < 0 ? <TrendingDown size={9} className="inline" /> : <Minus size={9} className="inline" />}
                    {' '}{Math.abs(m.diff).toFixed(1)}
                  </span>
                )}
              </div>
              {'sub' in m && m.sub && (
                <p className="text-[9px] mt-0.5" style={{ color: m.color }}>{m.sub}</p>
              )}
            </div>
          ))}
        </div>

        <PeriodSelector value={period} onChange={setPeriod} />
      </div>

      {/* Combined Chart */}
      {!hasData ? (
        <div className="h-40 flex items-center justify-center text-xs text-[var(--text-muted)] pb-4">
          Nhập dữ liệu để xem biểu đồ tổng quan
        </div>
      ) : (
        <div className="px-4 pb-4">
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={combined}>
                <defs>
                  <linearGradient id="weightGrad2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#A78BFA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="left" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={28} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9, fill: '#60A5FA' }} axisLine={false} tickLine={false} width={24} />
                <Tooltip
                  contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-accent)', borderRadius: '10px', fontSize: '11px' }}
                  formatter={(v: number, name: string) => {
                    if (name === 'weight') return [`${v} kg`, 'Cân nặng'];
                    if (name === 'waist') return [`${v} cm`, 'Vòng bụng'];
                    if (name === 'water') return [`${v} L`, 'Nước uống'];
                    return [v, name];
                  }}
                />
                {combined.some(d => d.weight !== undefined) && (
                  <Area yAxisId="left" type="monotone" dataKey="weight" stroke="#A78BFA" strokeWidth={2} fill="url(#weightGrad2)" dot={{ fill: '#A78BFA', r: 2 }} connectNulls />
                )}
                {combined.some(d => d.waist !== undefined) && (
                  <Line yAxisId="left" type="monotone" dataKey="waist" stroke="#FB923C" strokeWidth={2} dot={{ fill: '#FB923C', r: 2 }} connectNulls />
                )}
                {combined.some(d => d.water !== undefined) && (
                  <Bar yAxisId="right" dataKey="water" fill="#3B82F6" fillOpacity={0.5} radius={[3, 3, 0, 0]} maxBarSize={14} />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          <div className="flex items-center gap-4 mt-2 justify-center">
            <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-[#A78BFA] rounded" /><span className="text-[9px] text-[var(--text-muted)]">Cân nặng</span></div>
            <div className="flex items-center gap-1.5"><div className="w-4 h-0.5 bg-[#FB923C] rounded" /><span className="text-[9px] text-[var(--text-muted)]">Vòng bụng</span></div>
            <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-[#3B82F6] opacity-60" /><span className="text-[9px] text-[var(--text-muted)]">Nước (L)</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PDF Export ────────────────────────────────────────────────────────────────
function exportHealthPDF(state: ReturnType<typeof useHealthStore.getState>['state']) {
  const { waterEntries, weightEntries, waistEntries, dailyWaterGoal, weightUnit, goals } = state;

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayWater = waterEntries.filter(e => e.date === todayStr).reduce((s, e) => s + e.amount, 0);
  const latestWeight = weightEntries[weightEntries.length - 1];
  const latestWaist = waistEntries[waistEntries.length - 1];
  const bmi = latestWeight && goals.height ? calcBMI(latestWeight.value, goals.height) : 0;
  const bmiCat = getBMICategory(bmi);

  const now = new Date();
  const dateStr = now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i));
    const ds = d.toISOString().slice(0, 10);
    const water = waterEntries.filter(e => e.date === ds).reduce((s, e) => s + e.amount, 0);
    const wt = [...weightEntries].filter(e => e.date === ds).pop();
    const ws = [...waistEntries].filter(e => e.date === ds).pop();
    return { date: ds, label: d.toLocaleDateString('vi-VN', { weekday: 'short', day: 'numeric', month: 'numeric' }), water, weight: wt?.value, waist: ws?.value };
  });

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="UTF-8"/>
<title>Báo cáo Sức khoẻ - ${dateStr}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 32px; color: #1a1a2e; background: #fff; font-size: 13px; }
  h1 { font-size: 22px; font-weight: 800; color: #10b981; margin-bottom: 4px; }
  .meta { color: #64748b; font-size: 11px; margin-bottom: 24px; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 14px; font-weight: 700; color: #374151; border-bottom: 2px solid #e5e7eb; padding-bottom: 6px; margin-bottom: 12px; }
  .metrics { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
  .metric-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; text-align: center; }
  .metric-label { font-size: 10px; color: #64748b; margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.5px; }
  .metric-value { font-size: 22px; font-weight: 900; font-variant-numeric: tabular-nums; }
  .metric-unit { font-size: 10px; color: #94a3b8; margin-top: 2px; }
  .table { width: 100%; border-collapse: collapse; }
  .table th { background: #f1f5f9; font-size: 11px; font-weight: 600; color: #475569; padding: 8px 10px; text-align: left; }
  .table td { padding: 8px 10px; border-bottom: 1px solid #f1f5f9; font-size: 12px; }
  .table tr:last-child td { border-bottom: none; }
  .progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin-top: 4px; }
  .progress-fill { height: 100%; border-radius: 4px; }
  .bmi-badge { display: inline-block; padding: 2px 8px; border-radius: 20px; font-size: 11px; font-weight: 600; }
  .goal-row { display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
  .footer { margin-top: 32px; text-align: center; font-size: 10px; color: #94a3b8; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
<h1>💪 Báo cáo Sức khoẻ</h1>
<p class="meta">Xuất lúc ${timeStr} • ${dateStr}</p>

<div class="metrics">
  <div class="metric-card">
    <div class="metric-label">Cân nặng</div>
    <div class="metric-value" style="color:#7c3aed">${latestWeight?.value ?? '—'}</div>
    <div class="metric-unit">${weightUnit} • ${latestWeight ? new Date(latestWeight.timestamp).toLocaleDateString('vi-VN') : 'Chưa có'}</div>
  </div>
  <div class="metric-card">
    <div class="metric-label">Vòng bụng</div>
    <div class="metric-value" style="color:#ea580c">${latestWaist?.value ?? '—'}</div>
    <div class="metric-unit">cm • ${latestWaist ? new Date(latestWaist.timestamp).toLocaleDateString('vi-VN') : 'Chưa có'}</div>
  </div>
  <div class="metric-card">
    <div class="metric-label">BMI</div>
    <div class="metric-value" style="color:${bmiCat.color}">${bmi > 0 ? bmi.toFixed(1) : '—'}</div>
    <div class="metric-unit">${bmi > 0 ? bmiCat.label : 'Cần nhập chiều cao'}</div>
  </div>
  <div class="metric-card">
    <div class="metric-label">Nước hôm nay</div>
    <div class="metric-value" style="color:#2563eb">${(todayWater / 1000).toFixed(2)}</div>
    <div class="metric-unit">L / ${(dailyWaterGoal / 1000).toFixed(1)}L mục tiêu</div>
  </div>
</div>

${goals.height || goals.targetWeight || goals.targetWaist ? `
<div class="section">
  <div class="section-title">🎯 Mục tiêu</div>
  ${goals.height ? `<div class="goal-row"><span>Chiều cao</span><strong>${goals.height} cm</strong></div>` : ''}
  ${goals.targetWeight ? `<div class="goal-row"><span>Mục tiêu cân nặng</span><strong>${goals.targetWeight} ${weightUnit} ${latestWeight && latestWeight.value <= goals.targetWeight ? '✅ Đạt' : latestWeight ? `(còn ${Math.abs(latestWeight.value - goals.targetWeight).toFixed(1)}${weightUnit})` : ''}</strong></div>` : ''}
  ${goals.targetWaist ? `<div class="goal-row"><span>Mục tiêu vòng bụng</span><strong>${goals.targetWaist} cm ${latestWaist && latestWaist.value <= goals.targetWaist ? '✅ Đạt' : latestWaist ? `(còn ${Math.abs(latestWaist.value - goals.targetWaist).toFixed(1)}cm)` : ''}</strong></div>` : ''}
</div>` : ''}

<div class="section">
  <div class="section-title">📅 7 ngày gần nhất</div>
  <table class="table">
    <thead><tr>
      <th>Ngày</th>
      <th>Nước uống</th>
      <th>% Mục tiêu</th>
      <th>Cân nặng</th>
      <th>Vòng bụng</th>
    </tr></thead>
    <tbody>
      ${last7Days.map(d => {
        const waterPct2 = Math.min(100, Math.round((d.water / dailyWaterGoal) * 100));
        return `<tr>
          <td>${d.label}</td>
          <td>${d.water > 0 ? `${(d.water / 1000).toFixed(2)}L` : '—'}</td>
          <td>
            ${d.water > 0 ? `<div style="font-size:11px;font-weight:600;color:${waterPct2 >= 100 ? '#16a34a' : waterPct2 >= 50 ? '#ca8a04' : '#dc2626'}">${waterPct2}%</div>
            <div class="progress-bar"><div class="progress-fill" style="width:${waterPct2}%;background:${waterPct2 >= 100 ? '#16a34a' : '#3b82f6'}"></div></div>` : '—'}
          </td>
          <td>${d.weight !== undefined ? `${d.weight} ${weightUnit}` : '—'}</td>
          <td>${d.waist !== undefined ? `${d.waist} cm` : '—'}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>

${weightEntries.length > 1 ? `
<div class="section">
  <div class="section-title">⚖️ Lịch sử cân nặng (${Math.min(10, weightEntries.length)} lần gần nhất)</div>
  <table class="table">
    <thead><tr><th>Thời gian</th><th>Cân nặng</th><th>Thay đổi</th><th>Ghi chú</th></tr></thead>
    <tbody>
      ${[...weightEntries].reverse().slice(0, 10).map((e, i, arr) => {
        const prev2 = arr[i + 1];
        const diff2 = prev2 ? e.value - prev2.value : null;
        return `<tr>
          <td>${new Date(e.timestamp).toLocaleString('vi-VN')}</td>
          <td style="font-weight:700;color:#7c3aed">${e.value} ${weightUnit}</td>
          <td style="color:${diff2 === null ? '#94a3b8' : diff2 > 0 ? '#dc2626' : diff2 < 0 ? '#16a34a' : '#94a3b8'}">${diff2 !== null ? `${diff2 > 0 ? '+' : ''}${diff2.toFixed(1)}` : '—'}</td>
          <td style="color:#94a3b8;font-style:italic">${e.note || ''}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>
</div>` : ''}

<div class="footer">Báo cáo được tạo bởi NghiemWork Health Tracker • ${dateStr}</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

// ── Goals Panel ───────────────────────────────────────────────────────────────
function GoalsPanel() {
  const { state, setGoals } = useHealthStore();
  const [open, setOpen] = useState(false);
  const [height, setHeight] = useState(String(state.goals.height ?? ''));
  const [targetWeight, setTargetWeight] = useState(String(state.goals.targetWeight ?? ''));
  const [targetWaist, setTargetWaist] = useState(String(state.goals.targetWaist ?? ''));

  const handleSave = () => {
    const g: HealthGoals = {};
    if (height) g.height = parseFloat(height);
    if (targetWeight) g.targetWeight = parseFloat(targetWeight);
    if (targetWaist) g.targetWaist = parseFloat(targetWaist);
    setGoals(g);
    setOpen(false);
  };

  const latestWeight = state.weightEntries[state.weightEntries.length - 1]?.value;
  const latestWaist = state.waistEntries[state.waistEntries.length - 1]?.value;

  return (
    <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)] mb-4 overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="size-8 rounded-xl bg-green-500/15 flex items-center justify-center">
            <Target size={15} className="text-green-400" />
          </div>
          <span className="text-sm font-bold text-[var(--text-primary)]">Mục tiêu sức khoẻ</span>
        </div>
        <ChevronDown size={15} className={`text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {(latestWeight || latestWaist) && (
        <div className="px-4 pb-0">
          {latestWeight && state.goals.height && (
            <BMICard weightKg={latestWeight} heightCm={state.goals.height} />
          )}
          {latestWeight && state.goals.targetWeight && (
            <GoalProgress
              label="Mục tiêu cân nặng" current={latestWeight}
              target={state.goals.targetWeight} unit={state.weightUnit}
              color="#A78BFA" lowerIsBetter={latestWeight > state.goals.targetWeight}
            />
          )}
          {latestWaist && state.goals.targetWaist && (
            <GoalProgress
              label="Mục tiêu vòng bụng" current={latestWaist}
              target={state.goals.targetWaist} unit="cm"
              color="#FB923C" lowerIsBetter={latestWaist > state.goals.targetWaist}
            />
          )}
        </div>
      )}

      {open && (
        <div className="px-4 pb-4 space-y-2 animate-slide-up">
          <p className="text-[10px] text-[var(--text-muted)]">Nhập chiều cao để tính BMI tự động</p>
          {[
            { label: 'Chiều cao (cm)', val: height, set: setHeight, placeholder: 'VD: 170' },
            { label: `Mục tiêu cân nặng (${state.weightUnit})`, val: targetWeight, set: setTargetWeight, placeholder: 'VD: 65' },
            { label: 'Mục tiêu vòng bụng (cm)', val: targetWaist, set: setTargetWaist, placeholder: 'VD: 80' },
          ].map(({ label, val, set: setter, placeholder }) => (
            <div key={label}>
              <p className="text-[10px] text-[var(--text-muted)] mb-1">{label}</p>
              <input type="number" value={val} onChange={e => setter(e.target.value)}
                placeholder={placeholder} inputMode="decimal"
                className="w-full bg-[var(--bg-surface)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[40px] font-mono" />
            </div>
          ))}
          <button onClick={handleSave}
            className="w-full py-2.5 rounded-xl bg-green-500/20 text-green-400 text-sm font-bold min-h-[42px] mt-2">
            Lưu mục tiêu
          </button>
        </div>
      )}
    </div>
  );
}

// ── Water Reminder Hook ───────────────────────────────────────────────────────
function useWaterReminder(settings: WaterReminderSettings, todayTotal: number, dailyGoal: number) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!settings.enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    const schedule = () => {
      const now2 = new Date();
      const hour = now2.getHours();
      if (hour < settings.startHour || hour >= settings.endHour) {
        const next = new Date();
        next.setHours(settings.startHour, 0, 0, 0);
        if (next <= now2) next.setDate(next.getDate() + 1);
        timerRef.current = setTimeout(schedule, next.getTime() - now2.getTime());
        return;
      }
      if (todayTotal >= dailyGoal) return;
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('💧 Nhắc uống nước!', {
          body: `Đã uống ${todayTotal}ml / ${dailyGoal}ml. Uống thêm đi bạn ơi! 🥤`,
          icon: '/manifest.json',
          tag: 'water-reminder',
        });
      }
      timerRef.current = setTimeout(schedule, settings.intervalMinutes * 60 * 1000);
    };

    timerRef.current = setTimeout(schedule, settings.intervalMinutes * 60 * 1000);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [settings.enabled, settings.intervalMinutes, settings.startHour, settings.endHour, todayTotal, dailyGoal]);
}

function WaterReminderPanel({ settings, onUpdate }: {
  settings: WaterReminderSettings;
  onUpdate: (s: WaterReminderSettings) => void;
}) {
  const [open, setOpen] = useState(false);
  const [notifPerm, setNotifPerm] = useState<NotificationPermission>(
    'Notification' in window ? Notification.permission : 'denied'
  );

  const requestPerm = async () => {
    if ('Notification' in window) {
      const perm = await Notification.requestPermission();
      setNotifPerm(perm);
      if (perm === 'granted') onUpdate({ ...settings, enabled: true });
    }
  };

  return (
    <div className="border-t border-[var(--border-subtle)] pt-3 mt-1">
      <button onClick={() => setOpen(!open)} className="flex items-center gap-2 w-full text-left">
        {settings.enabled ? <Bell size={13} className="text-blue-400" /> : <BellOff size={13} className="text-[var(--text-muted)]" />}
        <span className="text-xs text-[var(--text-secondary)] flex-1">
          Nhắc uống nước {settings.enabled ? `(mỗi ${settings.intervalMinutes}p)` : '(tắt)'}
        </span>
        <ChevronDown size={12} className={`text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="mt-2 space-y-2 animate-slide-up">
          {notifPerm !== 'granted' ? (
            <button onClick={requestPerm}
              className="w-full py-2 rounded-xl bg-blue-500/15 text-blue-400 text-xs font-semibold min-h-[36px]">
              Bật quyền thông báo để nhắc nhở
            </button>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-[var(--text-muted)]">Bật nhắc uống nước</span>
                <button onClick={() => onUpdate({ ...settings, enabled: !settings.enabled })}
                  className={`w-9 h-5 rounded-full transition-colors relative ${settings.enabled ? 'bg-blue-500' : 'bg-[var(--bg-surface)]'}`}>
                  <div className={`size-3.5 rounded-full bg-white absolute top-[3px] transition-transform ${settings.enabled ? 'translate-x-4' : 'translate-x-[3px]'}`} />
                </button>
              </div>
              {settings.enabled && (
                <>
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)] mb-1">Nhắc mỗi (phút)</p>
                    <div className="flex gap-1.5">
                      {[20, 30, 45, 60, 90].map(m => (
                        <button key={m} onClick={() => onUpdate({ ...settings, intervalMinutes: m })}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-semibold min-h-[30px] ${settings.intervalMinutes === m ? 'bg-blue-500/20 text-blue-400' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                          {m}p
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] mb-1">Bắt đầu từ</p>
                      <select value={settings.startHour} onChange={e => onUpdate({ ...settings, startHour: parseInt(e.target.value) })}
                        className="w-full bg-[var(--bg-surface)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[32px]">
                        {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i}:00</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="text-[10px] text-[var(--text-muted)] mb-1">Đến</p>
                      <select value={settings.endHour} onChange={e => onUpdate({ ...settings, endHour: parseInt(e.target.value) })}
                        className="w-full bg-[var(--bg-surface)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[32px]">
                        {Array.from({ length: 24 }, (_, i) => <option key={i} value={i}>{i}:00</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── WATER MODULE ─────────────────────────────────────────────────────────────
function WaterModule() {
  const { state, addWater, resetTodayWater, setDailyWaterGoal, removeWater, setWaterReminder } = useHealthStore();
  const [period, setPeriod] = useState<HealthViewPeriod>('day');
  const [showGoalInput, setShowGoalInput] = useState(false);
  const [goalInput, setGoalInput] = useState(String(state.dailyWaterGoal));
  const [customAmount, setCustomAmount] = useState('');

  const todayStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);

  const todayTotal = useMemo(
    () => state.waterEntries.filter(e => e.date === todayStr).reduce((s, e) => s + e.amount, 0),
    [state.waterEntries, todayStr]
  );

  useWaterReminder(state.waterReminder, todayTotal, state.dailyWaterGoal);

  const progressPct = Math.min(100, Math.round((todayTotal / state.dailyWaterGoal) * 100));
  const chartData = useMemo(() => aggregateByDay(state.waterEntries, period, 'amount', 'sum'), [state.waterEntries, period]);

  return (
    <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-blue-500/20 flex items-center justify-center">
            <Droplets size={18} className="text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">Nước uống</p>
            <p className="text-[10px] text-[var(--text-muted)]">Hôm nay: {todayTotal}ml / {state.dailyWaterGoal}ml</p>
          </div>
        </div>
        <button onClick={() => setShowGoalInput(!showGoalInput)}
          className="size-8 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
          <Settings2 size={14} />
        </button>
      </div>

      {showGoalInput && (
        <div className="mx-4 mb-3 flex gap-2 animate-slide-up">
          <input type="number" value={goalInput} onChange={e => setGoalInput(e.target.value)}
            placeholder="Mục tiêu (ml)" inputMode="numeric"
            className="flex-1 bg-[var(--bg-surface)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[38px] font-mono" />
          <button onClick={() => { setDailyWaterGoal(parseInt(goalInput) || 2000); setShowGoalInput(false); }}
            className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 text-xs font-semibold min-h-[38px]">
            Lưu
          </button>
        </div>
      )}

      <div className="px-4 pb-3">
        <div className="flex items-center gap-4 mb-3">
          <div className="flex-1">
            <div className="w-full h-3 rounded-full bg-[var(--bg-surface)] overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progressPct}%`, background: progressPct >= 100 ? 'var(--success)' : 'linear-gradient(90deg, #3B82F6, #60A5FA)' }} />
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">{progressPct}% mục tiêu</p>
          </div>
          <div className={`text-2xl font-black font-mono tabular-nums ${progressPct >= 100 ? 'text-[var(--success)]' : 'text-blue-400'}`}>
            {(todayTotal / 1000).toFixed(2)}L
          </div>
        </div>

        <div className="flex gap-2 mb-2">
          {[100, 200, 300, 500].map(ml => (
            <button key={ml} onClick={() => addWater(ml)}
              className="flex-1 py-2.5 rounded-xl bg-blue-500/15 border border-blue-500/20 text-blue-400 text-xs font-bold min-h-[40px] active:scale-95 transition-transform">
              +{ml}ml
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-3">
          <input type="number" value={customAmount} onChange={e => setCustomAmount(e.target.value)}
            placeholder="Số ml tùy chỉnh..." inputMode="numeric"
            className="flex-1 bg-[var(--bg-surface)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[38px] font-mono" />
          <button onClick={() => { const v = parseInt(customAmount); if (v > 0) { addWater(v); setCustomAmount(''); } }}
            disabled={!customAmount || parseInt(customAmount) <= 0}
            className="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-400 text-xs font-semibold min-h-[38px] disabled:opacity-30">
            <Plus size={14} />
          </button>
          <button onClick={resetTodayWater}
            className="size-9 rounded-xl bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
            <RotateCcw size={14} />
          </button>
        </div>

        {state.waterEntries.filter(e => e.date === todayStr).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {[...state.waterEntries].filter(e => e.date === todayStr).reverse().slice(0, 8).map(e => (
              <div key={e.id} className="flex items-center gap-1 bg-blue-500/10 rounded-lg px-2 py-1 text-[10px] text-blue-400">
                {e.amount}ml
                <button onClick={() => removeWater(e.id)} className="text-[var(--text-muted)]">
                  <Trash2 size={9} />
                </button>
              </div>
            ))}
          </div>
        )}

        <WaterReminderPanel settings={state.waterReminder} onUpdate={setWaterReminder} />
      </div>

      <div className="px-4 pb-4">
        <PeriodSelector value={period} onChange={setPeriod} />
        {chartData.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-xs text-[var(--text-muted)] mt-3">
            Chưa có dữ liệu trong khoảng thời gian này
          </div>
        ) : (
          <div className="h-36 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} barSize={period === 'year' ? 10 : 14}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={32} />
                <Tooltip content={<CustomTooltip unit="ml" />} />
                <ReferenceLine y={period === 'day' ? state.dailyWaterGoal : undefined} stroke="#3B82F6" strokeDasharray="4 4" />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} fillOpacity={0.8} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

// ── WEIGHT MODULE ─────────────────────────────────────────────────────────────
function WeightModule() {
  const { state, addWeight, removeWeight } = useHealthStore();
  const [period, setPeriod] = useState<HealthViewPeriod>('month');
  const [inputVal, setInputVal] = useState('');
  const [inputNote, setInputNote] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const chartData = useMemo(() => aggregateByDay(state.weightEntries, period, 'value', 'last'), [state.weightEntries, period]);
  const latest = state.weightEntries[state.weightEntries.length - 1];
  const prev = state.weightEntries[state.weightEntries.length - 2];
  const diff = latest && prev ? (latest.value - prev.value) : null;

  const handleAdd = () => {
    const v = parseFloat(inputVal);
    if (!v || v <= 0 || v > 500) return;
    addWeight(v, inputNote.trim() || undefined);
    setInputVal(''); setInputNote('');
  };

  return (
    <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-purple-500/20 flex items-center justify-center">
            <Weight size={18} className="text-purple-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">Cân nặng</p>
            {latest && (
              <p className="text-[10px] text-[var(--text-muted)]">
                Mới nhất: <span className="text-purple-400 font-semibold">{latest.value} {state.weightUnit}</span>
                {diff !== null && (
                  <span className={`ml-1 ${diff > 0 ? 'text-[var(--error)]' : diff < 0 ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                    ({diff > 0 ? '+' : ''}{diff.toFixed(1)})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        {latest && (
          <div className="text-2xl font-black font-mono text-purple-400 tabular-nums">
            {latest.value}<span className="text-sm font-normal ml-0.5">{state.weightUnit}</span>
          </div>
        )}
      </div>

      <div className="px-4 pb-3 flex gap-2">
        <input type="number" value={inputVal} onChange={e => setInputVal(e.target.value)}
          placeholder={`Nhập cân nặng (${state.weightUnit})`} inputMode="decimal" step="0.1"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="flex-1 bg-[var(--bg-surface)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[40px] font-mono" />
        <button onClick={handleAdd} disabled={!inputVal || parseFloat(inputVal) <= 0}
          className="px-4 rounded-xl bg-purple-500/20 text-purple-400 text-sm font-bold min-h-[40px] disabled:opacity-30 active:scale-95 transition-transform">
          <Plus size={16} />
        </button>
      </div>
      <div className="px-4 pb-3">
        <input type="text" value={inputNote} onChange={e => setInputNote(e.target.value)}
          placeholder="Ghi chú (tùy chọn)..."
          className="w-full bg-[var(--bg-surface)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[36px] placeholder-[var(--text-muted)]" />
      </div>

      <div className="px-4 pb-4">
        <PeriodSelector value={period} onChange={setPeriod} />
        {chartData.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-xs text-[var(--text-muted)] mt-3">Nhập dữ liệu để xem biểu đồ</div>
        ) : (
          <div className="h-36 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#A78BFA" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={32}
                  domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip content={<CustomTooltip unit={state.weightUnit} />} />
                {state.goals.targetWeight && (
                  <ReferenceLine y={state.goals.targetWeight} stroke="#34D399" strokeDasharray="4 4"
                    label={{ value: 'Mục tiêu', fontSize: 9, fill: '#34D399', position: 'insideTopRight' }} />
                )}
                <Area type="monotone" dataKey="value" stroke="#A78BFA" strokeWidth={2} fill="url(#weightGrad)" dot={{ fill: '#A78BFA', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {state.weightEntries.length > 0 && (
        <div className="px-4 pb-4">
          <button onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mb-2">
            <ChevronDown size={12} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            Lịch sử ({state.weightEntries.length} lần)
          </button>
          {showHistory && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {[...state.weightEntries].reverse().map(e => (
                <div key={e.id} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="font-mono text-purple-400 font-semibold w-16">{e.value}{state.weightUnit}</span>
                  <span className="flex-1 text-[10px] text-[var(--text-muted)]">{new Date(e.timestamp).toLocaleString('vi-VN')}</span>
                  {e.note && <span className="text-[10px] italic text-[var(--text-muted)] truncate max-w-20">{e.note}</span>}
                  <button onClick={() => removeWeight(e.id)} className="text-[var(--text-muted)]">
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── WAIST MODULE ──────────────────────────────────────────────────────────────
function WaistModule() {
  const { state, addWaist, removeWaist } = useHealthStore();
  const [period, setPeriod] = useState<HealthViewPeriod>('month');
  const [inputVal, setInputVal] = useState('');
  const [inputNote, setInputNote] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const chartData = useMemo(() => aggregateByDay(state.waistEntries, period, 'value', 'last'), [state.waistEntries, period]);
  const latest = state.waistEntries[state.waistEntries.length - 1];
  const prev = state.waistEntries[state.waistEntries.length - 2];
  const diff = latest && prev ? (latest.value - prev.value) : null;

  const handleAdd = () => {
    const v = parseFloat(inputVal);
    if (!v || v <= 0 || v > 200) return;
    addWaist(v, inputNote.trim() || undefined);
    setInputVal(''); setInputNote('');
  };

  return (
    <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)] overflow-hidden">
      <div className="flex items-center justify-between px-4 pt-4 pb-3">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-xl bg-orange-500/20 flex items-center justify-center">
            <Ruler size={18} className="text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-[var(--text-primary)]">Vòng bụng</p>
            {latest && (
              <p className="text-[10px] text-[var(--text-muted)]">
                Mới nhất: <span className="text-orange-400 font-semibold">{latest.value} cm</span>
                {diff !== null && (
                  <span className={`ml-1 ${diff > 0 ? 'text-[var(--error)]' : diff < 0 ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>
                    ({diff > 0 ? '+' : ''}{diff.toFixed(1)})
                  </span>
                )}
              </p>
            )}
          </div>
        </div>
        {latest && (
          <div className="text-2xl font-black font-mono text-orange-400 tabular-nums">
            {latest.value}<span className="text-sm font-normal ml-0.5">cm</span>
          </div>
        )}
      </div>

      <div className="px-4 pb-3 flex gap-2">
        <input type="number" value={inputVal} onChange={e => setInputVal(e.target.value)}
          placeholder="Nhập vòng bụng (cm)" inputMode="decimal" step="0.1"
          onKeyDown={e => e.key === 'Enter' && handleAdd()}
          className="flex-1 bg-[var(--bg-surface)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[40px] font-mono" />
        <button onClick={handleAdd} disabled={!inputVal || parseFloat(inputVal) <= 0}
          className="px-4 rounded-xl bg-orange-500/20 text-orange-400 text-sm font-bold min-h-[40px] disabled:opacity-30 active:scale-95 transition-transform">
          <Plus size={16} />
        </button>
      </div>
      <div className="px-4 pb-3">
        <input type="text" value={inputNote} onChange={e => setInputNote(e.target.value)}
          placeholder="Ghi chú (tùy chọn)..."
          className="w-full bg-[var(--bg-surface)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[36px] placeholder-[var(--text-muted)]" />
      </div>

      <div className="px-4 pb-4">
        <PeriodSelector value={period} onChange={setPeriod} />
        {chartData.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-xs text-[var(--text-muted)] mt-3">Nhập dữ liệu để xem biểu đồ</div>
        ) : (
          <div className="h-36 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="waistGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FB923C" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#FB923C" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} axisLine={false} tickLine={false} width={32}
                  domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip content={<CustomTooltip unit="cm" />} />
                {state.goals.targetWaist && (
                  <ReferenceLine y={state.goals.targetWaist} stroke="#34D399" strokeDasharray="4 4"
                    label={{ value: 'Mục tiêu', fontSize: 9, fill: '#34D399', position: 'insideTopRight' }} />
                )}
                <Area type="monotone" dataKey="value" stroke="#FB923C" strokeWidth={2} fill="url(#waistGrad)" dot={{ fill: '#FB923C', r: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {state.waistEntries.length > 0 && (
        <div className="px-4 pb-4">
          <button onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 text-[10px] text-[var(--text-muted)] mb-2">
            <ChevronDown size={12} className={`transition-transform ${showHistory ? 'rotate-180' : ''}`} />
            Lịch sử ({state.waistEntries.length} lần)
          </button>
          {showHistory && (
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {[...state.waistEntries].reverse().map(e => (
                <div key={e.id} className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                  <span className="font-mono text-orange-400 font-semibold w-16">{e.value}cm</span>
                  <span className="flex-1 text-[10px] text-[var(--text-muted)]">{new Date(e.timestamp).toLocaleString('vi-VN')}</span>
                  {e.note && <span className="text-[10px] italic text-[var(--text-muted)] truncate max-w-20">{e.note}</span>}
                  <button onClick={() => removeWaist(e.id)} className="text-[var(--text-muted)]">
                    <Trash2 size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function HealthPage() {
  const { state, initForUser } = useHealthStore();
  const user = useAuthStore(s => s.user);

  useEffect(() => {
    if (user?.id) initForUser(user.id);
  }, [user?.id]);

  const handleExportPDF = useCallback(() => {
    exportHealthPDF(state);
  }, [state]);

  return (
    <div className="flex flex-col h-full overflow-y-auto pb-24"
      style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 12px))' }}>
      {/* Header */}
      <div className="px-4 pb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-2xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #34D399 0%, #10B981 100%)' }}>
              <span className="text-lg">💪</span>
            </div>
            <div>
              <h1 className="text-lg font-black text-[var(--text-primary)]">Sức khoẻ</h1>
              <p className="text-[10px] text-[var(--text-muted)]">Theo dõi nước, cân nặng, vòng bụng & BMI</p>
            </div>
          </div>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs font-medium text-[var(--text-secondary)] min-h-[36px] active:opacity-70">
            <FileText size={13} className="text-[var(--accent-primary)]" />
            PDF
          </button>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Cloud Sync Status */}
        <CloudSyncBar />

        {/* Overview Chart */}
        <OverviewChart />

        {/* Goals */}
        <GoalsPanel />

        {/* Modules */}
        <WaterModule />
        <WeightModule />
        <WaistModule />
      </div>
    </div>
  );
}
