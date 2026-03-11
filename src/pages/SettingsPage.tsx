import { useRef, useState, useEffect } from 'react';
import { useTaskStore, useAuthStore, useSettingsStore, useGamificationStore, useTemplateStore } from '@/stores';
import { supabase } from '@/lib/supabase';
import { requestNotificationPermission, canSendNotification } from '@/lib/notifications';
import { exportData, importData } from '@/lib/dataUtils';
import { DEFAULT_VOICE_SETTINGS } from '@/types';
import type { FinanceCategory, CostItem } from '@/types';
import {
  Type, Volume2, Mic, Trash2, Minus, Plus, ChevronDown,
  LogOut, User, Globe, Bell, Download, Upload, Smartphone, Sun, Moon, Shield,
  Wallet, DollarSign, Save, FolderOpen, Clock,
} from 'lucide-react';
import { manualBackup, restoreFromBackupFile, getLastBackupTime } from '@/lib/autoBackup';
import AdminPage from '@/pages/AdminPage';

const TIMEZONES = [
  { label: 'Việt Nam (GMT+7)', value: 'Asia/Ho_Chi_Minh' },
  { label: 'Nhật Bản (GMT+9)', value: 'Asia/Tokyo' },
  { label: 'Singapore (GMT+8)', value: 'Asia/Singapore' },
  { label: 'Thái Lan (GMT+7)', value: 'Asia/Bangkok' },
  { label: 'Úc (GMT+10)', value: 'Australia/Sydney' },
  { label: 'Mỹ PST (GMT-8)', value: 'America/Los_Angeles' },
  { label: 'Anh (GMT+0)', value: 'Europe/London' },
];

const PRESET_COLORS = ['#34D399', '#60A5FA', '#F87171', '#FBBF24', '#A78BFA', '#FB923C', '#F472B6', '#22D3EE'];

function getOS(): 'ios' | 'android' | 'other' {
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true;
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)}
      className={`w-10 h-6 rounded-full transition-colors relative ${value ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-surface)]'}`}>
      <div className={`size-4 rounded-full bg-white absolute top-1 transition-transform ${value ? 'translate-x-5' : 'translate-x-1'}`} />
    </button>
  );
}

