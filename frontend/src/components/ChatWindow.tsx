import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Clock, Mic, Send, Smile } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useToast } from '../contexts/ToastContext';
import { api } from '../api/client';
import { compressImage } from '../utils/compressImage';
import Modal from './Modal';
import PersonalOrbitView from './PersonalOrbitView';
import GooeySwipe from './GooeySwipe';
import VoiceBubble from './VoiceBubble';
import FluidInput from './FluidInput';
import FluidVoiceInput from './FluidVoiceInput';

interface Sender {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
}

interface ReplyTo {
  id: string;
  content: string;
  type: string;
  sender: { id: string; username: string; nickname: string };
}

interface Message {
  id: string;
  senderId: string;
  receiverId: string | null;
  groupId: string | null;
  content: string;
  type: string;
  isRecalled: boolean;
  replyToId: string | null;
  replyTo: ReplyTo | null;
  createdAt: string;
  sender: Sender;
  readReceipts?: { userId: string; readAt: string }[];
}

interface Peer {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  digitalId: number;
  lastSeenAt: string;
  status: string;
  autoReply?: string;
  allowStrangerMessage?: boolean;
  readReceiptsEnabled?: boolean;
}

interface Props {
  peerId: string;
  peer: Peer | null;
  chatType: 'user' | 'group';
  groupName?: string;
  onBack?: () => void;
}

const ERROR_MAP: Record<string, string> = {
  blocked: '对方已将你拉黑，或你已拉黑对方',
  'stranger messages disabled': '对方未开启陌生人消息',
  '消息已发出，但被对方拒收了': '消息已发出，但被对方拒收了',
  '对方开启了好友验证，你还不是他（她）好友': '对方开启了好友验证，你还不是他（她）好友',
};

