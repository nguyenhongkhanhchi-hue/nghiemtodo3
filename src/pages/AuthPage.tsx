import { useState } from 'react';
import { useAuthStore } from '@/stores';
import { supabase } from '@/lib/supabase';
import { Mail, Lock, Shield, ArrowRight, Loader2 } from 'lucide-react';

type Step = 'login' | 'otp' | 'set_password';

export default function AuthPage() {
  const setUser = useAuthStore(s => s.setUser);
  // ✅ #12: Always start with OTP flow - no password login, must re-authenticate after logout
  const [step, setStep] = useState<Step>('login');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [adminCode, setAdminCode] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);

  const handleSendOtp = async () => {
    if (!email.trim()) { setError('Nhập email'); return; }
    setLoading(true); setError('');
    try {
      const { error: e } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (e) throw e;
      setStep('otp');
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (!otp.trim()) { setError('Nhập mã OTP'); return; }
    setLoading(true); setError('');
    try {
      const { data, error: e } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
      if (e) throw e;
      if (data.user) {
        const hasPassword = data.user.user_metadata?.has_password;
        if (!hasPassword) {
          setIsNewUser(true);
          setStep('set_password');
        } else {
          // Existing user verified with OTP - log them in directly
          const u = data.user;
          setUser({ id: u.id, email: u.email!, username: u.user_metadata?.username || u.email!.split('@')[0] });
        }
      }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleSetPassword = async () => {
    if (password.length < 6) { setError('Mật khẩu tối thiểu 6 ký tự'); return; }
    setLoading(true); setError('');
    try {
      const username = email.split('@')[0];
      const { data, error: e } = await supabase.auth.updateUser({
        password,
        data: { username, has_password: true },
      });
      if (e) throw e;
      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email!, username });
      }
    } catch (e: any) { setError(e.message); }
    setLoading(false);
  };

  const handleAdminLogin = () => {
    if (adminCode === '2026Phattrien$') {
      localStorage.setItem('nw_admin_session', 'true');
      setUser({ id: 'admin', email: 'admin@nghiemwork.local', username: 'Admin' });
    } else {
      setError('Mã không đúng');
    }
  };

  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center px-6 bg-[var(--bg-base)]">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="size-16 rounded-2xl bg-[var(--accent-dim)] flex items-center justify-center border border-[var(--border-accent)] mb-3">
            <span className="text-2xl font-bold text-[var(--accent-primary)]">N</span>
          </div>
          <h1 className="text-xl font-bold text-[var(--text-primary)]">NghiemWork</h1>
          <p className="text-xs text-[var(--text-muted)] mt-1">Quản lý công việc thông minh</p>
        </div>

        {error && (
          <div className="bg-[rgba(248,113,113,0.1)] border border-[rgba(248,113,113,0.3)] rounded-xl px-4 py-2 mb-4">
            <p className="text-xs text-[var(--error)]">{error}</p>
          </div>
        )}

        {step === 'login' && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-secondary)] text-center mb-2">
              Đăng nhập bằng mã OTP gửi qua email
            </p>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Email của bạn"
                onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                className="w-full bg-[var(--bg-elevated)] rounded-xl pl-10 pr-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[48px]" />
            </div>
            <button onClick={handleSendOtp} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              Gửi mã OTP
            </button>
            <button onClick={() => setShowAdmin(!showAdmin)} className="w-full text-center text-[10px] text-[var(--text-muted)] py-2">
              {showAdmin ? 'Ẩn' : 'Admin'}
            </button>
            {showAdmin && (
              <div className="space-y-2">
                <div className="relative">
                  <Shield size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                  <input type="password" value={adminCode} onChange={e => setAdminCode(e.target.value)} placeholder="Mã admin"
                    onKeyDown={e => e.key === 'Enter' && handleAdminLogin()}
                    className="w-full bg-[var(--bg-elevated)] rounded-xl pl-10 pr-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] min-h-[48px]" />
                </div>
                <button onClick={handleAdminLogin} className="w-full py-2.5 rounded-xl text-xs font-medium text-[var(--text-secondary)] bg-[var(--bg-elevated)] min-h-[40px]">
                  Đăng nhập Admin
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'otp' && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-secondary)] text-center">
              Mã OTP đã gửi đến <strong>{email}</strong>
            </p>
            <input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="Nhập mã OTP" autoFocus
              onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()} inputMode="numeric"
              className="w-full bg-[var(--bg-elevated)] rounded-xl px-4 py-3 text-center text-lg font-mono text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[48px] tracking-widest" />
            <button onClick={handleVerifyOtp} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              Xác nhận OTP
            </button>
            <button onClick={() => { setStep('login'); setOtp(''); setError(''); }}
              className="w-full text-center text-xs text-[var(--text-muted)] py-2">← Quay lại</button>
          </div>
        )}

        {step === 'set_password' && (
          <div className="space-y-3">
            <p className="text-xs text-[var(--text-secondary)] text-center">
              {isNewUser ? 'Chào mừng! Đặt mật khẩu để bảo vệ tài khoản' : 'Đặt mật khẩu mới cho tài khoản'}
            </p>
            <div className="relative">
              <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mật khẩu (tối thiểu 6 ký tự)" autoFocus
                onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
                className="w-full bg-[var(--bg-elevated)] rounded-xl pl-10 pr-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] focus:border-[var(--accent-primary)] min-h-[48px]" />
            </div>
            <button onClick={handleSetPassword} disabled={loading}
              className="w-full py-3 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-50 min-h-[48px] flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
              Hoàn tất
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
