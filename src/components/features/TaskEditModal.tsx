import { useState } from 'react';
import { useTaskStore, useSettingsStore } from '@/stores';
import { X, Save, Check, ChevronDown, Plus, Trash2 } from 'lucide-react';
import type { Task, RecurringType, TaskFinance } from '@/types';
import { toast } from '@/lib/toast';
import { createReminders } from '@/lib/remindersManager';

interface TaskEditModalProps { task: Task; onClose: () => void; }

function CollapsibleOption({
  label,
  active,
  onToggle,
  children,
}: {
  label: string;
  active: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[var(--bg-surface)] rounded-xl border border-[var(--border-subtle)] overflow-hidden mb-2 flex flex-col">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left flex-shrink-0"
      >
        <div className="flex items-center gap-2">
          <div
            className={`size-4 rounded border flex items-center justify-center flex-shrink-0 ${
              active
                ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                : 'border-[var(--text-muted)]'
            }`}
          >
            {active && <Check size={10} className="text-[var(--bg-base)]" />}
          </div>
          <span className="text-sm font-medium text-[var(--text-primary)]">
            {label}
          </span>
        </div>
        <ChevronDown
          size={16}
          className={`text-[var(--text-muted)] transition-transform flex-shrink-0 ${
            active ? 'rotate-180' : ''
          }`}
        />
      </button>
      {active && (
        <div className="px-4 pb-3 pt-0 border-t border-[var(--border-subtle)] flex-shrink-0 order-last">
          {children}
        </div>
      )}
    </div>
  );
}

