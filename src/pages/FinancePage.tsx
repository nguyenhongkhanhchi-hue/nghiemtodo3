import { useMemo, useState } from 'react';
import { useTaskStore, useSettingsStore } from '@/stores';
import { getNowInTimezone } from '@/lib/notifications';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
} from 'recharts';
import {
  DollarSign, TrendingUp, TrendingDown, ArrowLeftRight,
  Plus, X, Wallet, Target, Flame, ChevronDown, ChevronUp,
  PieChart as PieIcon, BarChart2, Info, Filter,
} from 'lucide-react';
import { CATEGORY_LABELS, TaskCategory } from '@/types';

type Period = 'week' | 'month' | 'all';
type ViewMode = 'overview' | 'chart' | 'transactions';

const CATEGORY_CONFIG: Record<string, { label: string; icon: string; color: string }> = {
  work: { label: 'Công việc', icon: '💼', color: '#60A5FA' },
  personal: { label: 'Cá nhân', icon: '👤', color: '#F472B6' },
  health: { label: 'Sức khỏe', icon: '💪', color: '#34D399' },
  learning: { label: 'Học tập', icon: '📚', color: '#A78BFA' },
  finance: { label: 'Tài chính', icon: '💰', color: '#FBBF24' },
  social: { label: 'Xã hội', icon: '👥', color: '#FB923C' },
  other: { label: 'Khác', icon: '📌', color: '#8B8B9E' },
};

interface Budget {
  id: string;
  category: string;
  limit: number;
  period: 'week' | 'month';
}

interface ManualTx {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  note: string;
  category: string;
  date: number;
}

function loadBudgets(): Budget[] {
  try { return JSON.parse(localStorage.getItem('nw_budgets') || '[]'); } catch { return []; }
}
function saveBudgets(b: Budget[]) { localStorage.setItem('nw_budgets', JSON.stringify(b)); }
function loadManualTx(): ManualTx[] {
  try { return JSON.parse(localStorage.getItem('nw_manual_tx') || '[]'); } catch { return []; }
}
function saveManualTx(t: ManualTx[]) { localStorage.setItem('nw_manual_tx', JSON.stringify(t)); }

