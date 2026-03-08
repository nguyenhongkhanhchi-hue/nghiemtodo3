import { useState, useMemo, useCallback } from 'react';
import { useTemplateStore, useTopicStore, useTaskStore } from '@/stores';
import { convertYoutubeUrl, isYoutubeUrl } from '@/lib/youtubeUtils';
import {
  Plus, Trash2, Edit3, X, Save, Youtube, DollarSign, ArrowRight,
  Download, Upload, Tag, Check, Eye, FolderOpen, Layers, ChevronDown,
} from 'lucide-react';
import type { TaskTemplate, EisenhowerQuadrant, MediaBlock, TaskFinance, RecurringType } from '@/types';
import { QUADRANT_LABELS } from '@/types';
import { toast } from '@/lib/toast';

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ── Template Info Modal ──
function TemplateInfoModal({ template, onClose, onEdit }: { template: TaskTemplate; onClose: () => void; onEdit: () => void }) {
  const topics = useTopicStore(s => s.topics);
  const templates = useTemplateStore(s => s.templates);
  const topic = topics.find(t => t.id === template.topicId);
  // Find parent groups
  const parentGroups = templates.filter(t => t.isGroup && t.groupIds?.includes(template.id));
  // For group: get child singles
  const childSingles = template.isGroup && template.groupIds ? template.groupIds.map(id => templates.find(t => t.id === id)).filter(Boolean) as TaskTemplate[] : [];

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-lg max-h-[85vh] bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[var(--border-subtle)]">
          <div className="flex items-center gap-2">
            <Eye size={14} className="text-[var(--accent-primary)]" />
            <h2 className="text-sm font-bold text-[var(--text-primary)]">Chi tiết mẫu</h2>
          </div>
          <div className="flex gap-1.5">
            <button onClick={onEdit} className="px-2.5 py-1.5 rounded-lg text-[10px] font-medium bg-[var(--bg-surface)] text-[var(--text-secondary)] min-h-[32px]">Sửa</button>
            <button onClick={onClose} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><X size={16} /></button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <h3 className="text-base font-semibold text-[var(--text-primary)]">{template.isGroup ? '📂 ' : ''}{template.title}</h3>
          <div className="flex items-center gap-2 flex-wrap">
            {topic && <span className="text-[10px] px-2 py-0.5 rounded-full bg-[rgba(96,165,250,0.15)] text-[var(--info)]"><Tag size={8} className="inline" /> {topic.name}</span>}
            {template.xpReward && <span className="text-[10px] font-mono text-[var(--accent-primary)]">+{template.xpReward}XP</span>}
            {template.finance && <span className={`text-[10px] font-mono ${template.finance.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>{template.finance.type === 'income' ? '+' : '-'}{template.finance.amount.toLocaleString('vi-VN')}đ</span>}
            {parentGroups.length > 0 && <span className="text-[10px] text-[var(--text-muted)]">📂 {parentGroups.map(g => g.title).join(', ')}</span>}
          </div>
          {template.notes && <div className="px-3 py-2 rounded-xl bg-[var(--bg-surface)]"><p className="text-xs text-[var(--text-primary)] whitespace-pre-wrap">{template.notes}</p></div>}
          {childSingles.length > 0 && (
            <div>
              <p className="text-[10px] text-[var(--text-muted)] mb-1 flex items-center gap-1"><Layers size={10} /> Việc đơn ({childSingles.length})</p>
              {childSingles.map(c => (
                <div key={c.id} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-surface)] mb-1">
                  <div className="size-3 rounded-full border border-[var(--text-muted)]" />
                  <span className="text-xs text-[var(--text-primary)]">{c.title}</span>
                  {c.finance && <span className={`text-[9px] font-mono ml-auto ${c.finance.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>{c.finance.type === 'income' ? '+' : '-'}{c.finance.amount.toLocaleString('vi-VN')}đ</span>}
                </div>
              ))}
            </div>
          )}
          {template.media && template.media.length > 0 && (
            <div>
              <p className="text-[10px] text-[var(--text-muted)] mb-1">Đa phương tiện</p>
              {template.media.map(block => (
                <div key={block.id} className="rounded-xl overflow-hidden border border-[var(--border-subtle)] bg-[var(--bg-surface)] mb-2">
                  {block.type === 'youtube' && <div className="aspect-video"><iframe src={block.content} className="w-full h-full" allowFullScreen /></div>}
                  {block.type === 'image' && <img src={block.content} alt="" className="w-full max-h-48 object-cover" />}
                  {block.type === 'text' && <p className="px-3 py-2 text-xs text-[var(--text-primary)] whitespace-pre-wrap">{block.content}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Add to Todo Dialog ──
function AddToTodoDialog({ template, onClose }: { template: TaskTemplate; onClose: () => void }) {
  const addSingleTaskToTodo = useTemplateStore(s => s.addSingleTaskToTodo);
  const addGroupTasksToTodo = useTemplateStore(s => s.addGroupTasksToTodo);
  const now = new Date();
  const nowDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const nowTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const [deadlineDate, setDeadlineDate] = useState(nowDate);
  const [deadlineTime, setDeadlineTime] = useState(nowTime);
  const [quadrant, setQuadrant] = useState<EisenhowerQuadrant>('do_first');
  const [recurringType, setRecurringType] = useState<RecurringType>(template.recurring?.type || 'none');
  const [notes, setNotes] = useState('');
  const [showDeadline, setShowDeadline] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [showNotes, setShowNotes] = useState(false);

  const handleAdd = () => {
    if (template.isGroup) {
      addGroupTasksToTodo(template.id, quadrant, showDeadline ? deadlineDate : undefined, showDeadline ? deadlineTime : undefined, { type: showRecurring ? recurringType : 'none' }, notes || undefined);
    } else {
      let deadline: number | undefined;
      if (showDeadline && deadlineDate) deadline = new Date(`${deadlineDate}T${deadlineTime || '23:59'}:00`).getTime();
      if (quadrant === 'do_first' && !deadline) { const d = new Date(); d.setHours(23, 59, 0, 0); deadline = d.getTime(); }
      if (quadrant === 'schedule' && !deadline) { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(23, 59, 0, 0); deadline = d.getTime(); }
      addSingleTaskToTodo(template.id, quadrant, deadline, showDeadline ? deadlineDate : undefined, showDeadline ? deadlineTime : undefined, undefined, { type: showRecurring ? recurringType : 'none' }, notes || undefined);
    }
    onClose();
  };

  const toggles = [
    { key: 'deadline', label: '⏰ Hạn chót', active: showDeadline, toggle: () => setShowDeadline(!showDeadline) },
    { key: 'recurring', label: '🔁 Lặp lại', active: showRecurring, toggle: () => setShowRecurring(!showRecurring) },
    { key: 'notes', label: '📝 Ghi chú', active: showNotes, toggle: () => setShowNotes(!showNotes) },
  ];

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div className="w-full max-w-md max-h-[80vh] bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Thêm vào DS việc</h3>
          <button onClick={onClose} className="text-[var(--text-muted)]"><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
          <p className="text-xs text-[var(--text-secondary)] bg-[var(--bg-surface)] rounded-lg px-3 py-2">{template.isGroup ? '📂 ' : ''}{template.title}</p>
          <div className="grid grid-cols-2 gap-1.5">
            {(Object.keys(QUADRANT_LABELS) as EisenhowerQuadrant[]).map(q => {
              const cfg = QUADRANT_LABELS[q];
              return (
                <button key={q} onClick={() => setQuadrant(q)}
                  className={`py-2 rounded-lg text-[10px] font-medium min-h-[34px] border flex items-center justify-center gap-1 ${quadrant === q ? 'border-current' : 'border-transparent bg-[var(--bg-surface)]'}`}
                  style={quadrant === q ? { color: cfg.color, backgroundColor: `${cfg.color}15` } : {}}>
                  {cfg.icon} {cfg.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {toggles.map(opt => (
              <button key={opt.key} onClick={opt.toggle}
                className={`flex items-center gap-1.5 px-2 py-2 rounded-lg text-[10px] font-medium min-h-[34px] border ${opt.active ? 'border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'border-[var(--border-subtle)] bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                <div className={`size-3.5 rounded border flex items-center justify-center ${opt.active ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]' : 'border-[var(--text-muted)]'}`}>
                  {opt.active && <Check size={8} className="text-[var(--bg-base)]" />}
                </div>
                {opt.label}
              </button>
            ))}
          </div>
          {showDeadline && (
            <div className="flex gap-2">
              <input type="date" value={deadlineDate} onChange={e => setDeadlineDate(e.target.value)}
                className="flex-1 bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[34px]" />
              <input type="time" value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)}
                className="flex-1 bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[34px]" />
            </div>
          )}
          {showRecurring && (
            <div className="flex gap-1.5">
              {(['none', 'daily', 'weekdays', 'weekly'] as RecurringType[]).map(r => (
                <button key={r} onClick={() => setRecurringType(r)}
                  className={`flex-1 py-1.5 rounded-lg text-[9px] font-medium min-h-[30px] ${recurringType === r ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                  {r === 'none' ? 'Không' : r === 'daily' ? 'Hàng ngày' : r === 'weekdays' ? 'T2-T6' : 'Hàng tuần'}
                </button>
              ))}
            </div>
          )}
          {showNotes && (
            <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Ghi chú..." rows={2}
              className="w-full bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] resize-none" />
          )}
          <button onClick={handleAdd} className="w-full py-3 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] active:opacity-80 min-h-[44px] flex items-center justify-center gap-2">
            <ArrowRight size={16} /> {template.isGroup ? 'Thêm toàn bộ việc đơn' : 'Nhân bản vào DS việc'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Template Editor ──
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

function TemplateEditor({ template, isGroupMode, onSave, onCancel }: {
  template?: TaskTemplate;
  isGroupMode: boolean;
  onSave: (data: Omit<TaskTemplate, 'id' | 'createdAt'>) => void;
  onCancel: () => void;
}) {
  const topics = useTopicStore(s => s.topics);
  const addTopic = useTopicStore(s => s.addTopic);
  const templates = useTemplateStore(s => s.templates);
  const singleTemplates = templates.filter(t => !t.isGroup);

  const [title, setTitle] = useState(template?.title || '');
  const [notes, setNotes] = useState(template?.notes || '');
  const [media, setMedia] = useState<MediaBlock[]>(template?.media || []);
  const [videoInput, setVideoInput] = useState('');
  const [finance, setFinance] = useState<TaskFinance | undefined>(template?.finance);
  const [xpReward, setXpReward] = useState(template?.xpReward || 0);
  const [topicId, setTopicId] = useState(template?.topicId || '');
  const [newTopic, setNewTopic] = useState('');
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>(template?.groupIds || []);

  // Toggle fields
  const [showFinance, setShowFinance] = useState(!!template?.finance);
  const [showNotes, setShowNotes] = useState(!!template?.notes);
  const [showVideo, setShowVideo] = useState(!!(template?.media && template.media.some(m => m.type === 'youtube')));
  const [showXP, setShowXP] = useState(!!(template?.xpReward && template.xpReward > 0));
  const [showTopic, setShowTopic] = useState(!!template?.topicId);
  const [showGroupSelect, setShowGroupSelect] = useState(true);

  const handleAddVideo = () => {
    const val = videoInput.trim();
    if (!val) return;
    if (isYoutubeUrl(val)) {
      const embedUrl = convertYoutubeUrl(val);
      if (embedUrl) setMedia([...media, { id: genId(), type: 'youtube', content: embedUrl }]);
    } else {
      setMedia([...media, { id: genId(), type: 'image', content: val }]);
    }
    setVideoInput('');
  };

  const toggleGroupChild = (id: string) => {
    setSelectedGroupIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSave = () => {
    if (!title.trim()) return;
    onSave({
      title: title.trim(),
      recurring: { type: 'none' },
      notes: showNotes ? notes || undefined : undefined,
      media: showVideo && media.length > 0 ? media : undefined,
      finance: showFinance ? finance : undefined,
      xpReward: showXP && xpReward > 0 ? xpReward : undefined,
      topicId: showTopic ? topicId || undefined : undefined,
      isGroup: isGroupMode,
      groupIds: isGroupMode ? selectedGroupIds : undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70" onClick={onCancel}>
      <div className="w-full max-w-lg max-h-[90vh] bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 pt-3 pb-2 border-b border-[var(--border-subtle)]">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{template ? 'Sửa mẫu' : 'Tạo mẫu'} {isGroupMode ? '(Nhóm)' : '(Việc đơn)'}</h3>
          <button onClick={onCancel} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><X size={16} /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder={isGroupMode ? 'Tên nhóm việc' : 'Tên việc đơn'} autoFocus
            className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[44px]" />

          <div className="space-y-2">
            {!isGroupMode && (
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
                    onChange={e =>
                      setFinance({
                        ...(finance ?? { type: 'expense', amount: 0 }),
                        type: e.target.value as any,
                      })
                    }
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
            )}

            <CollapsibleOption
              label="📝 Ghi chú"
              active={showNotes}
              onToggle={() => setShowNotes(!showNotes)}
            >
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Ghi chú..."
                rows={2}
                className="w-full mt-2 bg-[var(--bg-surface)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] resize-none"
              />
            </CollapsibleOption>

            <CollapsibleOption
              label="⭐ XP thưởng"
              active={showXP}
              onToggle={() => setShowXP(!showXP)}
            >
              <div className="flex items-center gap-2 pt-2">
                <span className="text-xs text-[var(--text-muted)]">
                  XP khi hoàn thành
                </span>
                <input
                  type="number"
                  value={xpReward || ''}
                  onChange={e =>
                    setXpReward(Math.max(0, parseInt(e.target.value) || 0))
                  }
                  placeholder="0"
                  className="w-20 bg-[var(--bg-elevated)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[32px] font-mono ml-auto"
                  inputMode="numeric"
                />
              </div>
            </CollapsibleOption>

            <CollapsibleOption
              label="🏷️ Chủ đề"
              active={showTopic}
              onToggle={() => setShowTopic(!showTopic)}
            >
              <div className="pt-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Tag size={10} className="text-[var(--text-muted)]" />
                  {topics.map(t => (
                    <button
                      key={t.id}
                      onClick={() =>
                        setTopicId(topicId === t.id ? '' : t.id)
                      }
                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium border ${
                        topicId === t.id
                          ? 'border-[var(--accent-primary)] bg-[var(--accent-dim)] text-[var(--accent-primary)]'
                          : 'border-[var(--border-subtle)] text-[var(--text-muted)]'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                  {showNewTopic ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={newTopic}
                        onChange={e => setNewTopic(e.target.value)}
                        placeholder="Tên"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter' && newTopic.trim()) {
                            const id = addTopic(newTopic.trim());
                            setTopicId(id);
                            setNewTopic('');
                            setShowNewTopic(false);
                          }
                        }}
                        className="w-20 bg-[var(--bg-elevated)] rounded-lg px-2 py-1 text-[10px] text-[var(--text-primary)] outline-none border border-[var(--border-subtle)]"
                      />
                      <button
                        onClick={() => {
                          if (newTopic.trim()) {
                            const id = addTopic(newTopic.trim());
                            setTopicId(id);
                            setNewTopic('');
                            setShowNewTopic(false);
                          }
                        }}
                        className="size-6 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center text-[var(--bg-base)]"
                      >
                        <Check size={10} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowNewTopic(true)}
                      className="px-2 py-1 rounded-full text-[10px] border border-dashed border-[var(--border-subtle)] text-[var(--text-muted)]"
                    >
                      + Mới
                    </button>
                  )}
                </div>
              </div>
            </CollapsibleOption>

            {!isGroupMode && (
              <CollapsibleOption
                label="🎬 Video / Hình ảnh"
                active={showVideo}
                onToggle={() => setShowVideo(!showVideo)}
              >
                <div className="pt-2 space-y-2">
                  {media
                    .filter(m => m.type === 'youtube')
                    .map(block => (
                      <div
                        key={block.id}
                        className="relative rounded-xl overflow-hidden border border-[var(--border-subtle)]"
                      >
                        <div className="aspect-video">
                          <iframe
                            src={block.content}
                            className="w-full h-full"
                            allowFullScreen
                          />
                        </div>
                        <button
                          onClick={() =>
                            setMedia(media.filter(m => m.id !== block.id))
                          }
                          className="absolute top-1 right-1 size-6 rounded bg-black/60 flex items-center justify-center text-white"
                        >
                          <X size={10} />
                        </button>
                      </div>
                    ))}
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={videoInput}
                      onChange={e => setVideoInput(e.target.value)}
                      onKeyDown={e =>
                        e.key === 'Enter' && handleAddVideo()
                      }
                      placeholder="Dán link YouTube hoặc ảnh..."
                      className="flex-1 bg-[var(--bg-elevated)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] min-h-[34px]"
                    />
                    <button
                      onClick={handleAddVideo}
                      className="size-8 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent-primary)]"
                    >
                      <Plus size={12} />
                    </button>
                  </div>
                </div>
              </CollapsibleOption>
            )}

            {isGroupMode && (
              <CollapsibleOption
                label="📂 Chọn việc đơn trong nhóm"
                active={showGroupSelect}
                onToggle={() => setShowGroupSelect(!showGroupSelect)}
              >
                <div className="pt-2 space-y-1.5">
                  <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                    <Layers size={10} /> Đã chọn {selectedGroupIds.length} việc
                  </p>
                  {singleTemplates.length === 0 ? (
                    <p className="text-[10px] text-[var(--text-muted)] py-2 text-center">
                      Chưa có việc đơn nào
                    </p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {singleTemplates.map(s => {
                        const selected = selectedGroupIds.includes(s.id);
                        return (
                          <button
                            key={s.id}
                            onClick={() => toggleGroupChild(s.id)}
                            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs text-left border transition-colors ${
                              selected
                                ? 'border-[var(--border-accent)] bg-[var(--accent-dim)] text-[var(--accent-primary)]'
                                : 'border-transparent bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
                            }`}
                          >
                            <div
                              className={`size-4 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                selected
                                  ? 'bg-[var(--accent-primary)] border-[var(--accent-primary)]'
                                  : 'border-[var(--text-muted)]'
                              }`}
                            >
                              {selected && (
                                <Check
                                  size={10}
                                  className="text-[var(--bg-base)]"
                                />
                              )}
                            </div>
                            <span className="truncate">{s.title}</span>
                            {s.finance && (
                              <span
                                className={`text-[9px] font-mono ml-auto flex-shrink-0 ${
                                  s.finance.type === 'income'
                                    ? 'text-[var(--success)]'
                                    : 'text-[var(--error)]'
                                }`}
                              >
                                {s.finance.type === 'income' ? '+' : '-'}
                                {s.finance.amount.toLocaleString('vi-VN')}đ
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CollapsibleOption>
            )}
          </div>
        </div>

        <div className="px-4 pb-4 pt-2 border-t border-[var(--border-subtle)]">
          <button onClick={handleSave} disabled={!title.trim()}
            className="w-full py-3 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-30 active:opacity-80 min-h-[44px] flex items-center justify-center gap-2">
            <Save size={14} /> {template ? 'Cập nhật' : 'Tạo mẫu'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Templates Page ──
export default function TemplatesPage({ 
  externalEditorOpen,
  externalEditorMode,
  onExternalEditorClose,
}: { 
  externalEditorOpen?: boolean;
  externalEditorMode?: 'single' | 'group';
  onExternalEditorClose?: () => void;
}) {
  const { templates, addTemplate, updateTemplate, removeTemplate, exportTemplates, importTemplates } = useTemplateStore();
  const topics = useTopicStore(s => s.topics);
  const [internalShowEditor, setInternalShowEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<TaskTemplate | null>(null);
  const [addingToTodo, setAddingToTodo] = useState<TaskTemplate | null>(null);
  const [viewingTemplate, setViewingTemplate] = useState<TaskTemplate | null>(null);
  const [tab, setTab] = useState<'single' | 'group'>('single');
  const [topicFilter, setTopicFilter] = useState<string>('all');
  const [internalTemplateMode, setInternalTemplateMode] = useState<'single' | 'group'>('single');

  // Merge external và internal state
  const showEditor = externalEditorOpen || internalShowEditor;
  const templateMode = externalEditorMode || internalTemplateMode;

  const singleTemplates = templates.filter(t => !t.isGroup);
  const groupTemplates = templates.filter(t => t.isGroup);
  const displayTemplates = (tab === 'single' ? singleTemplates : groupTemplates)
    .filter(t => topicFilter === 'all' || t.topicId === topicFilter);

  const topicCounts = topics.map(t => ({
    ...t, count: templates.filter(tpl => tpl.topicId === t.id).length,
  }));

  const handleSave = (data: Omit<TaskTemplate, 'id' | 'createdAt'>) => {
    if (!data.title.trim()) {
      toast.warning('Vui lòng nhập tên mẫu');
      return;
    }
    if (editingTemplate) updateTemplate(editingTemplate.id, data);
    else addTemplate(data);
    toast.success(editingTemplate ? 'Đã cập nhật mẫu' : 'Đã tạo mẫu mới');
    setInternalShowEditor(false); 
    setEditingTemplate(null);
    onExternalEditorClose?.();
  };

  const handleCloseEditor = () => {
    setInternalShowEditor(false);
    setEditingTemplate(null);
    onExternalEditorClose?.();
  };

  const handleExport = () => {
    const json = exportTemplates();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'nghiemwork-templates.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    file.text().then(json => {
      const count = importTemplates(json);
      alert(count > 0 ? `Đã nhập ${count} mẫu` : 'Không nhập được mẫu nào');
    });
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full px-4 pb-24 overflow-y-auto" style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 12px))' }}>
      <div className="flex items-center justify-between mb-3">
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Việc Mẫu</h1>
        <div className="flex gap-1.5">
          <button onClick={handleExport} className="size-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)]" title="Xuất"><Download size={14} /></button>
          <label className="size-8 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)] cursor-pointer" title="Nhập">
            <Upload size={14} /><input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-0.5 p-0.5 bg-[var(--bg-elevated)] rounded-xl mb-3">
        <button onClick={() => setTab('single')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium min-h-[36px] flex items-center justify-center gap-1.5 ${tab === 'single' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
          Việc đơn <span className="text-[9px] font-mono bg-[var(--bg-base)] px-1.5 py-0.5 rounded">{singleTemplates.length}</span>
        </button>
        <button onClick={() => setTab('group')}
          className={`flex-1 py-2 rounded-lg text-xs font-medium min-h-[36px] flex items-center justify-center gap-1.5 ${tab === 'group' ? 'bg-[var(--bg-surface)] text-[var(--text-primary)]' : 'text-[var(--text-muted)]'}`}>
          Nhóm việc <span className="text-[9px] font-mono bg-[var(--bg-base)] px-1.5 py-0.5 rounded">{groupTemplates.length}</span>
        </button>
      </div>

      {/* Topic filter */}
      {topicCounts.length > 0 && (
        <div className="flex gap-1 mb-3 overflow-x-auto pb-0.5">
          <button onClick={() => setTopicFilter('all')}
            className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[9px] font-medium min-h-[26px] ${topicFilter === 'all' ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
            Tất cả
          </button>
          {topicCounts.map(t => (
            <button key={t.id} onClick={() => setTopicFilter(topicFilter === t.id ? 'all' : t.id)}
              className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[9px] font-medium min-h-[26px] flex items-center gap-1 ${topicFilter === t.id ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
              {t.name} <span className="font-mono">{t.count}</span>
            </button>
          ))}
        </div>
      )}

      {displayTemplates.length === 0 && !showEditor ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <span className="text-2xl mb-2">{tab === 'single' ? '📄' : '📂'}</span>
          <p className="text-xs text-[var(--text-muted)]">{tab === 'single' ? 'Chưa có việc đơn nào' : 'Chưa có nhóm việc nào'}</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {displayTemplates.map(template => {
            const topic = topics.find(t => t.id === template.topicId);
            const parentGroups = !template.isGroup ? groupTemplates.filter(g => g.groupIds?.includes(template.id)) : [];
            const childCount = template.isGroup && template.groupIds ? template.groupIds.length : 0;
            return (
              <div key={template.id} className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] p-3 active:border-[var(--border-accent)] transition-colors">
                <div className="flex items-start gap-2">
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewingTemplate(template)}>
                    <p className="text-sm font-medium text-[var(--text-primary)] break-words">{template.isGroup ? '📂 ' : ''}{template.title}</p>
                    <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                      {topic && <span className="text-[9px] text-[var(--info)] flex items-center gap-0.5"><Tag size={7} /> {topic.name}</span>}
                      {parentGroups.length > 0 && <span className="text-[9px] text-[var(--text-muted)]">📂 {parentGroups.map(g => g.title).join(', ')}</span>}
                      {childCount > 0 && <span className="text-[9px] text-[var(--text-muted)]"><Layers size={7} className="inline" /> {childCount}</span>}
                      {template.xpReward && <span className="text-[9px] text-[var(--accent-primary)] font-mono">+{template.xpReward}XP</span>}
                      {template.finance && <span className={`text-[9px] font-mono ${template.finance.type === 'income' ? 'text-[var(--success)]' : 'text-[var(--error)]'}`}>{template.finance.type === 'income' ? '+' : '-'}{template.finance.amount.toLocaleString('vi-VN')}đ</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => setAddingToTodo(template)} className="px-2.5 py-1.5 rounded-lg bg-[var(--accent-dim)] text-[9px] font-semibold text-[var(--accent-primary)] min-h-[30px]">+ Thêm</button>
                    <button onClick={() => { setEditingTemplate(template); setInternalShowEditor(true); }} className="size-7 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><Edit3 size={12} /></button>
                    <button onClick={() => removeTemplate(template.id)} className="size-7 rounded-lg bg-[rgba(248,113,113,0.1)] flex items-center justify-center text-[var(--error)]"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating button removed - now using UnifiedFAB from App.tsx */}

      {showEditor && <TemplateEditor template={editingTemplate || undefined} isGroupMode={editingTemplate ? !!editingTemplate.isGroup : templateMode === 'group'} onSave={handleSave} onCancel={handleCloseEditor} />}
      {addingToTodo && <AddToTodoDialog template={addingToTodo} onClose={() => setAddingToTodo(null)} />}
      {viewingTemplate && <TemplateInfoModal template={viewingTemplate} onClose={() => setViewingTemplate(null)} onEdit={() => { setEditingTemplate(viewingTemplate); setViewingTemplate(null); setInternalShowEditor(true); }} />}
    </div>
  );
}

// Export functions for UnifiedFAB to call
export function useTemplateActions() {
  return {
    createSingleTemplate: (setShowEditor: (show: boolean) => void, setTemplateMode: (mode: 'single' | 'group') => void) => {
      setTemplateMode('single');
      setShowEditor(true);
    },
    createGroupTemplate: (setShowEditor: (show: boolean) => void, setTemplateMode: (mode: 'single' | 'group') => void) => {
      setTemplateMode('group');
      setShowEditor(true);
    },
  };
}
