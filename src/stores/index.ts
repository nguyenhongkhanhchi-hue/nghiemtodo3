import { create } from 'zustand';
import type {
  Task, ChatMessage, TimerState, TabType, PageType,
  EisenhowerQuadrant, RecurringConfig, UserProfile,
  GamificationState, NotificationSettings, Reward,
  TaskTemplate, TaskFinance, Achievement, Topic, VoiceSettings,
  TaskCategory, ThemeMode,
} from '@/types';
import { DEFAULT_VOICE_SETTINGS } from '@/types';
import { calculateLevel, checkAchievement, getDefaultGamificationState } from '@/lib/gamification';
import { getNowInTimezone } from '@/lib/notifications';
import { calculateQuadrant, isTaskOverdue } from '@/lib/autoQuadrant';
import { toast } from '@/lib/toast';
import {
  loadTasksFromDB, saveTasksToDB,
  loadTemplatesFromDB, saveTemplatesToDB,
  loadTopicsFromDB, saveTopicsToDB,
  loadGamificationFromDB, saveGamificationToDB,
  loadChatMessagesFromDB, saveChatMessagesToDB,
  migrateLocalStorageToDatabase,
} from '@/lib/dataSync';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}
function getUserKey(base: string, userId?: string): string {
  return userId ? `${base}_${userId}` : base;
}
function loadFromStorage<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : fallback; } catch { return fallback; }
}
function saveToStorage(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

// ──────────── AUTH STORE ────────────
interface AuthStore {
  user: UserProfile | null;
  isLoading: boolean;
  setUser: (user: UserProfile | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  isLoading: true,
  setUser: (user) => set({ user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  logout: () => set({ user: null }),
}));

// ──────────── TASK STORE ────────────
interface TaskStore {
  tasks: Task[];
  activeTab: TabType;
  timer: TimerState;
  _userId: string | undefined;
  _version: number;
  initForUser: (userId?: string) => void;
  setActiveTab: (tab: TabType) => void;
  addTask: (title: string, manualQuadrant?: 'delegate' | 'eliminate', deadline?: number, recurring?: RecurringConfig, deadlineDate?: string, deadlineTime?: string, finance?: TaskFinance, templateId?: string, isGroup?: boolean, opts?: { showDeadline?: boolean; showRecurring?: boolean; showFinance?: boolean; showNotes?: boolean; notes?: string; groupTemplateIds?: string[] }) => string;
  updateTask: (id: string, updates: Partial<Task>) => void;
  removeTask: (id: string) => void;
  completeTask: (id: string) => void;
  restoreTask: (id: string) => void;
  reorderTasks: (fromIndex: number, toIndex: number) => void;
  startTimer: (taskId: string) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  stopTimer: () => void;
  tickTimer: () => void;
  clearAllData: () => void;
  checkAndMarkOverdue: () => void;
  bumpVersion: () => void;
}

const defaultTimer: TimerState = {
  taskId: null, isRunning: false, isPaused: false, elapsed: 0,
  startTime: null, pausedAt: null, totalPausedDuration: 0,
};

export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  activeTab: 'pending',
  timer: { ...defaultTimer },
  _userId: undefined,
  _version: 0,

  initForUser: async (userId) => {
    if (userId === 'admin') {
      const key = getUserKey('nw_tasks', userId);
      const savedTimer = loadFromStorage<TimerState | null>(getUserKey('nw_timer', userId), null);
      const restoredTimer = savedTimer && savedTimer.isRunning ? savedTimer : { ...defaultTimer };
      set({ tasks: loadFromStorage<Task[]>(key, []), _userId: userId, timer: restoredTimer });
      get().checkAndMarkOverdue();
      return;
    }

    await migrateLocalStorageToDatabase(userId);
    const tasksFromDB = await loadTasksFromDB(userId);
    const savedTimer = loadFromStorage<TimerState | null>(getUserKey('nw_timer', userId), null);
    const restoredTimer = savedTimer && savedTimer.isRunning ? savedTimer : { ...defaultTimer };
    set({ tasks: tasksFromDB, _userId: userId, timer: restoredTimer });
    get().checkAndMarkOverdue();
  },
  setActiveTab: (tab) => set({ activeTab: tab }),
  bumpVersion: () => set(s => ({ _version: s._version + 1 })),

  addTask: (title, manualQuadrant, deadline, recurring = { type: 'none' }, deadlineDate, deadlineTime, finance, templateId, isGroup, opts) => {
    const tasks = get().tasks;
    const userId = get()._userId;
    const id = generateId();
    
    const quadrant = calculateQuadrant(deadline, manualQuadrant);
    
    const newTask: Task = {
      id, title, status: 'pending', quadrant,
      createdAt: Date.now(), deadline, deadlineDate, deadlineTime,
      order: tasks.filter(t => t.status === 'pending').length,
      recurring: recurring || { type: 'none' },
      recurringLabel: recurring && recurring.type !== 'none' ? title : undefined,
      finance, templateId, isGroup,
      groupTemplateIds: opts?.groupTemplateIds,
      showDeadline: opts?.showDeadline ?? !!deadline,
      showRecurring: opts?.showRecurring ?? (recurring?.type !== 'none'),
      showFinance: opts?.showFinance ?? !!finance,
      showNotes: opts?.showNotes ?? !!opts?.notes,
      notes: opts?.notes,
    };
    const updated = [...tasks, newTask];
    saveToStorage(getUserKey('nw_tasks', userId), updated);
    set({ tasks: updated });
    if (userId && userId !== 'admin') saveTasksToDB(userId, updated);
    return id;
  },

  updateTask: (id, updates) => {
    const userId = get()._userId;
    const updated = get().tasks.map(t => {
      if (t.id !== id) return t;
      
      const merged = { ...t, ...updates };
      
      if (updates.deadline !== undefined || updates.quadrant !== undefined) {
        const manualQuadrant = merged.quadrant === 'delegate' || merged.quadrant === 'eliminate' ? merged.quadrant : undefined;
        merged.quadrant = calculateQuadrant(merged.deadline, manualQuadrant);
      }
      
      return merged;
    });
    saveToStorage(getUserKey('nw_tasks', userId), updated);
    set({ tasks: updated });
    if (userId && userId !== 'admin') saveTasksToDB(userId, updated);
  },

  removeTask: (id) => {
    const userId = get()._userId;
    const updated = get().tasks.filter(t => t.id !== id);
    saveToStorage(getUserKey('nw_tasks', userId), updated);
    set({ tasks: updated });
    if (userId && userId !== 'admin') saveTasksToDB(userId, updated);
  },

  completeTask: (id) => {
    const task = get().tasks.find(t => t.id === id);
    if (!task) return;
    const userId = get()._userId;
    const tz = useSettingsStore.getState().timezone;
    const now = getNowInTimezone(tz).getTime();
    const isOnTime = !task.deadline || now <= task.deadline;
    const xpEarned = isOnTime ? 10 : 5;
    const updated = get().tasks.map(t =>
      t.id === id ? { ...t, status: 'done' as const, completedAt: Date.now() } : t
    );
    saveToStorage(getUserKey('nw_tasks', userId), updated);
    const timer = get().timer;
    set({
      tasks: updated,
      timer: timer.taskId === id ? { ...defaultTimer } : timer,
    });
    if (userId && userId !== 'admin') saveTasksToDB(userId, updated);
    useGamificationStore.getState().onTaskCompleted(task.quadrant, task.duration || 0, tz, xpEarned);
  },

  restoreTask: (id) => {
    const userId = get()._userId;
    const updated = get().tasks.map(t => {
      if (t.id !== id) return t;
      
      const manualQuadrant = (t.quadrant === 'delegate' || t.quadrant === 'eliminate') ? t.quadrant : undefined;
      const newQuadrant = calculateQuadrant(t.deadline, manualQuadrant);
      
      return {
        ...t,
        status: 'pending' as const,
        completedAt: undefined,
        quadrant: newQuadrant,
      };
    });
    saveToStorage(getUserKey('nw_tasks', userId), updated);
    set({ tasks: updated });
    if (userId && userId !== 'admin') saveTasksToDB(userId, updated);
  },

  reorderTasks: (fromIndex, toIndex) => {
    const userId = get()._userId;
    const tasks = [...get().tasks];
    const pending = tasks.filter(t => t.status === 'pending').sort((a, b) => a.order - b.order);
    if (fromIndex < 0 || fromIndex >= pending.length || toIndex < 0 || toIndex >= pending.length) return;
    const [moved] = pending.splice(fromIndex, 1);
    pending.splice(toIndex, 0, moved);
    pending.forEach((t, i) => { t.order = i; });
    const rest = tasks.filter(t => t.status !== 'pending');
    const updated = [...pending, ...rest];
    saveToStorage(getUserKey('nw_tasks', userId), updated);
    set({ tasks: updated });
    if (userId && userId !== 'admin') saveTasksToDB(userId, updated);
  },

  startTimer: (taskId) => {
    const task = get().tasks.find(t => t.id === taskId);
    if (!task) return;
    const taskIsOverdue = isTaskOverdue(task);
    if (task.quadrant !== 'do_first' && !taskIsOverdue) {
      toast.warning('⚠️ Chỉ cho phép bấm giờ cho việc LÀM NGAY hoặc QUÁ HẠN');
      return;
    }
    
    const savedTimer = loadFromStorage<TimerState | null>(getUserKey('nw_timer', get()._userId), null);
    if (savedTimer && savedTimer.taskId === taskId && savedTimer.isRunning) {
      const elapsedSinceStart = Math.floor((Date.now() - (savedTimer.startTime || Date.now())) / 1000) - savedTimer.totalPausedDuration;
      set({ timer: { ...savedTimer, elapsed: Math.max(0, elapsedSinceStart) } });
      return;
    }
    
    const updated = get().tasks.map(t => t.id === taskId ? { ...t, status: (t.status === 'done' ? t.status : 'in_progress') as any } : t);
    saveToStorage(getUserKey('nw_tasks', get()._userId), updated);
    const newTimer = { taskId, isRunning: true, isPaused: false, elapsed: 0, startTime: Date.now(), pausedAt: null, totalPausedDuration: 0 };
    saveToStorage(getUserKey('nw_timer', get()._userId), newTimer);
    set({ tasks: updated, timer: newTimer });
  },
  pauseTimer: () => {
    const t = get().timer;
    if (t.isRunning && !t.isPaused) {
      const userId = get()._userId;
      const newTimer = { ...t, isPaused: true, isRunning: false, pausedAt: Date.now() };
      const updatedTasks = t.taskId
        ? get().tasks.map(task => task.id === t.taskId
          ? { ...task, status: (task.status === 'done' ? task.status : 'paused') as any }
          : task)
        : get().tasks;
      saveToStorage(getUserKey('nw_tasks', userId), updatedTasks);
      set({ timer: newTimer, tasks: updatedTasks });
      saveToStorage(getUserKey('nw_timer', userId), newTimer);
      if (userId && userId !== 'admin') saveTasksToDB(userId, updatedTasks);
    }
  },
  resumeTimer: () => {
    const t = get().timer;
    if (t.isPaused && t.pausedAt) {
      const userId = get()._userId;
      const pd = Math.floor((Date.now() - t.pausedAt) / 1000);
      const newTimer = { ...t, isPaused: false, isRunning: true, pausedAt: null, totalPausedDuration: t.totalPausedDuration + pd };
      const updatedTasks = t.taskId
        ? get().tasks.map(task => task.id === t.taskId
          ? { ...task, status: (task.status === 'done' ? task.status : 'in_progress') as any }
          : task)
        : get().tasks;
      saveToStorage(getUserKey('nw_tasks', userId), updatedTasks);
      set({ timer: newTimer, tasks: updatedTasks });
      saveToStorage(getUserKey('nw_timer', userId), newTimer);
      if (userId && userId !== 'admin') saveTasksToDB(userId, updatedTasks);
    }
  },
  stopTimer: () => {
    const t = get().timer;
    const userId = get()._userId;
    if (t.taskId) {
      const elapsed = t.elapsed;
      const updated = get().tasks.map(tk => {
        if (tk.id === t.taskId) {
          const newDuration = (tk.duration || 0) + elapsed;
          const newStatus = tk.status === 'in_progress' ? 'paused' as const : tk.status;
          return { ...tk, duration: newDuration, status: newStatus };
        }
        return tk;
      });
      saveToStorage(getUserKey('nw_tasks', userId), updated);
      localStorage.removeItem(getUserKey('nw_timer', userId));
      set({ tasks: updated, timer: { ...defaultTimer } });
      if (userId && userId !== 'admin') saveTasksToDB(userId, updated);
    } else set({ timer: { ...defaultTimer } });
  },
  tickTimer: () => {
    const t = get().timer;
    if (t.isRunning && t.startTime && !t.isPaused) {
      const newTimer = { ...t, elapsed: Math.floor((Date.now() - t.startTime) / 1000) - t.totalPausedDuration };
      set({ timer: newTimer });
      saveToStorage(getUserKey('nw_timer', get()._userId), newTimer);
    }
  },
  clearAllData: () => {
    const u = get()._userId;
    ['nw_tasks', 'nw_chat', 'nw_gamification', 'nw_templates', 'nw_topics'].forEach(k => localStorage.removeItem(getUserKey(k, u)));
    localStorage.removeItem('nw_settings');
    set({ tasks: [], timer: { ...defaultTimer } });
  },
  checkAndMarkOverdue: () => {
    const userId = get()._userId;
    const tz = useSettingsStore.getState().timezone;
    const now = getNowInTimezone(tz).getTime();
    let changed = false;
    
    const updated = get().tasks.map(t => {
      if (t.quadrant === 'schedule' && t.deadline) {
        const timeUntil = t.deadline - now;
        if (timeUntil > 0 && timeUntil < 86400000) {
          changed = true;
          return { ...t, quadrant: 'do_first' as const };
        }
      }
      
      return t;
    });
    
    if (changed) {
      saveToStorage(getUserKey('nw_tasks', userId), updated);
      set({ tasks: updated });
      if (userId && userId !== 'admin') saveTasksToDB(userId, updated);
    }
  },
}));

