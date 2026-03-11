import { useState } from 'react';
import { useTaskStore, useSettingsStore } from '@/stores';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { X, Mic, MicOff, Check } from 'lucide-react';
import type { EisenhowerQuadrant, RecurringConfig, RecurringType } from '@/types';
import { QUADRANT_LABELS } from '@/types';
import { toast } from '@/lib/toast';

export function AddTaskSheet({ onClose }: { onClose: () => void }) {
  const [value, setValue] = useState('');
  const [quadrant, setQuadrant] = useState<EisenhowerQuadrant>('do_first');
  const now = new Date();
  const nowDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const [deadlineDate, setDeadlineDate] = useState(nowDate);
  const [deadlineTime, setDeadlineTime] = useState(nowTime);
  const [recurringType, setRecurringType] = useState<RecurringType>('none');
  const [notes, setNotes] = useState('');
  const [showDeadline, setShowDeadline] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showFinance, setShowFinance] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [finType, setFinType] = useState<'income' | 'expense'>('expense');
  const [finAmount, setFinAmount] = useState(0);
  const [isGroup, setIsGroup] = useState(false);

  const addTask = useTaskStore(s => s.addTask);
  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition();

  if (transcript && transcript !== value) setValue(transcript);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed) {
      toast.warning('Vui lòng nhập tên việc');
      return;
    }
    
    let deadline: number | undefined;
    if (showDeadline && deadlineDate) {
      deadline = new Date(`${deadlineDate}T${deadlineTime || '23:59'}:00`).getTime();
    }
    
    // Auto quadrant: only pass manual quadrant if delegate/eliminate
    const manualQuadrant = (quadrant === 'delegate' || quadrant === 'eliminate') ? quadrant : undefined;
    
    const recurring: RecurringConfig = { type: showRecurring ? recurringType : 'none' };
    const finance = showFinance && finAmount > 0 ? { type: finType, amount: finAmount } : undefined;
    
    const taskId = addTask(trimmed, manualQuadrant, deadline, recurring, showDeadline ? deadlineDate : undefined, showDeadline ? deadlineTime : undefined, finance, undefined, isGroup, {
      showDeadline, showRecurring, showFinance, showNotes,
      notes: showNotes ? notes : undefined,
    });
    
    if (taskId) {
      toast.success('Đã thêm việc mới');
      onClose();
    }
  };

  const toggleOptions: { key: string; label: string; active: boolean; toggle: () => void }[] = [
    { key: 'deadline', label: '⏰ Hạn chót', active: showDeadline, toggle: () => setShowDeadline(!showDeadline) },
    { key: 'recurring', label: '🔁 Lặp lại', active: showRecurring, toggle: () => setShowRecurring(!showRecurring) },
    { key: 'finance', label: '💰 Thu/Chi', active: showFinance, toggle: () => setShowFinance(!showFinance) },
    { key: 'notes', label: '📝 Ghi chú', active: showNotes, toggle: () => setShowNotes(!showNotes) },
  ];

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] bg-[var(--bg-elevated)] rounded-t-2xl overflow-hidden flex flex-col animate-slide-up"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Thêm việc mới</h2>
          <button onClick={onClose} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          <div className="flex gap-2">
            <input type="text" value={value} onChange={e => setValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()}
              placeholder="Nhập việc cần làm..." autoFocus
              className="flex-1 bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[44px]" />
            {isSupported && (
              <button onClick={() => isListening ? stopListening() : startListening()}
                className={`size-11 rounded-xl flex items-center justify-center ${isListening ? 'bg-[rgba(248,113,113,0.2)] text-[var(--error)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(QUADRANT_LABELS) as EisenhowerQuadrant[]).map(q => {
              const cfg = QUADRANT_LABELS[q];
              return (
                <button key={q} onClick={() => setQuadrant(q)}
                  className={`py-2 rounded-lg text-[11px] font-medium min-h-[38px] border flex items-center justify-center gap-1 ${quadrant === q ? 'border-current' : 'border-transparent bg-[var(--bg-surface)]'}`}
                  style={quadrant === q ? { color: cfg.color, backgroundColor: `${cfg.color}15` } : {}}>
                  {cfg.icon} {cfg.label}
                </button>
              );
            })}
          </div>

          <div className="flex gap-2">
            <button onClick={() => setIsGroup(false)}
              className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium min-h-[38px] border ${!isGroup ? 'border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
              <div className={`size-4 rounded-full border-2 flex items-center justify-center ${!isGroup ? 'border-[var(--accent-primary)]' : 'border-[var(--text-muted)]'}`}>
                {!isGroup && <div className="size-2 rounded-full bg-[var(--accent-primary)]" />}
              </div>
              Việc đơn
            </button>
            <button onClick={() => setIsGroup(true)}
              className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium min-h-[38px] border ${isGroup ? 'border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
              <div className={`size-4 rounded-full border-2 flex items-center justify-center ${isGroup ? 'border-[var(--accent-primary)]' : 'border-[var(--text-muted)]'}`}>
                {isGroup && <div className="size-2 rounded-full bg-[var(--accent-primary)]" />}
              </div>
              Nhóm việc
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {toggleOptions.map(opt => (
              <button key={opt.key} onClick={opt.toggle}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium min-h-[38px] border transition-colors ${opt.active ? 'border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                <div className={`size-4 rounded border flex items-center justify-center ${opt.active ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--text-muted)]'}`}>
                  {opt.active && <Check size={10} className="text-[var(--bg-base)]" />}
                </div>
                {opt.label}
              </button>
            ))}
          </div>

          {showDeadline && (
            <div className="space-y-2 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              <div className="flex gap-2">
                <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)}
                  className="flex-1 bg-[var(--bg-elevated)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[38px]" />
                <input type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)}
                  className="flex-1 bg-[var(--bg-elevated)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[38px]" />
              </div>
            </div>
          )}

          {showRecurring && (
            <div className="flex gap-1.5 p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
              {(['none', 'daily', 'weekdays', 'weekly'] as RecurringType[]).map(r => (
                <button key={r} onClick={() => setRecurringType(r)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-medium min-h-[34px] ${recurringType === r ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)] border border-[var(--border-accent)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                  {r === 'none' ? 'Không' : r === 'daily' ? 'Hàng ngày' : r === 'weekdays' ? 'T2-T6' : 'Hàng tuần'}
                </button>
              ))}
            </div>
          )}

          {showFinance && (
            <div className="p-3 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] space-y-2">
              <div className="flex gap-2">
                <button onClick={() => setFinType('income')} className={`flex-1 py-2 rounded-lg text-xs font-medium min-h-[34px] ${finType === 'income' ? 'bg-[rgba(52,211,153,0.2)] text-[var(--success)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>+ Thu</button>
                <button onClick={() => setFinType('expense')} className={`flex-1 py-2 rounded-lg text-xs font-medium min-h-[34px] ${finType === 'expense' ? 'bg-[rgba(248,113,113,0.2)] text-[var(--error)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>- Chi</button>
              </div>
              <input type="number" value={finAmount || ''} onChange={e => setFinAmount(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="Số tiền (VNĐ)" inputMode="numeric"
                className="w-full bg-[var(--bg-elevated)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[36px] font-mono" />
            </div>
          )}

          {showNotes && (
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ghi chú..." rows={2}
              className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] resize-none" />
          )}
        </div>

        <div className="px-4 pb-4 pt-2">
          <button onClick={handleSubmit} disabled={!value.trim()}
            className="w-full py-3 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-30 active:opacity-80 min-h-[44px]">
            Thêm việc
          </button>
        </div>
      </div>
    </div>
  );
}

export function AddTaskInput() { return null; }
