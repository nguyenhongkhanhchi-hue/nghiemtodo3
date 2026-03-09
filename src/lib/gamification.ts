import type { Achievement, AchievementCondition, GamificationState, EisenhowerQuadrant, Reward } from '@/types';

// Default achievements
export const DEFAULT_ACHIEVEMENTS: Achievement[] = [
  {
    id: 'first_task',
    title: 'Khởi đầu',
    description: 'Hoàn thành việc đầu tiên',
    icon: '🌟',
    condition: { type: 'tasks_completed', count: 1 },
    xpReward: 10,
  },
  {
    id: 'five_tasks',
    title: 'Năng suất',
    description: 'Hoàn thành 5 việc',
    icon: '⚡',
    condition: { type: 'tasks_completed', count: 5 },
    xpReward: 25,
  },
  {
    id: 'ten_tasks',
    title: 'Siêu năng suất',
    description: 'Hoàn thành 10 việc',
    icon: '🔥',
    condition: { type: 'tasks_completed', count: 10 },
    xpReward: 50,
  },
  {
    id: 'fifty_tasks',
    title: 'Chiến binh',
    description: 'Hoàn thành 50 việc',
    icon: '⚔️',
    condition: { type: 'tasks_completed', count: 50 },
    xpReward: 200,
  },
  {
    id: 'hundred_tasks',
    title: 'Huyền thoại',
    description: 'Hoàn thành 100 việc',
    icon: '👑',
    condition: { type: 'tasks_completed', count: 100 },
    xpReward: 500,
  },
  {
    id: 'streak_3',
    title: 'Nhất quán',
    description: 'Giữ streak 3 ngày liên tiếp',
    icon: '🔗',
    condition: { type: 'streak_days', count: 3 },
    xpReward: 30,
  },
  {
    id: 'streak_7',
    title: 'Tuần hoàn hảo',
    description: 'Giữ streak 7 ngày liên tiếp',
    icon: '🏅',
    condition: { type: 'streak_days', count: 7 },
    xpReward: 100,
  },
  {
    id: 'streak_30',
    title: 'Kỷ luật thép',
    description: 'Giữ streak 30 ngày liên tiếp',
    icon: '💎',
    condition: { type: 'streak_days', count: 30 },
    xpReward: 500,
  },
  {
    id: 'timer_1h',
    title: 'Tập trung',
    description: 'Tích lũy 1 giờ làm việc',
    icon: '⏱️',
    condition: { type: 'timer_total', seconds: 3600 },
    xpReward: 40,
  },
  {
    id: 'timer_10h',
    title: 'Chuyên cần',
    description: 'Tích lũy 10 giờ làm việc',
    icon: '🕐',
    condition: { type: 'timer_total', seconds: 36000 },
    xpReward: 200,
  },
  {
    id: 'early_bird_5',
    title: 'Chim sớm',
    description: 'Hoàn thành 5 việc trước 9h sáng',
    icon: '🐦',
    condition: { type: 'early_bird', count: 5 },
    xpReward: 60,
  },
  {
    id: 'do_first_master',
    title: 'Ưu tiên số 1',
    description: 'Hoàn thành 10 việc "Hôm nay"',
    icon: '🎯',
    condition: { type: 'quadrant_master', quadrant: 'do_first', count: 10 },
    xpReward: 80,
  },
  {
    id: 'perfect_day_1',
    title: 'Ngày hoàn hảo',
    description: 'Hoàn thành tất cả việc trong 1 ngày',
    icon: '✨',
    condition: { type: 'perfect_day', count: 1 },
    xpReward: 50,
  },
  {
    id: 'speed_demon',
    title: 'Tốc độ',
    description: 'Hoàn thành 1 việc trong dưới 5 phút',
    icon: '💨',
    condition: { type: 'speed_demon', seconds: 300 },
    xpReward: 20,
  },
  {
    id: 'consistency_30',
    title: '30 ngày không nghỉ',
    description: 'Sử dụng app 30 ngày',
    icon: '📆',
    condition: { type: 'consistency', days: 30 },
    xpReward: 300,
  },
];

// Default rewards
export const DEFAULT_REWARDS: Reward[] = [
  { id: 'break_15', title: '15 phút nghỉ', description: 'Nghỉ ngơi xứng đáng!', icon: '☕', xpCost: 50, claimed: false },
  { id: 'treat', title: 'Tự thưởng đồ ăn', description: 'Mua món bạn thích', icon: '🍰', xpCost: 100, claimed: false },
  { id: 'movie', title: 'Xem phim', description: 'Thời gian giải trí', icon: '🎬', xpCost: 200, claimed: false },
  { id: 'day_off', title: 'Nửa ngày nghỉ', description: 'Nghỉ ngơi nửa ngày', icon: '🏖️', xpCost: 500, claimed: false },
  { id: 'special', title: 'Phần thưởng đặc biệt', description: 'Bạn tự chọn!', icon: '🎁', xpCost: 1000, claimed: false },
];

export function calculateLevel(xp: number): number {
  // Level formula: each level requires more XP
  // Level 1: 0, Level 2: 50, Level 3: 150, Level 4: 300, etc.
  let level = 1;
  let threshold = 0;
  while (true) {
    threshold += level * 50;
    if (xp < threshold) break;
    level++;
  }
  return level;
}

export function xpForNextLevel(currentLevel: number): number {
  let total = 0;
  for (let i = 1; i <= currentLevel; i++) {
    total += i * 50;
  }
  return total;
}

export function xpForCurrentLevel(currentLevel: number): number {
  if (currentLevel <= 1) return 0;
  let total = 0;
  for (let i = 1; i < currentLevel; i++) {
    total += i * 50;
  }
  return total;
}

export function checkAchievement(
  achievement: Achievement,
  state: GamificationState,
  taskQuadrantCounts: Record<EisenhowerQuadrant, number>,
  fastestCompletion: number,
): boolean {
  if (achievement.unlockedAt) return false;
  const cond = achievement.condition;

  switch (cond.type) {
    case 'tasks_completed':
      return state.totalTasksCompleted >= cond.count;
    case 'streak_days':
      return state.streak >= cond.count;
    case 'timer_total':
      return state.totalTimerSeconds >= cond.seconds;
    case 'early_bird':
      return state.earlyBirdCount >= cond.count;
    case 'quadrant_master':
      return (taskQuadrantCounts[cond.quadrant] || 0) >= cond.count;
    case 'perfect_day':
      return state.perfectDays >= cond.count;
    case 'speed_demon':
      return fastestCompletion > 0 && fastestCompletion <= cond.seconds;
    case 'consistency':
      return state.activeDays >= cond.days;
    default:
      return false;
  }
}

export function getDefaultGamificationState(): GamificationState {
  return {
    xp: 0,
    level: 1,
    streak: 0,
    lastActiveDate: '',
    totalTasksCompleted: 0,
    totalTimerSeconds: 0,
    earlyBirdCount: 0,
    perfectDays: 0,
    activeDays: 0,
    dailyCompletionDates: [],
    achievements: DEFAULT_ACHIEVEMENTS.map(a => ({ ...a })),
    rewards: DEFAULT_REWARDS.map(r => ({ ...r })),
  };
}