// [Rest của file giữ nguyên - chỉ đổi tên method markOverdue → checkAndMarkOverdue]
// ──────────── TOPIC STORE ────────────
interface TopicStore {
  topics: Topic[];
  _userId: string | undefined;
  initForUser: (userId?: string) => void;
  addTopic: (name: string) => string;
  removeTopic: (id: string) => void;
  addTopicParam: (topicId: string, paramName: string) => void;
  removeTopicParam: (topicId: string, paramId: string) => void;
}

export const useTopicStore = create<TopicStore>((set, get) => ({
  topics: [],
  _userId: undefined,
  initForUser: async (userId) => {
    if (userId === 'admin') {
      set({ topics: loadFromStorage<Topic[]>(getUserKey('nw_topics', userId), []), _userId: userId });
      return;
    }
    const topicsFromDB = await loadTopicsFromDB(userId);
    set({ topics: topicsFromDB, _userId: userId });
  },
  addTopic: (name) => {
    const userId = get()._userId;
    const id = generateId();
    const updated = [...get().topics, { id, name, params: [] }];
    saveToStorage(getUserKey('nw_topics', userId), updated);
    set({ topics: updated });
    if (userId && userId !== 'admin') saveTopicsToDB(userId, updated);
    return id;
  },
  removeTopic: (id) => {
    const userId = get()._userId;
    const updated = get().topics.filter(t => t.id !== id);
    saveToStorage(getUserKey('nw_topics', userId), updated);
    set({ topics: updated });
    if (userId && userId !== 'admin') saveTopicsToDB(userId, updated);
  },
  addTopicParam: (topicId, paramName) => {
    const userId = get()._userId;
    const updated = get().topics.map(t =>
      t.id === topicId ? { ...t, params: [...t.params, { id: generateId(), name: paramName, value: '' }] } : t
    );
    saveToStorage(getUserKey('nw_topics', userId), updated);
    set({ topics: updated });
    if (userId && userId !== 'admin') saveTopicsToDB(userId, updated);
  },
  removeTopicParam: (topicId, paramId) => {
    const userId = get()._userId;
    const updated = get().topics.map(t =>
      t.id === topicId ? { ...t, params: t.params.filter(p => p.id !== paramId) } : t
    );
    saveToStorage(getUserKey('nw_topics', userId), updated);
    set({ topics: updated });
    if (userId && userId !== 'admin') saveTopicsToDB(userId, updated);
  },
}));

