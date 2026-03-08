import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores';
import { Shield, Users, Ban, Check, Edit3, Trash2, Plus, X } from 'lucide-react';
import type { AppUser, UserRole } from '@/types';

export default function AdminPage() {
  const user = useAuthStore(s => s.user);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState<UserRole>('user');

  // Load users from localStorage (mock)
  useEffect(() => {
    const stored = localStorage.getItem('nw_users');
    if (stored) setUsers(JSON.parse(stored));
    else {
      // Default users
      const defaultUsers: AppUser[] = [
        { id: 'admin', email: 'admin@nghiemwork.local', username: 'Admin', role: 'admin', createdAt: Date.now() },
      ];
      setUsers(defaultUsers);
      localStorage.setItem('nw_users', JSON.stringify(defaultUsers));
    }
  }, []);

  const saveUsers = (us: AppUser[]) => {
    localStorage.setItem('nw_users', JSON.stringify(us));
    setUsers(us);
  };

  const handleAdd = () => {
    if (!email.trim() || !username.trim()) return;
    const newUser: AppUser = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      email: email.trim(),
      username: username.trim(),
      role,
      createdAt: Date.now(),
    };
    saveUsers([...users, newUser]);
    setEmail(''); setUsername(''); setRole('user'); setShowAdd(false);
  };

  const handleEdit = () => {
    if (!editingUser) return;
    const updated = users.map(u => u.id === editingUser.id ? { ...u, username, role } : u);
    saveUsers(updated);
    setEditingUser(null); setEmail(''); setUsername(''); setRole('user');
  };

  const handleDelete = (id: string) => {
    if (id === 'admin') { alert('Không thể xóa admin'); return; }
    if (window.confirm('Xóa người dùng này?')) {
      saveUsers(users.filter(u => u.id !== id));
    }
  };

  const handleBlock = (id: string) => {
    const updated = users.map(u => u.id === id ? { ...u, role: u.role === 'blocked' ? 'user' : 'blocked' as UserRole } : u);
    saveUsers(updated);
  };

  if (user?.id !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full px-4 text-center">
        <Shield size={48} className="text-[var(--error)] mb-3" />
        <p className="text-sm text-[var(--text-primary)] font-semibold">Chỉ admin mới truy cập được</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full px-4 pb-24 overflow-y-auto" style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 12px))' }}>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Shield size={18} className="text-[var(--accent-primary)]" /> Quản lý người dùng
        </h1>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent-dim)] text-xs font-medium text-[var(--accent-primary)] min-h-[32px]">
          <Plus size={12} /> Thêm user
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3 text-center border border-[var(--border-subtle)]">
          <Users size={16} className="text-[var(--accent-primary)] mx-auto mb-1" />
          <p className="text-lg font-bold text-[var(--text-primary)] font-mono">{users.filter(u => u.role !== 'blocked').length}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Hoạt động</p>
        </div>
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3 text-center border border-[var(--border-subtle)]">
          <Shield size={16} className="text-[var(--warning)] mx-auto mb-1" />
          <p className="text-lg font-bold text-[var(--text-primary)] font-mono">{users.filter(u => u.role === 'admin').length}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Admin</p>
        </div>
        <div className="bg-[var(--bg-elevated)] rounded-xl p-3 text-center border border-[var(--border-subtle)]">
          <Ban size={16} className="text-[var(--error)] mx-auto mb-1" />
          <p className="text-lg font-bold text-[var(--text-primary)] font-mono">{users.filter(u => u.role === 'blocked').length}</p>
          <p className="text-[10px] text-[var(--text-muted)]">Bị chặn</p>
        </div>
      </div>

      <div className="space-y-2">
        {users.map(u => (
          <div key={u.id} className={`flex items-center gap-3 bg-[var(--bg-elevated)] rounded-xl p-3 border ${
            u.role === 'blocked' ? 'border-[var(--error)] opacity-60' : 'border-[var(--border-subtle)]'
          }`}>
            <div className={`size-10 rounded-lg flex items-center justify-center text-sm font-semibold ${
              u.role === 'admin' ? 'bg-[rgba(251,191,36,0.2)] text-[var(--warning)]' :
              u.role === 'blocked' ? 'bg-[rgba(248,113,113,0.2)] text-[var(--error)]' :
              'bg-[var(--bg-surface)] text-[var(--text-primary)]'
            }`}>
              {u.username.slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{u.username}</p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">{u.email}</p>
              <div className="flex items-center gap-1 mt-0.5">
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                  u.role === 'admin' ? 'bg-[rgba(251,191,36,0.2)] text-[var(--warning)]' :
                  u.role === 'blocked' ? 'bg-[rgba(248,113,113,0.2)] text-[var(--error)]' :
                  'bg-[var(--bg-surface)] text-[var(--text-muted)]'
                }`}>
                  {u.role === 'admin' ? 'Admin' : u.role === 'blocked' ? 'Bị chặn' : 'User'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => { setEditingUser(u); setUsername(u.username); setRole(u.role); }}
                className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
                <Edit3 size={12} />
              </button>
              {u.id !== 'admin' && (
                <>
                  <button onClick={() => handleBlock(u.id)}
                    className={`size-8 rounded-lg flex items-center justify-center ${
                      u.role === 'blocked' ? 'bg-[rgba(52,211,153,0.2)] text-[var(--success)]' : 'bg-[rgba(248,113,113,0.2)] text-[var(--error)]'
                    }`}>
                    {u.role === 'blocked' ? <Check size={12} /> : <Ban size={12} />}
                  </button>
                  <button onClick={() => handleDelete(u.id)}
                    className="size-8 rounded-lg bg-[rgba(248,113,113,0.2)] flex items-center justify-center text-[var(--error)]">
                    <Trash2 size={12} />
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add User Modal */}
      {showAdd && (
        <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70 px-4" onClick={() => setShowAdd(false)}>
          <div className="w-full max-w-md bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl p-4 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Thêm người dùng</h3>
              <button onClick={() => setShowAdd(false)} className="size-7 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
                <X size={14} />
              </button>
            </div>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" autoFocus
              className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] mb-2 min-h-[40px]" />
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Tên"
              className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] mb-2 min-h-[40px]" />
            <select value={role} onChange={e => setRole(e.target.value as UserRole)}
              className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] mb-3 min-h-[40px]">
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
            <button onClick={handleAdd} disabled={!email.trim() || !username.trim()}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-30 min-h-[44px]">
              Thêm người dùng
            </button>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70 px-4" onClick={() => setEditingUser(null)}>
          <div className="w-full max-w-md bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl p-4 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Chỉnh sửa</h3>
              <button onClick={() => setEditingUser(null)} className="size-7 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
                <X size={14} />
              </button>
            </div>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Tên" autoFocus
              className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] mb-2 min-h-[40px]" />
            {editingUser.id !== 'admin' && (
              <select value={role} onChange={e => setRole(e.target.value as UserRole)}
                className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] mb-3 min-h-[40px]">
                <option value="user">User</option>
                <option value="admin">Admin</option>
                <option value="blocked">Bị chặn</option>
              </select>
            )}
            <button onClick={handleEdit} disabled={!username.trim()}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-30 min-h-[44px]">
              Lưu thay đổi
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
