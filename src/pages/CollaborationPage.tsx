import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '@/stores';
import {
  Users, Share2, Copy, Check, Plus, X, Crown, Shield, User,
  Activity, MessageCircle, CheckSquare, Star, Zap, BarChart2,
  Clock, Target, ChevronRight, Wifi, Circle,
} from 'lucide-react';

interface TeamMember {
  id: string;
  username: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  status: 'online' | 'away' | 'offline';
  avatar?: string;
  joinedAt: number;
  tasksCompleted: number;
  xp: number;
}

interface ActivityItem {
  id: string;
  userId: string;
  username: string;
  action: string;
  target?: string;
  timestamp: number;
  type: 'task' | 'achievement' | 'join' | 'message' | 'system';
}

interface Workspace {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  createdAt: number;
  memberCount: number;
  taskCount: number;
  inviteCode: string;
}

function loadWs(): Workspace | null {
  try { return JSON.parse(localStorage.getItem('nw_workspace') || 'null'); } catch { return null; }
}
function saveWs(ws: Workspace | null) { localStorage.setItem('nw_workspace', JSON.stringify(ws)); }
function loadMembers(): TeamMember[] {
  try { return JSON.parse(localStorage.getItem('nw_workspace_members') || '[]'); } catch { return []; }
}
function saveMembers(m: TeamMember[]) { localStorage.setItem('nw_workspace_members', JSON.stringify(m)); }
function loadActivities(): ActivityItem[] {
  try { return JSON.parse(localStorage.getItem('nw_workspace_activities') || '[]'); } catch { return []; }
}
function saveActivities(a: ActivityItem[]) { localStorage.setItem('nw_workspace_activities', JSON.stringify(a)); }

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
function genCode() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }

const ACTION_ICONS: Record<ActivityItem['type'], any> = {
  task: CheckSquare, achievement: Star, join: Users, message: MessageCircle, system: Zap,
};
const ACTION_COLORS: Record<ActivityItem['type'], string> = {
  task: 'var(--success)', achievement: 'var(--warning)', join: 'var(--accent-primary)',
  message: 'var(--info)', system: 'var(--text-muted)',
};

function RoleIcon({ role }: { role: TeamMember['role'] }) {
  if (role === 'owner') return <Crown size={10} className="text-[var(--warning)]" />;
  if (role === 'admin') return <Shield size={10} className="text-[var(--info)]" />;
  return <User size={10} className="text-[var(--text-muted)]" />;
}

function StatusDot({ status }: { status: TeamMember['status'] }) {
  const colors = { online: '#34D399', away: '#FBBF24', offline: '#5A5A6E' };
  return <div className="size-2.5 rounded-full border-2 border-[var(--bg-elevated)]" style={{ backgroundColor: colors[status] }} />;
}

function timeAgo(ts: number): string {
  const d = Date.now() - ts;
  if (d < 60000) return 'Vừa xong';
  if (d < 3600000) return `${Math.floor(d / 60000)}ph`;
  if (d < 86400000) return `${Math.floor(d / 3600000)}h`;
  return `${Math.floor(d / 86400000)}ng`;
}