export default function ChatWindow({ peerId, peer, chatType, groupName, onBack }: Props) {
  const { user } = useAuth();
  const { socket, connected, isUserOnline } = useSocket();
  const toast = useToast();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [older, setOlder] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleContent, setScheduleContent] = useState('');
  const [chatBg, setChatBg] = useState(() => localStorage.getItem(`echo-bg-${peerId}`) || '');
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [bgUrlInput, setBgUrlInput] = useState('');
  const [recallModalOpen, setRecallModalOpen] = useState(false);
  const [recallTargetId, setRecallTargetId] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [emojis, setEmojis] = useState<{ id: string; imageUrl: string; name: string }[]>([]);
  const [showPersonalOrbit, setShowPersonalOrbit] = useState(false);
  const [menuExpanded, setMenuExpanded] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [inkDrops, setInkDrops] = useState<{ id: number; x: number }[]>([]);
  const dropCounter = useRef(0);
  const [msgContextMenu, setMsgContextMenu] = useState<{ msgId: string; x: number; y: number; isMine: boolean; createdAt: string } | null>(null);
  const msgLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCollapseRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 30s auto-collapse timer
  useEffect(() => {
    if (!menuExpanded) return;
    const reset = () => {
      if (autoCollapseRef.current) clearTimeout(autoCollapseRef.current);
      autoCollapseRef.current = setTimeout(() => setMenuExpanded(false), 10000);
    };
    reset();
    const onInteraction = () => reset();
    window.addEventListener('click', onInteraction);
    window.addEventListener('touchstart', onInteraction);
    return () => {
      window.removeEventListener('click', onInteraction);
      window.removeEventListener('touchstart', onInteraction);
      if (autoCollapseRef.current) clearTimeout(autoCollapseRef.current);
    };
  }, [menuExpanded]);

  const fetchEmojis = async () => {
    try { setEmojis(await api<any[]>('GET', '/api/emojis')); } catch { /* */ }
  };

  useEffect(() => { if (showEmoji) fetchEmojis(); }, [showEmoji]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelObserverRef = useRef<IntersectionObserver | null>(null);
  const readyRef = useRef(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const imageFileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const readReceiptKey = `echo-read-${peerId}`;
  const [readReceiptOn, setReadReceiptOn] = useState(() => {
    const global = localStorage.getItem('echo-read-receipt-global');
    const perChat = localStorage.getItem(readReceiptKey);
    if (perChat !== null) return perChat === 'true';
    if (global !== null) return global === 'true';
    return true;
  });
  const readReceiptRef = useRef(readReceiptOn);
  readReceiptRef.current = readReceiptOn;

  const toggleReadReceipt = () => {
    const next = !readReceiptOn;
    setReadReceiptOn(next);
    localStorage.setItem(readReceiptKey, String(next));
    // Sync to server
    api('PUT', '/api/users/me', { readReceiptsEnabled: next }).catch(() => {});
  };

  const sendImage = async (file: File) => {
    try {
      const compressed = await compressImage(file);
      const base = localStorage.getItem('echo-server-url') || (import.meta as any).env?.VITE_API_BASE || '';
      const token = localStorage.getItem('echo-token');
      const formData = new FormData();
      formData.append('file', compressed);
      const res = await fetch(base + '/api/upload/chat-image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (socket) {
        socket.emit('message:send', {
          ...(isGroup ? { groupId: peerId } : { receiverId: peerId }),
          content: data.url,
          type: 'image',
          replyToId: replyTo?.id || undefined,
        }, (res: any) => {
          if (res?.error) {
            toast(ERROR_MAP[res.error] || res.error, 'error');
          }
        });
      }
      setReplyTo(null);
    } catch (e: any) {
      toast(e.message || '图片上传失败', 'error');
    }
  };

  const collectAsEmoji = async (imageUrl: string) => {
    try {
      await api('POST', '/api/emojis', { imageUrl, name: '收藏' });
      toast('已收藏为表情', 'success');
    } catch (e: any) {
      toast(e.message || '收藏失败', 'error');
    }
  };

  const isGroup = chatType === 'group';

  const fetchMessages = useCallback(async (before?: string) => {
    try {
      const endpoint = isGroup
        ? `/api/messages/group?groupId=${peerId}${before ? `&before=${before}` : ''}`
        : `/api/messages?userId=${peerId}${before ? `&before=${before}` : ''}`;
      const data = await api<Message[]>('GET', endpoint);
      if (before) {
        setMessages(prev => {
          const existingIds = new Set(prev.map(m => m.id));
          return [...data.filter(m => !existingIds.has(m.id)), ...prev];
        });
        setOlder(data.length >= 50);
      } else {
        setMessages(data);
        setOlder(data.length >= 50);
        setTimeout(() => bottomRef.current?.scrollIntoView(), 100);
      }
    } catch { /* offline */ } finally {
      setLoading(false);
      readyRef.current = true;
    }
  }, [peerId, isGroup]);

  useEffect(() => {
    setMessages([]);
    setLoading(true);
    setOlder(false);
    setReplyTo(null);
    readyRef.current = false;
    fetchMessages();
    // Mark messages as read when opening chat
    if (!isGroup && peerId) {
      api('PUT', '/api/messages/read', { peerId }).catch(() => {});
    }
  }, [peerId, fetchMessages, isGroup]);

  useEffect(() => {
    if (!topSentinelRef.current) return;
    sentinelObserverRef.current?.disconnect();

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && older && readyRef.current) {
          const oldest = messages[0];
          if (oldest) fetchMessages(oldest.createdAt);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(topSentinelRef.current);
    sentinelObserverRef.current = observer;
    return () => observer.disconnect();
  }, [older, messages, fetchMessages]);

  useEffect(() => {
    const container = bottomRef.current?.parentElement;
    if (!container || !readyRef.current) return;
    const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 150;
    if (isNearBottom) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages.length]);

  // Send push notification for background messages
  const notifyNewMessage = (msg: Message, senderName: string) => {
    if (document.hidden && Notification.permission === 'granted') {
      try {
        const body = msg.type === 'image' ? '[图片]' : msg.type === 'voice' ? '[语音]' : msg.content.slice(0, 60);
        new Notification(senderName, {
          body,
          icon: '/favicon.svg',
          tag: peerId,
        });
      } catch { /* SW not registered */ }
    }
  };

  // Socket message handling
  useEffect(() => {
    if (!socket) return;

    const handleReceive = (msg: Message) => {
      let relevant = false;
      if (isGroup) {
        relevant = msg.groupId === peerId;
      } else {
        relevant = (msg.senderId === peerId && msg.receiverId === user?.id) ||
                   (msg.senderId === user?.id && msg.receiverId === peerId);
      }

      if (relevant) {
        // Skip self-sent messages already handled by optimistic update
        if (!isGroup && msg.senderId === user?.id) return;

        if (msg.senderId === peerId) {
          const senderName = getPeerName();
          notifyNewMessage(msg, senderName);
        }
        setMessages(prev => {
          if (prev.find(m => m.id === msg.id)) return prev;
          return [...prev, msg].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        });
        if (!isGroup && msg.senderId === peerId && readReceiptRef.current) {
          socket.emit('message:read', { messageId: msg.id });
        }
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      }
    };

    const handleTyping = (data: { userId: string; typing: boolean }) => {
      if (data.userId === peerId) {
        setTypingUser(data.typing ? getPeerName() : null);
      }
    };

    const handleReadUpdate = (data: { messageId: string; readBy: string; readAt: string }) => {
      setMessages(prev => prev.map(m => {
        if (m.id === data.messageId) {
          const receipts = m.readReceipts || [];
          if (receipts.some(r => r.userId === data.readBy)) return m;
          return { ...m, readReceipts: [...receipts, { userId: data.readBy, readAt: data.readAt }] };
        }
        return m;
      }));
    };

    socket.on('message:receive', handleReceive);
    if (!isGroup) {
      socket.on('typing:update', handleTyping);
      socket.on('read:update', handleReadUpdate);
    }

    return () => {
      socket.off('message:receive', handleReceive);
      socket.off('typing:update', handleTyping);
      socket.off('read:update', handleReadUpdate);
    };
  }, [socket, peerId, user?.id, isGroup]);

  const sendMessage = (e?: React.FormEvent) => {
    e?.preventDefault();
    const content = input.trim();
    if (!content || !socket) return;

    // Optimistic: add temp message immediately
    const tempId = 'temp-' + Date.now();
    const optimisticMsg: Message = {
      id: tempId,
      senderId: user!.id,
      receiverId: isGroup ? null : peerId,
      groupId: isGroup ? peerId : null,
      content,
      type: 'text',
      isRecalled: false,
      replyToId: replyTo?.id || null,
      replyTo: replyTo ? { id: replyTo.id, content: replyTo.content, type: replyTo.type, sender: replyTo.sender } : null,
      createdAt: new Date().toISOString(),
      sender: { id: user!.id, username: user!.username, nickname: user!.nickname || user!.username, avatar: user!.avatar || '' },
    };
    setMessages(prev => [...prev, optimisticMsg]);

    socket.emit('message:send', {
      ...(isGroup ? { groupId: peerId } : { receiverId: peerId }),
      content,
      type: 'text',
      replyToId: replyTo?.id || undefined,
    }, (res: any) => {
      if (res?.error) {
        toast(res.error, 'error');
        // Mark as failed
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, content: m.content + ' ❌' } : m));
      } else if (res?.ok && res.message) {
        // Replace temp with real message
        setMessages(prev => prev.map(m => m.id === tempId ? { ...res.message, sender: optimisticMsg.sender } : m));
      }
    });

    setInput('');
    setReplyTo(null);
    inputRef.current?.focus();
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleTyping = () => {
    if (!socket || isGroup) return;
    socket.emit('typing:start', { receiverId: peerId });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('typing:stop', { receiverId: peerId });
    }, 2000);
  };

  const recallMessage = async () => {
    const msgId = recallTargetId;
    setRecallModalOpen(false);
    setRecallTargetId('');
    try {
      await api('PUT', `/api/messages/${msgId}/recall`);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isRecalled: true } : m));
    } catch (e: any) { toast(e.message || '撤回失败', 'error'); }
  };

  const openRecallConfirm = (msgId: string) => {
    setRecallTargetId(msgId);
    setRecallModalOpen(true);
  };

  const getPeerName = () => {
    if (isGroup) return groupName || '群聊';
    if (!peer) return '';
    return peer.nickname || peer.username;
  };

  // Voice recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        try {
          const base = localStorage.getItem('echo-server-url') || (import.meta as any).env?.VITE_API_BASE || '';
          const token = localStorage.getItem('echo-token');
          const formData = new FormData();
          formData.append('file', blob, `voice-${Date.now()}.webm`);
          const res = await fetch(base + '/api/upload/chat-image', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error);
          if (socket) {
            socket.emit('message:send', {
              ...(isGroup ? { groupId: peerId } : { receiverId: peerId }),
              content: data.url,
              type: 'voice',
            });
          }
        } catch (e: any) {
          toast('语音发送失败', 'error');
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
      setRecordingDuration(0);
      recordTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          if (prev >= 60) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    } catch {
      toast('无法访问麦克风，请检查权限或确保在安全协议(HTTPS)下运行', 'error');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    if (recordTimerRef.current) clearInterval(recordTimerRef.current);
    setRecording(false);
    setRecordingDuration(0);
  };

  // Chat background
  const uploadBgFile = async (file: File) => {
    try {
      const base = localStorage.getItem('echo-server-url') || (import.meta as any).env?.VITE_API_BASE || '';
      const token = localStorage.getItem('echo-token');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(base + '/api/upload/background', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setChatBg(data.url);
      localStorage.setItem(`echo-bg-${peerId}`, data.url);
      setShowBgPicker(false);
      toast('背景已更新', 'success');
    } catch (e: any) { toast(e.message || '上传失败', 'error'); }
  };

  const setBgUrl = () => {
    const url = bgUrlInput.trim();
    if (!url) { setChatBg(''); localStorage.removeItem(`echo-bg-${peerId}`); }
    else { setChatBg(url); localStorage.setItem(`echo-bg-${peerId}`, url); }
    setShowBgPicker(false);
  };

  // Delayed message
  const scheduleDelayed = async () => {
    if (!scheduleContent.trim() || !scheduleTime) return;
    try {
      await api('POST', '/api/delayed', {
        ...(isGroup ? { groupId: peerId } : { receiverId: peerId }),
        content: scheduleContent.trim(),
        sendAt: new Date(scheduleTime).toISOString(),
      });
      setScheduleContent('');
      setScheduleTime('');
      setShowSchedule(false);
      toast('定时消息已设置', 'success');
    } catch (e: any) { toast(e.message || '设置失败', 'error'); }
  };

  useEffect(() => {
    setChatBg(localStorage.getItem(`echo-bg-${peerId}`) || '');
    setShowBgPicker(false);
  }, [peerId]);

  const formatMsgTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const isRead = (msg: Message) => {
    // Symmetric: both users must have receipts enabled
    if (!readReceiptOn) return false;
    if (peer?.readReceiptsEnabled === false) return false;
    return msg.readReceipts?.some(r => r.userId === peerId);
  };

  if (!peerId) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
        <p className="text-sm">搜索 Echo ID 开始聊天</p>
      </div>
    );
  }

  // Swipe gestures (mobile) — right: dismiss, left: partner's orbit
  const chatSwipeRef = useRef({ sx: 0, sy: 0 });
  const handleChatTouchStart = (e: React.TouchEvent) => {
    chatSwipeRef.current = { sx: e.touches[0].clientX, sy: e.touches[0].clientY };
  };
  const handleChatTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - chatSwipeRef.current.sx;
    const dy = Math.abs(e.changedTouches[0].clientY - chatSwipeRef.current.sy);
    if (Math.abs(dx) < 50 || Math.abs(dx) < dy) return;
    e.stopPropagation();
    if (dx > 50 && onBack) {
      onBack();
    } else if (dx < -50 && !isGroup && peer) {
      setShowPersonalOrbit(true);
    }
  };

  return (
    <div className="flex h-full flex-col bg-white dark:bg-gray-900 relative"
      onTouchStart={handleChatTouchStart}
      onTouchEnd={handleChatTouchEnd}>
      {/* Global chat background layer */}
      {chatBg && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50 z-[-1]"
          style={{ backgroundImage: `url(${chatBg})` }}
        />
      )}

      {/* Header — mobile back button, partner info, no palette */}
      <header className="flex items-center gap-3 border-b border-gray-100 px-3 py-2.5 dark:border-gray-800 relative z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shrink-0">
        {onBack && (
          <button onClick={onBack} className="rounded-xl p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 shrink-0">
            ←
          </button>
        )}
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl text-base font-bold text-white shrink-0 ${
          isGroup ? 'bg-emerald-500' : 'bg-primary-500'
        }`}>
          {isGroup ? (groupName?.[0]?.toUpperCase() || 'G') : (
            peer?.avatar ? <img src={peer.avatar} alt="" className="h-full w-full rounded-xl object-cover" /> :
            getPeerName()[0]?.toUpperCase() || '?'
          )}
        </div>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { if (!isGroup && peer) window.location.hash = `#/chat/${peer.digitalId}/settings`; }}>
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{getPeerName()}</h2>
          <p className="text-xs text-gray-400">
            {typingUser ? <span className="text-primary-500">正在输入...</span> :
             isUserOnline(peerId) ? <span className="text-green-500">在线</span> : '离线'}
            {!isGroup && peer?.autoReply && <span className="ml-2 text-amber-500">[自动回复中]</span>}
          </p>
        </div>
        {!isGroup && (
          <button onClick={toggleReadReceipt} className={`shrink-0 rounded-lg p-1.5 text-xs ${readReceiptOn ? 'text-primary-500' : 'text-gray-300'}`}
            title={readReceiptOn ? '已读回执：开' : '已读回执：关'}
          >{readReceiptOn ? '✓✓' : '✓'}</button>
        )}
      </header>

      {/* Message area */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 dark:bg-gray-950"
        style={!chatBg ? undefined : { backgroundImage: 'none' }}
      >

        <div ref={topSentinelRef} className="h-1" />
        {older && <div className="py-2 text-center"><span className="text-xs text-gray-400">加载更多消息...</span></div>}
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">加载中...</div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            <div className="text-center">
              <p className="text-4xl mb-3">💬</p>
              <p>{isGroup ? '群聊中，发送第一条消息吧' : '发送第一条消息吧'}</p>
            </div>
          </div>
        ) : (
          <div className="px-3 py-3 space-y-2 relative z-[1]">
            {messages.map((msg) => {
              const isMine = msg.senderId === user?.id;

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col msg-in ${isMine ? 'items-end mr-1' : 'items-start ml-1'}`}
                >
                  {msg.replyTo && !msg.isRecalled && (
                    <div className={`mb-1 max-w-[75%] rounded-lg bg-gray-200/60 px-3 py-1.5 text-xs text-gray-500 dark:bg-gray-800 ${isMine ? 'text-right' : ''}`}>
                      <span className="font-medium text-primary-500">{msg.replyTo.sender.nickname || msg.replyTo.sender.username}:</span>{' '}
                      {msg.replyTo.type === 'image' ? '[图片]' : msg.replyTo.content.slice(0, 30)}
                    </div>
                  )}

                  <div className={`flex items-end gap-1.5 ${isMine ? 'max-w-[80%]' : 'max-w-[80%]'}`}>
                    {/* Reply button — left side for self messages */}
                    {isMine && !msg.isRecalled && (
                      <button
                        onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                        className="hidden rounded-full bg-gray-200/80 w-6 h-6 shrink-0 items-center justify-center text-[10px] text-gray-500 hover:bg-gray-300 group-hover:inline-flex dark:bg-gray-700 dark:text-gray-400"
                      >↩</button>
                    )}

                    {!isMine && !msg.isRecalled && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-xs font-bold text-primary-500 dark:bg-primary-900/30">
                        {msg.sender.nickname?.[0] || msg.sender.username[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    {!isMine && msg.isRecalled && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-300 text-xs font-bold text-gray-500 dark:bg-gray-700">
                        ?
                      </div>
                    )}

                    <div className="min-w-0">
                      {isGroup && !isMine && !msg.isRecalled && (
                        <p className="mb-0.5 text-[10px] text-primary-400 ml-1">
                          {msg.sender.nickname || msg.sender.username}
                        </p>
                      )}

                      <div
                        className={`group relative rounded-2xl px-3.5 py-2 text-sm ${
                          msg.isRecalled
                            ? 'dm-collapse'
                            : isMine
                              ? 'bg-primary-500 text-white rounded-br-md'
                              : 'bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded-bl-md shadow-sm'
                        }`}
                        onTouchStart={(e) => {
                          if (msg.isRecalled) return;
                          msgLongPressRef.current = setTimeout(() => {
                            setMsgContextMenu({ msgId: msg.id, x: e.touches[0].clientX, y: e.touches[0].clientY, isMine, createdAt: msg.createdAt });
                          }, 500);
                        }}
                        onTouchMove={() => { if (msgLongPressRef.current) { clearTimeout(msgLongPressRef.current); msgLongPressRef.current = null; } }}
                        onTouchEnd={() => { if (msgLongPressRef.current) { clearTimeout(msgLongPressRef.current); msgLongPressRef.current = null; } }}
                      >
                        {msg.isRecalled ? (
                          <>
                            <div className="dm-collapse-inner flex items-center gap-2 text-gray-400 dark:text-gray-500 italic">
                              <span className="dm-event-horizon-glow text-xs">
                                {isMine ? '你撤回了一条消息' : '对方撤回了一条消息'}
                              </span>
                            </div>
                            <div className="dm-residual-text text-[10px] text-gray-300/30 dark:text-gray-600/30 line-through select-none mt-0.5">
                              {msg.content.slice(0, 30)}{msg.content.length > 30 ? '…' : ''}
                            </div>
                          </>
                        ) : (
                          <>
                            {msg.type === 'image' ? (
                              <div className="relative">
                                <img src={msg.content} alt="" className="max-w-48 rounded-lg" loading="lazy" />
                                <button
                                  onClick={() => collectAsEmoji(msg.content)}
                                  className="absolute -bottom-5 right-0 hidden rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-white group-hover:block hover:bg-gray-600"
                                  title="收藏为表情"
                                >
                                  ⭐收藏
                                </button>
                              </div>
                            ) : msg.type === 'voice' ? (
                              <VoiceBubble src={msg.content} />
                            ) : (
                              <span className="whitespace-pre-wrap break-words overflow-wrap-anywhere">{msg.content}</span>
                            )}

                            {isMine && !msg.isRecalled && (Date.now() - new Date(msg.createdAt).getTime() < 120000) && (
                              <button
                                onClick={() => openRecallConfirm(msg.id)}
                                className="absolute -top-6 right-0 hidden rounded bg-gray-800 px-2 py-0.5 text-[10px] text-white group-hover:block"
                              >
                                撤回
                              </button>
                            )}
                          </>
                        )}

                        <div className={`flex items-center gap-1 mt-0.5 ${isMine ? 'justify-end' : ''}`}>
                          <span className={`text-[10px] ${isMine ? (msg.isRecalled ? 'text-gray-400/50' : 'text-primary-200') : (msg.isRecalled ? 'text-gray-400/50' : 'text-gray-400')}`}>
                            {formatMsgTime(msg.createdAt)}
                          </span>
                          {isMine && !msg.isRecalled && !isGroup && isRead(msg) && (
                            <span className="text-[10px] text-primary-200">已读</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Reply button — right side for peer messages */}
                    {!isMine && !msg.isRecalled && (
                      <button
                        onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                        className="hidden rounded-full bg-gray-200/80 w-6 h-6 shrink-0 items-center justify-center text-[10px] text-gray-500 hover:bg-gray-300 group-hover:inline-flex dark:bg-gray-700 dark:text-gray-400"
                      >↩</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {replyTo && (
        <div className="flex items-center gap-2 border-t border-gray-100 bg-gray-50 px-4 py-2 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex-1 border-l-2 border-primary-400 pl-2 text-xs text-gray-500 dark:text-gray-400">
            <span className="font-medium text-primary-500">{replyTo.sender.nickname || replyTo.sender.username}:</span>{' '}
            {replyTo.type === 'image' ? '[图片]' : replyTo.content.slice(0, 40)}
          </div>
          <button onClick={() => setReplyTo(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {showSchedule && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">定时发送:</span>
            <input
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="rounded-lg border border-gray-200 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
            <input
              type="text"
              value={scheduleContent}
              onChange={(e) => setScheduleContent(e.target.value)}
              placeholder="消息内容"
              className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
            <button onClick={scheduleDelayed} className="rounded-lg bg-primary-500 px-2 py-1 text-xs text-white">确定</button>
            <button onClick={() => setShowSchedule(false)} className="rounded-lg px-2 py-1 text-xs text-gray-400">取消</button>
          </div>
        </div>
      )}

      {/* Emoji panel */}
      {showEmoji && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">表情包</span>
            <label className="cursor-pointer rounded-lg bg-primary-500 px-3 py-1 text-xs text-white hover:bg-primary-600">
              + 上传
              <input type="file" multiple accept="image/*" className="hidden" onChange={async (e) => {
                const files = e.target.files;
                if (files) {
                  for (let i = 0; i < files.length; i++) {
                    try {
                      const compressed = await compressImage(files[i]);
                      const base = localStorage.getItem('echo-server-url') || '';
                      const token = localStorage.getItem('echo-token');
                      const fd = new FormData(); fd.append('file', compressed);
                      const res = await fetch(base + '/api/upload/chat-image', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd });
                      const data = await res.json();
                      if (res.ok) {
                        await api('POST', '/api/emojis', { imageUrl: data.url, name: 'sticker' });
                        fetchEmojis();
                      }
                    } catch { /* skip */ }
                  }
                }
              }} />
            </label>
          </div>
          {emojis.length === 0 ? (
            <span className="text-xs text-gray-400">上传表情包图片...</span>
          ) : (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {emojis.map(emoji => (
                <div key={emoji.id} className="relative shrink-0 group">
                  <img
                    src={emoji.imageUrl}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => {
                      if (socket) {
                        socket.emit('message:send', {
                          ...(isGroup ? { groupId: peerId } : { receiverId: peerId }),
                          content: emoji.imageUrl, type: 'image',
                          replyToId: replyTo?.id || undefined,
                        }, (res: any) => { if (res?.error) toast(res.error, 'error'); });
                        setReplyTo(null);
                      }
                    }}
                  />
                  <button
                    onClick={async () => { await api('DELETE', `/api/emojis/${emoji.id}`); fetchEmojis(); }}
                    className="absolute -top-1 -right-1 hidden group-hover:flex h-5 w-5 rounded-full bg-red-500 text-white text-[10px] items-center justify-center"
                  >✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <motion.form layout onSubmit={sendMessage} transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="flex items-end gap-2 px-3 py-2.5 relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border-t border-white/20 dark:border-zinc-800/50 group/input"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
        {/* SVG Gooey Filter */}
        <svg xmlns="http://www.w3.org/2000/svg" style={{ display: 'none' }}>
          <defs>
            <filter id="echo-goo">
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur" />
              <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7" result="goo" />
            </filter>
          </defs>
        </svg>

        <style>{`
          .echo-orb { position: absolute; border-radius: 50%; background: #3b82f6; transition: all 0.5s cubic-bezier(0.4,0,0.2,1); opacity: 0; }
          .group\\/input:focus-within .echo-orb { opacity: 1; }
          .group\\/input:focus-within .orb-1 { transform: scale(1.5) translate(-20px, -15px); }
          .group\\/input:focus-within .orb-2 { transform: scale(1.2) translate(30px, -10px); }
          .group\\/input:focus-within .orb-3 { transform: scale(1.8) translate(10px, 15px); }
        `}</style>
        {recording ? (
          <FluidVoiceInput
            onStartRecord={startRecording}
            onStopRecord={stopRecording}
          />
        ) : (
          <>
            {/* Toggle button */}
            <button
              type="button"
              onClick={() => setMenuExpanded(!menuExpanded)}
              className={`rounded-lg p-1.5 shrink-0 transition-all duration-300 ${menuExpanded ? 'text-primary-500 rotate-90' : 'text-gray-400 rotate-0'}`}
              title={menuExpanded ? '收起' : '展开'}
            >›</button>

            {/* Left icon group — AnimatePresence smooth collapse */}
            <AnimatePresence>
              {menuExpanded && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                  className="flex items-center gap-0.5 overflow-hidden">
              <button
                type="button"
                onClick={() => imageFileInputRef.current?.click()}
                className="rounded-lg p-1.5 text-gray-400 hover:text-primary-500 transition-colors"
                title="发送图片"
              >
                <Image size={20} strokeWidth={1.5} />
              </button>
              <input
                ref={imageFileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) sendImage(f); }}
              />
              <button
                type="button"
                onClick={() => setShowSchedule(!showSchedule)}
                className={`rounded-lg p-1.5 transition-colors ${
                  showSchedule
                    ? 'text-primary-500'
                    : 'text-gray-400 hover:text-primary-500'
                }`}
                title="定时发送"
              >
                <Clock size={20} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onMouseLeave={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                className="rounded-lg p-1.5 text-gray-400 hover:text-red-400 transition-colors"
                title="按住说话"
              >
                <Mic size={20} strokeWidth={1.5} />
              </button>
              <button
                type="button"
                onClick={() => setShowEmoji(!showEmoji)}
                className={`rounded-lg p-1.5 transition-colors ${showEmoji ? 'text-primary-500' : 'text-gray-400 hover:text-primary-500'}`}
                title="表情包"
              >
                <Smile size={20} strokeWidth={1.5} />
              </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Fluid input area */}
            <div className="relative flex-1 flex items-center">
                {/* Gooey layer (z-0): background block + bubbles, filter HERE only */}
                <div className="absolute inset-0 pointer-events-none z-0" style={{ filter: 'url(#echo-goo)' }}>
                  <div className="absolute inset-0 bg-white dark:bg-zinc-800 rounded-3xl" />
                  <div className="echo-orb orb-1 w-6 h-6 left-[10%] top-1/2 -translate-y-1/2" />
                  <div className="echo-orb orb-2 w-5 h-5 left-[50%] top-1/2 -translate-y-1/2" />
                  <div className="echo-orb orb-3 w-8 h-8 right-[15%] top-1/2 -translate-y-1/2" />
                </div>
                {/* Textarea (z-10): transparent background, sits above gooey layer */}
                <textarea
                  ref={inputRef as any}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value); handleTyping();
                    const id = dropCounter.current++;
                    setInkDrops(prev => [...prev, { id, x: 20 + Math.random() * 60 }]);
                    setTimeout(() => setInkDrops(prev => prev.filter(d => d.id !== id)), 800);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                  placeholder={menuExpanded ? '输入' : '输入消息...'}
                  rows={1}
                  className="relative z-10 w-full resize-none bg-transparent px-4 py-2.5 text-sm leading-relaxed outline-none text-gray-800 dark:text-gray-100 placeholder:text-gray-400 transition-all duration-300"
                  style={{ maxHeight: '120px' }}
                  onFocus={() => { setMenuExpanded(false); setInputFocused(true); }}
                  onBlur={() => setInputFocused(false)}
                  onInput={(e) => {
                    const el = e.currentTarget;
                    el.style.height = 'auto';
                    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
                  }}
              />
              </div>

            {/* Prominent send button */}
            <button
              type="submit"
              disabled={!input.trim()}
              className="shrink-0 flex items-center gap-1.5 rounded-2xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-600 active:scale-95 disabled:opacity-30 disabled:active:scale-100 transition-all shadow-sm shadow-primary-500/25"
            >
              <Send size={16} strokeWidth={2.5} />
              <span className="text-xs">发送</span>
            </button>
          </>
        )}
      </motion.form>

      {/* Recall confirmation modal */}
      <Modal
        open={recallModalOpen}
        onClose={() => setRecallModalOpen(false)}
        title="撤回消息"
        actions={
          <>
            <button
              onClick={() => setRecallModalOpen(false)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              取消
            </button>
            <button
              onClick={recallMessage}
              className="rounded-lg bg-red-500 px-4 py-2 text-sm text-white hover:bg-red-600"
            >
              确认撤回
            </button>
          </>
        }
      >
        <p>确定要撤回这条消息吗？撤回后对方将看到"暗物质"空间塌陷效果。</p>
      </Modal>

      {/* Message context menu */}
      {msgContextMenu && (() => {
        const m = msgContextMenu;
        const within2min = (Date.now() - new Date(m.createdAt).getTime()) < 120000;
        return (
          <div className="fixed inset-0 z-[70]" onClick={() => setMsgContextMenu(null)}>
            <div className="absolute rounded-2xl border border-gray-200 bg-white/95 backdrop-blur-xl shadow-2xl py-1.5 min-w-[120px] overflow-hidden dark:border-gray-700 dark:bg-gray-800/95"
              style={{ left: Math.min(m.x - 60, window.innerWidth - 140), top: Math.min(m.y - 80, window.innerHeight - 160) }}>
              <button onClick={(e) => { e.stopPropagation(); setReplyTo(messages.find(msg => msg.id === m.msgId) || null); setMsgContextMenu(null); inputRef.current?.focus(); }}
                className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                引用
              </button>
              <button onClick={(e) => { e.stopPropagation();
                setMessages(prev => prev.filter(msg => msg.id !== m.msgId));
                setMsgContextMenu(null);
              }}
                className="flex w-full items-center px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                删除
              </button>
              {m.isMine && within2min && (
                <button onClick={(e) => { e.stopPropagation(); setRecallTargetId(m.msgId); setRecallModalOpen(true); setMsgContextMenu(null); }}
                  className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                  撤回
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Personal Orbit View — fullscreen overlay */}
      {showPersonalOrbit && peer && (
        <PersonalOrbitView
          peerId={peer.id}
          peerName={getPeerName()}
          onClose={() => setShowPersonalOrbit(false)}
        />
      )}
    </div>
  );
}
