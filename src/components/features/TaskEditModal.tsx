import { useState } from 'react';
import { useTaskStore } from '@/stores';
import { X, Save, Check } from 'lucide-react';
import type { Task, EisenhowerQuadrant, RecurringType, TaskFinance, TaskCategory } from '@/types';
import { QUADRANT_LABELS, CATEGORY_LABELS } from '@/types';
import { toast } from '@/lib/toast';

interface TaskEditModalProps { task: Task; onClose: () => void; }

export function TaskEditModal({ task, onClose }: TaskEditModalProps) {
  const updateTask = useTaskStore(s => s.updateTask);

  const [title, setTitle] = useState(task.title);
  const [quadrant, setQuadrant] = useState<EisenhowerQuadrant>(task.quadrant);
  const now = new Date();
  const nowDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const [deadlineDate, setDeadlineDate] = useState(task.deadlineDate || nowDate);
  const [deadlineTime, setDeadlineTime] = useState(task.deadlineTime || nowTime);
  const [recurringType, setRecurringType] = useState<RecurringType>(task.recurring?.type || 'none');
  const [notes, setNotes] = useState(task.notes || '');
  const [finance, setFinance] = useState<TaskFinance | undefined>(task.finance);
  const [showDeadline, setShowDeadline] = useState(task.showDeadline ?? !!task.deadline);
  const [showRecurring, setShowRecurring] = useState(task.showRecurring ?? task.recurring?.type !== 'none');
  const [showFinance, setShowFinance] = useState(task.showFinance ?? !!task.finance);
  const [showNotes, setShowNotes] = useState(task.showNotes ?? !!task.notes);
  const [category, setCategory] = useState<TaskCategory | undefined>(task.category);
  const [showCategory, setShowCategory] = useState(!!task.category);

  const handleSave = () => {
    if (!title.trim()) {
      toast.warning('Vui lòng nhập tên việc');
      return;
    }
    
    let deadline: number | undefined;
    if (showDeadline && deadlineDate) {
      deadline = new Date(`${deadlineDate}T${deadlineTime || '23:59'}:00`).getTime();
    }
    
    // Auto quadrant: only pass manual quadrant if delegate/eliminate
    const manualQuadrant = (quadrant === 'delegate' || quadrant === 'eliminate') ? quadrant : undefined;
    
    updateTask(task.id, {
      title: title.trim(),
      quadrant: manualQuadrant, // Will trigger auto-calculation in store
      deadline,
      deadlineDate: showDeadline ? deadlineDate : undefined,
      deadlineTime: showDeadline ? deadlineTime : undefined,
      recurring: { type: showRecurring ? recurringType : 'none' },
      notes: showNotes ? notes : undefined,
      finance: showFinance && finance ? finance : undefined,
      showDeadline, showRecurring, showFinance, showNotes,
      category: showCategory ? category : undefined,
    });
    
    toast.success('Đã cập nhật việc');
    onClose();
  };

  const toggles = [
    { key: 'deadline', label: '⏰ Hạn chót', active: showDeadline, toggle: () => setShowDeadline(!showDeadline) },
    { key: 'recurring', label: '🔁 Lặp lại', active: showRecurring, toggle: () => setShowRecurring(!showRecurring) },
    { key: 'finance', label: '💰 Thu/Chi', active: showFinance, toggle: () => { setShowFinance(!showFinance); if (!finance) setFinance({ type: 'expense', amount: 0 }); } },
    { key: 'notes', label: '📝 Ghi chú', active: showNotes, toggle: () => setShowNotes(!showNotes) },
    { key: 'category', label: '🏷️ Danh mục', active: showCategory, toggle: () => { setShowCategory(!showCategory); if (!category) setCategory('other'); } },
  ];

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[var(--border-subtle)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Chỉnh sửa</h2>
          <div className="flex gap-1.5">
            <button onClick={handleSave} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--accent-primary)] text-[var(--bg-base)] min-h-[32px]"><Save size={12} /> Lưu</button>
            <button onClick={onClose} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><X size={16} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)}
            className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[44px]" />

          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(QUADRANT_LABELS) as EisenhowerQuadrant[]).map(q => {
              const cfg = QUADRANT_LABELS[q];
              return (
                <button key={q} onClick={() => setQuadrant(q)}
                  className={`py-2 rounded-lg text-[11px] font-medium min-h-[36px] border flex items-center justify-center gap-1 ${quadrant === q ? 'border-current' : 'border-transparent bg-[var(--bg-surface)]'}`}
                  style={quadrant === q ? { color: cfg.color, backgroundColor: `${cfg.color}15` } : {}}>
                  {cfg.icon} {cfg.label}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {toggles.map(opt => (
              <button key={opt.key} onClick={opt.toggle}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-[10px] font-medium min-h-[34px] border ${opt.active ? 'border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                <div className={`size-3.5 rounded border flex items-center justify-center ${opt.active ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--text-muted)]'}`}>
                  {opt.active && <Check size={8} className="text-[var(--bg-base)]" />}
                </div>
                {opt.label}
              </button>
            ))}
          </div>

          {showDeadline && (
            <div className="flex gap-2 p-2 rounded-lg bg-[var(--bg-surface)]">
              <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)} className="flex-1 bg-[var(--bg-elevated)] rounded-lg px-2 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[34px]" />
              <input type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} className="flex-1 bg-[var(--bg-elevated)] rounded-lg px-2 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[34px]" />
            </div>
          )}

          {showRecurring && (
            <div className="grid grid-cols-3 gap-1.5 p-2 rounded-lg bg-[var(--bg-surface)]">
              {(['none', 'daily', 'weekdays', 'weekly', 'biweekly', 'monthly'] as RecurringType[]).map(r => (
                <button key={r} onClick={() => setRecurringType(r)}
                  className={`py-1.5 rounded-lg text-[9px] font-medium min-h-[30px] ${recurringType === r ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                  {r === 'none' ? 'Không' : r === 'daily' ? 'Hàng ngày' : r === 'weekdays' ? 'T2-T6' : r === 'weekly' ? 'Hàng tuần' : r === 'biweekly' ? '2 tuần' : 'Hàng tháng'}
                </button>
              ))}
            </div>
          )}

          {showCategory && (
            <div className="grid grid-cols-4 gap-1.5 p-2 rounded-lg bg-[var(--bg-surface)]">
              {(Object.keys(CATEGORY_LABELS) as TaskCategory[]).map(cat => {
                const cfg = CATEGORY_LABELS[cat];
                return (
                  <button key={cat} onClick={() => setCategory(cat)}
                    className={`py-2 rounded-lg text-[9px] font-medium min-h-[36px] flex flex-col items-center justify-center gap-0.5 ${category === cat ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                    <span className="text-sm">{cfg.icon}</span>
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {showFinance && finance && (
            <div className="flex gap-2 p-2 rounded-lg bg-[var(--bg-surface)]">
              <select value={finance.type} onChange={e => setFinance({ ...finance, type: e.target.value as any })}
                className="bg-[var(--bg-elevated)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[32px]">
                <option value="income">Thu</option><option value="expense">Chi</option>
              </select>
              <input type="number" value={finance.amount || ''} onChange={e => setFinance({ ...finance, amount: Math.max(0, parseInt(e.target.value) || 0) })}
                placeholder="Số tiền" className="flex-1 bg-[var(--bg-elevated)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[32px] font-mono" inputMode="numeric" />
            </div>
          )}

          {showNotes && (
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ghi chú..." rows={3}
              className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] resize-none" />
          )}
        </div>
      </div>
    </div>
  );
}
