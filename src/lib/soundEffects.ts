// Game-like sound effects using Web Audio API
// These sounds create a satisfying, interactive experience

let audioCtx: AudioContext | null = null;
let isMuted = false;

export function setSoundMuted(muted: boolean) {
  isMuted = muted;
}

export function getSoundMuted(): boolean {
  return isMuted;
}

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

// ========== UI INTERACTION SOUNDS ==========

// Button/click sound - short and satisfying
export function playClickSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(800, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.05);
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    
    osc.start(now);
    osc.stop(now + 0.05);
  } catch (e) {}
}

// Success/positive feedback - like a coin collect
export function playSuccessSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // First note
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.setValueAtTime(523.25, now);
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.1, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    osc1.start(now);
    osc1.stop(now + 0.1);
    
    // Second note (higher)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.setValueAtTime(783.99, now + 0.08);
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.1, now + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    osc2.start(now + 0.08);
    osc2.stop(now + 0.2);
  } catch (e) {}
}

// Tab switch sound
export function playTabSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(600, now);
    osc.type = 'triangle';
    
    gain.gain.setValueAtTime(0.05, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
    
    osc.start(now);
    osc.stop(now + 0.08);
  } catch (e) {}
}

// ========== TASK ACTION SOUNDS ==========

// Task created - positive confirmation
export function playTaskCreatedSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const notes = [440, 554.37, 659.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, now + i * 0.06);
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.08, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.12);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.12);
    });
  } catch (e) {}
}

// Task completed - satisfying ding
export function playTaskCompleteSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    // Main ding
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.frequency.setValueAtTime(659.25, now);
    osc1.frequency.setValueAtTime(783.99, now + 0.1);
    osc1.type = 'sine';
    gain1.gain.setValueAtTime(0.15, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.start(now);
    osc1.stop(now + 0.35);
    
    // Sparkle
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.setValueAtTime(1046.50, now + 0.15);
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.06, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.4);
  } catch (e) {}
}

// Task deleted - subtle whoosh
export function playTaskDeleteSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
    
    osc.start(now);
    osc.stop(now + 0.15);
  } catch (e) {}
}

// ========== TIMER SOUNDS ==========

// Timer start
export function playTimerStartSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(880, now);
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
    
    osc.start(now);
    osc.stop(now + 0.2);
  } catch (e) {}
}

// Timer pause
export function playTimerPauseSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(440, now);
    osc.type = 'triangle';
    
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    
    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {}
}

// Timer tick (for countdown)
export function playTimerTickSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.frequency.setValueAtTime(1000, now);
    osc.type = 'sine';
    
    gain.gain.setValueAtTime(0.03, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.02);
    
    osc.start(now);
    osc.stop(now + 0.02);
  } catch (e) {}
}

// ========== EXISTING SOUNDS (kept for compatibility) ==========

// Bell/chime sound for 30-second intervals
export function playChime() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc1 = ctx.createOscillator();
  const gain1 = ctx.createGain();
  osc1.connect(gain1);
  gain1.connect(ctx.destination);
  osc1.frequency.setValueAtTime(880, now);
  osc1.type = 'sine';
  gain1.gain.setValueAtTime(0.15, now);
  gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
  osc1.start(now);
  osc1.stop(now + 0.8);

  const osc2 = ctx.createOscillator();
  const gain2 = ctx.createGain();
  osc2.connect(gain2);
  gain2.connect(ctx.destination);
  osc2.frequency.setValueAtTime(1320, now + 0.05);
  osc2.type = 'sine';
  gain2.gain.setValueAtTime(0.08, now + 0.05);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
  osc2.start(now + 0.05);
  osc2.stop(now + 0.7);
}

// Achievement unlock fanfare
export function playAchievementSound() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.50];

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(freq, now + i * 0.12);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.12, now + i * 0.12);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.4);
    osc.start(now + i * 0.12);
    osc.stop(now + i * 0.12 + 0.4);
  });
}

// Warning/alert sound
export function playWarningSound() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  for (let i = 0; i < 2; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(440, now + i * 0.25);
    osc.type = 'triangle';
    gain.gain.setValueAtTime(0.1, now + i * 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.25 + 0.2);
    osc.start(now + i * 0.25);
    osc.stop(now + i * 0.25 + 0.2);
  }
}

// Pomodoro break start sound
export function playBreakSound() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const notes = [783.99, 659.25, 523.25];

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(freq, now + i * 0.15);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.1, now + i * 0.15);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.3);
    osc.start(now + i * 0.15);
    osc.stop(now + i * 0.15 + 0.3);
  });
}

// ========== SPECIAL CELEBRATION SOUNDS ==========

// Timer finished — epic multi-note fanfare
export function playTimerFinishSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Ascending fanfare: C5 E5 G5 C6
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, now + i * 0.12);
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.18, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.5);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.5);
    });

    // Extra sparkle burst after fanfare
    const sparkleNotes = [1318.51, 1567.98, 2093.0];
    sparkleNotes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, now + 0.6 + i * 0.07);
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.08, now + 0.6 + i * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6 + i * 0.07 + 0.15);
      osc.start(now + 0.6 + i * 0.07);
      osc.stop(now + 0.6 + i * 0.07 + 0.15);
    });
  } catch (e) {}
}

// Task complete — celebratory "level up" sound
export function playTaskCelebrationSound() {
  if (isMuted) return;
  try {
    const ctx = getAudioContext();
    const now = ctx.currentTime;

    // Coin-collect style: quick ascending trio
    const notes = [659.25, 783.99, 1046.50];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(freq, now + i * 0.08);
      osc.type = 'triangle';
      gain.gain.setValueAtTime(0.15, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.25);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.25);
    });

    // Shimmer on top
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(1396.91, now + 0.28);
    osc.frequency.exponentialRampToValueAtTime(2093.0, now + 0.5);
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.07, now + 0.28);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc.start(now + 0.28);
    osc.stop(now + 0.55);
  } catch (e) {}
}

// Legacy alias
export const playCompletionSound = playTaskCompleteSound;

// Timer encouragement messages
const ENCOURAGEMENTS = [
  'Bạn đang làm rất tốt, tiếp tục nhé!',
  'Cố lên, sắp xong rồi!',
  'Tập trung là chìa khóa thành công!',
  'Mỗi phút đều đáng giá, tiếp tục nào!',
  'Bạn thật kiên trì, tuyệt vời!',
  'Đừng bỏ cuộc, bạn làm được mà!',
  'Tiến bộ mỗi ngày, giỏi lắm!',
  'Hãy tự hào về sự nỗ lực của bạn!',
];

export function getEncouragement(): string {
  return ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)];
}