// ──────────── TEMPLATE STORE ────────────
interface TemplateStore {
  templates: TaskTemplate[];
  _userId: string | undefined;
  initForUser: (userId?: string) => void;
  addTemplate: (template: Omit<TaskTemplate, 'id' | 'createdAt'>) => string;
  updateTemplate: (id: string, updates: Partial<TaskTemplate>) => void;
  removeTemplate: (id: string) => void;
  addGroupTasksToTodo: (groupTemplateId: string, quadrant: EisenhowerQuadrant, deadlineDate?: string, deadlineTime?: string, recurringOverride?: RecurringConfig, notesOverride?: string) => void;
  addSingleTaskToTodo: (templateId: string, quadrant: EisenhowerQuadrant, deadline?: number, deadlineDate?: string, deadlineTime?: string, finance?: TaskFinance, recurring?: RecurringConfig, notes?: string) => void;
  exportTemplates: () => string;
  importTemplates: (json: string) => number;
  hasTemplateForTitle: (title: string) => boolean;
}

export const useTemplateStore = create<TemplateStore>((set, get) => ({
  templates: [],
  _userId: undefined,
  initForUser: async (userId) => {
    if (userId === 'admin') {
      set({ templates: loadFromStorage<TaskTemplate[]>(getUserKey('nw_templates', userId), []), _userId: userId });
      return;
    }
    const templatesFromDB = await loadTemplatesFromDB(userId);
    set({ templates: templatesFromDB, _userId: userId });
  },
  addTemplate: (template) => {
    const userId = get()._userId;
    const id = generateId();
    const newT: TaskTemplate = { ...template, id, createdAt: Date.now() };
    const updated = [...get().templates, newT];
    saveToStorage(getUserKey('nw_templates', userId), updated);
    set({ templates: updated });
    if (userId && userId !== 'admin') saveTemplatesToDB(userId, updated);
    return id;
  },
  updateTemplate: (id, updates) => {
    const userId = get()._userId;
    const updated = get().templates.map(t => t.id === id ? { ...t, ...updates, updatedAt: Date.now() } : t);
    saveToStorage(getUserKey('nw_templates', userId), updated);
    set({ templates: updated });
    if (userId && userId !== 'admin') saveTemplatesToDB(userId, updated);
  },
  removeTemplate: (id) => {
    const userId = get()._userId;
    const updated = get().templates.filter(t => t.id !== id).map(t => {
      if (t.isGroup && t.groupIds?.includes(id)) {
        return { ...t, groupIds: t.groupIds.filter(gid => gid !== id) };
      }
      return t;
    });
    saveToStorage(getUserKey('nw_templates', userId), updated);
    set({ templates: updated });
    if (userId && userId !== 'admin') saveTemplatesToDB(userId, updated);
  },
  addGroupTasksToTodo: (groupTemplateId, quadrant, deadlineDate, deadlineTime, recurringOverride, notesOverride) => {
    const templates = get().templates;
    const group = templates.find(t => t.id === groupTemplateId);
    if (!group || !group.groupIds) return;
    const taskStore = useTaskStore.getState();
    let deadline: number | undefined;
    if (deadlineDate) deadline = new Date(`${deadlineDate}T${deadlineTime || '23:59'}:00`).getTime();

    group.groupIds.forEach(singleId => {
      const single = templates.find(t => t.id === singleId);
      if (!single) return;
      const fin = single.finance;
      const rec = recurringOverride || single.recurring;
      taskStore.addTask(
        single.title, quadrant, deadline, rec, deadlineDate, deadlineTime, fin, single.id, false,
        { notes: notesOverride || single.notes, showDeadline: !!deadline, showRecurring: rec?.type !== 'none', showFinance: !!fin, showNotes: !!(notesOverride || single.notes), groupTemplateIds: [groupTemplateId] },
      );
    });
  },
  addSingleTaskToTodo: (templateId, quadrant, deadline, deadlineDate, deadlineTime, finance, recurring, notes) => {
    const template = get().templates.find(t => t.id === templateId);
    if (!template) return;
    const taskStore = useTaskStore.getState();
    const rec = recurring || template.recurring;
    const fin = finance || template.finance;
    taskStore.addTask(
      template.title, quadrant, deadline, rec, deadlineDate, deadlineTime, fin, templateId, false,
      { notes: notes || template.notes, showDeadline: !!deadline, showRecurring: rec?.type !== 'none', showFinance: !!fin, showNotes: !!(notes || template.notes) },
    );
  },
  exportTemplates: () => {
    const templates = get().templates;
    const topics = useTopicStore.getState().topics;
    return JSON.stringify({ version: 3, templates, topics }, null, 2);
  },
  importTemplates: (json) => {
    try {
      const data = JSON.parse(json);
      if (!data.templates) return 0;
      const existing = get().templates;
      const newTemplates = data.templates.map((t: any) => ({ ...t, id: generateId(), createdAt: Date.now() }));
      const updated = [...existing, ...newTemplates];
      saveToStorage(getUserKey('nw_templates', get()._userId), updated);
      set({ templates: updated });
      if (data.topics) {
        const topicStore = useTopicStore.getState();
        const existingTopics = topicStore.topics;
        data.topics.forEach((t: any) => {
          if (!existingTopics.find(et => et.name === t.name)) topicStore.addTopic(t.name);
        });
      }
      return newTemplates.length;
    } catch { return 0; }
  },
  hasTemplateForTitle: (title) => {
    return get().templates.some(t => t.title.toLowerCase() === title.toLowerCase());
  },
}));