function Section({ title, icon, children, defaultOpen = false }: { title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] mb-2 overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-4 py-3 text-left">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-[var(--text-primary)]">{title}</span>
        </div>
        <ChevronDown size={16} className={`text-[var(--text-muted)] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="px-4 pb-3 space-y-2">{children}</div>}
    </div>
  );
}

// ✅ #8: Finance Categories Settings
function FinanceCategoriesSection() {
  const financeCategories = useSettingsStore(s => s.financeCategories);
  const setFinanceCategories = useSettingsStore(s => s.setFinanceCategories);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'income' | 'expense'>('income');
  const [newColor, setNewColor] = useState('#34D399');

  const handleAdd = () => {
    if (!newName.trim()) return;
    const cat: FinanceCategory = {
      id: Date.now().toString(36),
      name: newName.trim(),
      type: newType,
      color: newColor,
    };
    setFinanceCategories([...financeCategories, cat]);
    setNewName('');
  };

  const handleRemove = (id: string) => {
    setFinanceCategories(financeCategories.filter(c => c.id !== id));
  };

  const incomes = financeCategories.filter(c => c.type === 'income');
  const expenses = financeCategories.filter(c => c.type === 'expense');

  return (
    <div className="space-y-3">
      <div>
        <p className="text-[10px] text-[var(--accent-primary)] font-semibold mb-1">Hạng mục Thu</p>
        <div className="space-y-1">
          {incomes.map(c => (
            <div key={c.id} className="flex items-center gap-2 bg-[var(--bg-surface)] rounded-lg px-3 py-1.5">
              <div className="size-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
              <span className="text-xs text-[var(--text-primary)] flex-1">{c.name}</span>
              <button onClick={() => handleRemove(c.id)} className="text-[var(--text-muted)] p-0.5"><Minus size={10} /></button>
            </div>
          ))}
          {incomes.length === 0 && <p className="text-[10px] text-[var(--text-muted)] pl-1">Chưa có hạng mục</p>}
        </div>
      </div>
      <div>
        <p className="text-[10px] text-[var(--error)] font-semibold mb-1">Hạng mục Chi</p>
        <div className="space-y-1">
          {expenses.map(c => (
            <div key={c.id} className="flex items-center gap-2 bg-[var(--bg-surface)] rounded-lg px-3 py-1.5">
              <div className="size-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.color }} />
              <span className="text-xs text-[var(--text-primary)] flex-1">{c.name}</span>
              <button onClick={() => handleRemove(c.id)} className="text-[var(--text-muted)] p-0.5"><Minus size={10} /></button>
            </div>
          ))}
          {expenses.length === 0 && <p className="text-[10px] text-[var(--text-muted)] pl-1">Chưa có hạng mục</p>}
        </div>
      </div>
      {/* Add new */}
      <div className="pt-2 border-t border-[var(--border-subtle)]">
        <p className="text-[10px] text-[var(--text-muted)] mb-2">Thêm hạng mục mới</p>
        <div className="flex gap-1.5 mb-1.5">
          <button onClick={() => setNewType('income')}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium min-h-[28px] ${newType === 'income' ? 'bg-[rgba(52,211,153,0.2)] text-[var(--success)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
            Thu
          </button>
          <button onClick={() => setNewType('expense')}
            className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium min-h-[28px] ${newType === 'expense' ? 'bg-[rgba(248,113,113,0.15)] text-[var(--error)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
            Chi
          </button>
        </div>
        <div className="flex gap-1 mb-1.5 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button key={c} onClick={() => setNewColor(c)}
              className={`size-5 rounded-full flex-shrink-0 ${newColor === c ? 'ring-2 ring-white ring-offset-1 ring-offset-[var(--bg-elevated)]' : ''}`}
              style={{ backgroundColor: c }} />
          ))}
        </div>
        <div className="flex gap-1.5">
          <input value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            placeholder="Tên hạng mục..."
            className="flex-1 bg-[var(--bg-surface)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] min-h-[32px]" />
          <button onClick={handleAdd} className="px-3 py-1.5 rounded-lg bg-[var(--accent-dim)] text-[var(--accent-primary)] text-xs font-medium">
            <Plus size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ✅ #9: Cost Items Settings
function CostItemsSection() {
  const costItems = useSettingsStore(s => s.costItems);
  const setCostItems = useSettingsStore(s => s.setCostItems);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newType, setNewType] = useState<'fixed' | 'variable'>('fixed');

  const totalPerMonth = costItems.reduce((s, i) => s + i.amount, 0);
  const costPerHour = totalPerMonth / (30 * 24);
  const costPerMinute = costPerHour / 60;
  const costPerSecond = costPerMinute / 60;

  const handleAdd = () => {
    const amount = parseInt(newAmount.replace(/[^\d]/g, ''));
    if (!newName.trim() || !amount) return;
    const item: CostItem = { id: Date.now().toString(36), name: newName.trim(), amount, type: newType };
    setCostItems([...costItems, item]);
    setNewName(''); setNewAmount('');
  };

  const handleRemove = (id: string) => setCostItems(costItems.filter(i => i.id !== id));

  const fmt = (n: number) => n.toLocaleString('vi-VN') + 'đ';

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-[var(--text-muted)]">
        Liệt kê tất cả chi phí hàng tháng để tính chi phí thời gian chính xác trong trang Dòng tiền.
      </p>
      {/* Summary */}
      {costItems.length > 0 && (
        <div className="bg-[var(--bg-surface)] rounded-xl p-3 text-center">
          <p className="text-xs text-[var(--text-muted)] mb-1">Tổng chi phí/tháng: <span className="font-bold text-[var(--error)]">{fmt(totalPerMonth)}</span></p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div><p className="text-xs font-bold text-[var(--warning)] font-mono">{fmt(Math.round(costPerHour))}</p><p className="text-[8px] text-[var(--text-muted)]">/giờ</p></div>
            <div><p className="text-xs font-bold text-[var(--warning)] font-mono">{fmt(Math.round(costPerMinute))}</p><p className="text-[8px] text-[var(--text-muted)]">/phút</p></div>
            <div><p className="text-xs font-bold text-[var(--warning)] font-mono">{fmt(Math.round(costPerSecond * 100) / 100)}</p><p className="text-[8px] text-[var(--text-muted)]">/giây</p></div>
          </div>
        </div>
      )}
      {/* List */}
      <div className="space-y-1 max-h-40 overflow-y-auto">
        {costItems.map(item => (
          <div key={item.id} className="flex items-center gap-2 bg-[var(--bg-surface)] rounded-lg px-3 py-1.5">
            <span className="text-[10px] text-[var(--text-muted)] w-10 flex-shrink-0">{item.type === 'fixed' ? 'Cố định' : 'Biến động'}</span>
            <span className="text-xs text-[var(--text-primary)] flex-1 truncate">{item.name}</span>
            <span className="text-xs font-bold text-[var(--error)] font-mono">{item.amount.toLocaleString('vi-VN')}đ</span>
            <button onClick={() => handleRemove(item.id)} className="text-[var(--text-muted)]"><Minus size={10} /></button>
          </div>
        ))}
        {costItems.length === 0 && <p className="text-[10px] text-[var(--text-muted)] pl-1">Chưa có chi phí nào</p>}
      </div>
      {/* Add */}
      <div className="pt-2 border-t border-[var(--border-subtle)]">
        <div className="flex gap-1.5 mb-1.5">
          {(['fixed', 'variable'] as const).map(t => (
            <button key={t} onClick={() => setNewType(t)}
              className={`flex-1 py-1.5 rounded-lg text-[10px] min-h-[28px] ${newType === t ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
              {t === 'fixed' ? 'Cố định' : 'Biến động'}
            </button>
          ))}
        </div>
        <div className="flex gap-1.5 mb-1.5">
          <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Tên chi phí (VD: Thuê nhà)"
            className="flex-1 bg-[var(--bg-surface)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] min-h-[32px]" />
        </div>
        <div className="flex gap-1.5">
          <input value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="Số tiền/tháng (VND)" inputMode="numeric"
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="flex-1 bg-[var(--bg-surface)] rounded-lg px-2 py-1.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] min-h-[32px]" />
          <button onClick={handleAdd} className="px-3 rounded-lg bg-[var(--accent-dim)] text-[var(--accent-primary)] text-xs">
            <Plus size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Backup Section ────────────────────────────────────────────────────────────