function formatMoney(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k`;
  return n.toLocaleString('vi-VN');
}
function formatMoneyFull(n: number) { return n.toLocaleString('vi-VN') + 'đ'; }

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

// ─── Budget Ring ───
function BudgetRing({ spent, limit, color }: { spent: number; limit: number; color: string }) {
  const pct = Math.min(100, limit > 0 ? (spent / limit) * 100 : 0);
  const r = 20; const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const isOver = pct >= 100;
  return (
    <svg width="48" height="48" className="flex-shrink-0">
      <circle cx="24" cy="24" r={r} fill="none" stroke="var(--bg-surface)" strokeWidth="5" />
      <circle cx="24" cy="24" r={r} fill="none"
        stroke={isOver ? 'var(--error)' : color} strokeWidth="5"
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round" transform="rotate(-90 24 24)"
        style={{ transition: 'stroke-dasharray 0.5s ease' }} />
      <text x="24" y="28" textAnchor="middle" fontSize="9" fontWeight="bold"
        fill={isOver ? 'var(--error)' : 'var(--text-primary)'}>
        {Math.round(pct)}%
      </text>
    </svg>
  );
}

// ─── Insight Card ───
function InsightCard({ icon, text, color }: { icon: string; text: string; color: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-[var(--bg-surface)] rounded-xl p-3 border border-[var(--border-subtle)]">
      <span className="text-lg flex-shrink-0">{icon}</span>
      <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{text}</p>
    </div>
  );
}

export default function FinancePage() {
  const tasks = useTaskStore(s => s.tasks);
  const timezone = useSettingsStore(s => s.timezone);
  const [period, setPeriod] = useState<Period>('month');
  const [view, setView] = useState<ViewMode>('overview');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'pie'>('bar');
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [showAddTx, setShowAddTx] = useState(false);
  const [showAddBudget, setShowAddBudget] = useState(false);
  const [budgets, setBudgets] = useState<Budget[]>(loadBudgets);
  const [manualTx, setManualTx] = useState<ManualTx[]>(loadManualTx);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [txAmount, setTxAmount] = useState('');
  const [txNote, setTxNote] = useState('');
  const [txCategory, setTxCategory] = useState('other');
  const [budgetCat, setBudgetCat] = useState('other');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [budgetPeriod, setBudgetPeriod] = useState<'week' | 'month'>('month');
  const [expandedBudgets, setExpandedBudgets] = useState(false);

  const now = getNowInTimezone(timezone);

  const cutoffTime = useMemo(() => {
    const cutoff = period === 'week' ? 7 : period === 'month' ? 30 : 9999;
    return now.getTime() - cutoff * 86400000;
  }, [period, now.getTime()]);

  // Combine task finance + manual transactions
  const taskTx = useMemo(() => {
    const txs: any[] = [];
    tasks.forEach(t => {
      if (t.status === 'done' && t.finance && t.completedAt && t.completedAt >= cutoffTime) {
        // Handle array of finance items
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
          // Backward compatibility for single finance object
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
    return txs;
  }, [tasks, cutoffTime]);

  const allTx = useMemo(() => [
    ...taskTx,
    ...manualTx.filter(tx => tx.date >= cutoffTime).map(tx => ({ ...tx, source: 'manual' as const })),
  ].sort((a, b) => b.date - a.date), [taskTx, manualTx, cutoffTime]);

  const filtered = useMemo(() =>
    filterType === 'all' ? allTx : allTx.filter(tx => tx.type === filterType),
    [allTx, filterType]);

  const stats = useMemo(() => {
    let income = 0, expense = 0;
    allTx.forEach(tx => { if (tx.type === 'income') income += tx.amount; else expense += tx.amount; });
    return { income, expense, net: income - expense, txCount: allTx.length };
  }, [allTx]);

  const dailyData = useMemo(() => {
    const days: Record<string, { date: string; income: number; expense: number; net: number }> = {};
    allTx.forEach(tx => {
      const d = new Date(tx.date);
      const key = `${d.getDate()}/${d.getMonth() + 1}`;
      if (!days[key]) days[key] = { date: key, income: 0, expense: 0, net: 0 };
      if (tx.type === 'income') { days[key].income += tx.amount; days[key].net += tx.amount; }
      else { days[key].expense += tx.amount; days[key].net -= tx.amount; }
    });
    return Object.values(days).slice(-14);
  }, [allTx]);

  const categoryData = useMemo(() => {
    const cats: Record<string, { name: string; icon: string; color: string; income: number; expense: number }> = {};
    allTx.forEach(tx => {
      const cfg = CATEGORY_CONFIG[tx.category] || CATEGORY_CONFIG.other;
      if (!cats[tx.category]) cats[tx.category] = { name: cfg.label, icon: cfg.icon, color: cfg.color, income: 0, expense: 0 };
      if (tx.type === 'income') cats[tx.category].income += tx.amount;
      else cats[tx.category].expense += tx.amount;
    });
    return Object.entries(cats).map(([key, v]) => ({ ...v, key, total: v.expense })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);
  }, [allTx]);

  const insights = useMemo(() => {
    const result: { icon: string; text: string; color: string }[] = [];
    if (stats.net > 0) result.push({ icon: '📈', text: `Bạn đang tiết kiệm được ${formatMoneyFull(stats.net)} trong kỳ này. Tốt lắm!`, color: 'var(--success)' });
    else if (stats.net < 0) result.push({ icon: '⚠️', text: `Chi vượt thu ${formatMoneyFull(-stats.net)}. Hãy xem lại ngân sách.`, color: 'var(--warning)' });
    if (categoryData[0]) result.push({ icon: '🔍', text: `Danh mục chi nhiều nhất: ${categoryData[0].icon} ${categoryData[0].name} (${formatMoneyFull(categoryData[0].expense)})`, color: 'var(--info)' });
    if (allTx.length === 0) result.push({ icon: '💡', text: 'Chưa có giao dịch. Thêm thu/chi khi tạo task hoặc nhấn nút + bên dưới.', color: 'var(--text-muted)' });
    return result;
  }, [stats, categoryData, allTx]);

  const addTransaction = () => {
    if (!txAmount || isNaN(Number(txAmount))) return;
    const tx: ManualTx = {
      id: Date.now().toString(36),
      type: txType, amount: parseInt(txAmount), note: txNote || 'Giao dịch thủ công',
      category: txCategory, date: Date.now(),
    };
    const updated = [tx, ...manualTx];
    saveManualTx(updated); setManualTx(updated);
    setTxAmount(''); setTxNote(''); setShowAddTx(false);
  };

  const addBudget = () => {
    if (!budgetLimit || isNaN(Number(budgetLimit))) return;
    const b: Budget = { id: Date.now().toString(36), category: budgetCat, limit: parseInt(budgetLimit), period: budgetPeriod };
    const filtered = budgets.filter(x => x.category !== budgetCat);
    const updated = [...filtered, b];
    saveBudgets(updated); setBudgets(updated);
    setBudgetLimit(''); setShowAddBudget(false);
  };

  const deleteTx = (id: string) => {
    const updated = manualTx.filter(tx => tx.id !== id);
    saveManualTx(updated); setManualTx(updated);
  };

  const deleteBudget = (id: string) => {
    const updated = budgets.filter(b => b.id !== id);
    saveBudgets(updated); setBudgets(updated);
  };

  const getBudgetSpent = (cat: string) =>
    allTx.filter(tx => tx.type === 'expense' && tx.category === cat).reduce((s, tx) => s + tx.amount, 0);

  return (
    <div className="flex flex-col h-full pb-24 overflow-y-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-strong border-b border-[var(--border-subtle)] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">Thu Chi</h1>
            <p className="text-[10px] text-[var(--text-muted)]">{allTx.length} giao dịch • {period === 'week' ? '7 ngày' : period === 'month' ? '30 ngày' : 'Tất cả'}</p>
          </div>
          <button onClick={() => setShowAddTx(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--accent-primary)] text-[var(--bg-base)] text-xs font-bold min-h-[36px]">
            <Plus size={14} /> Giao dịch
          </button>
        </div>
        {/* Tabs */}
        <div className="flex gap-1">
          {(['overview', 'chart', 'transactions'] as ViewMode[]).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-medium transition-colors ${view === v ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}>
              {v === 'overview' ? '📊 Tổng quan' : v === 'chart' ? '📈 Biểu đồ' : '📋 Giao dịch'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Period Selector */}
        <div className="flex gap-1.5 bg-[var(--bg-elevated)] rounded-xl p-1">
          {(['week', 'month', 'all'] as Period[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${period === p ? 'bg-[var(--accent-primary)] text-[var(--bg-base)] shadow-sm' : 'text-[var(--text-muted)]'}`}>
              {p === 'week' ? '7 ngày' : p === 'month' ? '30 ngày' : 'Tất cả'}
            </button>
          ))}
        </div>

        {/* ── OVERVIEW TAB ── */}
        {view === 'overview' && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-2">
              <SummaryCard label="Tổng thu" value={stats.income} icon={TrendingUp} color="var(--success)" />
              <SummaryCard label="Tổng chi" value={stats.expense} icon={TrendingDown} color="var(--error)" />
              <SummaryCard label={stats.net >= 0 ? 'Tiết kiệm' : 'Bội chi'} value={Math.abs(stats.net)} icon={ArrowLeftRight} color={stats.net >= 0 ? 'var(--success)' : 'var(--error)'} />
            </div>

            {/* Net balance hero */}
            <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 border border-[var(--border-accent)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[rgba(0,229,204,0.06)] to-transparent" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-xs text-[var(--text-muted)] mb-1">Số dư ròng</p>
                  <p className={`text-3xl font-black font-mono tabular-nums ${stats.net >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                    {stats.net >= 0 ? '+' : ''}{formatMoneyFull(stats.net)}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1">{stats.txCount} giao dịch</p>
                </div>
                <div className="size-16 rounded-full border-4 flex items-center justify-center"
                  style={{ borderColor: stats.net >= 0 ? 'var(--success)' : 'var(--error)' }}>
                  <Wallet size={24} style={{ color: stats.net >= 0 ? 'var(--success)' : 'var(--error)' }} />
                </div>
              </div>
            </div>

            {/* Category Breakdown */}
            {categoryData.length > 0 && (
              <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 border border-[var(--border-subtle)]">
                <h2 className="text-xs font-bold text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
                  <PieIcon size={13} /> Theo danh mục
                </h2>
                <div className="space-y-2">
                  {categoryData.map(cat => {
                    const pct = stats.expense > 0 ? (cat.expense / stats.expense) * 100 : 0;
                    return (
                      <div key={cat.key}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm">{cat.icon}</span>
                            <span className="text-xs text-[var(--text-primary)]">{cat.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {cat.income > 0 && <span className="text-[10px] text-[var(--success)] font-mono">+{formatMoney(cat.income)}</span>}
                            <span className="text-xs font-bold text-[var(--error)] font-mono">-{formatMoney(cat.expense)}</span>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: cat.color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Budgets */}
            <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)]">
              <button onClick={() => setExpandedBudgets(!expandedBudgets)}
                className="w-full flex items-center justify-between px-4 py-3">
                <h2 className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Target size={13} /> Ngân sách ({budgets.length})
                </h2>
                <div className="flex items-center gap-2">
                  <button onClick={e => { e.stopPropagation(); setShowAddBudget(true); }}
                    className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--accent-dim)] text-[10px] text-[var(--accent-primary)] min-h-[24px]">
                    <Plus size={10} /> Thêm
                  </button>
                  {expandedBudgets ? <ChevronUp size={14} className="text-[var(--text-muted)]" /> : <ChevronDown size={14} className="text-[var(--text-muted)]" />}
                </div>
              </button>
              {expandedBudgets && (
                <div className="px-4 pb-4 space-y-3">
                  {budgets.length === 0 && (
                    <p className="text-xs text-[var(--text-muted)] text-center py-4">Chưa có ngân sách. Thêm để kiểm soát chi tiêu.</p>
                  )}
                  {budgets.map(b => {
                    const spent = getBudgetSpent(b.category);
                    const cfg = CATEGORY_CONFIG[b.category] || CATEGORY_CONFIG.other;
                    const isOver = spent > b.limit;
                    return (
                      <div key={b.id} className="flex items-center gap-3 bg-[var(--bg-surface)] rounded-xl p-3">
                        <BudgetRing spent={spent} limit={b.limit} color={cfg.color} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="text-sm">{cfg.icon}</span>
                            <span className="text-xs font-semibold text-[var(--text-primary)]">{cfg.label}</span>
                            <span className="text-[9px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-1.5 py-0.5 rounded">{b.period === 'month' ? 'T' : '7N'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className={`text-xs font-mono font-bold ${isOver ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'}`}>{formatMoney(spent)}</span>
                            <span className="text-[10px] text-[var(--text-muted)]">/ {formatMoney(b.limit)}</span>
                          </div>
                          {isOver && <p className="text-[9px] text-[var(--error)] mt-0.5">⚠️ Vượt {formatMoney(spent - b.limit)}</p>}
                        </div>
                        <button onClick={() => deleteBudget(b.id)} className="size-7 rounded-lg bg-[rgba(248,113,113,0.1)] flex items-center justify-center text-[var(--error)]">
                          <X size={12} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Insights */}
            {insights.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
                  <Info size={13} /> Phân tích
                </h2>
                {insights.map((ins, i) => <InsightCard key={i} {...ins} />)}
              </div>
            )}
          </>
        )}

        {/* ── CHART TAB ── */}
        {view === 'chart' && (
          <>
            <div className="flex gap-1.5 bg-[var(--bg-elevated)] rounded-xl p-1">
              {(['bar', 'line', 'pie'] as const).map(ct => (
                <button key={ct} onClick={() => setChartType(ct)}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all ${chartType === ct ? 'bg-[var(--accent-primary)] text-[var(--bg-base)]' : 'text-[var(--text-muted)]'}`}>
                  {ct === 'bar' ? '📊 Cột' : ct === 'line' ? '📈 Đường' : '🥧 Tròn'}
                </button>
              ))}
            </div>

            <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 border border-[var(--border-subtle)]">
              <h2 className="text-xs font-bold text-[var(--text-secondary)] mb-3">
                {chartType === 'bar' ? 'Thu chi theo ngày' : chartType === 'line' ? 'Xu hướng số dư ròng' : 'Phân bổ chi tiêu'}
              </h2>
              {dailyData.length === 0 && categoryData.length === 0 ? (
                <div className="h-40 flex items-center justify-center">
                  <p className="text-xs text-[var(--text-muted)]">Chưa có dữ liệu</p>
                </div>
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    {chartType === 'bar' ? (
                      <BarChart data={dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                        <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} width={28} tickFormatter={v => formatMoney(v)} />
                        <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '10px', fontSize: '11px' }}
                          formatter={(v: number, name: string) => [formatMoneyFull(v), name === 'income' ? 'Thu' : 'Chi']} />
                        <Bar dataKey="income" fill="#34D399" radius={[4, 4, 0, 0]} maxBarSize={20} />
                        <Bar dataKey="expense" fill="#F87171" radius={[4, 4, 0, 0]} maxBarSize={20} />
                      </BarChart>
                    ) : chartType === 'line' ? (
                      <LineChart data={dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="date" tick={{ fontSize: 9, fill: 'var(--text-muted)' }} />
                        <YAxis tick={{ fontSize: 9, fill: 'var(--text-muted)' }} width={28} tickFormatter={v => formatMoney(v)} />
                        <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '10px', fontSize: '11px' }}
                          formatter={(v: number) => [formatMoneyFull(v), 'Ròng']} />
                        <Line type="monotone" dataKey="net" stroke="var(--accent-primary)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent-primary)' }} />
                      </LineChart>
                    ) : (
                      <PieChart>
                        <Pie data={categoryData} cx="50%" cy="50%" outerRadius={85} dataKey="expense" strokeWidth={0}>
                          {categoryData.map((cat, i) => <Cell key={i} fill={cat.color} />)}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', borderRadius: '10px', fontSize: '11px' }}
                          formatter={(v: number, _, props) => [formatMoneyFull(v), props.payload?.name]} />
                      </PieChart>
                    )}
                  </ResponsiveContainer>
                </div>
              )}
              {chartType === 'pie' && categoryData.length > 0 && (
                <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
                  {categoryData.map(cat => (
                    <div key={cat.key} className="flex items-center gap-1">
                      <div className="size-2 rounded-full" style={{ backgroundColor: cat.color }} />
                      <span className="text-[9px] text-[var(--text-muted)]">{cat.icon} {cat.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Monthly goal indicator */}
            {stats.expense > 0 && (
              <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 border border-[var(--border-subtle)]">
                <h2 className="text-xs font-bold text-[var(--text-secondary)] mb-3 flex items-center gap-1.5"><Flame size={13} className="text-[var(--warning)]" /> Hiệu suất tài chính</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[var(--bg-surface)] rounded-xl p-3 text-center">
                    <p className="text-lg font-black font-mono text-[var(--success)]">{stats.income > 0 ? Math.round((stats.expense / stats.income) * 100) : 0}%</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Tỷ lệ chi/thu</p>
                  </div>
                  <div className="bg-[var(--bg-surface)] rounded-xl p-3 text-center">
                    <p className="text-lg font-black font-mono text-[var(--info)]">{stats.txCount}</p>
                    <p className="text-[10px] text-[var(--text-muted)]">Giao dịch</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ── TRANSACTIONS TAB ── */}
        {view === 'transactions' && (
          <>
            {/* Filter */}
            <div className="flex gap-1.5 bg-[var(--bg-elevated)] rounded-xl p-1">
              {(['all', 'income', 'expense'] as const).map(f => (
                <button key={f} onClick={() => setFilterType(f)}
                  className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition-all ${filterType === f ? 'bg-[var(--accent-primary)] text-[var(--bg-base)]' : 'text-[var(--text-muted)]'}`}>
                  {f === 'all' ? 'Tất cả' : f === 'income' ? '↑ Thu' : '↓ Chi'}
                </button>
              ))}
            </div>

            <p className="text-xs text-[var(--text-muted)]">{filtered.length} giao dịch</p>

            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)]">
                <DollarSign size={32} className="text-[var(--text-muted)] mb-2 opacity-40" />
                <p className="text-sm text-[var(--text-muted)]">Chưa có giao dịch</p>
                <p className="text-[10px] text-[var(--text-muted)] mt-1">Nhấn + để thêm thủ công</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filtered.map(tx => {
                  const cfg = CATEGORY_CONFIG[tx.category] || CATEGORY_CONFIG.other;
                  return (
                    <div key={tx.id} className="flex items-center gap-3 bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)] group">
                      <div className="size-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ backgroundColor: `${cfg.color}15` }}>
                        {cfg.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{tx.note}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[9px] text-[var(--text-muted)]">{new Date(tx.date).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}</span>
                          <span className="text-[9px] text-[var(--text-muted)]">•</span>
                          <span className="text-[9px]" style={{ color: cfg.color }}>{cfg.label}</span>
                          {(tx as any).source === 'manual' && <span className="text-[8px] bg-[var(--bg-surface)] px-1 py-0.5 rounded text-[var(--text-muted)]">manual</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <p className={`text-sm font-bold font-mono tabular-nums ${tx.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatMoney(tx.amount)}
                        </p>
                        {(tx as any).source === 'manual' && (
                          <button onClick={() => deleteTx(tx.id)} className="size-6 rounded-lg opacity-0 group-hover:opacity-100 bg-[rgba(248,113,113,0.1)] flex items-center justify-center text-[var(--error)] transition-opacity">
                            <X size={10} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── ADD TRANSACTION MODAL ── */}
      {showAddTx && (
        <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70" onClick={() => setShowAddTx(false)}>
          <div className="w-full max-w-md bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Thêm giao dịch</h3>
              <button onClick={() => setShowAddTx(false)} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><X size={14} /></button>
            </div>
            <div className="flex gap-1.5 mb-4 bg-[var(--bg-surface)] rounded-xl p-1">
              {(['income', 'expense'] as const).map(t => (
                <button key={t} onClick={() => setTxType(t)}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${txType === t ? t === 'income' ? 'bg-[var(--success)] text-white' : 'bg-[var(--error)] text-white' : 'text-[var(--text-muted)]'}`}>
                  {t === 'income' ? '↑ Thu' : '↓ Chi'}
                </button>
              ))}
            </div>
            <input type="number" value={txAmount} onChange={e => setTxAmount(e.target.value)} placeholder="Số tiền (VND)" inputMode="numeric"
              className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] mb-3 min-h-[44px] font-mono" />
            <input type="text" value={txNote} onChange={e => setTxNote(e.target.value)} placeholder="Ghi chú"
              className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] mb-3 min-h-[44px]" />
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                <button key={k} onClick={() => setTxCategory(k)}
                  className={`py-2 rounded-xl flex flex-col items-center gap-0.5 text-[9px] font-medium transition-all ${txCategory === k ? 'bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent-primary)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                  <span className="text-base">{v.icon}</span>{v.label}
                </button>
              ))}
            </div>
            <button onClick={addTransaction} disabled={!txAmount}
              className="w-full py-3 rounded-xl text-sm font-bold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-30 min-h-[44px]">
              Thêm giao dịch
            </button>
          </div>
        </div>
      )}

      {/* ── ADD BUDGET MODAL ── */}
      {showAddBudget && (
        <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70" onClick={() => setShowAddBudget(false)}>
          <div className="w-full max-w-md bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Đặt ngân sách</h3>
              <button onClick={() => setShowAddBudget(false)} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><X size={14} /></button>
            </div>
            <div className="grid grid-cols-4 gap-1.5 mb-4">
              {Object.entries(CATEGORY_CONFIG).map(([k, v]) => (
                <button key={k} onClick={() => setBudgetCat(k)}
                  className={`py-2 rounded-xl flex flex-col items-center gap-0.5 text-[9px] font-medium transition-all ${budgetCat === k ? 'bg-[var(--accent-dim)] border border-[var(--border-accent)] text-[var(--accent-primary)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                  <span className="text-base">{v.icon}</span>{v.label}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              {(['week', 'month'] as const).map(p => (
                <button key={p} onClick={() => setBudgetPeriod(p)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${budgetPeriod === p ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                  {p === 'week' ? '7 ngày' : 'Tháng'}
                </button>
              ))}
            </div>
            <input type="number" value={budgetLimit} onChange={e => setBudgetLimit(e.target.value)} placeholder="Giới hạn chi tiêu (VND)" inputMode="numeric"
              className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] mb-4 min-h-[44px] font-mono" />
            <button onClick={addBudget} disabled={!budgetLimit}
              className="w-full py-3 rounded-xl text-sm font-bold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-30 min-h-[44px]">
              Đặt ngân sách
            </button>
          </div>
        </div>
      )}
    </div>
  );
}