// ─── No Workspace View ───
function CreateWorkspaceView({ onCreated }: { onCreated: (ws: Workspace, me: TeamMember) => void }) {
  const user = useAuthStore(s => s.user);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const handleCreate = () => {
    if (!name.trim() || !user) return;
    const ws: Workspace = {
      id: genId(), name: name.trim(), description: desc.trim() || undefined,
      ownerId: user.id, createdAt: Date.now(), memberCount: 1, taskCount: 0, inviteCode: genCode(),
    };
    const me: TeamMember = {
      id: user.id, username: user.username, email: user.email, role: 'owner',
      status: 'online', joinedAt: Date.now(), tasksCompleted: 0, xp: 0,
    };
    saveWs(ws); saveMembers([me]);
    const activity: ActivityItem = { id: genId(), userId: user.id, username: user.username, action: 'đã tạo workspace', timestamp: Date.now(), type: 'system' };
    saveActivities([activity]);
    onCreated(ws, me);
  };

  return (
    <div className="flex flex-col h-full px-4 pt-8 pb-24 overflow-y-auto items-center">
      <div className="w-full max-w-sm">
        <div className="size-20 rounded-3xl bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center mx-auto mb-6">
          <Users size={36} className="text-[var(--accent-primary)]" />
        </div>
        <h1 className="text-2xl font-black text-[var(--text-primary)] text-center mb-2">Workspace nhóm</h1>
        <p className="text-sm text-[var(--text-muted)] text-center mb-8 leading-relaxed">
          Tạo không gian làm việc chung, phân công task và theo dõi hiệu suất nhóm
        </p>
        <div className="space-y-3">
          <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Tên workspace (VD: Team Marketing)"
            className="w-full bg-[var(--bg-elevated)] rounded-2xl px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[52px] font-medium" />
          <input type="text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="Mô tả (tùy chọn)"
            className="w-full bg-[var(--bg-elevated)] rounded-2xl px-4 py-3.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[52px]" />
          <button onClick={handleCreate} disabled={!name.trim()}
            className="w-full py-4 rounded-2xl text-sm font-black text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-30 min-h-[52px] shadow-lg">
            Tạo Workspace
          </button>
        </div>

        <div className="mt-8 space-y-3">
          {[
            { icon: '🎯', title: 'Phân công task', desc: 'Assign nhiệm vụ cho từng thành viên' },
            { icon: '📊', title: 'Team analytics', desc: 'Theo dõi hiệu suất toàn nhóm' },
            { icon: '⚡', title: 'Activity feed', desc: 'Cập nhật realtime mọi hoạt động' },
            { icon: '🏆', title: 'Leaderboard', desc: 'Xếp hạng XP trong nhóm' },
          ].map(f => (
            <div key={f.title} className="flex items-center gap-3 bg-[var(--bg-elevated)] rounded-2xl p-3.5 border border-[var(--border-subtle)]">
              <span className="text-2xl">{f.icon}</span>
              <div>
                <p className="text-sm font-semibold text-[var(--text-primary)]">{f.title}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Workspace Dashboard ───
function WorkspaceDashboard({
  workspace, members, activities, onAddMember, onLeave,
}: {
  workspace: Workspace;
  members: TeamMember[];
  activities: ActivityItem[];
  onAddMember: () => void;
  onLeave: () => void;
}) {
  const user = useAuthStore(s => s.user);
  const [activeTab, setActiveTab] = useState<'members' | 'activity' | 'leaderboard'>('members');
  const [copied, setCopied] = useState(false);

  const online = members.filter(m => m.status === 'online').length;
  const sorted = [...members].sort((a, b) => b.xp - a.xp);

  const handleCopyInvite = async () => {
    await navigator.clipboard.writeText(`${window.location.origin}?invite=${workspace.inviteCode}`);
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 glass-strong border-b border-[var(--border-subtle)] px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="size-10 rounded-2xl bg-[var(--accent-dim)] border border-[var(--border-accent)] flex items-center justify-center">
              <span className="text-lg font-black text-[var(--accent-primary)]">{workspace.name.slice(0, 1).toUpperCase()}</span>
            </div>
            <div>
              <h1 className="text-base font-black text-[var(--text-primary)]">{workspace.name}</h1>
              <div className="flex items-center gap-1.5">
                <div className="size-1.5 rounded-full bg-[var(--success)]" />
                <p className="text-[9px] text-[var(--text-muted)]">{online} online • {members.length} thành viên</p>
              </div>
            </div>
          </div>
          <button onClick={onAddMember}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[var(--accent-dim)] text-[var(--accent-primary)] text-xs font-bold min-h-[36px]">
            <Plus size={13} /> Mời
          </button>
        </div>

        {/* Invite code row */}
        <div className="flex items-center gap-2 bg-[var(--bg-surface)] rounded-xl px-3 py-2.5">
          <div className="flex-1 min-w-0">
            <p className="text-[9px] text-[var(--text-muted)] mb-0.5">Mã mời</p>
            <p className="text-xs font-bold font-mono text-[var(--accent-primary)] tracking-widest">{workspace.inviteCode}</p>
          </div>
          <button onClick={handleCopyInvite} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--bg-elevated)] border border-[var(--border-subtle)] text-xs text-[var(--text-secondary)] min-h-[32px]">
            {copied ? <Check size={12} className="text-[var(--success)]" /> : <Copy size={12} />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mt-3">
          {(['members', 'activity', 'leaderboard'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${activeTab === tab ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'text-[var(--text-muted)]'}`}>
              {tab === 'members' ? '👥 Thành viên' : tab === 'activity' ? '⚡ Hoạt động' : '🏆 Xếp hạng'}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-24 space-y-3">
        {/* ── MEMBERS TAB ── */}
        {activeTab === 'members' && (
          <>
            {/* Stats overview */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Thành viên', value: members.length, color: 'var(--accent-primary)', icon: Users },
                { label: 'Online', value: online, color: 'var(--success)', icon: Wifi },
                { label: 'Task xong', value: members.reduce((s, m) => s + m.tasksCompleted, 0), color: 'var(--warning)', icon: CheckSquare },
              ].map(({ label, value, color, icon: Icon }) => (
                <div key={label} className="bg-[var(--bg-elevated)] rounded-2xl p-3 border border-[var(--border-subtle)] text-center">
                  <Icon size={14} style={{ color }} className="mx-auto mb-1" />
                  <p className="text-lg font-black font-mono" style={{ color }}>{value}</p>
                  <p className="text-[9px] text-[var(--text-muted)]">{label}</p>
                </div>
              ))}
            </div>

            {/* Member list */}
            {members.map(member => (
              <div key={member.id} className="bg-[var(--bg-elevated)] rounded-2xl p-3.5 border border-[var(--border-subtle)]">
                <div className="flex items-center gap-3">
                  <div className="relative flex-shrink-0">
                    <div className="size-11 rounded-2xl bg-[var(--bg-surface)] border border-[var(--border-subtle)] flex items-center justify-center text-base font-black text-[var(--text-primary)]">
                      {member.username.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5">
                      <StatusDot status={member.status} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-[var(--text-primary)] truncate">{member.username}</p>
                      <RoleIcon role={member.role} />
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] truncate">{member.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] text-[var(--warning)] font-mono font-bold">{member.xp} XP</span>
                      <span className="text-[9px] text-[var(--text-muted)]">•</span>
                      <span className="text-[9px] text-[var(--success)]">{member.tasksCompleted} task</span>
                      <span className="text-[9px] text-[var(--text-muted)]">•</span>
                      <span className="text-[9px] text-[var(--text-muted)] capitalize">{member.status}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-medium ${
                      member.role === 'owner' ? 'bg-[rgba(251,191,36,0.15)] text-[var(--warning)]' :
                      member.role === 'admin' ? 'bg-[rgba(96,165,250,0.15)] text-[var(--info)]' :
                      'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                    }`}>
                      {member.role === 'owner' ? 'Chủ' : member.role === 'admin' ? 'Admin' : 'Thành viên'}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* Leave button */}
            <button onClick={onLeave}
              className="w-full py-3 rounded-2xl text-xs font-semibold text-[var(--error)] bg-[rgba(248,113,113,0.08)] border border-[rgba(248,113,113,0.2)] min-h-[44px]">
              Rời workspace
            </button>
          </>
        )}

        {/* ── ACTIVITY TAB ── */}
        {activeTab === 'activity' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-[var(--text-secondary)]">Hoạt động gần đây</h2>
              <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-elevated)] px-2 py-1 rounded-lg">{activities.length} mục</span>
            </div>
            {activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-[var(--bg-elevated)] rounded-2xl border border-[var(--border-subtle)]">
                <Activity size={32} className="text-[var(--text-muted)] mb-2 opacity-40" />
                <p className="text-sm text-[var(--text-muted)]">Chưa có hoạt động</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-5 top-0 bottom-0 w-px bg-[var(--border-subtle)]" />
                <div className="space-y-3">
                  {activities.slice(0, 30).map(act => {
                    const Icon = ACTION_ICONS[act.type];
                    const color = ACTION_COLORS[act.type];
                    return (
                      <div key={act.id} className="flex items-start gap-3 pl-3">
                        <div className="size-5 rounded-full border-2 border-[var(--bg-base)] flex items-center justify-center flex-shrink-0 z-10 mt-1" style={{ backgroundColor: `${color}20` }}>
                          <Icon size={10} style={{ color }} />
                        </div>
                        <div className="flex-1 bg-[var(--bg-elevated)] rounded-xl p-3 border border-[var(--border-subtle)]">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-xs text-[var(--text-primary)]">
                              <span className="font-bold">{act.username}</span> {act.action}
                              {act.target && <span className="text-[var(--accent-primary)]"> "{act.target}"</span>}
                            </p>
                            <span className="text-[9px] text-[var(--text-muted)] whitespace-nowrap flex-shrink-0">{timeAgo(act.timestamp)}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── LEADERBOARD TAB ── */}
        {activeTab === 'leaderboard' && (
          <>
            <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 border border-[var(--border-accent)] relative overflow-hidden mb-2">
              <div className="absolute inset-0 bg-gradient-to-br from-[rgba(251,191,36,0.06)] to-transparent" />
              <div className="relative">
                <h2 className="text-xs font-bold text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
                  <Star size={13} className="text-[var(--warning)]" /> Xếp hạng XP nhóm
                </h2>
                {sorted.map((member, idx) => {
                  const isTop3 = idx < 3;
                  const medals = ['🥇', '🥈', '🥉'];
                  const isMe = member.id === user?.id;
                  return (
                    <div key={member.id} className={`flex items-center gap-3 p-3 rounded-xl mb-2 transition-all ${isMe ? 'bg-[var(--accent-dim)] border border-[var(--border-accent)]' : 'bg-[var(--bg-surface)]'}`}>
                      <div className="w-8 text-center flex-shrink-0">
                        {isTop3 ? <span className="text-lg">{medals[idx]}</span> : <span className="text-sm font-bold text-[var(--text-muted)]">#{idx + 1}</span>}
                      </div>
                      <div className="size-9 rounded-xl bg-[var(--bg-elevated)] border border-[var(--border-subtle)] flex items-center justify-center text-xs font-black text-[var(--text-primary)] flex-shrink-0">
                        {member.username.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <p className="text-xs font-bold text-[var(--text-primary)] truncate">{member.username}</p>
                          {isMe && <span className="text-[8px] text-[var(--accent-primary)] bg-[var(--bg-elevated)] px-1 py-0.5 rounded">Bạn</span>}
                          <RoleIcon role={member.role} />
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <div className="flex-1 h-1 bg-[var(--bg-elevated)] rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-[var(--warning)]" style={{ width: `${Math.min(100, (member.xp / (sorted[0]?.xp || 1)) * 100)}%` }} />
                          </div>
                          <span className="text-[10px] font-mono font-bold text-[var(--warning)] flex-shrink-0">{member.xp} XP</span>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-bold text-[var(--success)]">{member.tasksCompleted}</p>
                        <p className="text-[8px] text-[var(--text-muted)]">task</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Team stats */}
            <div className="bg-[var(--bg-elevated)] rounded-2xl p-4 border border-[var(--border-subtle)]">
              <h2 className="text-xs font-bold text-[var(--text-secondary)] mb-3 flex items-center gap-1.5">
                <BarChart2 size={13} /> Thống kê nhóm
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Tổng XP nhóm', value: members.reduce((s, m) => s + m.xp, 0), suffix: ' XP', color: 'var(--warning)' },
                  { label: 'Task hoàn thành', value: members.reduce((s, m) => s + m.tasksCompleted, 0), suffix: '', color: 'var(--success)' },
                  { label: 'Avg XP/người', value: members.length > 0 ? Math.round(members.reduce((s, m) => s + m.xp, 0) / members.length) : 0, suffix: ' XP', color: 'var(--info)' },
                  { label: 'Thành viên', value: members.length, suffix: ' người', color: 'var(--accent-primary)' },
                ].map(stat => (
                  <div key={stat.label} className="bg-[var(--bg-surface)] rounded-xl p-3 text-center">
                    <p className="text-base font-black font-mono" style={{ color: stat.color }}>{stat.value}{stat.suffix}</p>
                    <p className="text-[9px] text-[var(--text-muted)] mt-0.5">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Invite Modal ───
function InviteModal({ workspace, members, onClose, onInvited }: { workspace: Workspace; members: TeamMember[]; onClose: () => void; onInvited: (m: TeamMember) => void }) {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'member'>('member');

  const handleInvite = () => {
    if (!username.trim()) return;
    const m: TeamMember = {
      id: genId(), username: username.trim(), email: email.trim() || `${username.trim().toLowerCase()}@team.com`,
      role, status: 'offline', joinedAt: Date.now(), tasksCompleted: 0, xp: 0,
    };
    onInvited(m);
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70" onClick={onClose}>
      <div className="w-full max-w-md bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Mời thành viên</h3>
          <button onClick={onClose} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]"><X size={14} /></button>
        </div>
        <div className="bg-[var(--bg-surface)] rounded-xl p-3 mb-4 flex items-center gap-2">
          <Copy size={12} className="text-[var(--accent-primary)]" />
          <div>
            <p className="text-[9px] text-[var(--text-muted)]">Hoặc chia sẻ mã mời</p>
            <p className="text-sm font-black font-mono text-[var(--accent-primary)] tracking-widest">{workspace.inviteCode}</p>
          </div>
        </div>
        <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Tên thành viên" autoFocus
          className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] mb-3 min-h-[44px]" />
        <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email (tùy chọn)"
          className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] mb-3 min-h-[44px]" />
        <div className="flex gap-2 mb-4">
          {(['member', 'admin'] as const).map(r => (
            <button key={r} onClick={() => setRole(r)}
              className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${role === r ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)] border border-[var(--border-accent)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
              {r === 'admin' ? '🛡️ Admin' : '👤 Thành viên'}
            </button>
          ))}
        </div>
        <button onClick={handleInvite} disabled={!username.trim()}
          className="w-full py-3 rounded-xl text-sm font-bold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-30 min-h-[44px]">
          Thêm thành viên
        </button>
      </div>
    </div>
  );
}

export default function CollaborationPage() {
  const user = useAuthStore(s => s.user);
  const [workspace, setWorkspace] = useState<Workspace | null>(loadWs);
  const [members, setMembers] = useState<TeamMember[]>(loadMembers);
  const [activities, setActivities] = useState<ActivityItem[]>(loadActivities);
  const [showInvite, setShowInvite] = useState(false);

  const addActivity = (act: Omit<ActivityItem, 'id'>) => {
    const newAct: ActivityItem = { ...act, id: genId() };
    const updated = [newAct, ...activities].slice(0, 50);
    saveActivities(updated); setActivities(updated);
  };

  const handleCreated = (ws: Workspace, me: TeamMember) => {
    setWorkspace(ws); setMembers([me]);
    addActivity({ userId: me.id, username: me.username, action: 'đã tạo workspace', timestamp: Date.now(), type: 'system' });
  };

  const handleInvited = (m: TeamMember) => {
    const updated = [...members, m];
    saveMembers(updated); setMembers(updated);
    const updatedWs = workspace ? { ...workspace, memberCount: updated.length } : workspace;
    if (updatedWs) { saveWs(updatedWs); setWorkspace(updatedWs); }
    addActivity({ userId: m.id, username: m.username, action: 'đã được mời tham gia', timestamp: Date.now(), type: 'join' });
    setShowInvite(false);
  };

  const handleLeave = () => {
    if (confirm('Bạn có chắc muốn rời workspace này?')) {
      saveWs(null); saveMembers([]); saveActivities([]);
      setWorkspace(null); setMembers([]); setActivities([]);
    }
  };

  if (!workspace) return <CreateWorkspaceView onCreated={handleCreated} />;

  return (
    <>
      <WorkspaceDashboard
        workspace={workspace} members={members} activities={activities}
        onAddMember={() => setShowInvite(true)} onLeave={handleLeave}
      />
      {showInvite && (
        <InviteModal workspace={workspace} members={members} onClose={() => setShowInvite(false)} onInvited={handleInvited} />
      )}
    </>
  );
}
