import { useState, useMemo } from 'react';
import { useTaskStore, useSettingsStore, useTemplateStore } from '@/stores';
import { formatTimeRemaining, formatDeadlineDisplay } from '@/lib/notifications';
import { shareTask } from '@/lib/calendarExport';
import { isTaskOverdue } from '@/lib/autoQuadrant';

import {
  X, Calendar, Clock, RotateCcw, DollarSign,
  Play, CheckCircle2, Copy, Check, FileText, FolderOpen, Share2, AlertCircle,
} from 'lucide-react';
import type { Task, TaskFinance } from '@/types';
import { QUADRANT_LABELS } from '@/types';

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

  const qConfig = QUADRANT_LABELS[task.quadrant];
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
      <div className="w-full max-w-lg max-h-[90vh] bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[var(--border-subtle)]">
          <h2 className="text-sm font-bold text-[var(--text-primary)]">Chi tiết việc</h2>
          <div className="flex gap-1.5">
            <button onClick={onEdit} className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-[var(--bg-surface)] text-[var(--text-secondary)] min-h-[32px]">Sửa</button>
            <button onClick={onClose} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><X size={16} /></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <div>
            <div className="flex items-start gap-2">
              <div className="w-1 h-5 rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: qConfig.color }} />
              <h3 className="text-base font-semibold text-[var(--text-primary)] break-words leading-snug">{task.title}</h3>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 ml-3 flex-wrap">
              <span className="text-[10px] font-medium" style={{ color: qConfig.color }}>{qConfig.icon} {qConfig.label}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                task.status === 'done' ? 'bg-[rgba(52,211,153,0.15)] text-[var(--success)]' :
                task.status === 'overdue' ? 'bg-[rgba(248,113,113,0.15)] text-[var(--error)]' :
                task.status === 'in_progress' ? 'bg-[rgba(251,191,36,0.15)] text-[var(--warning)]' :
                task.status === 'paused' ? 'bg-[rgba(96,165,250,0.15)] text-[var(--info)]' :
                'bg-[var(--bg-surface)] text-[var(--text-muted)]'
              }`}>
                {task.status === 'done' ? 'Xong' : task.status === 'overdue' ? 'Quá hạn' : task.status === 'in_progress' ? 'Đang làm' : task.status === 'paused' ? 'Tạm dừng' : 'Chờ'}
              </span>
              {groupNames.length > 0 && <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-0.5"><FolderOpen size={9} /> {groupNames.join(', ')}</span>}
            </div>
          </div>

          {task.showDeadline && deadlineDisplay && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-surface)]">
              <Calendar size={12} className={deadlineInfo?.urgent ? 'text-[var(--error)]' : 'text-[var(--text-muted)]'} />
              <span className={`text-xs ${deadlineInfo?.urgent ? 'text-[var(--error)]' : 'text-[var(--text-primary)]'}`}>{deadlineDisplay}</span>
              {deadlineInfo && <span className="text-[10px] text-[var(--text-muted)]">({deadlineInfo.text})</span>}
            </div>
          )}

          {task.duration && task.duration > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-surface)]">
              <Clock size={12} className="text-[var(--accent-primary)]" />
              <span className="text-xs text-[var(--text-primary)] font-mono">Tổng: {formatDuration(task.duration)}</span>
            </div>
          )}

          {task.showRecurring && task.recurring?.type !== 'none' && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--bg-surface)]">
              <RotateCcw size={12} className="text-[var(--info)]" />
              <span className="text-xs text-[var(--text-primary)]">
                {task.recurring.type === 'daily' ? 'Hàng ngày' : task.recurring.type === 'weekdays' ? 'T2-T6' : 'Hàng tuần'}
              </span>
            </div>
          )}

          {task.showNotes && task.notes && (
            <div className="px-3 py-2 rounded-xl bg-[var(--bg-surface)]">
              <p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap">{task.notes}</p>
            </div>
          )}

          {/* Rich content from templates */}
          {task.templateId && (() => {
            const template = templates.find(t => t.id === task.templateId);
            if (!template) return null;
            
            return (
              <>
                {template.richContent && (
                  <div className="px-3 py-2 rounded-xl bg-[var(--bg-surface)] prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: template.richContent }} />
                )}
                
                {template.media && template.media.length > 0 && (
                  <div className="space-y-2">
                    {template.media.map(block => (
                      <div key={block.id} className="rounded-xl overflow-hidden bg-[var(--bg-surface)]">
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
              </>
            );
          })()}

          {task.showFinance && (
            <div className="px-3 py-2 rounded-xl bg-[var(--bg-surface)]">
              <div className="flex items-center justify-between mb-1">
                <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1"><DollarSign size={10} /> Thu Chi</p>
                <button onClick={() => setEditingFinance(!editingFinance)} className="text-[9px] text-[var(--accent-primary)]">{editingFinance ? 'Đóng' : task.finance ? 'Sửa' : 'Nhập'}</button>
              </div>
              {task.finance && !editingFinance && (
                <span className={`text-sm font-bold font-mono ${task.finance.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>
                  {task.finance.type === 'income' ? '+' : '-'}{task.finance.amount.toLocaleString('vi-VN')}đ
                </span>
              )}
              {editingFinance && (
                <div className="space-y-2 mt-1">
                  <div className="flex gap-2">
                    <button onClick={() => setFinanceType('income')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium ${financeType === 'income' ? 'bg-[rgba(52,211,153,0.2)] text-[var(--success)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>+ Thu</button>
                    <button onClick={() => setFinanceType('expense')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium ${financeType === 'expense' ? 'bg-[rgba(248,113,113,0.2)] text-[var(--error)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>- Chi</button>
                  </div>
                  <input type="number" value={financeAmount || ''} onChange={e => setFinanceAmount(Math.max(0, parseInt(e.target.value) || 0))} placeholder="Số tiền" inputMode="numeric"
                    className="w-full bg-[var(--bg-elevated)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] font-mono min-h-[32px]" />
                  <button onClick={saveFinance} className="w-full py-2 rounded-lg text-[10px] font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] min-h-[32px]">Lưu</button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Bottom actions */}
        <div className="px-4 pb-4 pt-2 border-t border-[var(--border-subtle)] flex gap-2 flex-wrap">
          <button onClick={handleShare}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-[var(--text-secondary)] bg-[var(--bg-surface)] min-h-[42px] flex items-center justify-center gap-1.5 border border-[var(--border-subtle)]">
            {copied ? <Check size={14} /> : <Share2 size={14} />} {copied ? 'Đã copy' : 'Chia sẻ'}
          </button>
          {canTimer && (
            <button onClick={() => { startTimer(task.id); onClose(); }} className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] min-h-[42px] flex items-center justify-center gap-1.5">
              <Play size={14} fill="currentColor" /> Bấm giờ
            </button>
          )}
          {!hasTemplate && task.status !== 'done' && (
            <button onClick={() => { handleAddToTemplate(); onClose(); }} className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-[var(--accent-primary)] bg-[var(--accent-dim)] min-h-[42px] flex items-center justify-center gap-1.5 border border-[var(--border-accent)]">
              <FileText size={14} /> Thêm vào Mẫu
            </button>
          )}
          {/* Overdue: Chỉnh deadline hoặc Hoàn thành */}
          {taskIsOverdue && task.status !== 'done' && (
            <>
              <button onClick={() => { onClose(); onEdit(); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-[var(--warning)] bg-[rgba(251,191,36,0.2)] min-h-[42px] flex items-center justify-center gap-1.5 border border-[var(--warning)]">
                <AlertCircle size={14} /> Chỉnh hạn chót
              </button>
              <button onClick={() => { useTaskStore.getState().completeTask(task.id); onClose(); }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-[var(--success)] bg-[rgba(52,211,153,0.15)] min-h-[42px] flex items-center justify-center gap-1.5 border border-[rgba(52,211,153,0.3)]">
                <CheckCircle2 size={14} /> Hoàn thành
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Delegate summary modal
export function DelegateSummaryModal({ task, onClose }: { task: Task; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const qConfig = QUADRANT_LABELS[task.quadrant];

  const summaryText = useMemo(() => {
    let text = `📋 VIỆC ỦY THÁC\n\n`;
    text += `📌 ${task.title}\n`;
    text += `🏷️ ${qConfig.label}\n`;
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
