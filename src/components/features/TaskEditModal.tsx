import { useState } from 'react';
import { useTaskStore } from '@/stores';
import { X, Save, Check, ChevronDown } from 'lucide-react';
import type { Task, RecurringType, TaskFinance, TaskCategory } from '@/types';
import { CATEGORY_LABELS } from '@/types';
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

  const [title, setTitle] = useState(task.title);
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
  const [showReminder, setShowReminder] = useState(!!task.reminderSettings?.enabled);
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

    const reminderSettings = showReminder && reminderEnabled && deadline ? {
      enabled: true,
      minutesBefore: parseInt(reminderMinutesBefore) || 5,
      repeatTimes: parseInt(reminderRepeatTimes) || 3,
      repeatInterval: parseInt(reminderRepeatInterval) || 10,
    } : undefined;
    
    const updatedTask: Partial<Task> = {
      title: title.trim(),
      deadline,
      deadlineDate: showDeadline ? deadlineDate : undefined,
      deadlineTime: showDeadline ? deadlineTime : undefined,
      recurring: { type: showRecurring ? recurringType : 'none' },
      notes: showNotes ? notes : undefined,
      finance: showFinance && finance ? finance : undefined,
      showDeadline, showRecurring, showFinance, showNotes,
      category: showCategory ? category : undefined,
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
              label="⏰ Hạn chót"
              active={showDeadline}
              onToggle={() => setShowDeadline(!showDeadline)}
            >
              <div className="flex gap-2 pt-2">
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
                if (next && !finance) setFinance({ type: 'expense', amount: 0 });
              }}
            >
              <div className="flex gap-2 pt-2">
                  <select
                    value={(finance ?? { type: 'expense', amount: 0 }).type}
                    onChange={e => setFinance({ ...(finance ?? { type: 'expense', amount: 0 }), type: e.target.value as any })}
                    className="bg-[var(--bg-elevated)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[32px]"
                  >
                    <option value="income">Thu</option>
                    <option value="expense">Chi</option>
                  </select>
                  <input
                    type="number"
                    value={(finance ?? { type: 'expense', amount: 0 }).amount || ''}
                    onChange={e =>
                      setFinance({
                        ...(finance ?? { type: 'expense', amount: 0 }),
                        amount: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    placeholder="Số tiền"
                    className="flex-1 bg-[var(--bg-elevated)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[32px] font-mono"
                    inputMode="numeric"
                  />
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

            <CollapsibleOption
              label="🔔 Nhắc Nhở"
              active={showReminder}
              onToggle={() => setShowReminder(!showReminder)}
            >
              <div className="space-y-3 pt-2">
                {!showDeadline && (
                  <div className="text-xs text-red-500 bg-red-500/10 p-2 rounded">
                    ⚠️ Vui lòng bật "Hạn chót" trước khi thiết lập nhắc nhở
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="reminderEnabled"
                    checked={reminderEnabled}
                    onChange={e => setReminderEnabled(e.target.checked)}
                    disabled={!showDeadline}
                    className="size-4 rounded"
                  />
                  <label htmlFor="reminderEnabled" className="text-xs font-medium text-[var(--text-primary)]">
                    Bật nhắc nhở
                  </label>
                </div>

                {reminderEnabled && showDeadline && (
                  <div className="space-y-2 pt-2 border-t border-[var(--border-subtle)]">
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
                        Khoảng cách giữa các lần: <span className="text-[var(--accent-primary)]">{reminderRepeatInterval} giây</span>
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

                    <div className="bg-[var(--bg-base)] rounded p-2 mt-2">
                      <p className="text-xs text-[var(--text-muted)]">
                        📢 Hoạt động: Thông báo đẩy + Chuông + Giọng nói
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        ✋ Yêu cầu: Phải bấm "Đã Hiểu Rồi" mới dừng
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleOption>

            <CollapsibleOption
              label="🏷️ Danh mục"
              active={showCategory}
              onToggle={() => {
                const next = !showCategory;
                setShowCategory(next);
                if (next && !category) setCategory('other');
              }}
            >
              <div className="grid grid-cols-4 gap-1.5 pt-2">
                {(Object.keys(CATEGORY_LABELS) as TaskCategory[]).map(cat => {
                  const cfg = CATEGORY_LABELS[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => setCategory(cat)}
                      className={`py-2 rounded-lg text-[9px] font-medium min-h-[36px] flex flex-col items-center justify-center gap-0.5 ${
                        category === cat
                          ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]'
                          : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'
                      }`}
                    >
                      <span className="text-sm">{cfg.icon}</span>
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </CollapsibleOption>
          </div>
        </div>
      </div>
    </div>
  );
}