function BackupSection() {
  const user = useAuthStore(s => s.user);
  const restoreRef = useRef<HTMLInputElement>(null);
  const [restoreMsg, setRestoreMsg] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);
  const lastBackup = getLastBackupTime();

  const handleManualBackup = () => {
    if (!user) return;
    manualBackup(user.id);
  };

  const handleRestoreBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsRestoring(true);
    setRestoreMsg('');
    const result = await restoreFromBackupFile(file);
    setRestoreMsg(result.message);
    setIsRestoring(false);
    if (result.success && window.confirm(`${result.message}\n\nTải lại ứng dụng ngay?`)) {
      window.location.reload();
    }
    if (restoreRef.current) restoreRef.current.value = '';
  };

  return (
    <div className="pt-2 border-t border-[var(--border-subtle)] space-y-2">
      <p className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
        <Clock size={10} />
        Backup tự động: {lastBackup ? lastBackup.toLocaleString('vi-VN') : 'Chưa có'}
      </p>
      <div className="flex gap-2">
        <button onClick={handleManualBackup}
          className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-green-500/15 text-green-400 min-h-[40px] flex items-center justify-center gap-1.5">
          <Save size={13} /> Backup thủ công
        </button>
        <button onClick={() => restoreRef.current?.click()}
          disabled={isRestoring}
          className="flex-1 py-2.5 rounded-xl text-xs font-medium bg-[var(--bg-surface)] text-[var(--text-secondary)] min-h-[40px] flex items-center justify-center gap-1.5 disabled:opacity-50">
          <FolderOpen size={13} /> Khôi phục
        </button>
      </div>
      {restoreMsg && (
        <p className="text-[10px] text-center text-[var(--success)] bg-green-500/10 rounded-lg px-3 py-2">{restoreMsg}</p>
      )}
      <input ref={restoreRef} type="file" accept=".json" onChange={handleRestoreBackup} className="hidden" />
      <p className="text-[9px] text-[var(--text-muted)] leading-relaxed">
        Backup thủ công tải file JSON về thiết bị. Backup tự động lưu vào bộ nhớ cục bộ mỗi 3 giờ.
        Dùng nút Khôi phục để upload file JSON backup khi cần.
      </p>
    </div>
  );
}

