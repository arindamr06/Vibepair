'use client';

import React, { useState, useEffect, useRef } from 'react';
import { MultiplayerClient } from '@/lib/multiplayer';
import {
  Send,
  Flame,
  Mic,
  Square,
  Image as ImageIcon,
  Heart,
  Phone,
  Video,
  Smile,
  ShieldCheck,
  Clock,
  Eye,
  EyeOff,
  User,
} from 'lucide-react';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text?: string;
  type: 'text' | 'voice' | 'image';
  mediaUrl?: string;
  reactions: { [emoji: string]: number };
  timestamp: number;
  expiresInSeconds?: number;
  expiresAt?: number;
}

interface ChatPanelProps {
  multiplayer: MultiplayerClient;
  userName: string;
  partnerName: string;
  onStartCall: (type: 'voice' | 'video' | 'avatar') => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  multiplayer,
  userName,
  partnerName,
  onStartCall,
}) => {
  const getStorageKey = () => `vibepair_chat_history_${multiplayer.roomCode || 'global'}`;

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`vibepair_chat_history_${multiplayer.roomCode || 'global'}`) || localStorage.getItem('vibepair_chat_history');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        } catch {}
      }
    }
    return [
      {
        id: 'msg_welcome',
        senderId: 'system',
        senderName: 'VibePair E2EE',
        text: '🔒 End-to-End Encrypted Tunnel Established. Only you two have the cryptographic keys. No messages or calls are stored on any server.',
        type: 'text',
        reactions: {},
        timestamp: 1700000000000,
      },
    ];
  });

  const [input, setInput] = useState('');
  const [disappearTimer, setDisappearTimer] = useState<number>(0); // 0 = off, 10, 30, 60, 300
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [revealedImages, setRevealedImages] = useState<{ [id: string]: boolean }>({});
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const typingTimeoutRef = useRef<number | null>(null);

  // Auto-scroll on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load chat history when room changes
  useEffect(() => {
    if (!multiplayer.roomCode) return;
    const key = `vibepair_chat_history_${multiplayer.roomCode}`;
    const saved = localStorage.getItem(key);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
        }
      } catch {}
    }
  }, [multiplayer.roomCode]);

  // Sync cross-tab changes in real-time
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      const key = `vibepair_chat_history_${multiplayer.roomCode || 'global'}`;
      if (e.key === key && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setMessages(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [multiplayer.roomCode]);

  // Periodic expiration cleaner for disappearing messages
  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      setMessages(prev => {
        const remaining = prev.filter(m => !m.expiresAt || m.expiresAt > now);
        if (remaining.length !== prev.length) {
          localStorage.setItem(getStorageKey(), JSON.stringify(remaining));
          return remaining;
        }
        return prev;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [multiplayer.roomCode]);

  // Listen to incoming encrypted chat events
  useEffect(() => {
    const unsubChat = multiplayer.on('CHAT_MESSAGE', (msg: any) => {
      const newMsg = msg.data as ChatMessage;
      if (!newMsg || !newMsg.id) return;
      setMessages(prev => {
        // Prevent duplicate messages
        if (prev.some(m => m.id === newMsg.id)) return prev;
        const updated = [...prev, newMsg];
        try {
          localStorage.setItem(`vibepair_chat_history_${multiplayer.roomCode || 'global'}`, JSON.stringify(updated));
        } catch {}
        return updated;
      });
    });

    const unsubReaction = multiplayer.on('CHAT_REACTION', (msg: any) => {
      const { msgId, emoji } = msg.data as { msgId: string; emoji: string };
      setMessages(prev =>
        prev.map(m => {
          if (m.id === msgId) {
            const currentCount = m.reactions[emoji] || 0;
            return {
              ...m,
              reactions: { ...m.reactions, [emoji]: currentCount + 1 },
            };
          }
          return m;
        })
      );
    });

    const unsubTyping = multiplayer.on('TYPING_STATUS', (msg: any) => {
      const isTyping = Boolean(msg.data?.isTyping);
      setIsPartnerTyping(isTyping);
    });

    return () => {
      unsubChat();
      unsubReaction();
      unsubTyping();
    };
  }, [multiplayer]);

  const handleSendMessage = () => {
    if (!input.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      senderId: multiplayer.peerId,
      senderName: userName,
      text: input.trim(),
      type: 'text',
      reactions: {},
      timestamp: Date.now(),
      expiresInSeconds: disappearTimer > 0 ? disappearTimer : undefined,
      expiresAt: disappearTimer > 0 ? Date.now() + disappearTimer * 1000 : undefined,
    };

    setMessages(prev => {
      if (prev.some(m => m.id === newMsg.id)) return prev;
      const updated = [...prev, newMsg];
      try {
        localStorage.setItem(`vibepair_chat_history_${multiplayer.roomCode || 'global'}`, JSON.stringify(updated));
      } catch {}
      return updated;
    });

    multiplayer.send('CHAT_MESSAGE', newMsg);
    setInput('');

    // Clear typing status
    multiplayer.send('TYPING_STATUS', { isTyping: false });
  };

  const handleInputChange = (val: string) => {
    setInput(val);
    multiplayer.send('TYPING_STATUS', { isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = window.setTimeout(() => {
      multiplayer.send('TYPING_STATUS', { isTyping: false });
    }, 1500);
  };

  const handleAddReaction = (msgId: string, emoji: string) => {
    setMessages(prev =>
      prev.map(m => {
        if (m.id === msgId) {
          const count = m.reactions[emoji] || 0;
          return {
            ...m,
            reactions: { ...m.reactions, [emoji]: count + 1 },
          };
        }
        return m;
      })
    );
    multiplayer.send('CHAT_REACTION', { msgId, emoji });
  };

  // Start voice note recording
  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = e => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = () => {
          const base64Audio = reader.result as string;
          const newMsg: ChatMessage = {
            id: `msg_audio_${Date.now()}`,
            senderId: multiplayer.peerId,
            senderName: userName,
            type: 'voice',
            mediaUrl: base64Audio,
            reactions: {},
            timestamp: Date.now(),
            expiresInSeconds: disappearTimer > 0 ? disappearTimer : undefined,
            expiresAt: disappearTimer > 0 ? Date.now() + disappearTimer * 1000 : undefined,
          };
          setMessages(prev => {
            if (prev.some(m => m.id === newMsg.id)) return prev;
            const updated = [...prev, newMsg];
            try {
              localStorage.setItem(getStorageKey(), JSON.stringify(updated));
            } catch {}
            return updated;
          });
          multiplayer.send('CHAT_MESSAGE', newMsg);
        };
        stream.getTracks().forEach(t => t.stop());
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
    } catch {
      alert('Microphone permission required for voice notes.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
    }
  };

  // Photo share with privacy blur
  const handleUploadPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = ev => {
      const base64Img = ev.target?.result as string;
      const newMsg: ChatMessage = {
        id: `msg_img_${Date.now()}`,
        senderId: multiplayer.peerId,
        senderName: userName,
        type: 'image',
        mediaUrl: base64Img,
        reactions: {},
        timestamp: Date.now(),
        expiresInSeconds: disappearTimer > 0 ? disappearTimer : undefined,
        expiresAt: disappearTimer > 0 ? Date.now() + disappearTimer * 1000 : undefined,
      };
      setMessages(prev => {
        if (prev.some(m => m.id === newMsg.id)) return prev;
        const updated = [...prev, newMsg];
        try {
          localStorage.setItem(getStorageKey(), JSON.stringify(updated));
        } catch {}
        return updated;
      });
      multiplayer.send('CHAT_MESSAGE', newMsg);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-950/80 rounded-2xl overflow-hidden border border-purple-500/20 backdrop-blur-xl shadow-2xl">
      {/* Chat Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-purple-500/20 bg-slate-900/60">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center font-bold text-white shadow-md">
              {partnerName.slice(0, 1).toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-slate-950" />
          </div>

          <div>
            <div className="flex items-center gap-1.5 font-bold text-sm text-purple-100">
              <span>{partnerName}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-mono flex items-center gap-1 border border-emerald-500/30">
                <ShieldCheck className="w-2.5 h-2.5" /> E2EE
              </span>
            </div>
            <div className="text-[11px] text-pink-300/80">
              {isPartnerTyping ? (
                <span className="animate-pulse flex items-center gap-1">
                  typing sweet words<span className="animate-ping">...</span>
                </span>
              ) : (
                'Connected via Encrypted Channel'
              )}
            </div>
          </div>
        </div>

        {/* Call Triggers & Disappearing Timer */}
        <div className="flex items-center gap-2">
          {/* Disappearing Timer Selector */}
          <div className="relative group">
            <button
              className={`p-2 rounded-xl text-xs flex items-center gap-1 border transition-all ${
                disappearTimer > 0
                  ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                  : 'bg-white/5 text-purple-200/70 border-white/10 hover:text-white'
              }`}
              title="Disappearing message timer"
            >
              <Flame className={`w-4 h-4 ${disappearTimer > 0 ? 'text-amber-400 animate-pulse' : ''}`} />
              <span className="text-[10px] font-bold">
                {disappearTimer === 0 ? 'Off' : `${disappearTimer}s`}
              </span>
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-slate-900 border border-purple-500/30 rounded-xl p-1 z-30 shadow-xl min-w-[120px]">
              {[
                { s: 0, l: 'Timer Off' },
                { s: 10, l: '10 seconds 🔥' },
                { s: 30, l: '30 seconds 🔥' },
                { s: 60, l: '1 minute 🔥' },
                { s: 300, l: '5 minutes 🔥' },
              ].map(opt => (
                <button
                  key={opt.s}
                  onClick={() => setDisappearTimer(opt.s)}
                  className={`px-3 py-1.5 rounded-lg text-xs text-left transition-all ${
                    disappearTimer === opt.s ? 'bg-pink-600 text-white' : 'text-gray-300 hover:bg-white/10'
                  }`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onStartCall('voice')}
            className="p-2 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border border-purple-500/30 transition-all hover:scale-105"
            title="Start Encrypted Voice Call"
          >
            <Phone className="w-4 h-4 text-emerald-400" />
          </button>

          <button
            onClick={() => onStartCall('video')}
            className="p-2 rounded-xl bg-purple-900/40 hover:bg-purple-800/60 text-purple-200 border border-purple-500/30 transition-all hover:scale-105"
            title="Start Encrypted Video Call"
          >
            <Video className="w-4 h-4 text-pink-400" />
          </button>

          <button
            onClick={() => onStartCall('avatar')}
            className="px-2 sm:px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 text-white text-[11px] sm:text-xs font-bold shadow-md shadow-pink-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-1"
            title="Live Avatar Call"
          >
            <Smile className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Avatar</span>
          </button>
        </div>
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => {
          const isMe = msg.senderId === multiplayer.peerId;
          const isSystem = msg.senderId === 'system';

          if (isSystem) {
            return (
              <div key={msg.id} className="flex justify-center my-2">
                <div className="max-w-md px-3.5 py-2 rounded-2xl bg-purple-950/40 border border-purple-500/30 text-[11px] text-purple-200/80 text-center flex items-center gap-2">
                  <span>{msg.text}</span>
                </div>
              </div>
            );
          }

          const timeLeft = msg.expiresAt ? Math.max(0, Math.ceil((msg.expiresAt - Date.now()) / 1000)) : null;

          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}>
              <div className="flex items-end gap-1.5 max-w-[82%]">
                <div
                  className={`relative p-3.5 rounded-2xl shadow-lg ${
                    isMe
                      ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-br-none shadow-pink-500/10'
                      : 'bg-slate-900/90 border border-purple-500/25 text-purple-100 rounded-bl-none shadow-purple-950/40'
                  }`}
                >
                  {/* Sender Header */}
                  <div className="text-[10px] font-semibold text-pink-200/80 mb-1 flex items-center gap-1.5 justify-between">
                    <span>{isMe ? 'You' : msg.senderName}</span>
                    {timeLeft !== null && (
                      <span className="flex items-center gap-0.5 text-amber-300 font-mono text-[9px] bg-amber-950/60 px-1.5 py-0.5 rounded-full border border-amber-500/30">
                        <Flame className="w-2.5 h-2.5 animate-pulse" /> {timeLeft}s
                      </span>
                    )}
                  </div>

                  {/* Message Content: Text */}
                  {msg.type === 'text' && <div className="text-xs sm:text-sm leading-relaxed">{msg.text}</div>}

                  {/* Message Content: Voice Note */}
                  {msg.type === 'voice' && msg.mediaUrl && (
                    <div className="flex items-center gap-2 py-1">
                      <audio controls src={msg.mediaUrl} className="h-8 max-w-[220px] rounded-lg accent-pink-500" />
                    </div>
                  )}

                  {/* Message Content: Photo with Privacy Blur */}
                  {msg.type === 'image' && msg.mediaUrl && (
                    <div className="relative rounded-xl overflow-hidden mt-1 cursor-pointer">
                      <img
                        src={msg.mediaUrl}
                        alt="Shared memory"
                        className={`max-w-[240px] max-h-[240px] object-cover rounded-xl transition-all duration-300 ${
                          revealedImages[msg.id] ? 'blur-0' : 'blur-xl scale-105'
                        }`}
                      />
                      {!revealedImages[msg.id] && (
                        <button
                          onClick={() => setRevealedImages(p => ({ ...p, [msg.id]: true }))}
                          className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-sm text-white text-xs font-semibold gap-1"
                        >
                          <Eye className="w-4 h-4 text-pink-400" />
                          Tap to reveal private photo
                        </button>
                      )}
                    </div>
                  )}

                  {/* Reactions Display */}
                  {Object.keys(msg.reactions).length > 0 && (
                    <div className="flex items-center gap-1 mt-2 flex-wrap">
                      {Object.entries(msg.reactions).map(([emoji, count]) => (
                        <span
                          key={emoji}
                          className="px-2 py-0.5 rounded-full bg-black/40 text-[10px] text-pink-200 border border-pink-500/30 flex items-center gap-1"
                        >
                          {emoji} {count > 1 ? count : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reaction Picker on hover */}
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-black/60 backdrop-blur-md rounded-full px-2 py-1 border border-purple-500/30">
                  {['❤️', '🔥', '🥺', '💋', '✨', '🧸'].map(e => (
                    <button
                      key={e}
                      onClick={() => handleAddReaction(msg.id, e)}
                      className="hover:scale-125 transition-transform text-xs"
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>

              <span className="text-[9px] text-purple-300/40 px-2 mt-0.5">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer Bar */}
      <div className="p-3 border-t border-purple-500/20 bg-slate-900/80">
        <div className="flex items-center gap-2">
          {/* Photo attach button */}
          <label
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-purple-300 hover:text-white cursor-pointer transition-all border border-purple-500/20"
            title="Send Private Photo"
          >
            <ImageIcon className="w-4 h-4" />
            <input type="file" accept="image/*" onChange={handleUploadPhoto} className="hidden" />
          </label>

          {/* Voice Note Button */}
          <button
            onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
            className={`p-2.5 rounded-xl transition-all border ${
              isRecordingVoice
                ? 'bg-red-600 text-white animate-pulse border-red-500 shadow-md shadow-red-500/50'
                : 'bg-white/5 hover:bg-white/10 text-purple-300 hover:text-white border-purple-500/20'
            }`}
            title={isRecordingVoice ? 'Stop recording voice note' : 'Record Voice Note'}
          >
            {isRecordingVoice ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Text input */}
          <input
            type="text"
            value={input}
            onChange={e => handleInputChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
            placeholder={
              disappearTimer > 0
                ? `Disappearing message (${disappearTimer}s)...`
                : 'Type an encrypted sweet message...'
            }
            className="flex-1 bg-black/40 border border-purple-500/30 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-purple-100 placeholder-purple-400/40 focus:outline-none focus:border-pink-500 transition-colors"
          />

          {/* Send Button */}
          <button
            onClick={handleSendMessage}
            disabled={!input.trim()}
            className="p-2.5 rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:brightness-110 disabled:opacity-40 disabled:hover:brightness-100 text-white shadow-md shadow-pink-500/30 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
