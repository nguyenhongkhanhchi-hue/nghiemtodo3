import { useCallback } from 'react';
import { useSettingsStore } from '@/stores';

// Clean text: remove **, *, #, ```, and other markdown/special chars
function cleanTextForSpeech(text: string): string {
  return text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[~_|>]/g, '')
    .replace(/:::ACTION[\s\S]*?:::END/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ', ')
    .trim();
}

export function useVietnameseVoice() {
  const voiceSettings = useSettingsStore(s => s.voiceSettings);

  const speak = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return;
    const cleaned = cleanTextForSpeech(text);
    if (!cleaned) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(cleaned);
    utterance.rate = voiceSettings.rate;
    utterance.pitch = voiceSettings.pitch;

    const voices = window.speechSynthesis.getVoices();
    let voice = null;
    
    // Try user-selected voice first
    if (voiceSettings.voiceName) {
      voice = voices.find(v => v.name === voiceSettings.voiceName);
    }
    
    // Fallback: Try Vietnamese voices
    if (!voice) {
      voice = voices.find(v => v.lang.startsWith('vi') && v.name.toLowerCase().includes('female'))
        || voices.find(v => v.lang.startsWith('vi'))
        || voices.find(v => v.lang.startsWith('vi-VN'));
    }
    
    // If Vietnamese not available, use English (Windows fallback)
    if (!voice) {
      console.warn('No Vietnamese voice found, using English fallback');
      voice = voices.find(v => v.lang.startsWith('en') && v.name.toLowerCase().includes('female'))
        || voices.find(v => v.lang.startsWith('en-US'))
        || voices[0]; // Last resort: any voice
      utterance.lang = voice?.lang || 'en-US';
    } else {
      utterance.lang = 'vi-VN';
    }
    
    if (voice) utterance.voice = voice;

    window.speechSynthesis.speak(utterance);
  }, [voiceSettings.rate, voiceSettings.pitch, voiceSettings.voiceName]);

  const announceTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    let text = '';
    
    if (hours > 0) {
      text = `${hours} giờ`;
      if (mins > 0) text += ` ${mins} phút`;
    } else if (mins > 0) {
      text = `${mins} phút`;
      if (secs > 0 && mins < 5) text += ` ${secs} giây`; // Only add seconds if less than 5 mins
    } else {
      text = `${secs} giây`;
    }
    
    speak(text);
  }, [speak]);

  const announceCompletion = useCallback((taskTitle: string, seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    let timeText = '';
    
    if (hours > 0) {
      timeText = `${hours} giờ`;
      if (mins > 0) timeText += ` ${mins} phút`;
    } else if (mins > 0) {
      timeText = `${mins} phút`;
      if (secs > 0 && mins < 5) timeText += ` ${secs} giây`;
    } else {
      timeText = `${secs} giây`;
    }
    
    speak(`Tuyệt vời! Đã hoàn thành ${taskTitle} trong ${timeText}`);
  }, [speak]);

  return { speak, announceTime, announceCompletion };
}
