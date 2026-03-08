import { useState, useMemo } from 'react';
import { useTaskStore, useSettingsStore, useTemplateStore } from '@/stores';
import { formatTimeRemaining, formatDeadlineDisplay } from '@/lib/notifications';
import { shareTask } from '@/lib/calendarExport';
import { isTaskOverdue } from '@/lib/autoQuadrant';

import {
  X, Calendar, Clock, RotateCcw, DollarSign,
  Play, CheckCircle2, Copy, Check, FileText, FolderOpen, Share2, AlertCircle, Pencil,
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
  const [financeType, setFinanceType] = useState<'income' | 'expense'>(task.finance?.type || 'expense');
  const [financeAmount, setFinanceAmount] = useState(task.finance?.amount || 0);
  const [copied, setCopied] = useState(false);

  const saveFinance = () => {
    if (financeAmount > 0) updateTask(task.id, { finance: { type: financeType, amount: financeAmount }, showFinance: true });
    else updateTask(task.id, { finance: undefined });
    setEditingFinance(false);
  };

  const handleAddToTemplate = () => {
    addTemplate({
      title: task.title, recurring: task.recurring || { type: 'none' },
      notes: task.notes, finance: task.finance,
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

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[90vh] bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-base)]/50">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-wider">Chi tiết việc</h2>
          <div className="flex items-center gap-2">
            <button onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium text-[var(--accent-primary)] bg-[var(--accent-dim)] border border-[var(--border-accent)] hover:bg-[var(--accent-dim)]/80 transition-colors">
              <Pencil size={14} />
              Sửa
            </button>
            <button onClick={onClose}
              className="size-9 rounded-lg flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)] transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Tiêu đề & trạng thái */}
          <section>
            <div className="flex items-start gap-3">
              <div
                className="w-1 h-6 rounded-full mt-1 flex-shrink-0"
                style={{ backgroundColor: taskIsOverdue ? 'var(--error)' : 'var(--accent-primary)' }}
              />
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-semibold text-[var(--text-primary)] break-words leading-snug">{task.title}</h3>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className={`text-[10px] px-2 py-1 rounded-md font-medium ${
                    task.status === 'done' ? 'bg-[rgba(52,211,153,0.15)] text-[var(--success)]' :
                    task.status === 'overdue' ? 'bg-[rgba(248,113,113,0.15)] text-[var(--error)]' :
                    task.status === 'in_progress' ? 'bg-[rgba(251,191,36,0.15)] text-[var(--warning)]' :
                    task.status === 'paused' ? 'bg-[rgba(96,165,250,0.15)] text-[var(--info)]' :
                    'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                  }`}>
                    {task.status === 'done' ? 'Xong' : task.status === 'overdue' ? 'Quá hạn' : task.status === 'in_progress' ? 'Đang làm' : task.status === 'paused' ? 'Tạm dừng' : 'Chờ'}
                  </span>
                  {groupNames.length > 0 && (
                    <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                      <FolderOpen size={10} /> {groupNames.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Thông tin thời gian - grid gọn */}
          <section className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {task.showDeadline && deadlineDisplay && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <div className={`size-8 rounded-lg flex items-center justify-center flex-shrink-0 ${deadlineInfo?.urgent ? 'bg-[rgba(248,113,113,0.15)]' : 'bg-[var(--bg-elevated)]'}`}>
                  <Calendar size={14} className={deadlineInfo?.urgent ? 'text-[var(--error)]' : 'text-[var(--text-muted)]'} />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] text-[var(--text-muted)]">Hạn chót</p>
                  <p className={`text-xs font-medium truncate ${deadlineInfo?.urgent ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'}`}>
                    {deadlineDisplay}
                  </p>
                  {deadlineInfo && <p className="text-[10px] text-[var(--text-muted)]">{deadlineInfo.text}</p>}
                </div>
              </div>
            )}
            {task.duration && task.duration > 0 && (
              <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <div className="size-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-[var(--accent-dim)]">
                  <Clock size={14} className="text-[var(--accent-primary)]" />
                </div>
                <div>
                  <p className="text-[10px] text-[var(--text-muted)]">Thời lượng</p>
                  <p className="text-xs font-mono font-medium text-[var(--text-primary)]">{formatDuration(task.duration)}</p>
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
                  <p className="text-xs font-medium text-[var(--text-primary)]">
                    {task.recurring.type === 'daily' ? 'Hàng ngày' : task.recurring.type === 'weekdays' ? 'Thứ 2 - Thứ 6' : 'Hàng tuần'}
                  </p>
                </div>
              </div>
            )}
          </section>

          {task.showNotes && task.notes && (
            <section>
              <div className="px-3 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <p className="text-[10px] text-[var(--text-muted)] mb-1.5 flex items-center gap-1">Ghi chú</p>
                <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap leading-relaxed">{task.notes}</p>
              </div>
            </section>
          )}

          {/* Rich content from templates */}
          {task.templateId && (() => {
            const template = templates.find(t => t.id === task.templateId);
            if (!template) return null;
            return (
              <section className="space-y-2">
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
              </section>
            );
          })()}

          {task.showFinance && (
            <section>
              <div className="px-3 py-2.5 rounded-xl bg-[var(--bg-surface)] border border-[var(--border-subtle)]">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1"><DollarSign size={10} /> Thu Chi</p>
                  <button onClick={() => setEditingFinance(!editingFinance)}
                    className="text-[10px] font-medium text-[var(--accent-primary)] hover:underline">
                    {editingFinance ? 'Đóng' : task.finance ? 'Sửa' : 'Nhập'}
                  </button>
                </div>
                {task.finance && !editingFinance && (
                  <span className={`text-base font-bold font-mono ${task.finance.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                    {task.finance.type === 'income' ? '+' : '-'}{task.finance.amount.toLocaleString('vi-VN')}đ
                  </span>
                )}
                {editingFinance && (
                  <div className="space-y-2.5 mt-1">
                    <div className="flex gap-2">
                      <button onClick={() => setFinanceType('income')} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${financeType === 'income' ? 'bg-[rgba(52,211,153,0.2)] text-[var(--success)] border border-[var(--success)]/30' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-transparent'}`}>+ Thu</button>
                      <button onClick={() => setFinanceType('expense')} className={`flex-1 py-2 rounded-lg text-xs font-medium transition-colors ${financeType === 'expense' ? 'bg-[rgba(248,113,113,0.2)] text-[var(--error)] border border-[var(--error)]/30' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)] border border-transparent'}`}>- Chi</button>
                    </div>
                    <input type="number" value={financeAmount || ''} onChange={e => setFinanceAmount(Math.max(0, parseInt(e.target.value) || 0))} placeholder="Số tiền" inputMode="numeric"
                      className="w-full bg-[var(--bg-elevated)] rounded-lg px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] font-mono min-h-[40px] focus:border-[var(--accent-primary)]" />
                    <button onClick={saveFinance} className="w-full py-2.5 rounded-lg text-xs font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] min-h-[40px] hover:opacity-90 transition-opacity">Lưu</button>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>

        {/* Bottom actions - phân cấp rõ ràng */}
        <div className="px-4 pb-4 pt-3 border-t border-[var(--border-subtle)] bg-[var(--bg-base)]/30 space-y-3">
          {/* Primary: Quá hạn → Chỉnh hạn / Hoàn thành | Bình thường → Bấm giờ */}
          {(taskIsOverdue || canTimer) && task.status !== 'done' && (
          <div className="flex gap-2">
            {taskIsOverdue ? (
              <>
                <button onClick={() => { onClose(); onEdit(); }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-[var(--warning)] bg-[rgba(251,191,36,0.15)] border border-[var(--warning)]/40 min-h-[40px] flex items-center justify-center gap-2 hover:bg-[rgba(251,191,36,0.25)] transition-colors">
                  <AlertCircle size={16} /> Chỉnh hạn chót
                </button>
                <button onClick={() => { useTaskStore.getState().completeTask(task.id); onClose(); }}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold text-white bg-[var(--success)] min-h-[40px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-sm">
                  <CheckCircle2 size={16} /> Hoàn thành
                </button>
              </>
            ) : canTimer ? (
              <button onClick={() => { startTimer(task.id); onClose(); }}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] min-h-[40px] flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-sm">
                <Play size={16} fill="currentColor" /> Bấm giờ
              </button>
            ) : null}
          </div>
          )}
          {/* Secondary: Chia sẻ, Thêm mẫu */}
          <div className="flex gap-2">
            <button onClick={handleShare}
              className="flex-1 py-2.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] min-h-[36px] flex items-center justify-center gap-2 border border-[var(--border-subtle)] hover:bg-[var(--bg-elevated)] hover:text-[var(--text-primary)] transition-colors">
              {copied ? <Check size={14} className="text-[var(--success)]" /> : <Share2 size={14} />} {copied ? 'Đã copy' : 'Chia sẻ'}
            </button>
            {!hasTemplate && task.status !== 'done' && (
              <button onClick={() => { handleAddToTemplate(); onClose(); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-medium text-[var(--accent-primary)] bg-[var(--accent-dim)] min-h-[36px] flex items-center justify-center gap-2 border border-[var(--border-accent)] hover:bg-[var(--accent-dim)]/80 transition-colors">
                <FileText size={14} /> Thêm mẫu
              </button>
            )}
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
    if (task.finance) text += `💰 ${task.finance.type === 'income' ? 'Thu' : 'Chi'}: ${task.finance.amount.toLocaleString('vi-VN')}đ\n`;
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