export default function SettingsPage() {
  const clearAllData = useTaskStore(s => s.clearAllData);
  const tasks = useTaskStore(s => s.tasks);
  const templates = useTemplateStore(s => s.templates);
  const gamState = useGamificationStore(s => s.state);
  const fontScale = useSettingsStore(s => s.fontScale);
  const tickSoundEnabled = useSettingsStore(s => s.tickSoundEnabled);
  const voiceEnabled = useSettingsStore(s => s.voiceEnabled);
  const timezone = useSettingsStore(s => s.timezone);
  const notificationSettings = useSettingsStore(s => s.notificationSettings);
  const voiceSettings = useSettingsStore(s => s.voiceSettings);
  const theme = useSettingsStore(s => s.theme);
  const setFontScale = useSettingsStore(s => s.setFontScale);
  const setTickSound = useSettingsStore(s => s.setTickSound);
  const setVoiceEnabled = useSettingsStore(s => s.setVoiceEnabled);
  const setTimezone = useSettingsStore(s => s.setTimezone);
  const setNotificationSettings = useSettingsStore(s => s.setNotificationSettings);
  const setVoiceSettings = useSettingsStore(s => s.setVoiceSettings);
  const setTheme = useSettingsStore(s => s.setTheme);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAdmin, setShowAdmin] = useState(false);

  const os = getOS();
  const installed = isStandalone();
  const notifGranted = canSendNotification();

  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [newEncouragement, setNewEncouragement] = useState('');
  const testVoiceText = 'Xin chào! Đây là giọng nói thử nghiệm của Lucy.';

  useEffect(() => {
    if ('speechSynthesis' in window) {
      const loadVoices = () => {
        const voices = window.speechSynthesis.getVoices();
        setAvailableVoices(voices.filter(v => v.lang.startsWith('vi') || v.lang.startsWith('en')));
      };
      loadVoices();
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
  }, []);

  const fontSizes = [
    { label: 'Nhỏ', value: 0.85 },
    { label: 'Vừa', value: 1 },
    { label: 'Lớn', value: 1.15 },
    { label: 'Rất lớn', value: 1.3 },
  ];

  const handleClear = () => {
    if (window.confirm('Xóa toàn bộ dữ liệu?')) { clearAllData(); window.location.reload(); }
  };

  // ✅ #12: Logout clears session, forces OTP re-login
  const handleLogout = async () => {
    if (user?.id !== 'admin') {
      await supabase.auth.signOut();
    } else {
      localStorage.removeItem('nw_admin_session');
    }
    logout();
  };

  const handleExport = () => {
    exportData(tasks, templates, gamState, { fontScale, tickSoundEnabled, voiceEnabled, timezone, notificationSettings });
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await importData(file);
    if (result.error) { alert(result.error); return; }
    if (window.confirm(`Nhập ${result.tasks?.length || 0} việc, ${result.templates?.length || 0} mẫu?`)) {
      if (result.tasks) {
        const key = user?.id && user.id !== 'admin' ? `nw_tasks_${user.id}` : 'nw_tasks';
        localStorage.setItem(key, JSON.stringify(result.tasks));
      }
      if (result.templates) {
        const key = user?.id && user.id !== 'admin' ? `nw_templates_${user.id}` : 'nw_templates';
        localStorage.setItem(key, JSON.stringify(result.templates));
      }
      window.location.reload();
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddEncouragement = () => {
    if (!newEncouragement.trim()) return;
    const updated = [...(voiceSettings.encouragements || []), newEncouragement.trim()];
    setVoiceSettings({ encouragements: updated });
    setNewEncouragement('');
  };

  const handleRemoveEncouragement = (idx: number) => {
    const updated = (voiceSettings.encouragements || []).filter((_, i) => i !== idx);
    setVoiceSettings({ encouragements: updated });
  };

  return (
    <div className="flex flex-col h-full px-4 pb-24 overflow-y-auto" style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 12px))' }}>
      <h1 className="text-lg font-bold text-[var(--text-primary)] mb-4">Cài đặt</h1>

      {/* User Info */}
      <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-subtle)] mb-3">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-[var(--accent-dim)] flex items-center justify-center">
            <User size={18} className="text-[var(--accent-primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{user?.username || 'Admin'}</p>
            <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.id === 'admin' ? 'Quản trị viên' : user?.email}</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[var(--bg-surface)] text-xs text-[var(--text-muted)] min-h-[36px]">
            <LogOut size={12} /> Đăng xuất
          </button>
        </div>
      </div>

      {/* Install App */}
      {!installed && (
        <div className="bg-[var(--bg-elevated)] rounded-xl p-4 border border-[var(--border-accent)] mb-3">
          <div className="flex items-center gap-2 mb-2">
            <Smartphone size={16} className="text-[var(--accent-primary)]" />
            <span className="text-sm font-medium text-[var(--text-primary)]">Cài đặt ứng dụng</span>
          </div>
          {os === 'ios' && (
            <div className="text-xs text-[var(--text-secondary)] space-y-1">
              <p>1. Nhấn nút <strong>Chia sẻ</strong> (hình vuông có mũi tên ↑) ở thanh dưới Safari</p>
              <p>2. Cuộn xuống chọn <strong>"Thêm vào Màn hình chính"</strong></p>
              <p>3. Nhấn <strong>"Thêm"</strong> ở góc phải trên</p>
            </div>
          )}
          {os === 'android' && (
            <div className="text-xs text-[var(--text-secondary)] space-y-1">
              <p>1. Nhấn nút <strong>⋮</strong> (menu 3 chấm) ở góc phải trên Chrome</p>
              <p>2. Chọn <strong>"Thêm vào Màn hình chính"</strong> hoặc <strong>"Cài đặt ứng dụng"</strong></p>
              <p>3. Nhấn <strong>"Cài đặt"</strong></p>
            </div>
          )}
          {os === 'other' && (
            <div className="text-xs text-[var(--text-secondary)] space-y-1">
              <p>1. Mở bằng Chrome/Edge trên máy tính</p>
              <p>2. Click biểu tượng <strong>cài đặt</strong> trên thanh địa chỉ</p>
              <p>3. Chọn <strong>"Cài đặt"</strong></p>
            </div>
          )}
        </div>
      )}

      <Section title="Giao diện" icon={theme === 'dark' ? <Moon size={16} className="text-[var(--accent-primary)]" /> : <Sun size={16} className="text-[var(--accent-primary)]" />} defaultOpen={true}>
        <div className="flex gap-2">
          <button onClick={() => setTheme('dark')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-medium min-h-[40px] flex items-center justify-center gap-1.5 ${theme === 'dark' ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)] border border-[var(--border-accent)]' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'}`}>
            <Moon size={14} /> Tối
          </button>
          <button onClick={() => setTheme('light')}
            className={`flex-1 py-2.5 rounded-xl text-xs font-medium min-h-[40px] flex items-center justify-center gap-1.5 ${theme === 'light' ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)] border border-[var(--border-accent)]' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'}`}>
            <Sun size={14} /> Sáng
          </button>
        </div>
      </Section>

      <Section title="Cỡ chữ" icon={<Type size={16} className="text-[var(--accent-primary)]" />}>
        <div className="grid grid-cols-4 gap-1.5">
          {fontSizes.map(({ label, value }) => (
            <button key={value} onClick={() => setFontScale(value)}
              className={`py-2 rounded-lg text-[11px] font-medium min-h-[36px] ${fontScale === value ? 'bg-[rgba(0,229,204,0.2)] text-[var(--accent-primary)] border border-[var(--border-accent)]' : 'bg-[var(--bg-surface)] text-[var(--text-secondary)]'}`}>{label}</button>
          ))}
        </div>
        <div className="flex items-center justify-center gap-4 mt-2">
          <button onClick={() => setFontScale(Math.round((fontScale - 0.05) * 100) / 100)} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)]"><Minus size={14} /></button>
          <p className="text-[var(--text-primary)] font-medium" style={{ fontSize: `${16 * fontScale}px` }}>Xem trước</p>
          <button onClick={() => setFontScale(Math.round((fontScale + 0.05) * 100) / 100)} className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-secondary)]"><Plus size={14} /></button>
        </div>
      </Section>

      <Section title="Múi giờ" icon={<Globe size={16} className="text-[var(--accent-primary)]" />}>
        <select value={timezone} onChange={e => setTimezone(e.target.value)}
          className="w-full bg-[var(--bg-surface)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[40px]">
          {TIMEZONES.map(tz => <option key={tz.value} value={tz.value}>{tz.label}</option>)}
        </select>
      </Section>

      <Section title="Thông báo" icon={<Bell size={16} className="text-[var(--accent-primary)]" />}>
        {!notifGranted ? (
          <button onClick={async () => { const g = await requestNotificationPermission(); if (g) setNotificationSettings({ enabled: true }); }}
            className="w-full py-2.5 rounded-xl text-sm font-medium text-[var(--bg-base)] bg-[var(--accent-primary)] min-h-[40px]">
            Bật thông báo
          </button>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[var(--text-secondary)]">Nhắc deadline</span>
              <Toggle value={notificationSettings.enabled} onChange={v => setNotificationSettings({ enabled: v })} />
            </div>
            {notificationSettings.enabled && (
              <div className="flex gap-1.5">
                {[5, 15, 30, 60].map(m => (
                  <button key={m} onClick={() => setNotificationSettings({ beforeDeadline: m })}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium min-h-[30px] ${notificationSettings.beforeDeadline === m ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                    {m < 60 ? `${m}p` : '1h'}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </Section>

      {/* ✅ #8: Finance Categories */}
      <Section title="Hạng mục Thu/Chi" icon={<Wallet size={16} className="text-[var(--accent-primary)]" />}>
        <FinanceCategoriesSection />
      </Section>

      {/* ✅ #9: Cost Items */}
      <Section title="Cài đặt Chi phí" icon={<DollarSign size={16} className="text-[var(--accent-primary)]" />}>
        <CostItemsSection />
      </Section>

      <Section title="Âm thanh & Giọng nói" icon={<Volume2 size={16} className="text-[var(--accent-primary)]" />}>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]">Tiếng tik-tak</span>
            <Toggle value={tickSoundEnabled} onChange={setTickSound} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]"><Mic size={12} className="inline mr-1" />Lucy (giọng nữ)</span>
            <Toggle value={voiceEnabled} onChange={setVoiceEnabled} />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--text-secondary)]">AI trả lời bằng giọng</span>
            <Toggle value={voiceSettings.aiVoiceResponse} onChange={v => setVoiceSettings({ aiVoiceResponse: v })} />
          </div>

          {voiceEnabled && (
            <>
              {availableVoices.length > 0 && (
                <div>
                  <span className="text-[10px] text-[var(--text-muted)] block mb-1">Chọn giọng</span>
                  <select value={voiceSettings.voiceName} onChange={e => setVoiceSettings({ voiceName: e.target.value })}
                    className="w-full bg-[var(--bg-surface)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[34px]">
                    <option value="">Mặc định</option>
                    {availableVoices.map(v => <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>)}
                  </select>
                </div>
              )}
              <button onClick={() => {
                if ('speechSynthesis' in window) {
                  const utterance = new SpeechSynthesisUtterance(testVoiceText);
                  utterance.rate = voiceSettings.rate;
                  utterance.pitch = voiceSettings.pitch;
                  if (voiceSettings.voiceName) {
                    const voice = availableVoices.find(v => v.name === voiceSettings.voiceName);
                    if (voice) utterance.voice = voice;
                  }
                  window.speechSynthesis.speak(utterance);
                }
              }}
                className="w-full py-2.5 rounded-xl text-xs font-semibold bg-[var(--accent-dim)] text-[var(--accent-primary)] min-h-[40px] flex items-center justify-center gap-2">
                <Volume2 size={14} /> Nghe thử giọng nói
              </button>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-[var(--text-muted)]">Tốc độ: {voiceSettings.rate.toFixed(1)}</span>
                  <input type="range" min="0.5" max="2" step="0.1" value={voiceSettings.rate} onChange={e => setVoiceSettings({ rate: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-[var(--bg-surface)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]" />
                </div>
                <div>
                  <span className="text-[10px] text-[var(--text-muted)]">Cao độ: {voiceSettings.pitch.toFixed(1)}</span>
                  <input type="range" min="0.5" max="2" step="0.1" value={voiceSettings.pitch} onChange={e => setVoiceSettings({ pitch: parseFloat(e.target.value) })}
                    className="w-full h-1.5 bg-[var(--bg-surface)] rounded-lg appearance-none cursor-pointer accent-[var(--accent-primary)]" />
                </div>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block mb-1">Khoảng báo giờ (giây)</span>
                <div className="flex gap-1.5">
                  {[15, 30, 60, 120].map(s => (
                    <button key={s} onClick={() => setVoiceSettings({ chimeInterval: s })}
                      className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium min-h-[30px] ${voiceSettings.chimeInterval === s ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                      {s}s
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block mb-1">Câu động viên ({voiceSettings.encouragements?.length || 0})</span>
                <div className="max-h-24 overflow-y-auto space-y-1 mb-1.5">
                  {(voiceSettings.encouragements || []).map((msg, i) => (
                    <div key={i} className="flex items-center gap-1 bg-[var(--bg-surface)] rounded-lg px-2 py-1">
                      <span className="text-[10px] text-[var(--text-secondary)] flex-1 truncate">{msg}</span>
                      <button onClick={() => handleRemoveEncouragement(i)} className="text-[var(--text-muted)] flex-shrink-0"><Minus size={10} /></button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-1.5">
                  <input type="text" value={newEncouragement} onChange={e => setNewEncouragement(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddEncouragement()}
                    placeholder="Thêm câu động viên..." className="flex-1 bg-[var(--bg-surface)] rounded-lg px-2 py-1.5 text-[10px] text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] min-h-[28px]" />
                  <button onClick={handleAddEncouragement} className="px-2 py-1 rounded-lg bg-[var(--accent-dim)] text-[var(--accent-primary)] text-[10px]"><Plus size={12} /></button>
                </div>
              </div>
            </>
          )}
        </div>
      </Section>

      <Section title="Sao lưu dữ liệu" icon={<Download size={16} className="text-[var(--accent-primary)]" />}>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex-1 py-2.5 rounded-xl text-xs font-medium text-[var(--accent-primary)] bg-[var(--accent-dim)] min-h-[40px] flex items-center justify-center gap-1.5">
            <Download size={14} /> Xuất
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-2.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-surface)] min-h-[40px] flex items-center justify-center gap-1.5">
            <Upload size={14} /> Nhập
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
        <BackupSection />
      </Section>

      <Section title="Nguy hiểm" icon={<Trash2 size={16} className="text-[var(--error)]" />}>
        <button onClick={handleClear} className="w-full py-2.5 rounded-xl text-xs font-medium text-[var(--error)] bg-[rgba(248,113,113,0.1)] min-h-[40px] flex items-center justify-center gap-1.5">
          <Trash2 size={14} /> Xóa toàn bộ dữ liệu
        </button>
      </Section>

      {user?.id === 'admin' && (
        <Section title="Quản trị" icon={<Shield size={16} className="text-[var(--warning)]" />}>
          <button onClick={() => setShowAdmin(!showAdmin)}
            className="w-full py-2.5 rounded-xl text-xs font-medium text-[var(--text-primary)] bg-[var(--bg-surface)] min-h-[40px] flex items-center justify-center gap-1.5">
            <Shield size={14} /> {showAdmin ? 'Đóng Admin' : 'Mở Admin'}
          </button>
          {showAdmin && (
            <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
              <AdminPage />
            </div>
          )}
        </Section>
      )}
    </div>
  );
}
