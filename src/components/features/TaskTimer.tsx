import { useTaskStore, useSettingsStore } from '@/stores';
import { useTickSound } from '@/hooks/useTickSound';
import { useVietnameseVoice } from '@/hooks/useVietnameseVoice';
import { playChime, getEncouragement } from '@/lib/soundEffects';
import { Pause, Play, Square, Clock, Volume2, VolumeX, Mic, MicOff } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { requestWakeLock, releaseWakeLock } from '@/lib/wakeLock';
import type { ActiveTimer } from '@/types';

function SingleTimer({ timer, onPause, onResume, onStop }: {
  timer: ActiveTimer;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}) {
  const tasks = useTaskStore(s => s.tasks);
  const task = tasks.find(t => t.id === timer.taskId);

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600); const m = Math.floor((s % 3600) / 60); const sec = s % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (!task) return null;

  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 border-b last:border-b-0 ${timer.isPaused ? 'border-[var(--warning)]/30' : 'border-[var(--border-subtle)]'}`}>
      <Clock size={12} className={timer.isPaused ? 'text-[var(--warning)] flex-shrink-0' : 'text-[var(--accent-primary)] flex-shrink-0'} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-[var(--text-primary)] truncate">{task.title}</p>
        {task.duration && task.duration > 0 && (
          <p className="text-[9px] text-[var(--text-muted)] font-mono">Tổng: {formatTime(task.duration + timer.elapsed)}</p>
        )}
      </div>
      <div className={`font-mono text-sm font-bold tabular-nums flex-shrink-0 ${timer.isPaused ? 'text-[var(--warning)]' : 'text-[var(--accent-primary)] animate-timer-pulse'}`}>
        {formatTime(timer.elapsed)}
      </div>
      <div className="flex items-center gap-1 flex-shrink-0">
        <button onClick={timer.isPaused ? onResume : onPause}
          className={`size-7 rounded-lg flex items-center justify-center ${timer.isPaused ? 'bg-[rgba(0,229,204,0.2)] text-[var(--accent-primary)]' : 'bg-[rgba(251,191,36,0.2)] text-[var(--warning)]'}`}>
          {timer.isPaused ? <Play size={12} /> : <Pause size={12} />}
        </button>
        <button onClick={onStop} className="size-7 rounded-lg bg-[rgba(248,113,113,0.15)] flex items-center justify-center text-[var(--error)]">
          <Square size={11} fill="currentColor" />
        </button>
      </div>
    </div>
  );
}

export function TaskTimer() {
  const timers = useTaskStore(s => s.timers);
  const tickTimer = useTaskStore(s => s.tickTimer);
  const stopTimer = useTaskStore(s => s.stopTimer);
  const pauseTimer = useTaskStore(s => s.pauseTimer);
  const resumeTimer = useTaskStore(s => s.resumeTimer);
  const tasks = useTaskStore(s => s.tasks);
  const tickSoundEnabled = useSettingsStore(s => s.tickSoundEnabled);
  const voiceEnabled = useSettingsStore(s => s.voiceEnabled);
  const setTickSound = useSettingsStore(s => s.setTickSound);
  const setVoiceEnabled = useSettingsStore(s => s.setVoiceEnabled);
  const voiceSettings = useSettingsStore(s => s.voiceSettings);
  const { playTick } = useTickSound();
  const { speak, announceTime } = useVietnameseVoice();
  const lastAnnounced = useRef(0);
  const lastEncourage = useRef(0);
  const chimeInterval = voiceSettings.chimeInterval || 30;

  const activeTimers = timers.filter(t => t.isRunning || t.isPaused);
  const hasAnyRunning = activeTimers.some(t => t.isRunning && !t.isPaused);

  // Request wake lock to keep screen/audio alive
  useEffect(() => {
    if (hasAnyRunning) requestWakeLock();
    else releaseWakeLock();
    return () => releaseWakeLock();
  }, [hasAnyRunning]);

  // Tick all running timers
  useEffect(() => {
    if (!hasAnyRunning) return;
    const i = setInterval(() => tickTimer(), 1000);
    return () => clearInterval(i);
  }, [hasAnyRunning]);

  // Tick sound for running timers
  useEffect(() => {
    if (!hasAnyRunning || !tickSoundEnabled) return;
    const i = setInterval(() => playTick(), 1000);
    return () => clearInterval(i);
  }, [hasAnyRunning, tickSoundEnabled]);

  // Chime/voice - use first running timer for announcements
  const primaryTimer = activeTimers.find(t => t.isRunning) || activeTimers[0];
  const primaryTask = primaryTimer ? tasks.find(t => t.id === primaryTimer.taskId) : null;

  useEffect(() => {
    if (!primaryTimer || primaryTimer.isPaused || primaryTimer.elapsed === 0) return;
    const elapsed = primaryTimer.elapsed;

    if (elapsed % chimeInterval === 0 && elapsed !== lastAnnounced.current) {
      const timeSinceEncourage = elapsed - lastEncourage.current;
      if (timeSinceEncourage > 5) {
        lastAnnounced.current = elapsed;
        playChime();
        if (voiceEnabled) setTimeout(() => announceTime(elapsed), 600);
      }
    }

    const nextEncouragementInterval = 120 + Math.floor(Math.random() * 60);
    if (elapsed - lastEncourage.current >= nextEncouragementInterval) {
      const timeSinceAnnounce = elapsed - lastAnnounced.current;
      if (timeSinceAnnounce > 3 && voiceEnabled && primaryTask) {
        lastEncourage.current = elapsed;
        const encouragements = voiceSettings.encouragements?.length > 0 ? voiceSettings.encouragements : [getEncouragement()];
        const msg = encouragements[Math.floor(Math.random() * encouragements.length)];
        const taskInfo = primaryTask.deadline
          ? `Hạn chót ${new Date(primaryTask.deadline).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}.`
          : '';
        const notesInfo = primaryTask.notes ? `Lưu ý: ${primaryTask.notes.slice(0, 50)}.` : '';
        const multiInfo = activeTimers.length > 1 ? ` Đang đa nhiệm ${activeTimers.length} việc.` : '';
        setTimeout(() => speak(`Đang làm "${primaryTask.title}".${multiInfo} ${taskInfo} ${notesInfo} ${msg}`), 800);
      }
    }
  }, [primaryTimer?.elapsed, hasAnyRunning, voiceEnabled, primaryTask, chimeInterval]);

  if (activeTimers.length === 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[80] glass-strong border-b border-[var(--border-accent)]"
      style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
      {/* Global sound controls */}
      <div className="flex items-center justify-between px-3 pt-1.5 pb-0.5">
        <div className="flex items-center gap-1">
          <Clock size={12} className="text-[var(--accent-primary)]" />
          <span className="text-[10px] font-medium text-[var(--text-muted)]">
            {activeTimers.length > 1 ? `${activeTimers.length} việc đang chạy` : 'Đang bấm giờ'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const allMuted = !tickSoundEnabled && !voiceEnabled;
              if (allMuted) { setTickSound(true); setVoiceEnabled(true); }
              else { setTickSound(false); setVoiceEnabled(false); }
            }}
            title={tickSoundEnabled || voiceEnabled ? 'Tắt toàn bộ âm thanh' : 'Bật âm thanh'}
            className={`size-7 rounded-lg flex items-center justify-center transition-colors ${
              tickSoundEnabled || voiceEnabled
                ? 'bg-[rgba(59,130,246,0.2)] text-blue-500'
                : 'bg-[rgba(107,114,128,0.2)] text-gray-500'
            }`}>
            {tickSoundEnabled || voiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
          </button>
          <button
            onClick={() => setVoiceEnabled(!voiceEnabled)}
            title={voiceEnabled ? 'Tắt báo giọng nói' : 'Bật báo giọng nói'}
            className={`size-7 rounded-lg flex items-center justify-center transition-colors ${
              voiceEnabled
                ? 'bg-[rgba(34,197,94,0.2)] text-green-500'
                : 'bg-[rgba(107,114,128,0.2)] text-gray-500'
            }`}>
            {voiceEnabled ? <Mic size={13} /> : <MicOff size={13} />}
          </button>
        </div>
      </div>
      {/* Individual timers */}
      <div>
        {activeTimers.map(timer => (
          <SingleTimer
            key={timer.taskId}
            timer={timer}
            onPause={() => pauseTimer(timer.taskId)}
            onResume={() => resumeTimer(timer.taskId)}
            onStop={() => stopTimer(timer.taskId)}
          />
        ))}
      </div>
    </div>
  );
}
