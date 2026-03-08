import { useEffect, useState } from 'react';
import { useSettingsStore, useAuthStore, useTaskStore, useChatStore, useGamificationStore, useTemplateStore, useTopicStore } from '@/stores';
import { supabase } from '@/lib/supabase';
import { checkDeadlineNotifications } from '@/lib/notifications';
import { BottomNav } from '@/components/layout/BottomNav';
import { ToastContainer } from '@/components/layout/ToastContainer';
import { TaskTimer } from '@/components/features/TaskTimer';
import { LucyChatFAB } from '@/pages/AIPage';
import { UnifiedFAB } from '@/components/layout/UnifiedFAB';
import { AddTaskSheet } from '@/components/features/AddTaskInput';
import TasksPage from '@/pages/TasksPage';
import StatsPage from '@/pages/StatsPage';
import SettingsPage from '@/pages/SettingsPage';
import AchievementsPage from '@/pages/AchievementsPage';
import AuthPage from '@/pages/AuthPage';
import TemplatesPage from '@/pages/TemplatesPage';
import FinancePage from '@/pages/FinancePage';
import GroupChatPage from '@/pages/GroupChatPage';
import AdminPage from '@/pages/AdminPage';
import NotificationsPage from '@/pages/NotificationsPage';
import type { TaskTemplate } from '@/types';

export default function App() {
  const currentPage = useSettingsStore(s => s.currentPage);
  const fontScale = useSettingsStore(s => s.fontScale);
  const timezone = useSettingsStore(s => s.timezone);
  const notificationSettings = useSettingsStore(s => s.notificationSettings);
  const user = useAuthStore(s => s.user);
  const isLoading = useAuthStore(s => s.isLoading);
  const setUser = useAuthStore(s => s.setUser);
  const setLoading = useAuthStore(s => s.setLoading);
  const initTasks = useTaskStore(s => s.initForUser);
  const initChat = useChatStore(s => s.initForUser);
  const initGam = useGamificationStore(s => s.initForUser);
  const initTemplates = useTemplateStore(s => s.initForUser);
  const initTopics = useTopicStore(s => s.initForUser);
  const tasks = useTaskStore(s => s.tasks);
  const checkAndMarkOverdue = useTaskStore(s => s.checkAndMarkOverdue);
  const [isLandscape, setIsLandscape] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showLucy, setShowLucy] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [templateMode, setTemplateMode] = useState<'single' | 'group'>('single');

  // Font scale
  useEffect(() => { document.documentElement.style.setProperty('--font-scale', String(fontScale)); }, [fontScale]);

  // Detect orientation
  useEffect(() => {
    const check = () => setIsLandscape(window.innerWidth > window.innerHeight && window.innerWidth > 600);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // Set landscape class on body
  useEffect(() => {
    document.body.classList.toggle('landscape', isLandscape);
    document.body.classList.toggle('portrait', !isLandscape);
  }, [isLandscape]);

  // Preload voices
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  // Auth session - persistent login
  useEffect(() => {
    let mounted = true;

    // Check for admin login
    const adminSession = localStorage.getItem('nw_admin_session');
    if (adminSession === 'true') {
      setUser({ id: 'admin', email: 'admin@nghiemwork.local', username: 'Admin' });
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (mounted && session?.user) {
        const u = session.user;
        setUser({ id: u.id, email: u.email!, username: u.user_metadata?.username || u.email!.split('@')[0] });
      } else if (mounted) setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        const u = session.user;
        setUser({ id: u.id, email: u.email!, username: u.user_metadata?.username || u.email!.split('@')[0] });
      } else if (event === 'SIGNED_OUT') {
        localStorage.removeItem('nw_admin_session');
        setUser(null); setLoading(false);
      }
    });
    return () => { mounted = false; subscription.unsubscribe(); };
  }, []);

  // Init stores
  useEffect(() => {
    if (user) {
      const uid = user.id === 'admin' ? 'admin' : user.id;
      initTasks(uid); initChat(uid); initGam(uid); initTemplates(uid); initTopics(uid);
    }
  }, [user?.id]);

  // ✅ Auto-check overdue + notifications (mỗi 10 giây)
  useEffect(() => {
    if (!user) return;
    const notified = new Set<string>();
    const check = () => {
      checkAndMarkOverdue();
      if (notificationSettings.enabled) checkDeadlineNotifications(tasks, timezone, notificationSettings.beforeDeadline, notified);
    };
    check(); // Check ngay khi mount
    const i = setInterval(check, 10000); // Mỗi 10 giây
    return () => clearInterval(i);
  }, [user?.id, tasks.length, timezone, notificationSettings.enabled]);

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[var(--bg-base)]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center border border-[var(--border-accent)] animate-pulse">
            <span className="text-xl font-bold text-[var(--accent-primary)]">N</span>
          </div>
          <p className="text-sm text-[var(--text-muted)]">Đang tải...</p>
        </div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const renderPage = () => {
    switch (currentPage) {
      case 'tasks': return <TasksPage />;
      case 'stats': return <StatsPage />;
      case 'settings': return <SettingsPage />;
      case 'templates': return <TemplatesPage 
        externalEditorOpen={showTemplateEditor}
        externalEditorMode={templateMode}
        onExternalEditorClose={() => setShowTemplateEditor(false)}
      />;
      case 'notifications': return <NotificationsPage />;
      default: return <TasksPage />;
    }
  };

  return (
    <div className={`min-h-[100dvh] flex bg-[var(--bg-base)] overflow-x-hidden ${isLandscape ? 'flex-row' : 'flex-col'}`}>
      <ToastContainer />
      <TaskTimer />
      <main className={`flex-1 overflow-y-auto overflow-x-hidden ${isLandscape ? 'ml-16' : ''}`}
        style={{ paddingBottom: isLandscape ? '0' : 'calc(56px + env(safe-area-inset-bottom, 0px))' }}>
        {renderPage()}
      </main>
      <BottomNav />
      <UnifiedFAB 
        onAddTask={() => setShowAddTask(true)}
        onAddSingleTemplate={() => { setTemplateMode('single'); setShowTemplateEditor(true); }}
        onAddGroupTemplate={() => { setTemplateMode('group'); setShowTemplateEditor(true); }}
        onOpenLucy={() => setShowLucy(!showLucy)} 
        showLucy={showLucy}
      />
      {showAddTask && <AddTaskSheet onClose={() => setShowAddTask(false)} />}
      {showLucy && (
        <div className={`fixed inset-0 z-[55] flex bg-[var(--bg-base)] ${
          isLandscape ? 'right-0 left-auto w-96' : 'flex-col'
        }`} style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <LucyChatFAB />
        </div>
      )}
    </div>
  );
}
