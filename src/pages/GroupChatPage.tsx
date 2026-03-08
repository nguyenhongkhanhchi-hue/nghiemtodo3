import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/stores';
import { supabase } from '@/lib/supabase';
import { sendChatMessage } from '@/lib/aiService';
import { Plus, Send, Hash, Users, Image as ImageIcon, FileText, X, Loader2, AtSign, Upload } from 'lucide-react';
import { logUserActivity, updateUserLastActive, getOnlineUsers } from '@/lib/userTracking';
import { useRealtimePolling } from '@/lib/realtimeSync';
import type { ChatChannel, GroupChatMessage, AppUser } from '@/types';

function genId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

export default function GroupChatPage() {
  const user = useAuthStore(s => s.user);
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [currentChannel, setCurrentChannel] = useState<ChatChannel | null>(null);
  const [messages, setMessages] = useState<GroupChatMessage[]>([]);
  const [users, setUsers] = useState<AppUser[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [channelName, setChannelName] = useState('');
  const [channelDesc, setChannelDesc] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<{ name: string; content: string }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  // Load channels
  useEffect(() => {
    const stored = localStorage.getItem('nw_chat_channels');
    if (stored) {
      const data = JSON.parse(stored);
      setChannels(data);
      if (data.length > 0) setCurrentChannel(data[0]);
    }
  }, []);

  // Load messages
  useEffect(() => {
    if (!currentChannel) return;
    const key = `nw_chat_messages_${currentChannel.id}`;
    const stored = localStorage.getItem(key);
    if (stored) setMessages(JSON.parse(stored));
    else setMessages([]);
  }, [currentChannel?.id]);

  // Real-time sync messages
  useRealtimePolling(() => {
    if (!currentChannel) return;
    const key = `nw_chat_messages_${currentChannel.id}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      const msgs = JSON.parse(stored);
      if (msgs.length !== messages.length) setMessages(msgs);
    }
  }, 3000);

  // Update last active
  useEffect(() => {
    if (user) {
      updateUserLastActive(user.id);
      const i = setInterval(() => updateUserLastActive(user.id), 30000);
      return () => clearInterval(i);
    }
  }, [user]);

  // Scroll to bottom
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  // Mock users (in real app, fetch from backend)
  useEffect(() => {
    setUsers([
      { id: user?.id || 'me', email: user?.email || '', username: user?.username || 'Me', role: 'admin', createdAt: Date.now() },
      { id: 'user2', email: 'user2@test.com', username: 'Nguyễn Văn A', role: 'user', createdAt: Date.now() },
      { id: 'user3', email: 'user3@test.com', username: 'Trần Thị B', role: 'user', createdAt: Date.now() },
    ]);
  }, [user]);

  const saveChannels = (chs: ChatChannel[]) => {
    localStorage.setItem('nw_chat_channels', JSON.stringify(chs));
    setChannels(chs);
  };

  const saveMessages = (msgs: GroupChatMessage[], channelId: string) => {
    const key = `nw_chat_messages_${channelId}`;
    localStorage.setItem(key, JSON.stringify(msgs));
    setMessages(msgs);
    // Update channel message count
    const updated = channels.map(c => c.id === channelId ? { ...c, messageCount: msgs.length } : c);
    saveChannels(updated);
  };

  const handleCreateChannel = () => {
    if (!channelName.trim()) return;
    const newChannel: ChatChannel = {
      id: genId(),
      name: channelName.trim(),
      description: channelDesc.trim() || undefined,
      createdAt: Date.now(),
      createdBy: user?.id || 'admin',
      messageCount: 0,
    };
    const updated = [...channels, newChannel];
    saveChannels(updated);
    setCurrentChannel(newChannel);
    setChannelName(''); setChannelDesc(''); setShowNewChannel(false);
  };

  const handleSend = async () => {
    if (!input.trim() || !currentChannel) return;
    const content = input.trim();
    const mentions = content.match(/@(\w+)/g)?.map(m => m.slice(1)) || [];
    const callLucy = mentions.includes('Lucy') || content.toLowerCase().includes('@lucy');

    // Log activity
    if (user) logUserActivity({ userId: user.id, username: user.username, action: 'chat_message', details: currentChannel.name });

    const msg: GroupChatMessage = {
      id: genId(),
      channelId: currentChannel.id,
      userId: user?.id || 'admin',
      username: user?.username || 'Admin',
      content,
      mentions,
      timestamp: Date.now(),
    };

    const updated = [...messages, msg];
    saveMessages(updated, currentChannel.id);
    setInput('');

    // Call Lucy AI - AUTO RESPONSE khi được @mention
    if (callLucy) {
      setLoading(true);
      try {
        const contextFromDocs = uploadedDocs.length > 0 
          ? `\n\nTài liệu tham khảo:\n${uploadedDocs.map(d => `[${d.name}]\n${d.content.slice(0, 500)}...`).join('\n\n')}`
          : '';
        const response = await sendChatMessage(content.replace(/@lucy/gi, '').trim() + contextFromDocs);
        const aiMsg: GroupChatMessage = {
          id: genId(),
          channelId: currentChannel.id,
          userId: 'lucy',
          username: 'Lucy AI',
          content: response,
          timestamp: Date.now(),
          isAI: true,
        };
        saveMessages([...updated, aiMsg], currentChannel.id);
        // Auto log Lucy activity
        logUserActivity({ userId: 'lucy', username: 'Lucy AI', action: 'chat_message', details: currentChannel.name });
      } catch (err: any) {
        const errMsg: GroupChatMessage = {
          id: genId(),
          channelId: currentChannel.id,
          userId: 'system',
          username: 'System',
          content: `❌ Lỗi: ${err.message}`,
          timestamp: Date.now(),
        };
        saveMessages([...updated, errMsg], currentChannel.id);
      }
      setLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentChannel) return;
    
    alert(`📁 Tải ảnh lên Supabase Storage (đơn giản hơn Google Drive):\n\n1. Tạo bucket 'chat-files' trong Supabase Storage\n2. Enable public access\n3. Upload trực tiếp từ client\n\nTham khảo: supabase.com/docs/guides/storage`);
    
    e.target.value = '';
  };

  const handleDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      alert('Chỉ hỗ trợ file .txt');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const content = evt.target?.result as string;
      setUploadedDocs([...uploadedDocs, { name: file.name, content }]);
      alert(`✅ Đã upload "${file.name}" - Lucy sẽ tham khảo tài liệu này khi trả lời.`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleMention = (username: string) => {
    setInput(input + `@${username} `);
    setShowMentions(false);
  };

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(mentionSearch.toLowerCase()));

  return (
    <div className="flex flex-col h-full" style={{ paddingTop: 'max(12px, env(safe-area-inset-top, 12px))' }}>
      <div className="flex items-center justify-between px-4 pb-3">
        <h1 className="text-lg font-bold text-[var(--text-primary)]">Chat nhóm</h1>
        <button onClick={() => setShowNewChannel(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[var(--accent-dim)] text-xs font-medium text-[var(--accent-primary)] min-h-[32px]">
          <Plus size={12} /> Kênh mới
        </button>
      </div>

      {/* Channels */}
      <div className="flex gap-1 px-4 pb-2 overflow-x-auto">
        {channels.map(ch => (
          <button key={ch.id} onClick={() => setCurrentChannel(ch)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 min-h-[32px] ${
              currentChannel?.id === ch.id ? 'bg-[var(--accent-dim)] text-[var(--accent-primary)] border border-[var(--border-accent)]' : 'bg-[var(--bg-elevated)] text-[var(--text-secondary)]'
            }`}>
            <Hash size={12} /> {ch.name}
            {ch.messageCount > 0 && <span className="ml-1 text-[9px] bg-[var(--bg-base)] px-1.5 py-0.5 rounded-full font-mono">{ch.messageCount}</span>}
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
        {!currentChannel ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Hash size={32} className="text-[var(--text-muted)] mb-2" />
            <p className="text-xs text-[var(--text-muted)]">Chọn hoặc tạo kênh để bắt đầu</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Users size={32} className="text-[var(--text-muted)] mb-2" />
            <p className="text-xs text-[var(--text-muted)]">Chưa có tin nhắn nào</p>
            <p className="text-[10px] text-[var(--text-muted)] mt-1">Gõ @Lucy để gọi AI trợ lý</p>
          </div>
        ) : (
          <>
            {messages.map(msg => (
              <div key={msg.id} className={`flex items-start gap-2 ${msg.isAI ? 'bg-[var(--accent-dim)] rounded-xl p-2' : ''}`}>
                <div className="size-8 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center flex-shrink-0 text-xs font-semibold"
                  style={{ color: msg.isAI ? 'var(--accent-primary)' : msg.userId === user?.id ? 'var(--info)' : 'var(--warning)' }}>
                  {msg.username.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="text-xs font-semibold text-[var(--text-primary)]">{msg.username}</span>
                    <span className="text-[9px] text-[var(--text-muted)]">{new Date(msg.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap break-words">
                    {msg.content.split(/(@\w+)/g).map((part, i) => 
                      part.startsWith('@') ? <span key={i} className="text-[var(--accent-primary)] font-semibold">{part}</span> : part
                    )}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Mentions dropdown */}
      {showMentions && (
        <div className="mx-4 mb-2 bg-[var(--bg-elevated)] rounded-xl border border-[var(--border-subtle)] max-h-32 overflow-y-auto">
          {filteredUsers.map(u => (
            <button key={u.id} onClick={() => handleMention(u.username)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--bg-surface)]">
              <div className="size-6 rounded bg-[var(--bg-surface)] flex items-center justify-center text-[10px] font-semibold text-[var(--text-primary)]">
                {u.username.slice(0, 2).toUpperCase()}
              </div>
              <span className="text-xs text-[var(--text-primary)]">{u.username}</span>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      {currentChannel && (
        <div className="px-4 pb-safe pt-2 border-t border-[var(--border-subtle)]">
          {uploadedDocs.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1">
              {uploadedDocs.map((doc, i) => (
                <div key={i} className="flex items-center gap-1 bg-[var(--bg-surface)] rounded-lg px-2 py-1 text-[10px] text-[var(--text-secondary)]">
                  <FileText size={10} /> {doc.name}
                  <button onClick={() => setUploadedDocs(uploadedDocs.filter((_, idx) => idx !== i))} className="text-[var(--text-muted)]">
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <button onClick={() => setShowMentions(!showMentions)}
              className="size-9 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)]">
              <AtSign size={16} />
            </button>
            <button onClick={() => fileInputRef.current?.click()}
              className="size-9 rounded-lg bg-[var(--bg-elevated)] flex items-center justify-center text-[var(--text-muted)]">
              <ImageIcon size={16} />
            </button>
            <button onClick={() => docInputRef.current?.click()} title="Upload tài liệu cho Lucy"
              className="size-9 rounded-lg bg-[var(--accent-dim)] flex items-center justify-center text-[var(--accent-primary)]">
              <Upload size={16} />
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" />
            <input ref={docInputRef} type="file" accept=".txt,text/plain" onChange={handleDocUpload} className="hidden" />
            
            <input type="text" value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              placeholder="Nhập tin nhắn... (@Lucy để gọi AI)"
              className="flex-1 bg-[var(--bg-elevated)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] min-h-[40px]" />
            
            <button onClick={handleSend} disabled={!input.trim() || loading}
              className="size-9 rounded-lg bg-[var(--accent-primary)] flex items-center justify-center text-[var(--bg-base)] disabled:opacity-30">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            </button>
          </div>
        </div>
      )}

      {/* New Channel Modal */}
      {showNewChannel && (
        <div className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70" onClick={() => setShowNewChannel(false)}>
          <div className="w-full max-w-md bg-[var(--bg-elevated)] rounded-t-2xl sm:rounded-2xl p-4 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Tạo kênh mới</h3>
              <button onClick={() => setShowNewChannel(false)} className="size-7 rounded-lg bg-[var(--bg-surface)] flex items-center justify-center text-[var(--text-muted)]">
                <X size={14} />
              </button>
            </div>
            <input type="text" value={channelName} onChange={e => setChannelName(e.target.value)} placeholder="Tên kênh" autoFocus
              className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] mb-2 min-h-[40px]" />
            <input type="text" value={channelDesc} onChange={e => setChannelDesc(e.target.value)} placeholder="Mô tả (tùy chọn)"
              className="w-full bg-[var(--bg-surface)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] outline-none border border-[var(--border-subtle)] mb-3 min-h-[40px]" />
            <button onClick={handleCreateChannel} disabled={!channelName.trim()}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-[var(--bg-base)] bg-[var(--accent-primary)] disabled:opacity-30 min-h-[44px]">
              Tạo kênh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
