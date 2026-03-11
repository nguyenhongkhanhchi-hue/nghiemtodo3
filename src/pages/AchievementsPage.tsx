import { useState, useMemo } from 'react';
import { useGamificationStore, useAuthStore, useTaskStore } from '@/stores';
import { calculateLevel, xpForNextLevel, xpForCurrentLevel } from '@/lib/gamification';
import {
  Trophy, Star, Gift, Flame, Plus, X, Trash2, Lock,
  Shield, Crown, Zap, Target, Clock, CheckSquare, Sparkles,
  ChevronDown, ChevronUp, Info,
} from 'lucide-react';

type Rarity = 'common' | 'rare' | 'epic' | 'legendary';

const RARITY_CONFIG: Record<Rarity, { label: string; color: string; bg: string; glow: string; icon: string }> = {
  common: { label: 'Thường', color: '#8B8B9E', bg: 'rgba(139,139,158,0.1)', glow: '', icon: '⚪' },
  rare: { label: 'Hiếm', color: '#60A5FA', bg: 'rgba(96,165,250,0.1)', glow: '0 0 12px rgba(96,165,250,0.3)', icon: '🔵' },
  epic: { label: 'Sử thi', color: '#A78BFA', bg: 'rgba(167,139,250,0.1)', glow: '0 0 12px rgba(167,139,250,0.4)', icon: '🟣' },
  legendary: { label: 'Huyền thoại', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', glow: '0 0 20px rgba(251,191,36,0.4)', icon: '🟡' },
};

function getRarity(xpReward: number): Rarity {
  if (xpReward >= 100) return 'legendary';
  if (xpReward >= 50) return 'epic';
  if (xpReward >= 25) return 'rare';
  return 'common';
}

function getTitle(level: number): { title: string; icon: string } {
  if (level >= 50) return { title: 'Thần sử thi', icon: '🌟' };
  if (level >= 40) return { title: 'Truyền thuyết', icon: '👑' };
  if (level >= 30) return { title: 'Huyền thoại', icon: '💎' };
  if (level >= 20) return { title: 'Anh hùng', icon: '⚡' };
  if (level >= 15) return { title: 'Chiến binh', icon: '🗡️' };
  if (level >= 10) return { title: 'Thợ việc', icon: '🔨' };
  if (level >= 5) return { title: 'Tập sự', icon: '📚' };
  return { title: 'Người mới', icon: '🌱' };
}

interface DailyQuest {
  id: string;
  title: string;
  icon: string;
  xpReward: number;
  progress: number;
  target: number;
  completed: boolean;
}

function getDailyQuests(completedToday: number, streakDays: number): DailyQuest[] {
  return [
    { id: 'q1', title: 'Hoàn thành 3 task hôm nay', icon: '✅', xpReward: 30, progress: Math.min(3, completedToday), target: 3, completed: completedToday >= 3 },
    { id: 'q2', title: 'Duy trì streak liên tiếp', icon: '🔥', xpReward: 20, progress: Math.min(1, streakDays > 0 ? 1 : 0), target: 1, completed: streakDays > 0 },
    { id: 'q3', title: 'Làm ngay 1 task "Làm ngay"', icon: '🎯', xpReward: 15, progress: Math.min(1, completedToday > 0 ? 1 : 0), target: 1, completed: completedToday > 0 },
  ];
}

// ─── Level Hero Card ───
function LevelHeroCard({ state }: { state: any }) {
  const { title, icon } = getTitle(state.level);
  const currentLevelXp = xpForCurrentLevel(state.level);
  const nextLevelXp = xpForNextLevel(state.level);
  const progress = nextLevelXp > currentLevelXp ? ((state.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100 : 100;
  const xpToNext = Math.max(0, nextLevelXp - state.xp);

  return (
    <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 border border-[var(--border-accent)] relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[rgba(0,229,204,0.06)] via-transparent to-[rgba(167,139,250,0.04)]" />
      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="size-16 rounded-2xl bg-[var(--accent-dim)] border-2 border-[var(--border-accent)] flex items-center justify-center"
                style={{ boxShadow: '0 0 20px rgba(0,229,204,0.25)' }}>
                <span className="text-2xl font-black text-[var(--accent-primary)]">{state.level}</span>
              </div>
              <span className="absolute -bottom-1 -right-1 text-lg">{icon}</span>
            </div>
            <div>
              <p className="text-[10px] text-[var(--text-muted)] mb-0.5">Cấp độ {state.level}</p>
              <p className="text-xl font-black text-[var(--text-primary)]">{title}</p>
              <p className="text-[10px] text-[var(--accent-primary)]">Còn {xpToNext} XP → Cấp {state.level + 1}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-black text-[var(--accent-primary)] font-mono tabular-nums">{state.xp}</p>
            <p className="text-[9px] text-[var(--text-muted)]">Tổng XP</p>
          </div>
        </div>

        {/* XP Bar */}
        <div className="mb-2">
          <div className="w-full h-3 rounded-full bg-[var(--bg-surface)] overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700 relative overflow-hidden"
              style={{ width: `${Math.min(progress, 100)}%`, background: 'linear-gradient(90deg, var(--accent-primary), #A78BFA)' }}>
              <div className="absolute inset-0 animate-shimmer opacity-30" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)', backgroundSize: '200% 100%' }} />
            </div>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-[9px] text-[var(--text-muted)] font-mono">{state.xp - currentLevelXp} / {nextLevelXp - currentLevelXp} XP</span>
            <span className="text-[9px] text-[var(--accent-primary)]">{Math.round(progress)}%</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-4 gap-2 mt-3">
          {[
            { label: 'Streak', value: state.streak, icon: '🔥', color: 'var(--warning)' },
            { label: 'Thành tích', value: state.achievements.filter((a: any) => a.unlockedAt).length, icon: '🏆', color: 'var(--accent-primary)' },
            { label: 'Task', value: state.totalTasksCompleted, icon: '✅', color: 'var(--success)' },
            { label: 'Ngày', value: state.activeDays, icon: '📅', color: 'var(--info)' },
          ].map(s => (
            <div key={s.label} className="text-center bg-[var(--bg-surface)] rounded-xl py-2">
              <div className="text-base">{s.icon}</div>
              <p className="text-sm font-black font-mono" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[7px] text-[var(--text-muted)]">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Daily Quests ───
function DailyQuestsPanel({ state }: { state: any }) {
  const tasks = useTaskStore(s => s.tasks);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const completedToday = tasks.filter(t => t.status === 'done' && t.completedAt && t.completedAt >= today.getTime()).length;
  const quests = getDailyQuests(completedToday, state.streak);
  const completedCount = quests.filter(q => q.completed).length;

  return (
    <div className="bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)]">
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <h2 className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
          <Zap size={13} className="text-[var(--warning)]" /> Nhiệm vụ ngày ({completedCount}/{quests.length})
        </h2>
        <span className="text-[10px] text-[var(--accent-primary)] font-mono">Làm lại mỗi ngày</span>
      </div>
      <div className="px-4 pb-4 space-y-2">
        {quests.map(q => (
          <div key={q.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${q.completed ? 'bg-[rgba(0,229,204,0.08)] border-[var(--border-accent)]' : 'bg-[var(--bg-surface)] border-[var(--border-subtle)]'}`}>
            <div className="text-xl flex-shrink-0">{q.icon}</div>
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-semibold ${q.completed ? 'text-[var(--accent-primary)] line-through opacity-70' : 'text-[var(--text-primary)]'}`}>{q.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-1.5 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-[var(--accent-primary)] transition-all duration-500"
                    style={{ width: `${(q.progress / q.target) * 100}%` }} />
                </div>
                <span className="text-[9px] text-[var(--text-muted)] font-mono flex-shrink-0">{q.progress}/{q.target}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={`text-xs font-black font-mono ${q.completed ? 'text-[var(--success)]' : 'text-[var(--warning)]'}`}>+{q.xpReward}</span>
              {q.completed && <span className="text-[9px] text-[var(--success)]">✓ Xong</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Achievement Card ───
function AchievementCard({ ach, isAdmin, onUnlock, onDelete }: { ach: any; isAdmin: boolean; onUnlock?: () => void; onDelete?: () => void }) {
  const rarity = getRarity(ach.xpReward);
  const cfg = RARITY_CONFIG[rarity];
  const isUnlocked = !!ach.unlockedAt;

  return (
    <div className={`flex items-center gap-3 rounded-2xl p-3.5 border transition-all ${isUnlocked ? 'border-[var(--border-accent)]' : 'border-[var(--border-subtle)] opacity-60'}`}
      style={{ background: isUnlocked ? cfg.bg : 'var(--bg-elevated)', boxShadow: isUnlocked ? cfg.glow : 'none' }}>
      <div className={`size-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 border ${isUnlocked ? 'border-current' : 'border-[var(--border-subtle)]'}`}
        style={{ borderColor: isUnlocked ? cfg.color : undefined, background: `${cfg.color}10` }}>
        {isUnlocked ? ach.icon : '🔒'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <p className={`text-xs font-bold ${isUnlocked ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{ach.title}</p>
          <span className="text-[8px] px-1.5 py-0.5 rounded-full font-bold" style={{ color: cfg.color, background: cfg.bg }}>{cfg.icon} {cfg.label}</span>
        </div>
        <p className="text-[10px] text-[var(--text-muted)] truncate">{ach.description}</p>
        {ach.unlockedAt && <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{new Date(ach.unlockedAt).toLocaleDateString('vi-VN')}</p>}
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        <span className={`text-sm font-black font-mono ${isUnlocked ? 'text-[var(--success)]' : 'text-[var(--text-muted)]'}`}>+{ach.xpReward}</span>
        <div className="flex gap-1">
          {!isUnlocked && ach.isCustom && isAdmin && onUnlock && (
            <button onClick={onUnlock} className="px-2 py-1 rounded-lg text-[9px] bg-[var(--accent-dim)] text-[var(--accent-primary)] font-semibold">Mở</button>
          )}
          {ach.isCustom && isAdmin && onDelete && (
            <button onClick={onDelete} className="size-6 rounded-lg bg-[rgba(248,113,113,0.1)] flex items-center justify-center text-[var(--error)]">
              <Trash2 size={9} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Reward Card ───
function RewardCard({ reward, xp, onClaim, onDelete, isAdmin }: { reward: any; xp: number; onClaim: () => void; onDelete?: () => void; isAdmin: boolean }) {
  const canClaim = !reward.claimed && xp >= reward.xpCost;
  const pct = Math.min(100, (xp / reward.xpCost) * 100);

  return (
    <div className={`flex items-center gap-3 bg-[var(--bg-elevated)] rounded-2xl p-3.5 border transition-all ${reward.claimed ? 'border-[var(--success)] opacity-60' : canClaim ? 'border-[var(--warning)]' : 'border-[var(--border-subtle)]'}`}
      style={{ boxShadow: canClaim && !reward.claimed ? '0 0 12px rgba(251,191,36,0.2)' : 'none' }}>
      <div className="size-12 rounded-2xl bg-[rgba(251,191,36,0.1)] border border-[rgba(251,191,36,0.2)] flex items-center justify-center text-2xl flex-shrink-0">
        {reward.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-xs font-bold ${reward.claimed ? 'line-through text-[var(--text-muted)]' : 'text-[var(--text-primary)]'}`}>{reward.title}</p>
        <p className="text-[10px] text-[var(--text-muted)] truncate">{reward.description}</p>
        {!reward.claimed && (
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1 bg-[var(--bg-surface)] rounded-full overflow-hidden">
              <div className="h-full rounded-full bg-[var(--warning)] transition-all duration-500" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-[9px] text-[var(--text-muted)] font-mono flex-shrink-0">{Math.round(pct)}%</span>
          </div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
        {reward.claimed ? (
          <span className="text-xs text-[var(--success)] font-bold">✓ Đã nhận</span>
        ) : (
          <button onClick={onClaim} disabled={!canClaim}
            className={`px-3 py-1.5 rounded-xl text-xs font-black min-h-[32px] transition-all ${canClaim ? 'bg-[var(--warning)] text-[var(--bg-base)] shadow-md' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
            {reward.xpCost} XP
          </button>
        )}
        {reward.id.startsWith('cr_') && isAdmin && onDelete && (
          <button onClick={onDelete} className="size-6 rounded-lg bg-[rgba(248,113,113,0.1)] flex items-center justify-center text-[var(--error)]">
            <Trash2 size={9} />
          </button>
        )}
      </div>
    </div>
  );
}

const ICON_OPTIONS = ['🎁', '☕', '🍰', '🎬', '🏖️', '🎮', '🎵', '📱', '👟', '💆', '🍕', '🎊', '🌴', '🎯', '🏆', '🌟'];
const ACH_ICONS = ['🏆', '⭐', '🔥', '💎', '🎯', '⚡', '🌟', '👑', '🎖️', '🏅', '💪', '🧠', '🚀', '🌈', '🦁', '🐉'];

type Section = 'progress' | 'quests' | 'achievements' | 'rewards';

export default function AchievementsPage() {
  const { state, claimReward, addCustomReward, removeReward, addCustomAchievement, removeAchievement, updateAchievement, unlockAchievement } = useGamificationStore();
  const user = useAuthStore(s => s.user);
  const isAdmin = user?.id === 'admin';
  const [activeSection, setActiveSection] = useState<Section>('progress');
  const [filterRarity, setFilterRarity] = useState<Rarity | 'all'>('all');
  const [showAddReward, setShowAddReward] = useState(false);
  const [showAddAch, setShowAddAch] = useState(false);
  const [rewardTitle, setRewardTitle] = useState('');
  const [rewardDesc, setRewardDesc] = useState('');
  const [rewardIcon, setRewardIcon] = useState('🎁');
  const [rewardXp, setRewardXp] = useState(100);
  const [achTitle, setAchTitle] = useState('');
  const [achDesc, setAchDesc] = useState('');
  const [achIcon, setAchIcon] = useState('🏆');
  const [achXp, setAchXp] = useState(50);

  const unlocked = state.achievements.filter((a: any) => a.unlockedAt);
  const locked = state.achievements.filter((a: any) => !a.unlockedAt);

  const filteredUnlocked = useMemo(() => filterRarity === 'all' ? unlocked : unlocked.filter((a: any) => getRarity(a.xpReward) === filterRarity), [unlocked, filterRarity]);
  const filteredLocked = useMemo(() => filterRarity === 'all' ? locked : locked.filter((a: any) => getRarity(a.xpReward) === filterRarity), [locked, filterRarity]);

  const rarityStats = useMemo(() => {
    const counts: Record<Rarity, { total: number; unlocked: number }> = { common: { total: 0, unlocked: 0 }, rare: { total: 0, unlocked: 0 }, epic: { total: 0, unlocked: 0 }, legendary: { total: 0, unlocked: 0 } };
    state.achievements.forEach((a: any) => {
      const r = getRarity(a.xpReward);
      counts[r].total++;
      if (a.unlockedAt) counts[r].unlocked++;
    });
    return counts;
  }, [state.achievements]);

  const handleAddReward = () => {
    if (!rewardTitle.trim()) return;
    addCustomReward({ title: rewardTitle, description: rewardDesc || 'Phần thưởng tùy chọn', icon: rewardIcon, xpCost: rewardXp });
    setRewardTitle(''); setRewardDesc(''); setRewardIcon('🎁'); setRewardXp(100); setShowAddReward(false);
  };

  const handleAddAch = () => {
    if (!achTitle.trim()) return;
    addCustomAchievement({ title: achTitle, description: achDesc || 'Thành tích tùy chỉnh', icon: achIcon, xpReward: achXp, condition: { type: 'custom', description: achDesc }, isCustom: true });
    setAchTitle(''); setAchDesc(''); setAchIcon('🏆'); setAchXp(50); setShowAddAch(false);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-strong border-b border-[var(--border-subtle)] px-4 pt-4 pb-3">
        <h1 className="text-xl font-black text-[var(--text-primary)] mb-3">Thành tích & Phần thưởng</h1>
        <div className="flex gap-1">
          {(['progress', 'quests', 'achievements', 'rewards'] as Section[]).map(s => (
            <button key={s} onClick={() => setActiveSection(s)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${activeSection === s ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}>
              {s === 'progress' ? '📈 Cấp' : s === 'quests' ? '⚡ Nhiệm vụ' : s === 'achievements' ? '🏆 Huy hiệu' : '🎁 Thưởng'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-4">
        {/* ── PROGRESS TAB ── */}
        {activeSection === 'progress' && (
          <>
            <LevelHeroCard state={state} />

            {/* Rarity collection */}
            <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 border border-[var(--border-subtle)]">
              <h2 className="text-xs font-bold text-[var(--text-secondary)] mb-3 flex items-center gap-1.5"><Shield size={13} /> Bộ sưu tập huy hiệu</h2>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(rarityStats) as [Rarity, any][]).map(([rarity, counts]) => {
                  const cfg = RARITY_CONFIG[rarity];
                  return (
                    <div key={rarity} className="rounded-xl p-3 border flex items-center gap-2" style={{ background: cfg.bg, borderColor: `${cfg.color}30` }}>
                      <span className="text-xl">{cfg.icon}</span>
                      <div className="flex-1">
                        <p className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</p>
                        <p className="text-[10px] text-[var(--text-muted)]">{counts.unlocked}/{counts.total} mở khóa</p>
                        <div className="w-full h-1 bg-[var(--bg-surface)] rounded-full mt-1 overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${counts.total > 0 ? (counts.unlocked / counts.total) * 100 : 0}%`, backgroundColor: cfg.color }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Achievement milestones */}
            <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 border border-[var(--border-subtle)]">
              <h2 className="text-xs font-bold text-[var(--text-secondary)] mb-3 flex items-center gap-1.5"><Target size={13} /> Mốc tiếp theo</h2>
              {[
                { icon: '🔥', label: 'Streak 7 ngày', current: state.streak, target: 7, color: 'var(--warning)' },
                { icon: '✅', label: '50 task hoàn thành', current: state.totalTasksCompleted, target: 50, color: 'var(--success)' },
                { icon: '⏱️', label: '10 giờ làm việc', current: Math.floor(state.totalTimerSeconds / 3600), target: 10, color: 'var(--info)' },
              ].map(m => (
                <div key={m.label} className="flex items-center gap-3 mb-3 last:mb-0">
                  <span className="text-xl flex-shrink-0">{m.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-[var(--text-primary)]">{m.label}</p>
                      <span className="text-[10px] font-mono" style={{ color: m.color }}>{m.current}/{m.target}</span>
                    </div>
                    <div className="w-full h-2 bg-[var(--bg-surface)] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.min(100, (m.current / m.target) * 100)}%`, backgroundColor: m.color }} />
                    </div>
                  </div>
                  {m.current >= m.target && <span className="text-[var(--success)] text-sm">✓</span>}
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── QUESTS TAB ── */}
        {activeSection === 'quests' && (
          <DailyQuestsPanel state={state} />
        )}

        {/* ── ACHIEVEMENTS TAB ── */}
        {activeSection === 'achievements' && (
          <>
            {/* Filter by rarity */}
            <div className="flex gap-1.5 overflow-x-auto">
              <button onClick={() => setFilterRarity('all')}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap flex-shrink-0 ${filterRarity === 'all' ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-elevated)] text-[var(--text-muted)]'}`}>
                Tất cả ({state.achievements.length})
              </button>
              {(Object.entries(RARITY_CONFIG) as [Rarity, any][]).map(([r, cfg]) => (
                <button key={r} onClick={() => setFilterRarity(r)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap flex-shrink-0 ${filterRarity === r ? 'border border-current' : 'bg-[var(--bg-elevated)]'}`}
                  style={{ color: cfg.color, background: filterRarity === r ? cfg.bg : undefined }}>
                  {cfg.icon} {cfg.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[var(--text-secondary)]">Đã mở khóa ({filteredUnlocked.length})</h2>
              {isAdmin && (
                <button onClick={() => setShowAddAch(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] bg-[var(--accent-dim)] text-[var(--accent-primary)] font-bold min-h-[28px]">
                  <Plus size={10} /> Thêm
                </button>
              )}
            </div>

            {/* Add Achievement Form */}
            {showAddAch && (
              <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 border border-[var(--border-accent)] animate-slide-up">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-[var(--text-primary)]">Tạo thành tích</h3>
                  <button onClick={() => setShowAddAch(false)} className="size-7 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><X size={12} /></button>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {ACH_ICONS.map(icon => (
                    <button key={icon} onClick={() => setAchIcon(icon)}
                      className={`size-9 rounded-xl flex items-center justify-center text-xl ${achIcon === icon ? 'bg-[var(--accent-dim)] border border-[var(--border-accent)]' : 'bg-[var(--bg-surface)]'}`}>{icon}</button>
                  ))}
                </div>
                <input type="text" value={achTitle} onChange={e => setAchTitle(e.target.value)} placeholder="Tên thành tích"
                  className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none mb-2 min-h-[40px]" />
                <input type="text" value={achDesc} onChange={e => setAchDesc(e.target.value)} placeholder="Mô tả điều kiện"
                  className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none mb-2 min-h-[40px]" />
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-xs text-[var(--text-muted)] flex-shrink-0">XP thưởng:</label>
                  <input type="number" value={achXp} onChange={e => setAchXp(Math.max(5, parseInt(e.target.value) || 5))}
                    className="w-24 bg-[var(--bg-surface)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none min-h-[36px] font-mono" />
                  <span className="text-[10px] text-[var(--text-muted)]">≥25: Hiếm • ≥50: Sử thi • ≥100: Huyền thoại</span>
                </div>
                <button onClick={handleAddAch} disabled={!achTitle.trim()}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-30">Tạo thành tích</button>
              </div>
            )}

            {filteredUnlocked.map((ach: any) => (
              <AchievementCard key={ach.id} ach={ach} isAdmin={isAdmin}
                onDelete={ach.isCustom ? () => removeAchievement(ach.id) : undefined} />
            ))}

            {filteredLocked.length > 0 && (
              <>
                <h2 className="text-xs font-bold text-[var(--text-secondary)] flex items-center gap-1.5"><Lock size={12} /> Chưa mở khóa ({filteredLocked.length})</h2>
                {filteredLocked.map((ach: any) => (
                  <AchievementCard key={ach.id} ach={ach} isAdmin={isAdmin}
                    onUnlock={ach.isCustom ? () => unlockAchievement(ach.id) : undefined}
                    onDelete={ach.isCustom ? () => removeAchievement(ach.id) : undefined} />
                ))}
              </>
            )}
          </>
        )}

        {/* ── REWARDS TAB ── */}
        {activeSection === 'rewards' && (
          <>
            <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 border border-[var(--border-accent)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[rgba(251,191,36,0.06)] to-transparent" />
              <div className="relative flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-[var(--text-muted)] mb-1">XP khả dụng</p>
                  <p className="text-3xl font-black text-[var(--warning)] font-mono">{state.xp}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-bold text-[var(--text-primary)]">{state.rewards.filter((r: any) => !r.claimed).length} phần thưởng</p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-0.5">có thể đổi</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[var(--text-secondary)]">Cửa hàng phần thưởng</h2>
              {isAdmin && (
                <button onClick={() => setShowAddReward(true)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[10px] bg-[var(--accent-dim)] text-[var(--accent-primary)] font-bold min-h-[28px]">
                  <Plus size={10} /> Thêm
                </button>
              )}
            </div>

            {showAddReward && (
              <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 border border-[var(--border-accent)] animate-slide-up">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-[var(--text-primary)]">Tạo phần thưởng</h3>
                  <button onClick={() => setShowAddReward(false)} className="size-7 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><X size={12} /></button>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {ICON_OPTIONS.map(icon => (
                    <button key={icon} onClick={() => setRewardIcon(icon)}
                      className={`size-9 rounded-xl flex items-center justify-center text-xl ${rewardIcon === icon ? 'bg-[var(--accent-dim)] border border-[var(--border-accent)]' : 'bg-[var(--bg-surface)]'}`}>{icon}</button>
                  ))}
                </div>
                <input type="text" value={rewardTitle} onChange={e => setRewardTitle(e.target.value)} placeholder="Tên phần thưởng"
                  className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none mb-2 min-h-[40px]" />
                <input type="text" value={rewardDesc} onChange={e => setRewardDesc(e.target.value)} placeholder="Mô tả"
                  className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none mb-2 min-h-[40px]" />
                <div className="flex items-center gap-2 mb-3">
                  <label className="text-xs text-[var(--text-muted)] flex-shrink-0">XP cần:</label>
                  <input type="number" value={rewardXp} onChange={e => setRewardXp(Math.max(10, parseInt(e.target.value) || 10))}
                    className="w-24 bg-[var(--bg-surface)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] outline-none min-h-[36px] font-mono" />
                </div>
                <button onClick={handleAddReward} disabled={!rewardTitle.trim()}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-[var(--bg-base)] bg-[var(--warning)] disabled:opacity-30">Tạo phần thưởng</button>
              </div>
            )}

            {state.rewards.map((reward: any) => (
              <RewardCard key={reward.id} reward={reward} xp={state.xp}
                onClaim={() => claimReward(reward.id)}
                onDelete={reward.id.startsWith('cr_') ? () => removeReward(reward.id) : undefined}
                isAdmin={isAdmin} />
            ))}
          </>
        )}
      </div>
    </div>
  );
}