// ──────────── CHAT STORE ────────────
interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  _userId: string | undefined;
  initForUser: (userId?: string) => void;
  addMessage: (role: 'user' | 'assistant', content: string) => void;
  updateLastAssistant: (content: string) => void;
  setLoading: (loading: boolean) => void;
  clearChat: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  _userId: undefined,
  initForUser: async (userId) => {
    if (userId === 'admin') {
      set({ messages: loadFromStorage<ChatMessage[]>(getUserKey('nw_chat', userId), []), _userId: userId });
      return;
    }
    const messagesFromDB = await loadChatMessagesFromDB(userId);
    set({ messages: messagesFromDB, _userId: userId });
  },
  addMessage: (role, content) => {
    const userId = get()._userId;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
    const msg: ChatMessage = { id, role, content, timestamp: Date.now() };
    const updated = [...get().messages, msg];
    saveToStorage(getUserKey('nw_chat', userId), updated);
    set({ messages: updated });
    if (userId && userId !== 'admin') saveChatMessagesToDB(userId, updated);
  },
  updateLastAssistant: (content) => {
    const userId = get()._userId;
    const msgs = [...get().messages];
    for (let i = msgs.length - 1; i >= 0; i--) {
      if (msgs[i].role === 'assistant') { msgs[i] = { ...msgs[i], content }; break; }
    }
    saveToStorage(getUserKey('nw_chat', userId), msgs);
    set({ messages: msgs });
    if (userId && userId !== 'admin') saveChatMessagesToDB(userId, msgs);
  },
  setLoading: (loading) => set({ isLoading: loading }),
  clearChat: () => {
    localStorage.removeItem(getUserKey('nw_chat', get()._userId));
    set({ messages: [] });
  },
}));

