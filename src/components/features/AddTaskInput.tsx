import { useState, useEffect } from 'react';
import { useTaskStore, useSettingsStore } from '@/stores';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import { X, Mic, MicOff, Check, ChevronDown, Plus, Trash2 } from 'lucide-react';
import type { RecurringConfig, RecurringType, TaskFinance } from '@/types';
import { toast } from '@/lib/toast';

function formatMoneyDisplay(value: number): string {
  if (!value) return '';
  return value.toLocaleString('vi-VN');
}

function parseMoneyInput(value: string): number {
  const num = parseInt(value.replace(/\D/g, ''), 10);
  return isNaN(num) ? 0 : num;
}

function formatTimeUntilDeadline(deadlineDate: string, deadlineTime: string): { text: string; color: string } {
  const deadline = new Date(`${deadlineDate}T${deadlineTime || '23:59'}:00`).getTime();
  const now = Date.now();
  const remaining = deadline - now;
  if (remaining < 0) {
    const mins = Math.floor(Math.abs(remaining) / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return { text: `Đã quá hạn ${days} ngày`, color: 'var(--error)' };
    if (hours > 0) return { text: `Đã quá hạn ${hours} giờ`, color: 'var(--error)' };
    return { text: `Đã quá hạn ${mins} phút`, color: 'var(--error)' };
  }
  const mins = Math.floor(remaining / 60000);
  const hours = Math.floor(mins / 60);
  const days = Math.floor(hours / 24);
  if (hours < 1) return { text: `Còn ${mins} phút`, color: '#F87171' };
  if (hours < 24) return { text: `Còn ${hours} giờ ${mins % 60} phút`, color: '#FBBF24' };
  if (days < 7) return { text: `Còn ${days} ngày`, color: '#60A5FA' };
  return { text: `Còn ${days} ngày`, color: 'var(--text-muted)' };
}

function CollapsibleOption({ label, active, expanded, onToggle, children }: {
  label: string; active: boolean; expanded: boolean; onToggle: () => void; children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] overflow-hidden mb-2 flex flex-col">
      <button type="button" onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 text-left flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className={`size-4 rounded border flex items-center justify-center flex-shrink-0 ${active ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--text-muted)]'}`}>
            {active && <Check size={10} className="text-[var(--bg-base)]" />}
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)]">{label}</span>
        </div>
        <ChevronDown size={16} className={`text-[var(--text-muted)] transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`} />
      </button>
      {expanded && (
        <div className="px-4 pb-3 pt-0 border-t border-[var(--border-subtle)] flex-shrink-0 order-last">
          {children}
        </div>
      )}
    </div>
  );
}

