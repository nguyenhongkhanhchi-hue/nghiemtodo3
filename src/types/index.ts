export type EisenhowerQuadrant = 'do_first' | 'schedule' | 'delegate' | 'eliminate' | 'overdue';
export type TaskStatus = 'pending' | 'in_progress' | 'paused' | 'done' | 'overdue';
export type RecurringType = 'none' | 'daily' | 'weekdays' | 'weekly' | 'biweekly' | 'monthly' | 'custom';
export type TabType = 'pending' | 'in_progress' | 'paused' | 'done' | 'overdue';
export type PageType = 'tasks' | 'stats' | 'settings' | 'achievements' | 'templates' | 'finance' | 'chat' | 'admin' | 'notifications';
export type TaskCategory = 'work' | 'personal' | 'health' | 'learning' | 'finance' | 'social' | 'other';
export type ThemeMode = 'dark' | 'light';
export type UserRole = 'admin' | 'user' | 'blocked';

export interface RecurringConfig {
  type: RecurringType;
  customDays?: number[];
  label?: string;
}

export type MediaBlockType = 'text' | 'image' | 'youtube';
export interface MediaBlock {
  id: string;
  type: MediaBlockType;
  content: string;
  caption?: string;
}

export interface TaskFinance {
  type: 'income' | 'expense';
  amount: number;
  note?: string;
}

export interface TopicParam {
  id: string;
  name: string;
  value: string;
}

export interface Topic {
  id: string;
  name: string;
  params: TopicParam[];
}

export interface Task {
  id: string;
  title: string;
  status: TaskStatus;
  quadrant: EisenhowerQuadrant;
  createdAt: number;
  completedAt?: number;
  deadline?: number;
  deadlineDate?: string;
  deadlineTime?: string;
  duration?: number;
  order: number;
  recurring: RecurringConfig;
  recurringLabel?: string;
  notes?: string;
  finance?: TaskFinance;
  templateId?: string;
  isGroup?: boolean;
  groupTemplateIds?: string[];
  showDeadline?: boolean;
  showRecurring?: boolean;
  showFinance?: boolean;
  showNotes?: boolean;
  category?: TaskCategory;
  sharedWith?: string[];
}

export interface TaskTemplate {
  id: string;
  title: string;
  recurring: RecurringConfig;
  notes?: string;
  media?: MediaBlock[];
  richContent?: string;
  finance?: TaskFinance;
  xpReward?: number;
  topicId?: string;
  topicParams?: TopicParam[];
  isGroup?: boolean;
  createdAt: number;
  updatedAt?: number;
  groupIds?: string[];
}

export interface TimerState {
  taskId: string | null;
  isRunning: boolean;
  isPaused: boolean;
  elapsed: number;
  startTime: number | null;
  pausedAt: number | null;
  totalPausedDuration: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  channelId?: string;
}

export interface ChatChannel {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  createdBy: string;
  messageCount: number;
}

export interface ChatAttachment {
  id: string;
  type: 'image' | 'document';
  url: string;
  name: string;
  size: number;
}

export interface GroupChatMessage {
  id: string;
  channelId: string;
  userId: string;
  username: string;
  content: string;
  attachments?: ChatAttachment[];
  mentions?: string[];
  timestamp: number;
  isAI?: boolean;
}

export interface AppUser {
  id: string;
  email: string;
  username: string;
  role: UserRole;
  createdAt: number;
  lastActive?: number;
  avatar?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  avatar?: string;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  condition: AchievementCondition;
  unlockedAt?: number;
  xpReward: number;
  isCustom?: boolean;
}

export type AchievementCondition =
  | { type: 'tasks_completed'; count: number }
  | { type: 'streak_days'; count: number }
  | { type: 'timer_total'; seconds: number }
  | { type: 'early_bird'; count: number }
  | { type: 'quadrant_master'; quadrant: EisenhowerQuadrant; count: number }
  | { type: 'perfect_day'; count: number }
  | { type: 'speed_demon'; seconds: number }
  | { type: 'consistency'; days: number }
  | { type: 'custom'; description: string };

export interface Reward {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpCost: number;
  claimed: boolean;
  claimedAt?: number;
}

export interface GamificationState {
  xp: number;
  level: number;
  streak: number;
  lastActiveDate: string;
  totalTasksCompleted: number;
  totalTimerSeconds: number;
  earlyBirdCount: number;
  perfectDays: number;
  activeDays: number;
  dailyCompletionDates: string[];
  achievements: Achievement[];
  rewards: Reward[];
}

export interface NotificationSettings {
  enabled: boolean;
  beforeDeadline: number;
  dailyReminder: boolean;
  dailyReminderTime: string;
}

export interface VoiceSettings {
  rate: number;
  pitch: number;
  voiceName: string;
  chimeInterval: number;
  aiVoiceResponse: boolean;
  encouragements: string[];
}

export interface AppNotification {
  id: string;
  userId: string;
  type: 'task' | 'chat' | 'system' | 'mention';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  actionUrl?: string;
}

export const CATEGORY_LABELS: Record<TaskCategory, { label: string; icon: string; color: string }> = {
  work: { label: 'Công việc', icon: '💼', color: '#60A5FA' },
  personal: { label: 'Cá nhân', icon: '👤', color: '#F472B6' },
  health: { label: 'Sức khỏe', icon: '💪', color: '#34D399' },
  learning: { label: 'Học tập', icon: '📚', color: '#A78BFA' },
  finance: { label: 'Tài chính', icon: '💰', color: '#FBBF24' },
  social: { label: 'Xã hội', icon: '👥', color: '#FB923C' },
  other: { label: 'Khác', icon: '📌', color: '#8B8B9E' },
};

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  rate: 1.1,
  pitch: 1.2,
  voiceName: '',
  chimeInterval: 30,
  aiVoiceResponse: false,
  encouragements: [
    'Bạn đang làm rất tốt, tiếp tục nhé!',
    'Cố lên, sắp xong rồi!',
    'Tập trung là chìa khóa thành công!',
    'Mỗi phút đều đáng giá, tiếp tục nào!',
    'Bạn thật kiên trì, tuyệt vời!',
    'Đừng bỏ cuộc, bạn làm được mà!',
    'Tiến bộ mỗi ngày, giỏi lắm!',
    'Hãy tự hào về sự nỗ lực của bạn!',
  ],
};

export const QUADRANT_LABELS: Record<EisenhowerQuadrant, { label: string; icon: string; color: string; desc: string }> = {
  overdue: { label: 'Quá hạn', icon: '🔥', color: '#DC2626', desc: 'Tự động (deadline < hiện tại)' },
  do_first: { label: 'Làm ngay', icon: '🔴', color: '#F87171', desc: 'Tự động (deadline < 24h)' },
  schedule: { label: 'Lên lịch', icon: '🔵', color: '#60A5FA', desc: 'Tự động (deadline > 24h)' },
  delegate: { label: 'Ủy thác', icon: '🟡', color: '#FBBF24', desc: 'Thủ công' },
  eliminate: { label: 'Loại bỏ', icon: '⚪', color: '#5A5A6E', desc: 'Thùng rác' },
};