// ──────────── GAMIFICATION STORE ────────────
interface GamificationStore {
  state: GamificationState;
  _userId: string | undefined;
  initForUser: (userId?: string) => void;
  onTaskCompleted: (quadrant: EisenhowerQuadrant, duration: number, timezone: string, xpEarned: number) => void;
  claimReward: (rewardId: string) => void;
  addCustomReward: (reward: Omit<Reward, 'id' | 'claimed'>) => void;
  removeReward: (rewardId: string) => void;
  updateReward: (rewardId: string, updates: Partial<Omit<Reward, 'id'>>) => void;
  addCustomAchievement: (achievement: Omit<Achievement, 'id' | 'unlockedAt'>) => void;
  removeAchievement: (achievementId: string) => void;
  updateAchievement: (achievementId: string, updates: Partial<Omit<Achievement, 'id'>>) => void;
  unlockAchievement: (achievementId: string) => void;
  _save: () => void;
}

export const useGamificationStore = create<GamificationStore>((set, get) => ({
  state: getDefaultGamificationState(),
  _userId: undefined,
  initForUser: async (userId) => {
    if (userId === 'admin') {
      const saved = loadFromStorage<GamificationState | null>(getUserKey('nw_gamification', userId), null);
      if (saved) {
        const def = getDefaultGamificationState();
        const ids = new Set(saved.achievements.map(a => a.id));
        saved.achievements = [...saved.achievements, ...def.achievements.filter(a => !ids.has(a.id))];
        set({ state: saved, _userId: userId });
      } else set({ state: getDefaultGamificationState(), _userId: userId });
      return;
    }
    const stateFromDB = await loadGamificationFromDB(userId);
    if (stateFromDB) {
      const def = getDefaultGamificationState();
      const ids = new Set(stateFromDB.achievements.map(a => a.id));
      stateFromDB.achievements = [...stateFromDB.achievements, ...def.achievements.filter(a => !ids.has(a.id))];
      set({ state: stateFromDB, _userId: userId });
    } else set({ state: getDefaultGamificationState(), _userId: userId });
  },
  _save: () => {
    const userId = get()._userId;
    saveToStorage(getUserKey('nw_gamification', userId), get().state);
    if (userId && userId !== 'admin') saveGamificationToDB(userId, get().state);
  },
  onTaskCompleted: (quadrant, duration, timezone, xpEarned = 10) => {
    const s = { ...get().state };
    const now = getNowInTimezone(timezone);
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    s.totalTasksCompleted += 1;
    s.totalTimerSeconds += duration;
    s.xp += xpEarned;
    if (now.getHours() < 9) s.earlyBirdCount += 1;
    if (s.lastActiveDate !== todayStr) {
      const y = new Date(now); y.setDate(y.getDate() - 1);
      const ys = `${y.getFullYear()}-${String(y.getMonth() + 1).padStart(2, '0')}-${String(y.getDate()).padStart(2, '0')}`;
      s.streak = s.lastActiveDate === ys ? s.streak + 1 : 1;
      s.lastActiveDate = todayStr;
      s.activeDays += 1;
    }
    s.level = calculateLevel(s.xp);
    const tasks = useTaskStore.getState().tasks;
    const qc = { do_first: 0, schedule: 0, delegate: 0, eliminate: 0 } as Record<EisenhowerQuadrant, number>;
    tasks.filter(t => t.status === 'done').forEach(t => { qc[t.quadrant] = (qc[t.quadrant] || 0) + 1; });
    let achXp = 0;
    s.achievements = s.achievements.map(a => {
      if (!a.unlockedAt && checkAchievement(a, s, qc, duration)) {
        achXp += a.xpReward;
        return { ...a, unlockedAt: Date.now() };
      }
      return a;
    });
    s.xp += achXp;
    s.level = calculateLevel(s.xp);
    set({ state: s });
    get()._save();
  },
  claimReward: (rewardId) => {
    const s = { ...get().state };
    const r = s.rewards.find(r => r.id === rewardId);
    if (!r || r.claimed || s.xp < r.xpCost) return;
    s.xp -= r.xpCost;
    s.level = calculateLevel(s.xp);
    s.rewards = s.rewards.map(r => r.id === rewardId ? { ...r, claimed: true, claimedAt: Date.now() } : r);
    set({ state: s }); get()._save();
  },
  addCustomReward: (reward) => {
    const s = { ...get().state };
    s.rewards = [...s.rewards, { ...reward, id: `cr_${Date.now().toString(36)}`, claimed: false }];
    set({ state: s }); get()._save();
  },
  removeReward: (id) => {
    const s = { ...get().state }; s.rewards = s.rewards.filter(r => r.id !== id);
    set({ state: s }); get()._save();
  },
  updateReward: (id, updates) => {
    const s = { ...get().state }; s.rewards = s.rewards.map(r => r.id === id ? { ...r, ...updates } : r);
    set({ state: s }); get()._save();
  },
  addCustomAchievement: (ach) => {
    const s = { ...get().state };
    s.achievements = [...s.achievements, { ...ach, id: `ca_${Date.now().toString(36)}`, isCustom: true }];
    set({ state: s }); get()._save();
  },
  removeAchievement: (id) => {
    const s = { ...get().state }; s.achievements = s.achievements.filter(a => a.id !== id);
    set({ state: s }); get()._save();
  },
  updateAchievement: (id, updates) => {
    const s = { ...get().state }; s.achievements = s.achievements.map(a => a.id === id ? { ...a, ...updates } : a);
    set({ state: s }); get()._save();
  },
  unlockAchievement: (id) => {
    const s = { ...get().state };
    const a = s.achievements.find(a => a.id === id);
    if (!a || a.unlockedAt) return;
    s.achievements = s.achievements.map(a => a.id === id ? { ...a, unlockedAt: Date.now() } : a);
    s.xp += a.xpReward;
    s.level = calculateLevel(s.xp);
    set({ state: s }); get()._save();
  },
}));

