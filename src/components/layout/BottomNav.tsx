import { useSettingsStore, useTaskStore, useAuthStore } from '@/stores';
import { CheckSquare, FileText, BarChart3, Settings, Clock } from 'lucide-react';
import { isTaskOverdue } from '@/lib/autoQuadrant';
import type { PageType } from '@/types';

export function BottomNav() {
  const currentPage = useSettingsStore(s => s.currentPage);
  const setCurrentPage = useSettingsStore(s => s.setCurrentPage);
  // ✅ Dùng isTaskOverdue() helper thống nhất
  const overdueCount = useTaskStore(s => s.tasks.filter(isTaskOverdue).length);
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.id === 'admin';

  // Simplified nav: VIỆC, MẪU, CHI PHÍ, THỐNG KÊ (Thu chi + Thành tích), CÀI ĐẶT (Admin)
  interface NavItem { page: PageType; icon: any; label: string; adminOnly?: boolean }
  const NAV_ITEMS: NavItem[] = ([
    { page: 'tasks', icon: CheckSquare, label: 'Việc' },
    { page: 'templates', icon: FileText, label: 'Mẫu' },
    { page: 'timecost', icon: Clock, label: 'Dòng tiền' },
    { page: 'stats', icon: BarChart3, label: 'Thống kê' },
    { page: 'settings', icon: Settings, label: 'Cài đặt' },
  ] as NavItem[]).filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      {/* Portrait: bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 glass-strong border-t border-[var(--border-subtle)] landscape-hidden">
        <div className="w-full flex items-center safe-bottom">
          {NAV_ITEMS.map(({ page, icon: Icon, label }) => {
            const isActive = currentPage === page;
            return (
              <button key={page} onClick={() => setCurrentPage(page)}
                className={`flex-1 flex flex-col items-center gap-0.5 py-2 min-h-[52px] relative transition-colors ${isActive ? 'text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}>
                <div className="relative">
                  <Icon size={18} />
                  {page === 'tasks' && overdueCount > 0 && (
                    <div className="absolute -top-1 -right-2 size-4 rounded-full bg-[var(--error)] flex items-center justify-center">
                      <span className="text-[7px] font-bold text-white">{overdueCount > 9 ? '9+' : overdueCount}</span>
                    </div>
                  )}
                </div>
                <span className="text-[9px] font-medium leading-tight">{label}</span>
                {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[var(--accent-primary)]" />}
              </button>
            );
          })}
        </div>
      </nav>

      {/* Landscape: left sidebar */}
      <nav className="fixed top-0 left-0 bottom-0 z-50 w-16 glass-strong border-r border-[var(--border-subtle)] portrait-hidden flex flex-col items-center py-3 gap-1"
        style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 12px))' }}>
        <div className="size-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center mb-3">
          <span className="text-lg font-bold text-[var(--accent-primary)]">N</span>
        </div>
        {NAV_ITEMS.map(({ page, icon: Icon, label }) => {
          const isActive = currentPage === page;
          return (
            <button key={page} onClick={() => setCurrentPage(page)} title={label}
              className={`w-12 h-11 rounded-xl flex flex-col items-center justify-center gap-0.5 relative transition-colors ${isActive ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}>
              <div className="relative">
                <Icon size={18} />
                {page === 'tasks' && overdueCount > 0 && (
                  <div className="absolute -top-1 -right-1.5 size-3.5 rounded-full bg-[var(--error)] flex items-center justify-center">
                    <span className="text-[6px] font-bold text-white">{overdueCount > 9 ? '9+' : overdueCount}</span>
                  </div>
                )}
              </div>
              <span className="text-[7px] font-medium leading-none">{label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
