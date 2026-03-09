import { useState, useMemo } from 'react';
import { useTaskStore, useSettingsStore, useTemplateStore } from '@/stores';
import type { FinanceCategory } from '@/stores';
import { formatTimeRemaining, formatDeadlineDisplay } from '@/lib/notifications';
import { shareTask } from '@/lib/calendarExport';
import { isTaskOverdue } from '@/lib/autoQuadrant';

import {
  X, Calendar, Clock, RotateCcw, DollarSign,
  Play, CheckCircle2, Copy, Check, FileText, FolderOpen, Share2, AlertCircle, Pencil,
  Plus, Trash2,
} from 'lucide-react';
import type { Task, TaskFinance } from '@/types';

function formatDuration(s: number) {
  if (s === 0) return '0s';
  const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m`;
  return `${s}s`;
}

interface TaskViewModalProps { task: Task; onClose: () => void; onEdit: () => void; }

export function TaskViewModal({ task, onClose, onEdit }: TaskViewModalProps) {
  const updateTask = useTaskStore(s => s.updateTask);
  const startTimer = useTaskStore(s => s.startTimer);
  const timer = useTaskStore(s => s.timer);
  const templates = useTemplateStore(s => s.templates);
  const addTemplate = useTemplateStore(s => s.addTemplate);
  const timezone = useSettingsStore(s => s.timezone);
  const { dailyTimeCost } = useSettingsStore();
  const financeCategories = useSettingsStore(s => s.financeCategories);

  const deadlineInfo = task.deadline ? formatTimeRemaining(task.deadline, timezone) : null;
  const deadlineDisplay = task.deadline ? formatDeadlineDisplay(task.deadline, timezone) : null;
  const taskIsOverdue = isTaskOverdue(task);
  // Ràng buộc: Không cho bấm giờ với Ủy thác và Loại bỏ
  const canTimer = task.status !== 'done' && task.quadrant !== 'delegate' && task.quadrant !== 'eliminate' && !(timer.isRunning || timer.isPaused);
  const hasTemplate = templates.some(t => t.title.toLowerCase() === task.title.toLowerCase());
  const groupNames = useMemo(() => {
    if (!task.groupTemplateIds) return [];
    return task.groupTemplateIds.map(gid => templates.find(t => t.id === gid)?.title).filter(Boolean) as string[];
  }, [task.groupTemplateIds, templates]);

  const [editingFinance, setEditingFinance] = useState(false);
  const [financeItems, setFinanceItems] = useState<TaskFinance[]>(
    Array.isArray(task.finance) ? task.finance : task.finance ? [task.finance] : []
  );
  const [copied, setCopied] = useState(false);

  const saveFinance = () => {
    const validFinance = financeItems.filter(f => f.amount > 0);
    updateTask(task.id, { 
      finance: validFinance, 
      showFinance: validFinance.length > 0 
    });
    setEditingFinance(false);
  };

  const addFinanceItem = () => {
    setFinanceItems([
      ...financeItems,
      {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
        type: 'expense',
        amount: 0,
        category: task.category || 'other',
        note: ''
      }
    ]);
  };

  const removeFinanceItem = (id: string) => {
    setFinanceItems(financeItems.filter(f => f.id !== id));
  };

  const updateFinanceItem = (id: string, updates: Partial<TaskFinance>) => {
    setFinanceItems(financeItems.map(f => f.id === id ? { ...f, ...updates } : f));
  };

  const handleAddToTemplate = () => {
    addTemplate({
      title: task.title, recurring: task.recurring || { type: 'none' },
      notes: task.notes, 
      finance: task.finance && task.finance.length > 0 ? task.finance[0] : undefined,
    });
  };

  const handleShare = async () => {
    const text = shareTask(task);
    if (navigator.share) {
      try { await navigator.share({ text }); } catch { /* silent */ }
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  /* ── finance totals ── */
  const financeTotal = useMemo(() => {
    if (!Array.isArray(task.finance) || task.finance.length === 0) return null;
    const income = task.finance.filter(f => f.type === 'income').reduce((s, f) => s + f.amount, 0);
    const expense = task.finance.filter(f => f.type === 'expense').reduce((s, f) => s + f.amount, 0);
    return { income, expense, net: income - expense };
  }, [task.finance]);

  /* ── profit/loss analysis ── */
  const profitLossAnalysis = useMemo(() => {
    const timeCost = task.duration ? Math.floor((task.duration * dailyTimeCost) / 86400) : 0;
    const emergentCost = Array.isArray(task.finance) 
      ? task.finance.filter(f => f.type === 'expense').reduce((s, f) => s + f.amount, 0)
      : 0;
    const totalIncome = Array.isArray(task.finance)
      ? task.finance.filter(f => f.type === 'income').reduce((s, f) => s + f.amount, 0)
      : 0;
    const totalExpense = timeCost + emergentCost;
    const netProfit = totalIncome - totalExpense;
    const isProfitable = netProfit > 0;
    const isBreakEven = netProfit === 0;
    
    // Determine reasons and suggestions
    let reason = '';
    let suggestion = '';
    
    if (totalIncome === 0 && totalExpense === 0) {
      reason = 'Chưa có dữ liệu thu/chi';
      suggestion = 'Thêm thu nhập và chi phí để phân tích';
    } else if (isProfitable) {
      reason = `Thu nhập ${totalIncome.toLocaleString('vi-VN')}đ > Chi phí ${totalExpense.toLocaleString('vi-VN')}đ`;
      if (timeCost > 0 && emergentCost > 0) {
        suggestion = 'Tốt! Cả chi phí thời gian và chi phí phát sinh đều được tính vào. Hãy tiếp tục tối ưu hóa!';
      } else if (timeCost > 0) {
        suggestion = 'Tốt! Chi phí thời gian đã được tính. Có thể thêm các chi phí phát sinh khác nếu có.';
      } else if (emergentCost > 0) {
        suggestion = 'Tốt! Đã có chi phí phát sinh. Hãy theo dõi thời gian làm việc để có bức tranh tài chính đầy đủ hơn.';
      } else {
        suggestion = 'Hãy thêm chi phí thời gian (bấm giờ) và chi phí phát sinh để có phân tích chính xác hơn.';
      }
    } else if (isBreakEven) {
      reason = `Thu nhập = Chi phí (Hòa vốn)`;
      suggestion = 'Hòa vốn! Hãy tìm cách tăng thu nhập hoặc giảm chi phí để có lợi nhuận.';
    } else {
      reason = `Chi phí ${totalExpense.toLocaleString('vi-VN')}đ > Thu nhập ${totalIncome.toLocaleString('vi-VN')}đ`;
      if (timeCost > emergentCost) {
        suggestion = 'Chi phí thời gian chiếm phần lớn. Hãy tìm cách làm việc hiệu quả hơn hoặc tăng giá trị công việc.';
      } else if (emergentCost > 0) {
        suggestion = 'Chi phí phát sinh cao. Hãy kiểm soát các khoản chi phí phát sinh.';
      } else {
        suggestion = 'Hãy tăng thu nhập từ công việc này hoặc giảm chi phí vận hành.';
      }
    }
    
    return {
      timeCost,
      emergentCost,
      totalIncome,
      totalExpense,
      netProfit,
      isProfitable,
      isBreakEven,
      reason,
      suggestion
    };
  }, [task.finance, task.duration, dailyTimeCost]);

  const statusConfig = {
    done:        { label: 'Xong',       dot: 'bg-[var(--success)]',  pill: 'bg-[rgba(52,211,153,0.12)] text-[var(--success)]' },
    overdue:     { label: 'Quá hạn',    dot: 'bg-[var(--error)]',    pill: 'bg-[rgba(248,113,113,0.12)] text-[var(--error)]' },
    in_progress: { label: 'Đang làm',   dot: 'bg-[var(--warning)]',  pill: 'bg-[rgba(251,191,36,0.12)] text-[var(--warning)]' },
    paused:      { label: 'Tạm dừng',   dot: 'bg-[var(--info)]',     pill: 'bg-[rgba(96,165,250,0.12)] text-[var(--info)]' },
    pending:     { label: 'Chờ',        dot: 'bg-[var(--text-muted)]',pill: 'bg-[var(--bg-surface)] text-[var(--text-muted)]' },
  } as const;
  const sc = statusConfig[task.status as keyof typeof statusConfig] ?? statusConfig.pending;

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <div className={`size-2 rounded-full ${taskIsOverdue ? 'bg-[var(--error)]' : 'bg-[var(--accent-primary)]'}`} />
            <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest truncate max-w-[200px]">{task.title}</h2>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onClose}
              className="size-8 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-surface)] transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">

          {/* Title + status */}
          <div className="flex items-start gap-3 px-3 py-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
            <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${taskIsOverdue ? 'bg-[var(--error)]' : 'bg-[var(--accent-primary)]'}`} />
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-[var(--text-primary)] break-words leading-snug mb-2">{task.title}</h3>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-semibold ${sc.pill}`}>
                  <span className={`size-1.5 rounded-full ${sc.dot}`} />
                  {sc.label}
                </span>
                {groupNames.length > 0 && (
                  <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                    <FolderOpen size={10} /> {groupNames.join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Meta info cards */}
          {(task.showDeadline && deadlineDisplay || (task.duration && task.duration > 0) || (task.showRecurring && task.recurring?.type !== 'none')) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {task.showDeadline && deadlineDisplay && (
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <div className={`size-8 rounded-lg flex items-center justify-center flex-shrink-0 ${deadlineInfo?.urgent ? 'bg-[rgba(248,113,113,0.15)]' : 'bg-[var(--bg-elevated)]'}`}>
                    <Calendar size={14} className={deadlineInfo?.urgent ? 'text-[var(--error)]' : 'text-[var(--text-muted)]'} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-[var(--text-muted)]">Hạn chót</p>
                    <p className={`text-xs font-semibold truncate ${deadlineInfo?.urgent ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'}`}>
                      {deadlineDisplay}
                    </p>
                    {deadlineInfo && <p className="text-[10px] text-[var(--text-muted)]">{deadlineInfo.text}</p>}
                  </div>
                </div>
              )}
              {task.duration && task.duration > 0 && (
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                  <div className="size-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--accent-dim)] mt-0.5">
                    <Clock size={14} className="text-[var(--accent-primary)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] text-[var(--text-muted)]">Thời lượng</p>
                    <p className="text-xs font-mono font-semibold text-[var(--text-primary)]">{formatDuration(task.duration)}</p>
                  </div>
                </div>
              )}
              {task.showRecurring && task.recurring?.type !== 'none' && (
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] sm:col-span-2">
                  <div className="size-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[rgba(96,165,250,0.15)]">
                    <RotateCcw size={14} className="text-[var(--info)]" />
                  </div>
                  <div>
                    <p className="text-[10px] text-[var(--text-muted)]">Lặp lại</p>
                    <p className="text-xs font-semibold text-[var(--text-primary)]">
                      {task.recurring.type === 'daily' ? 'Hàng ngày' : task.recurring.type === 'weekdays' ? 'Thứ 2 - Thứ 6' : 'Hàng tuần'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          {task.showNotes && task.notes && (
            <div className="px-3 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <p className="text-[10px] font-semibold text-[var(--text-muted)] mb-1.5 uppercase tracking-wide">📝 Ghi chú</p>
              <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{task.notes}</p>
            </div>
          )}

          {/* Rich content from templates */}
          {task.templateId && (() => {
            const template = templates.find(t => t.id === task.templateId);
            if (!template) return null;
            return (
              <div className="space-y-2">
                {template.richContent && (
                  <div className="px-3 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: template.richContent }} />
                )}
                {template.media && template.media.length > 0 && (
                  <div className="space-y-2">
                    {template.media.map(block => (
                      <div key={block.id} className="rounded-xl overflow-hidden bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                        {block.type === 'image' && (
                          <div>
                            <img src={block.content} alt={block.caption || ''} className="w-full" />
                            {block.caption && <p className="text-[10px] text-[var(--text-muted)] px-3 py-1.5">{block.caption}</p>}
                          </div>
                        )}
                        {block.type === 'youtube' && (
                          <div>
                            <div className="aspect-video">
                              <iframe src={block.content} className="w-full h-full" allowFullScreen />
                            </div>
                            {block.caption && <p className="text-[10px] text-[var(--text-muted)] px-3 py-1.5">{block.caption}</p>}
                          </div>
                        )}
                        {block.type === 'text' && (
                          <div className="px-3 py-2">
                            <p className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap">{block.content}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

          {/* Finance section */}
          {task.showFinance && (
            <div className="rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2.5 border-b border-[var(--border-subtle)]">
                <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide flex items-center gap-1.5">
                  <DollarSign size={11} /> Tài chính
                </p>
                <button onClick={() => setEditingFinance(!editingFinance)}
                  className="text-[10px] font-bold text-[var(--accent-primary)] hover:underline">
                  {editingFinance ? 'Đóng' : 'Quản lý'}
                </button>
              </div>

              {/* Edit mode */}
              {editingFinance ? (
                <div className="px-3 py-2.5 space-y-3">
                  {financeItems.map((item) => (
                    <div key={item.id} className="bg-[var(--bg-elevated)] p-2 rounded-lg border border-[var(--border-subtle)] space-y-2">
                      <div className="flex gap-2">
                        <button onClick={() => updateFinanceItem(item.id, { type: item.type === 'income' ? 'expense' : 'income' })}
                          className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors flex-shrink-0 ${item.type === 'income' ? 'bg-[rgba(52,211,153,0.15)] text-[var(--success)]' : 'bg-[rgba(248,113,113,0.15)] text-[var(--error)]'}`}>
                          {item.type === 'income' ? '+ Thu' : '- Chi'}
                        </button>
                        <input type="number" value={item.amount || ''} onChange={e => updateFinanceItem(item.id, { amount: Math.max(0, parseInt(e.target.value) || 0) })}
                          placeholder="Số tiền" inputMode="numeric"
                          className="flex-1 bg-[var(--bg-surface)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] font-mono min-h-[30px]" />
                        <button onClick={() => removeFinanceItem(item.id)} className="size-7 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--error)]">
                          <Trash2 size={12} />
                        </button>
                      </div>
                      {/* Category picker from settings */}
                      <div className="flex flex-wrap gap-1">
                        {financeCategories
                          .filter(c => c.type === item.type || c.type === 'both')
                          .map((c: FinanceCategory) => (
                            <button key={c.id} onClick={() => updateFinanceItem(item.id, { note: c.name })}
                              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] transition-colors ${(item.note && item.note.startsWith(c.name)) ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                              <span>{c.icon}</span>{c.name}
                            </button>
                          ))}
                      </div>
                      <input type="text" value={item.note || ''} onChange={e => updateFinanceItem(item.id, { note: e.target.value })}
                        placeholder="Ghi chú thêm (tuỳ chọn)..."
                        className="w-full bg-[var(--bg-surface)] rounded-lg px-2 py-1 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[30px]" />
                    </div>
                  ))}
                  <button onClick={addFinanceItem}
                    className="w-full py-2 rounded-lg border border-dashed border-[var(--border-subtle)] text-[10px] text-[var(--text-muted)] flex items-center justify-center gap-1 hover:bg-[var(--bg-elevated)]">
                    <Plus size={12} /> Thêm khoản mới
                  </button>
                  <button onClick={saveFinance}
                    className="w-full py-2.5 rounded-lg text-xs font-bold text-[var(--bg-base)] bg-[var(--accent-primary)] min-h-[36px]">
                    Lưu thay đổi
                  </button>
                </div>
              ) : (
                <div className="px-3 py-2.5 space-y-3">
                  {/* Danh sách Thu */}
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--success)] uppercase tracking-wide mb-1.5 flex items-center gap-1">
                      📥 Danh sách Thu
                    </p>
                    {task.finance && Array.isArray(task.finance) && task.finance.filter(f => f.type === 'income').length > 0 ? (
                      <div className="space-y-1 bg-[var(--bg-elevated)] rounded-lg p-2">
                        {task.finance.filter(f => f.type === 'income').map(f => (
                          <div key={f.id} className="flex items-center justify-between py-0.5">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className="size-1.5 rounded-full flex-shrink-0 bg-[var(--success)]" />
                              <p className="text-xs text-[var(--text-primary)] truncate">{f.note || 'Thu nhập'}</p>
                            </div>
                            <p className="text-xs font-bold font-mono flex-shrink-0 ml-2 text-[var(--success)]">
                              +{Math.floor(f.amount).toLocaleString('vi-VN')}đ
                            </p>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-1.5 mt-1 border-t border-[var(--border-subtle)]">
                          <p className="text-[10px] font-semibold text-[var(--text-muted)]">Tổng Thu</p>
                          <p className="text-xs font-bold font-mono text-[var(--success)]">
                            +{Math.floor(profitLossAnalysis.totalIncome).toLocaleString('vi-VN')}đ
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-[var(--text-muted)] italic pl-2">Chưa có thu nhập</p>
                    )}
                  </div>

                  {/* Danh sách Chi - Phân tách Chi phí Phát sinh và Chi phí Thời gian */}
                  <div>
                    <p className="text-[10px] font-semibold text-[var(--error)] uppercase tracking-wide mb-1.5 flex items-center gap-1">
                      📤 Danh sách Chi
                    </p>
                    
                    {/* Chi phí Phát sinh */}
                    {task.finance && Array.isArray(task.finance) && task.finance.filter(f => f.type === 'expense').length > 0 ? (
                      <div className="space-y-1 bg-[var(--bg-elevated)] rounded-lg p-2 mb-2">
                        <p className="text-[9px] font-semibold text-[var(--warning)] uppercase tracking-wide mb-1">Chi phí Phát sinh</p>
                        {task.finance.filter(f => f.type === 'expense').map(f => (
                          <div key={f.id} className="flex items-center justify-between py-0.5">
                            <div className="flex items-center gap-2 overflow-hidden">
                              <div className="size-1.5 rounded-full flex-shrink-0 bg-[var(--error)]" />
                              <p className="text-xs text-[var(--text-primary)] truncate">{f.note || 'Chi phí'}</p>
                            </div>
                            <p className="text-xs font-bold font-mono flex-shrink-0 ml-2 text-[var(--error)]">
                              -{Math.floor(f.amount).toLocaleString('vi-VN')}đ
                            </p>
                          </div>
                        ))}
                        <div className="flex items-center justify-between pt-1 mt-1 border-t border-[var(--border-subtle)]">
                          <p className="text-[10px] font-semibold text-[var(--text-muted)]">Tổng Chi phí Phát sinh</p>
                          <p className="text-xs font-bold font-mono text-[var(--error)]">
                            -{Math.floor(profitLossAnalysis.emergentCost).toLocaleString('vi-VN')}đ
                          </p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-[var(--text-muted)] italic pl-2 mb-2">Chưa có chi phí phát sinh</p>
                    )}
                    
                    {/* Chi phí Thời gian */}
                    {task.duration && task.duration > 0 && (
                      <div className="space-y-1 bg-[var(--bg-elevated)] rounded-lg p-2">
                        <p className="text-[9px] font-semibold text-[var(--info)] uppercase tracking-wide mb-1 flex items-center gap-1">
                          ⏱️ Chi phí Thời gian
                        </p>
                        <div className="flex items-center justify-between py-0.5">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="size-1.5 rounded-full flex-shrink-0 bg-[var(--info)]" />
                            <p className="text-xs text-[var(--text-primary)] truncate">
                              {formatDuration(task.duration)} × {dailyTimeCost.toLocaleString('vi-VN')}đ/ngày
                            </p>
                          </div>
                          <p className="text-xs font-bold font-mono flex-shrink-0 ml-2 text-[var(--error)]">
                            -{Math.floor(profitLossAnalysis.timeCost).toLocaleString('vi-VN')}đ
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-1 mt-1 border-t border-[var(--border-subtle)]">
                          <p className="text-[10px] font-semibold text-[var(--text-muted)]">Tổng Chi phí Thời gian</p>
                          <p className="text-xs font-bold font-mono text-[var(--error)]">
                            -{Math.floor(profitLossAnalysis.timeCost).toLocaleString('vi-VN')}đ
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Tổng cộng Chi */}
                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-[var(--border-subtle)]">
                      <p className="text-[10px] font-bold text-[var(--text-muted)]">Tổng Chi</p>
                      <p className="text-xs font-bold font-mono text-[var(--error)]">
                        -{Math.floor(profitLossAnalysis.totalExpense).toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  </div>

                  {/* Lời/Lỗ Analysis */}
                  <div className={`rounded-lg p-3 border ${profitLossAnalysis.netProfit >= 0 ? 'bg-[rgba(52,211,153,0.08)] border-[var(--success)]/30' : 'bg-[rgba(248,113,113,0.08)] border-[var(--error)]/30'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
                        {profitLossAnalysis.netProfit > 0 ? '✅ LỜI' : profitLossAnalysis.netProfit < 0 ? '❌ LỖ' : '⚖️ HÒA VỐN'}
                      </p>
                      <p className={`text-sm font-bold font-mono ${profitLossAnalysis.netProfit >= 0 ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                        {profitLossAnalysis.netProfit >= 0 ? '+' : ''}{Math.floor(profitLossAnalysis.netProfit).toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                    
                    {/* Lý do */}
                    <div className="mb-2">
                      <p className="text-[9px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mb-0.5">Lý do:</p>
                      <p className="text-[10px] text-[var(--text-primary)]">{profitLossAnalysis.reason}</p>
                    </div>
                    
                    {/* Đề xuất cải thiện */}
                    <div className="pt-2 border-t border-[var(--border-subtle)]">
                      <p className="text-[9px] font-semibold text-[var(--accent-primary)] uppercase tracking-wide mb-0.5">Đề xuất cải thiện:</p>
                      <p className="text-[10px] text-[var(--text-secondary)]">{profitLossAnalysis.suggestion}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Bottom actions ── */}
        <div className="px-4 pb-4 pt-3 border-t border-[var(--border-subtle)] space-y-2">
          {/* Primary: overdue → adjust/complete | normal → timer */}
          {(taskIsOverdue || canTimer) && task.status !== 'done' && (
            <div className="flex gap-2">
              {taskIsOverdue ? (
                <>
                  <button onClick={() => { onClose(); onEdit(); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-[var(--warning)] bg-[rgba(251,191,36,0.12)] border border-[var(--warning)]/30 min-h-[44px] flex items-center justify-center gap-2 hover:bg-[rgba(251,191,36,0.2)] transition-colors">
                    <AlertCircle size={15} /> Chỉnh hạn chót
                  </button>
                  <button onClick={() => { useTaskStore.getState().completeTask(task.id); onClose(); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[var(--success)] min-h-[44px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                    <CheckCircle2 size={15} /> Hoàn thành
                  </button>
                </>
              ) : canTimer ? (
                <button onClick={() => { startTimer(task.id); onClose(); }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] min-h-[44px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
                  <Play size={15} fill="currentColor" /> Bấm giờ
                </button>
              ) : null}
            </div>
          )}
          {/* Secondary: share, template, edit */}
          <div className="flex gap-2">
            <button onClick={handleShare}
              className="flex-1 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] min-h-[36px] flex items-center justify-center gap-1.5 border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors">
              {copied ? <Check size={13} className="text-[var(--success)]" /> : <Share2 size={13} />}
              {copied ? 'Đã copy' : 'Chia sẻ'}
            </button>
            {!hasTemplate && task.status !== 'done' && (
              <button onClick={() => { handleAddToTemplate(); onClose(); }}
                className="flex-1 py-2 rounded-xl text-xs font-medium text-[var(--accent-primary)] bg-[var(--accent-dim)] min-h-[36px] flex items-center justify-center gap-1.5 border border-[var(--border-accent)] hover:opacity-80 transition-opacity">
                <FileText size={13} /> Thêm mẫu
              </button>
            )}
            <button onClick={onEdit}
              className="flex-1 py-2 rounded-xl text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] min-h-[36px] flex items-center justify-center gap-1.5 border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors">
              <Pencil size={13} /> Sửa
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Delegate summary modal
export function DelegateSummaryModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const summaryText = useMemo(() => {
    let text = `📋 VIỆC ỦY THÁC\n\n`;
    text += `📌 ${task.title}\n`;
    if (task.deadline) text += `⏰ Hạn chót: ${new Date(task.deadline).toLocaleString('vi-VN')}\n`;
    if (task.recurring?.type !== 'none') text += `🔁 Lặp lại: ${task.recurring.type === 'daily' ? 'Hàng ngày' : task.recurring.type === 'weekdays' ? 'T2-T6' : 'Hàng tuần'}\n`;
    if (task.notes) text += `📝 Ghi chú: ${task.notes}\n`;
    if (task.finance && Array.isArray(task.finance) && task.finance.length > 0) {
      task.finance.forEach(f => {
        const typeLabel = f.type === 'income' ? 'Thu' : 'Chi';
        const notePart = f.note ? ` (${f.note})` : '';
        text += `💰 ${typeLabel}: ${Math.floor(f.amount)}đ${notePart}\n`;
      });
    }
    text += `\n--- NghiemWork ---`;
    return text;
  }, [task]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(summaryText);
    setCopied(true);
    setTimeout(() => onClose(), 800);
  };

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-[var(--bg-elevated)] rounded-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Nội dung ủy thác</h3>
          <button onClick={onClose} className="size-7 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><X size={14} /></button>
        </div>
        <div className="px-4 pb-3">
          <div className="bg-[var(--bg-surface)] rounded-xl p-3 text-xs text-[var(--text-primary)] whitespace-pre-wrap font-mono max-h-60 overflow-y-auto">{summaryText}</div>
        </div>
        <div className="px-4 pb-4">
          <button onClick={handleCopy} className="w-full py-3 rounded-xl text-sm font-semibold min-h-[44px] flex items-center justify-center gap-2 bg-[var(--accent-primary)] text-[var(--bg-base)]">
            {copied ? <><Check size={16} /> Đã copy!</> : <><Copy size={16} /> Copy toàn bộ</>}
          </button>
        </div>
      </div>
    </div>
  );
}

// Schedule deadline modal - required when switching to "Lên lịch"
export function ScheduleDeadlineModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const updateTask = useTaskStore(s => s.updateTask);
  const now = new Date();
  const tomorrow = new Date(now); tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowDate = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;
  const [deadlineDate, setDeadlineDate] = useState(tomorrowDate);
  const [deadlineTime, setDeadlineTime] = useState('23:59');

  const handleSave = () => {
    if (!deadlineDate) return;
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (deadlineDate <= todayStr) { alert('Hạn chót phải sau hôm nay (Lên lịch = trì hoãn chủ động)'); return; }
    const dl = new Date(`${deadlineDate}T${deadlineTime || '23:59'}:00`).getTime();
    updateTask(task.id, { quadrant: 'schedule', deadline: dl, deadlineDate, deadlineTime, showDeadline: true });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[96] flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-sm bg-[var(--bg-elevated)] rounded-2xl overflow-hidden animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">🔵 Lên lịch - Đặt hạn chót mới</h3>
          <p className="text-[10px] text-[var(--text-muted)] mt-1">Hạn chót phải khác hôm nay (trì hoãn chủ động)</p>
        </div>
        <div className="px-4 pb-3 space-y-2">
          <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)}
            className="w-full bg-[var(--bg-surface)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[40px]" />
          <input type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)}
            className="w-full bg-[var(--bg-surface)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[40px]" />
        </div>
        <div className="px-4 pb-4 flex gap-2">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-medium text-[var(--text-muted)] bg-[var(--bg-surface)] min-h-[40px]">Hủy</button>
          <button onClick={handleSave} className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] min-h-[40px]">Lên lịch</button>
        </div>
      </div>
    </div>
  );
}