// ──────────── SETTINGS STORE ────────────
interface SettingsStore {
  fontScale: number;
  tickSoundEnabled: boolean;
  voiceEnabled: boolean;
  screenBrightness: number;
  lockTouch: boolean;
  currentPage: PageType;
  timezone: string;
  notificationSettings: NotificationSettings;
  voiceSettings: VoiceSettings;
  theme: ThemeMode;
  setFontScale: (scale: number) => void;
  setTickSound: (enabled: boolean) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  setScreenBrightness: (brightness: number) => void;
  setLockTouch: (locked: boolean) => void;
  setCurrentPage: (page: PageType) => void;
  setTimezone: (tz: string) => void;
  setNotificationSettings: (settings: Partial<NotificationSettings>) => void;
  setVoiceSettings: (settings: Partial<VoiceSettings>) => void;
  setTheme: (theme: ThemeMode) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  fontScale: loadFromStorage<number>('nw_fontscale', 1),
  tickSoundEnabled: loadFromStorage<boolean>('nw_tick', true),
  voiceEnabled: loadFromStorage<boolean>('nw_voice', true),
  screenBrightness: loadFromStorage<number>('nw_brightness', 100),
  lockTouch: loadFromStorage<boolean>('nw_locktouch', false),
  timezone: loadFromStorage<string>('nw_timezone', 'Asia/Ho_Chi_Minh'),
  notificationSettings: loadFromStorage<NotificationSettings>('nw_notifications', { enabled: true, beforeDeadline: 15, dailyReminder: false, dailyReminderTime: '08:00' }),
  voiceSettings: loadFromStorage<VoiceSettings>('nw_voicesettings', DEFAULT_VOICE_SETTINGS),
  theme: loadFromStorage<ThemeMode>('nw_theme', 'dark'),
  currentPage: 'tasks',
  setFontScale: (scale) => {
    const safe = Math.max(0.75, Math.min(1.5, scale));
    saveToStorage('nw_fontscale', safe);
    document.documentElement.style.setProperty('--font-scale', String(safe));
    set({ fontScale: safe });
  },
  setTickSound: (e) => { saveToStorage('nw_tick', e); set({ tickSoundEnabled: e }); },
  setVoiceEnabled: (e) => { saveToStorage('nw_voice', e); set({ voiceEnabled: e }); },
  setScreenBrightness: (brightness) => {
    const safe = Math.max(10, Math.min(100, brightness));
    saveToStorage('nw_brightness', safe);
    document.documentElement.style.setProperty('--screen-brightness', `${safe}%`);
    set({ screenBrightness: safe });
  },
  setLockTouch: (locked) => {
    saveToStorage('nw_locktouch', locked);
    document.documentElement.classList.toggle('lock-touch', locked);
    set({ lockTouch: locked });
  },
  setCurrentPage: (page) => set({ currentPage: page }),
  setTimezone: (tz) => { saveToStorage('nw_timezone', tz); set({ timezone: tz }); },
  setNotificationSettings: (partial) => {
    set((prev) => {
      const updated = { ...prev.notificationSettings, ...partial };
      saveToStorage('nw_notifications', updated);
      return { notificationSettings: updated };
    });
  },
  setVoiceSettings: (partial) => {
    set((prev) => {
      const updated = { ...prev.voiceSettings, ...partial };
      saveToStorage('nw_voicesettings', updated);
      return { voiceSettings: updated };
    });
  },
  setTheme: (theme) => {
    saveToStorage('nw_theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    set({ theme });
  },
}));
