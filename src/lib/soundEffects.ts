// Sound effects using Web Audio API
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

// Bell/chime sound for 30-second intervals
export function playChime() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Bell tone 1
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

  // Bell tone 2 (harmony)
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
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

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

// Task completion ding
export function playCompletionSound() {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.frequency.setValueAtTime(659.25, now);
  osc.frequency.setValueAtTime(783.99, now + 0.1);
  osc.type = 'sine';
  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc.start(now);
  osc.stop(now + 0.3);
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
  const notes = [783.99, 659.25, 523.25]; // G5, E5, C5 descending

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

// Timer encouragement messages based on context
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