export function TaskEditModal({ task, onClose }: TaskEditModalProps) {
  const updateTask = useTaskStore(s => s.updateTask);
  const financeCategories = useSettingsStore(s => s.financeCategories);

  const [title, setTitle] = useState(task.title);
  const now = new Date();
  const nowDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const [deadlineDate, setDeadlineDate] = useState(task.deadlineDate || nowDate);
  const [deadlineTime, setDeadlineTime] = useState(task.deadlineTime || nowTime);
  const [recurringType, setRecurringType] = useState<RecurringType>(task.recurring?.type || 'none');
  const [notes, setNotes] = useState(task.notes || '');
  
  // task.finance is TaskFinance[]; support legacy single-object data at runtime
  const initialFinance: TaskFinance[] = Array.isArray(task.finance) ? task.finance : [];
      
  const [financeItems, setFinanceItems] = useState<TaskFinance[]>(initialFinance);
  
  const [showDeadline, setShowDeadline] = useState(task.showDeadline ?? !!task.deadline);
  const [showRecurring, setShowRecurring] = useState(task.showRecurring ?? task.recurring?.type !== 'none');
  const [showFinance, setShowFinance] = useState(task.showFinance ?? (!!task.finance && (Array.isArray(task.finance) ? task.finance.length > 0 : true)));
  const [showNotes, setShowNotes] = useState(task.showNotes ?? !!task.notes);
  const [reminderEnabled, setReminderEnabled] = useState(task.reminderSettings?.enabled ?? false);
  const [reminderMinutesBefore, setReminderMinutesBefore] = useState(String(task.reminderSettings?.minutesBefore ?? 5));
  const [reminderRepeatTimes, setReminderRepeatTimes] = useState(String(task.reminderSettings?.repeatTimes ?? 3));
  const [reminderRepeatInterval, setReminderRepeatInterval] = useState(String(task.reminderSettings?.repeatInterval ?? 10));

  const handleSave = () => {
    if (!title.trim()) {
      toast.warning('Vui lòng nhập tên việc');
      return;
    }
    
    let deadline: number | undefined;
    if (showDeadline && deadlineDate) {
      deadline = new Date(`${deadlineDate}T${deadlineTime || '23:59'}:00`).getTime();
    }

    const reminderSettings = reminderEnabled && deadline ? {
      enabled: true,
      minutesBefore: parseInt(reminderMinutesBefore) || 5,
      repeatTimes: parseInt(reminderRepeatTimes) || 3,
      repeatInterval: parseInt(reminderRepeatInterval) || 10,
    } : undefined;
    
    // Filter out invalid finance items
    const validFinance = showFinance ? financeItems.filter(f => f.amount > 0) : undefined;
    
    const updatedTask: Partial<Task> = {
      title: title.trim(),
      deadline,
      deadlineDate: showDeadline ? deadlineDate : undefined,
      deadlineTime: showDeadline ? deadlineTime : undefined,
      recurring: { type: showRecurring ? recurringType : 'none' },
      notes: showNotes ? notes : undefined,
      finance: validFinance,
      showDeadline, showRecurring, showFinance, showNotes,
      reminderSettings,
    };

    // Tạo reminders từ settings
    if (reminderSettings && deadline) {
      const testTask: Task = { ...task, ...updatedTask, deadline } as Task;
      updatedTask.reminders = createReminders(testTask);
    }
    
    updateTask(task.id, updatedTask);
    
    toast.success('Đã cập nhật việc');
    onClose();
  };

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

          <div className="space-y-2">
            <CollapsibleOption
              label="⏰ Hạn chót & Nhắc Nhở"
              active={showDeadline}
              onToggle={() => setShowDeadline(!showDeadline)}
            >
              <div className="space-y-3 pt-2">
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={deadlineDate}
                    onChange={e => setDeadlineDate(e.target.value)}
                    className="flex-1 bg-[var(--bg-elevated)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[34px]"
                  />
                  <input
                    type="time"
                    value={deadlineTime}
                    onChange={e => setDeadlineTime(e.target.value)}
                    className="flex-1 bg-[var(--bg-elevated)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[34px]"
                  />
                </div>

                {/* Reminder settings - integrated with deadline */}
                <div className="border-t border-[var(--bg-base)] pt-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="reminderEnabled"
                      checked={reminderEnabled}
                      onChange={e => setReminderEnabled(e.target.checked)}
                      className="size-4 rounded"
                    />
                    <label htmlFor="reminderEnabled" className="text-xs font-medium text-[var(--text-primary)]">
                      🔔 Bật nhắc nhở
                    </label>
                  </div>

                  {reminderEnabled && (
                    <div className="space-y-2 bg-[var(--bg-base)] rounded p-2">
                      <div>
                        <label className="text-xs font-medium text-[var(--text-primary)] block mb-1">
                          Nhắc nhở trước: <span className="text-[var(--accent-primary)]">{reminderMinutesBefore} phút</span>
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="60"
                          value={reminderMinutesBefore}
                          onChange={e => setReminderMinutesBefore(e.target.value)}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-[var(--text-primary)] block mb-1">
                          Số lần nhắc nhở: <span className="text-[var(--accent-primary)]">{reminderRepeatTimes} lần</span>
                        </label>
                        <input
                          type="range"
                          min="1"
                          max="10"
                          value={reminderRepeatTimes}
                          onChange={e => setReminderRepeatTimes(e.target.value)}
                          className="w-full"
                        />
                      </div>

                      <div>
                        <label className="text-xs font-medium text-[var(--text-primary)] block mb-1">
                          Khoảng cách: <span className="text-[var(--accent-primary)]">{reminderRepeatInterval} giây</span>
                        </label>
                        <input
                          type="range"
                          min="5"
                          max="60"
                          value={reminderRepeatInterval}
                          onChange={e => setReminderRepeatInterval(e.target.value)}
                          className="w-full"
                        />
                      </div>

                      <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-elevated)] rounded p-1.5 mt-2">
                        <p>📢 Thông báo đẩy + Chuông + Giọng nói (kể cả khi màn hình tắt)</p>
                        <p>✋ Bấm "Đã Hiểu Rồi" để dừng</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CollapsibleOption>

            <CollapsibleOption
              label="🔁 Lặp lại"
              active={showRecurring}
              onToggle={() => setShowRecurring(!showRecurring)}
            >
              <div className="grid grid-cols-3 gap-1.5 pt-2">
                {(['none', 'daily', 'weekdays', 'weekly', 'biweekly', 'monthly'] as RecurringType[]).map(r => (
                  <button
                    key={r}
                    onClick={() => setRecurringType(r)}
                    className={`py-1.5 rounded-lg text-[9px] font-medium min-h-[30px] ${
                      recurringType === r
                        ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]'
                        : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                    }`}
                  >
                    {r === 'none'
                      ? 'Không'
                      : r === 'daily'
                      ? 'Hàng ngày'
                      : r === 'weekdays'
                      ? 'T2-T6'
                      : r === 'weekly'
                      ? 'Hàng tuần'
                      : r === 'biweekly'
                      ? '2 tuần'
                      : 'Hàng tháng'}
                  </button>
                ))}
              </div>
            </CollapsibleOption>

            <CollapsibleOption
              label="💰 Thu/Chi"
              active={showFinance}
              onToggle={() => {
                const next = !showFinance;
                setShowFinance(next);
                if (next && financeItems.length === 0) addFinanceItem();
              }}
            >
              <div className="space-y-3 pt-2">
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
            </CollapsibleOption>

            <CollapsibleOption
              label="📝 Ghi chú"
              active={showNotes}
              onToggle={() => setShowNotes(!showNotes)}
            >
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ghi chú..."
                rows={3}
                className="w-full mt-2 bg-[var(--bg-surface)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] resize-none"
              />
            </CollapsibleOption>

          </div>
        </div>
      </div>
    </div>
  );
}