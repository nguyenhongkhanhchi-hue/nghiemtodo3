import { Sparkles, X, Plus, FileText, Layers } from 'lucide-react';
import { useSettingsStore } from '@/stores';
import { useState } from 'react';

// Context-aware FAB
export function UnifiedFAB({ 
  onAddTask,
  onAddSingleTemplate,
  onAddGroupTemplate,
  onOpenLucy, 
  showLucy,
  onGoToTemplates,
}: { 
  onAddTask: () => void;
  onAddSingleTemplate?: () => void;
  onAddGroupTemplate?: () => void;
  onOpenLucy: () => void; 
  showLucy: boolean;
  onGoToTemplates?: () => void;
}) {
  const currentPage = useSettingsStore(s => s.currentPage);
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const isTasksPage = currentPage === 'tasks';
  const isTemplatesPage = currentPage === 'templates';

  return (
    <>
      {/* Tasks page: nút chuyển sang MẪU thay vì thêm việc trực tiếp */}
      {isTasksPage && (
        <button onClick={onGoToTemplates}
          className="fixed z-[61] size-14 rounded-full bg-[var(--accent-primary)] text-[var(--bg-base)] flex items-center justify-center shadow-2xl active:scale-95 transition-all duration-200"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 138px)', right: '16px' }}
          aria-label="Thêm từ mẫu">
          <FileText size={24} strokeWidth={2} />
        </button>
      )}

      {/* Template Menu */}
      {isTemplatesPage && (
        <>
          {showTemplateMenu && (
            <div className="fixed z-[60] inset-0 bg-black/20" onClick={() => setShowTemplateMenu(false)} />
          )}
          <button onClick={() => setShowTemplateMenu(!showTemplateMenu)}
            className="fixed z-[61] size-14 rounded-full bg-[var(--accent-primary)] text-[var(--bg-base)] flex items-center justify-center shadow-2xl active:scale-95 transition-all duration-200"
            style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 138px)', right: '16px' }}
            aria-label="Thêm mẫu">
            <Plus size={26} strokeWidth={2.5} className={showTemplateMenu ? 'rotate-45 transition-transform' : ''} />
          </button>
          {showTemplateMenu && (
            <div className="fixed z-[61] flex flex-col gap-2" style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 208px)', right: '16px' }}>
              <button onClick={() => { onAddSingleTemplate?.(); setShowTemplateMenu(false); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-lg text-sm font-medium text-[var(--text-primary)] whitespace-nowrap animate-slide-up">
                <FileText size={16} /> Việc đơn
              </button>
              <button onClick={() => { onAddGroupTemplate?.(); setShowTemplateMenu(false); }}
                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[var(--bg-elevated)] border border-[var(--border-subtle)] shadow-lg text-sm font-medium text-[var(--text-primary)] whitespace-nowrap animate-slide-up" style={{ animationDelay: '50ms' }}>
                <Layers size={16} /> Nhóm việc
              </button>
            </div>
          )}
        </>
      )}

      {/* Lucy Chat Toggle Button */}
      <button onClick={onOpenLucy}
        className="fixed z-[61] size-14 rounded-full bg-[var(--accent-primary)] text-[var(--bg-base)] flex items-center justify-center shadow-2xl active:scale-95 transition-all duration-200"
        style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 68px)', right: '16px' }}
        aria-label={showLucy ? 'Đóng Lucy' : 'Mở Lucy'}>
        {showLucy ? <X size={26} strokeWidth={2.5} /> : <Sparkles size={26} strokeWidth={2.5} />}
      </button>
    </>
  );
}
