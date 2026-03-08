// Real-time sync via polling mechanism (Supabase Realtime không hỗ trợ)

import { useEffect, useRef } from 'react';

export function useRealtimePolling(callback: () => void, intervalMs = 5000) {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    const tick = () => savedCallback.current();
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
}

export function syncChatMessages(channelId: string): void {
  const key = `nw_chat_messages_${channelId}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    // Trigger update event
    window.dispatchEvent(new CustomEvent('chat_sync', { detail: { channelId, messages: JSON.parse(stored) } }));
  }
}

export function syncTasksUpdate(): void {
  window.dispatchEvent(new CustomEvent('tasks_sync'));
}