export function AddTaskSheet({ onClose }: { onClose: () => void }) {
  const [value, setValue] = useState('');
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
  const [expandedDeadline, setExpandedDeadline] = useState(false);
  const [expandedRecurring, setExpandedRecurring] = useState(false);
  const [expandedFinance, setExpandedFinance] = useState(false);
  const [expandedNotes, setExpandedNotes] = useState(false);
  const [finAmountDisplay, setFinAmountDisplay] = useState('');
  const [, setTick] = useState(0);
  useEffect(() => { const t = setInterval(() => setTick(d => d + 1), 1000); return () => clearInterval(t); }, []);
  const [finType, setFinType] = useState<'income' | 'expense'>('expense');
  
  // New finance format - now default when Thu/Chi is selected
  const [useNewFinanceFormat, setUseNewFinanceFormat] = useState(true);
  const [financeItems, setFinanceItems] = useState<TaskFinance[]>([]);
  const financeCategories = useSettingsStore(s => s.financeCategories);

  const addTask = useTaskStore(s => s.addTask);
  const { isListening, transcript, startListening, stopListening, isSupported } = useSpeechRecognition();

  if (transcript && transcript !== value) setValue(transcript);

  const toggleDeadline = () => {
    const next = !showDeadline;
    setShowDeadline(next);
    setExpandedDeadline(next);
    if (next) {
      const n = new Date();
      setDeadlineDate(`${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`);
      setDeadlineTime(`${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}`);
    }
  };
  const toggleRecurring = () => { setShowRecurring(!showRecurring); setExpandedRecurring(!showRecurring); };
  const toggleFinance = () => {
    const next = !showFinance;
    setShowFinance(next);
    setExpandedFinance(next);
    if (next && financeItems.length === 0) {
      addFinanceItem();
    }
  };
  const toggleNotes = () => { setShowNotes(!showNotes); setExpandedNotes(!showNotes); };
  
  // Finance item management for new format
  const addFinanceItem = () => {
    setFinanceItems([
      ...financeItems,
      {
        id: Date.now().toString(36) + Math.random().toString(36).slice(2),
        type: 'expense',
        amount: 0,
        category: financeCategories[0]?.id || 'other',
        note: ''
      }
    ]);
  };
  
  const removeFinanceItem = (index: number) => {
    const newItems = [...financeItems];
    newItems.splice(index, 1);
    setFinanceItems(newItems);
  };
  
  const updateFinanceItem = (index: number, updates: Partial<TaskFinance>) => {
    const newItems = [...financeItems];
    newItems[index] = { ...newItems[index], ...updates };
    setFinanceItems(newItems);
  };

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
    
    const recurring: RecurringConfig = { type: showRecurring ? recurringType : 'none' };
    
    // Handle finance based on format
    let finance: TaskFinance[] | undefined;
    if (useNewFinanceFormat) {
      // New format: array of finance items
      const validItems = financeItems.filter(f => f.amount > 0);
      if (validItems.length > 0) finance = validItems;
    } else {
      // Old format: single item
      const amount = parseMoneyInput(finAmountDisplay);
      if (showFinance && amount > 0) {
        finance = [{
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          type: finType,
          amount,
          category: financeCategories[0]?.id || 'other',
          note: ''
        }];
      }
    }
    
    const taskId = addTask(trimmed, undefined, deadline, recurring, showDeadline ? deadlineDate : undefined, showDeadline ? deadlineTime : undefined, finance, undefined, false, {
      showDeadline, showRecurring, showFinance, showNotes,
      notes: showNotes ? notes : undefined,
    });
    
    if (taskId) {
      toast.success('Đã thêm việc mới');
      onClose();
    }
  };

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

          <CollapsibleOption label="⏰ Hạn chót" active={showDeadline} expanded={expandedDeadline} onToggle={toggleDeadline}>
            <div className="space-y-2 pt-3">
              <div className="flex gap-2">
                <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)}
                  className="flex-1 bg-[var(--bg-elevated)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[38px]" />
                <input type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)}
                  className="flex-1 bg-[var(--bg-elevated)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[38px]" />
              </div>
              <div className="px-2 py-1.5 rounded-lg bg-[var(--bg-elevated)] text-sm font-medium" style={{ color: formatTimeUntilDeadline(deadlineDate, deadlineTime).color }}>
                {formatTimeUntilDeadline(deadlineDate, deadlineTime).text}
              </div>
            </div>
          </CollapsibleOption>

          <CollapsibleOption label="🔁 Lặp lại" active={showRecurring} expanded={expandedRecurring} onToggle={toggleRecurring}>
            <div className="flex gap-1.5 pt-3">
              {(['none', 'daily', 'weekdays', 'weekly'] as RecurringType[]).map(r => (
                <button key={r} onClick={() => setRecurringType(r)}
                  className={`flex-1 py-2 rounded-lg text-[10px] font-medium min-h-[34px] ${recurringType === r ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)] border border-[var(--border-accent)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                  {r === 'none' ? 'Không' : r === 'daily' ? 'Hàng ngày' : r === 'weekdays' ? 'T2-T6' : 'Hàng tuần'}
                </button>
              ))}
            </div>
          </CollapsibleOption>

          <CollapsibleOption label="💰 Thu/Chi" active={showFinance} expanded={expandedFinance} onToggle={toggleFinance}>
            <div className="space-y-2 pt-3">
              {/* New format: multiple finance items with categories - now default */}
              <div className="space-y-2">
                /* New format: multiple finance items with categories */
                <div className="space-y-2">
                  {financeItems.map((item, idx) => (
                    <div key={idx} className="bg-[var(--bg-elevated)] p-2 rounded-lg border border-[var(--border-subtle)] space-y-2">
                      <div className="flex gap-2">
                        <select
                          value={item.type}
                          onChange={e => updateFinanceItem(idx, { type: e.target.value as any })}
                          className={`rounded-lg px-2 py-1.5 text-xs font-bold outline-none border border-[var(--border-subtle)] min-h-[32px] ${
                            item.type === 'income' ? 'bg-[var(--success)] text-white' : 'bg-[var(--error)] text-white'
                          }`}
                        >
                          <option value="income">Thu</option>
                          <option value="expense">Chi</option>
                        </select>
                        <input
                          type="number"
                          value={item.amount || ''}
                          onChange={e => updateFinanceItem(idx, { amount: Math.max(0, parseInt(e.target.value) || 0) })}
                          placeholder="Số tiền"
                          className="flex-1 bg-[var(--bg-surface)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[32px] font-mono"
                          inputMode="numeric"
                        />
                        <button onClick={() => removeFinanceItem(idx)} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--error)]">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      
                      <div className="flex gap-2">
                        <select
                          value={item.category}
                          onChange={e => updateFinanceItem(idx, { category: e.target.value as any })}
                          className="w-1/3 bg-[var(--bg-surface)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[32px]"
                        >
                          {financeCategories.map(fc => (
                            <option key={fc.id} value={fc.id}>{fc.icon} {fc.name}</option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={item.note || ''}
                          onChange={e => updateFinanceItem(idx, { note: e.target.value })}
                          placeholder="Ghi chú chi tiêu..."
                          className="flex-1 bg-[var(--bg-surface)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[32px]"
                        />
                      </div>
                    </div>
                  ))}
                  
                  <button 
                    onClick={addFinanceItem}
                    className="w-full py-2 rounded-lg border border-dashed border-[var(--border-subtle)] text-xs text-[var(--text-muted)] flex items-center justify-center gap-1 hover:bg-[var(--bg-elevated)]"
                  >
                    <Plus size={14} /> Thêm khoản thu/chi
                  </button>
                </div>
            </div>
          </CollapsibleOption>

          <CollapsibleOption label="📝 Ghi chú" active={showNotes} expanded={expandedNotes} onToggle={toggleNotes}>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ghi chú..." rows={2}
              className="w-full mt-3 bg-[var(--bg-elevated)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] resize-none" />
          </CollapsibleOption>
        </div>

        <div className="px-4 pb-4 pt-2">
          <button onClick={handleSubmit} disabled={!value.trim()}
            className="w-full py-3 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-30 active:opacity-80 min-h-[44px] flex items-center justify-center">
            Thêm việc
          </button>
        </div>
      </div>
    </div>
  );
}

export function AddTaskInput() { return null; }
