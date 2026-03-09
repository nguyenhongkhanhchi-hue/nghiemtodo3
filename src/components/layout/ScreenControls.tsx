import { useSettingsStore } from '@/stores';
import { Sun, Lock, Unlock } from 'lucide-react';

export function ScreenControls() {
  const screenBrightness = useSettingsStore(s => s.screenBrightness);
  const lockTouch = useSettingsStore(s => s.lockTouch);
  const setScreenBrightness = useSettingsStore(s => s.setScreenBrightness);
  const setLockTouch = useSettingsStore(s => s.setLockTouch);

  return (
    <div className="fixed bottom-20 right-4 z-[45] flex flex-col gap-2 pointer-events-auto">
      {/* Brightness Control */}
      <div className="flex items-center gap-2 bg-[var(--bg-surface)] rounded-xl p-2 border border-[var(--border-subtle)] shadow-lg pointer-events-auto">
        <Sun size={16} className="text-yellow-500 flex-shrink-0 pointer-events-none" />
        <input
          type="range"
          min="10"
          max="100"
          value={screenBrightness}
          onChange={e => setScreenBrightness(parseInt(e.target.value))}
          className="w-20 h-2 rounded cursor-pointer pointer-events-auto"
          title={`Độ sáng: ${screenBrightness}%`}
        />
        <span className="text-xs font-medium text-[var(--text-muted)] w-8 text-right pointer-events-none">
          {screenBrightness}%
        </span>
      </div>

      {/* Touch Lock Control */}
      <button
        onClick={() => setLockTouch(!lockTouch)}
        title={lockTouch ? 'Mở khóa cảm ứng' : 'Khóa cảm ứng'}
        className={`flex items-center justify-center gap-2 px-3 py-2 rounded-xl font-medium text-sm transition-colors pointer-events-auto ${
          lockTouch
            ? 'bg-red-500/20 text-red-500 border border-red-500/50'
            : 'bg-[var(--bg-surface)] text-[var(--text-muted)] border border-[var(--border-subtle)] hover:border-[var(--text-muted)]'
        }`}>
        {lockTouch ? <Lock size={16} /> : <Unlock size={16} />}
        <span>{lockTouch ? 'Khóa' : 'Mở'}</span>
      </button>
    </div>
  );
}
