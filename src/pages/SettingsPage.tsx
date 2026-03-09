import { useRef, useState, useEffect } from 'react';
import { useTaskStore, useAuthStore, useSettingsStore, useGamificationStore, useTemplateStore } from '@/stores';
import type { FinanceCategory } from '@/stores';
import { supabase } from '@/lib/supabase';
import { requestNotificationPermission, canSendNotification } from '@/lib/notifications';
import { exportData, importData } from '@/lib/dataUtils';
import { DEFAULT_VOICE_SETTINGS } from '@/types';
import {
  Type, Volume2, Mic, Trash2, Minus, Plus, ChevronDown,
  LogOut, User, Globe, Bell, Download, Upload, Smartphone, Sun, Moon, Shield, DollarSign, X,
} from 'lucide-react';
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
  const dailyTimeCost = useSettingsStore(s => s.dailyTimeCost);
  const setDailyTimeCost = useSettingsStore(s => s.setDailyTimeCost);
  const financeCategories = useSettingsStore(s => s.financeCategories);
  const addFinanceCategory = useSettingsStore(s => s.addFinanceCategory);
  const removeFinanceCategory = useSettingsStore(s => s.removeFinanceCategory);
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [newCat, setNewCat] = useState({ name: '', icon: '💡', type: 'expense' as FinanceCategory['type'] });

  const costPerSecond = dailyTimeCost / (24 * 3600);
  const costPerMinute = costPerSecond * 60;
  const costPerHour = costPerSecond * 3600;

  function formatMoney(amount: number) {
    return amount.toLocaleString('vi-VN') + 'đ';
  }

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

  const handleLogout = async () => {
    if (user?.id !== 'admin') await supabase.auth.signOut();
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

      {/* User Info - Always visible */}
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

      {/* Install App - Always visible if not installed */}
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

      {/* Collapsible Sections */}
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

      <Section title="Chi phí thời gian" icon={<DollarSign size={16} className="text-[var(--warning)]" />}>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-[var(--text-muted)] mb-1 block">Chi phí/ngày (cho 24h)</label>
            <input
              type="number"
              value={dailyTimeCost}
              onChange={(e) => setDailyTimeCost(Number(e.target.value))}
              className="w-full bg-[var(--bg-surface)] rounded-xl px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] font-mono min-h-[40px]"
            />
          </div>
          <div className="grid grid-cols-3 gap-2 text-center bg-[var(--bg-surface)] rounded-xl p-3 border border-[var(--border-subtle)]">
            <div>
              <p className="text-[10px] text-[var(--text-muted)]">Mỗi giờ</p>
              <p className="text-xs font-bold font-mono text-[var(--accent-primary)]">{formatMoney(costPerHour)}</p>
            </div>
            <div className="border-l border-[var(--border-subtle)]">
              <p className="text-[10px] text-[var(--text-muted)]">Mỗi phút</p>
              <p className="text-xs font-bold font-mono text-[var(--warning)]">{formatMoney(costPerMinute)}</p>
            </div>
            <div className="border-l border-[var(--border-subtle)]">
              <p className="text-[10px] text-[var(--text-muted)]">Mỗi giây</p>
              <p className="text-xs font-bold font-mono text-[var(--error)]">{formatMoney(costPerSecond)}</p>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Hạng mục Thu/Chi" icon={<DollarSign size={16} className="text-[var(--success)]" />}>
        <div className="space-y-2">
          {financeCategories.map(cat => (
            <div key={cat.id} className="flex items-center justify-between px-3 py-2 rounded-xl bg-[var(--bg-surface)]">
              <div className="flex items-center gap-2">
                <span className="text-base">{cat.icon}</span>
                <div>
                  <p className="text-xs font-medium text-[var(--text-primary)]">{cat.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{cat.type === 'income' ? 'Thu' : cat.type === 'expense' ? 'Chi' : 'Cả hai'}</p>
                </div>
              </div>
              <button onClick={() => removeFinanceCategory(cat.id)} className="size-7 rounded-lg flex items-center justify-center text-[var(--error)] hover:bg-[rgba(248,113,113,0.1)]">
                <X size={13} />
              </button>
            </div>
          ))}
          <div className="pt-1 space-y-2 border-t border-[var(--border-subtle)]">
            <p className="text-[10px] text-[var(--text-muted)] font-medium">Thêm hạng mục mới</p>
            <div className="flex gap-2">
              <input value={newCat.icon} onChange={e => setNewCat(p => ({ ...p, icon: e.target.value }))}
                className="w-12 bg-[var(--bg-surface)] rounded-xl px-2 py-2 text-center text-base outline-none border border-[var(--border-subtle)] min-h-[36px]"
                placeholder="🏷️" maxLength={2} />
              <input value={newCat.name} onChange={e => setNewCat(p => ({ ...p, name: e.target.value }))}
                className="flex-1 bg-[var(--bg-surface)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] outline-none border border-[var(--border-subtle)] min-h-[36px]"
                placeholder="Tên hạng mục..." />
            </div>
            <div className="flex gap-1.5">
              {(['income', 'expense', 'both'] as const).map(t => (
                <button key={t} onClick={() => setNewCat(p => ({ ...p, type: t }))}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium ${newCat.type === t ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)]' : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'}`}>
                  {t === 'income' ? 'Thu' : t === 'expense' ? 'Chi' : 'Cả hai'}
                </button>
              ))}
            </div>
            <button onClick={() => { if (newCat.name.trim()) { addFinanceCategory(newCat); setNewCat({ name: '', icon: '💡', type: 'expense' }); } }}
              className="w-full py-2 rounded-xl text-xs font-semibold bg-[var(--accent-primary)] text-[var(--bg-base)] min-h-[36px]">
              + Thêm
            </button>
          </div>
        </div>
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

              {/* Test Voice Button */}
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
      </Section>

      <Section title="Nguy hiểm" icon={<Trash2 size={16} className="text-[var(--error)]" />}>
        <button onClick={handleClear} className="w-full py-2.5 rounded-xl text-xs font-medium text-[var(--error)] bg-[rgba(248,113,113,0.1)] min-h-[40px] flex items-center justify-center gap-1.5">
          <Trash2 size={14} /> Xóa toàn bộ dữ liệu
        </button>
      </Section>

      {/* Admin Section - Only visible to admin */}
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
