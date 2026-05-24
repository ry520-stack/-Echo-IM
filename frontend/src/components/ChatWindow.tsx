import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Image, Clock, Send, Smile, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useToast } from '../contexts/ToastContext';
import { api, getServerUrl } from '../api/client';
import { compressImage, compressEmoji } from '../utils/compressImage';
import { is5Plus } from '../utils/env';
import { useBackground } from '../hooks/useBackground';
import Modal from './Modal';
import PersonalOrbitView from './PersonalOrbitView';
import GroupOrbitView from './GroupOrbitView';
import GooeySwipe from './GooeySwipe';
import VoiceBubble from './VoiceBubble';
import FluidInput from './FluidInput';
import { Phone } from 'lucide-react';
import { useCall } from '../contexts/CallContext';
import { assetUrl } from '../utils/assetUrl';
import { useAudioRecorder } from '../hooks/useAudioRecorder';

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
  groupAvatar?: string;
  onBack?: () => void;
  initialOrbit?: boolean;
}

const ERROR_MAP: Record<string, string> = {
  blocked: '对方已将你拉黑，或你已拉黑对方',
  'stranger messages disabled': '对方未开启陌生人消息',
  '消息已发出，但被对方拒收了': '消息已发出，但被对方拒收了',
  '对方开启了好友验证，你还不是他（她）好友': '对方开启了好友验证，你还不是他（她）好友',
};

export default function ChatWindow({ peerId, peer, chatType, groupName, groupAvatar, onBack, initialOrbit = false }: Props) {
  const { user } = useAuth();
  const { socket, connected, isUserOnline } = useSocket();
  const toast = useToast();
  const isGroup = chatType === 'group';
  const { getBg, getChatBg, setChatBg: saveChatBg, uploadAndGetUrl } = useBackground();
  const { startCall } = useCall();
  const { startRecord, stopRecord, isRecording: recorderActive } = useAudioRecorder();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [older, setOlder] = useState(false);
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [typingUser, setTypingUser] = useState<string | null>(null);
  const [recording, setRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  type ActivePanel = null | 'emoji' | 'schedule' | 'more';
  const [activePanel, setActivePanel] = useState<ActivePanel>(null);
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleContent, setScheduleContent] = useState('');
  const realPeerId = peer?.id || peerId;
  const [chatBg, setChatBg] = useState(() => getChatBg(realPeerId));
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [bgUrlInput, setBgUrlInput] = useState('');
  const [emojis, setEmojis] = useState<{ id: string; imageUrl: string; name: string }[]>([]);
  const [emojiManageMode, setEmojiManageMode] = useState(false);
  const [emojiExpanded, setEmojiExpanded] = useState(false);
  const [emojiPage, setEmojiPage] = useState(0);
  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const [selectedEmojis, setSelectedEmojis] = useState<Set<string>>(new Set());
  const emojisCachedRef = useRef(false);
  const [showPersonalOrbit, setShowPersonalOrbit] = useState(false);
  const [showGroupOrbit, setShowGroupOrbit] = useState(false);
  const [inkDrops, setInkDrops] = useState<{ id: number; x: number }[]>([]);
  const dropCounter = useRef(0);
  const [msgContextMenu, setMsgContextMenu] = useState<{ msgId: string; x: number; y: number; isMine: boolean; createdAt: string; type?: string; content?: string } | null>(null);
  const msgLongPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoCollapseRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emojiSwipeRef = useRef({ sx: 0, sy: 0 });

  // 10s auto-collapse timer
  useEffect(() => {
    if (!activePanel) return;
    if (activePanel === 'emoji') return;
    const reset = () => {
      if (autoCollapseRef.current) clearTimeout(autoCollapseRef.current);
      autoCollapseRef.current = setTimeout(() => setActivePanel(null), 10000);
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
  }, [activePanel]);

  const fetchEmojis = async (force = false) => {
    if (!force && emojisCachedRef.current && emojis.length > 0) return;
    try {
      setEmojis(await api<any[]>('GET', '/api/emojis'));
      emojisCachedRef.current = true;
    } catch { /* */ }
  };

  useEffect(() => { if (activePanel === 'emoji') fetchEmojis(); }, [activePanel]);
  useEffect(() => { fetchEmojis(); }, [peerId]);

  const emojiPageSize = emojiExpanded ? 12 : 4;
  const emojiMaxPage = Math.max(0, Math.ceil(emojis.length / emojiPageSize) - 1);
  const visibleEmojis = emojis.slice(emojiPage * emojiPageSize, emojiPage * emojiPageSize + emojiPageSize);

  useEffect(() => {
    setEmojiPage(page => Math.min(page, emojiMaxPage));
  }, [emojiMaxPage]);

  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sentinelObserverRef = useRef<IntersectionObserver | null>(null);
  const readyRef = useRef(false);
  const recordTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bgFileInputRef = useRef<HTMLInputElement>(null);
  const albumFileInputRef = useRef<HTMLInputElement>(null);
  const shootPhotoRef = useRef<HTMLInputElement>(null);
  const shootVideoRef = useRef<HTMLInputElement>(null);
  const [showShootMenu, setShowShootMenu] = useState(false);
  const [emojiPreview, setEmojiPreview] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [groupAliases, setGroupAliases] = useState<Record<string, string>>({});

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

  useEffect(() => {
    if (!initialOrbit || chatType === 'group' || !peer) return;
    setShowPersonalOrbit(true);
  }, [initialOrbit, chatType, peer]);

  useEffect(() => {
    if (!isGroup || !peerId) {
      setGroupAliases({});
      return;
    }
    api<any>('GET', `/api/groups/${peerId}`).then(group => {
      const aliases: Record<string, string> = {};
      (group.members || []).forEach((member: any) => {
        aliases[member.userId] = member.alias || member.user?.nickname || member.user?.username || '';
      });
      setGroupAliases(aliases);
    }).catch(() => setGroupAliases({}));
  }, [isGroup, peerId]);

  useEffect(() => {
    if (chatType !== 'group' && peerId) {
      const ids = [peerId, peer?.digitalId ? String(peer.digitalId) : ''].filter(Boolean);
      localStorage.setItem('echo-active-chat-peer', ids.join(','));
    }
    return () => {
      const activeIds = (localStorage.getItem('echo-active-chat-peer') || '').split(',');
      if (activeIds.includes(peerId) || (peer?.digitalId && activeIds.includes(String(peer.digitalId)))) {
        localStorage.removeItem('echo-active-chat-peer');
      }
    };
  }, [chatType, peerId, peer?.digitalId]);

  const toggleReadReceipt = () => {
    const next = !readReceiptOn;
    setReadReceiptOn(next);
    localStorage.setItem(readReceiptKey, String(next));
  };

  const closePanels = () => {
    setActivePanel(null);
    setShowShootMenu(false);
  };

  // 5+ 拍照
  const capturePhoto5Plus = () => {
    const plus = (window as any).plus;
    const camera = plus.camera.getCamera();
    camera.captureImage(
      (path: string) => {
        plus.io.resolveLocalFileSystemURL(path, (entry: any) => {
          entry.file((file: any) => {
            const reader = new FileReader();
            reader.onload = () => {
              const blob = new Blob([reader.result as ArrayBuffer], { type: file.type || 'image/jpeg' });
              const f = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
              sendImage(f);
            };
            reader.onerror = () => toast('读取照片失败', 'error');
            reader.readAsArrayBuffer(file);
          });
        }, () => toast('照片文件不存在', 'error'));
      },
      (e: any) => {
        if (e.code !== 12) toast('无法打开相机，请检查权限', 'error');
      },
      { filename: '_doc/camera/', format: 'jpg' }
    );
  };

  // 5+ 拍视频
  const captureVideo5Plus = () => {
    const plus = (window as any).plus;
    const camera = plus.camera.getCamera();
    camera.startVideoCapture(
      (path: string) => {
        plus.io.resolveLocalFileSystemURL(path, (entry: any) => {
          entry.file((file: any) => {
            const reader = new FileReader();
            reader.onload = () => {
              const blob = new Blob([reader.result as ArrayBuffer], { type: file.type || 'video/mp4' });
              const f = new File([blob], `video_${Date.now()}.mp4`, { type: 'video/mp4' });
              sendVideo(f);
            };
            reader.onerror = () => toast('读取视频失败', 'error');
            reader.readAsArrayBuffer(file);
          });
        }, () => toast('视频文件不存在', 'error'));
      },
      (e: any) => {
        if (e.code !== 12) toast('无法打开相机，请检查权限', 'error');
      },
      { filename: '_doc/camera/' }
    );
  };

  const sendImage = async (file: File) => {
    if (file.size > 10 * 1024 * 1024) { toast('图片不能超过 10MB', 'error'); return; }
    const tempId = 'temp-img-' + Date.now();
    const localUrl = URL.createObjectURL(file);
    const optimisticMsg: Message | null = socket && user ? {
      id: tempId,
      senderId: user.id,
      receiverId: isGroup ? null : peerId,
      groupId: isGroup ? peerId : null,
      content: localUrl,
      type: 'image',
      isRecalled: false,
      replyToId: replyTo?.id || null,
      replyTo: replyTo ? { id: replyTo.id, content: replyTo.content, type: replyTo.type, sender: replyTo.sender } : null,
      createdAt: new Date().toISOString(),
      sender: { id: user.id, username: user.username, nickname: user.nickname || user.username, avatar: user.avatar || '' },
    } : null;
    if (optimisticMsg) {
      setMessages(prev => [...prev, optimisticMsg]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
    try {
      const uploadFile = await compressImage(file);
      const base = getServerUrl();
      const token = localStorage.getItem('echo-token');
      const formData = new FormData();
      formData.append('file', uploadFile);
      const res = await fetch(base + '/api/upload/chat-image', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (socket && optimisticMsg) {
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, content: data.url } : m));
        socket.emit('message:send', {
          ...(isGroup ? { groupId: peerId } : { receiverId: peerId }),
          content: data.url,
          type: 'image',
          replyToId: replyTo?.id || undefined,
        }, (res: any) => {
          URL.revokeObjectURL(localUrl);
          if (res?.error) {
            toast(ERROR_MAP[res.error] || res.error, 'error');
            setMessages(prev => prev.filter(m => m.id !== tempId));
          } else if (res?.ok && res.message) {
            setMessages(prev => prev.map(m => m.id === tempId ? { ...res.message, sender: optimisticMsg.sender } : m));
          }
        });
      }
      setReplyTo(null);
    } catch (e: any) {
      if (e.message?.includes('已加入同步队列')) {
        toast('已开启离线模式，网络恢复后自动发送', 'info');
      } else {
        toast(e.message || '图片上传失败', 'error');
        URL.revokeObjectURL(localUrl);
        setMessages(prev => prev.filter(m => m.id !== tempId));
      }
    }
  };

  // 5+ App: 调用原生相册选择图片或视频
  const pickMedia5Plus = () => {
    const plus = (window as any).plus;
    plus.gallery.pick((path: string) => {
      plus.io.resolveLocalFileSystemURL(path, (entry: any) => {
        entry.file((file: any) => {
          const reader = new FileReader();
          reader.onload = () => {
            const mime = file.type || 'image/jpeg';
            const blob = new Blob([reader.result as ArrayBuffer], { type: mime });
            const f = new File([blob], file.name || `media_${Date.now()}`, { type: mime });
            if (mime.startsWith('video/')) sendVideo(f);
            else sendImage(f);
          };
          reader.readAsArrayBuffer(file);
        });
      });
    }, (e: any) => {
      if (e.code !== 12) toast('选择文件失败', 'error');
    });
  };

  // 5+ App: 上传录音文件（从 plus.io 路径读取）
  const collectAsEmoji = async (imageUrl: string) => {
    try {
      await api('POST', '/api/emojis', { imageUrl, name: '收藏' });
      toast('已收藏为表情', 'success');
    } catch (e: any) {
      toast(e.message || '收藏失败', 'error');
    }
  };

  const sendVideo = async (file: File) => {
    if (file.size > 50 * 1024 * 1024) { toast('视频不能超过 50MB', 'error'); return; }
    const tempId = 'temp-vid-' + Date.now();
    try {
      const base = getServerUrl();
      const token = localStorage.getItem('echo-token');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(base + '/api/upload/video', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      if (socket) {
        const optimisticMsg: Message = {
          id: tempId,
          senderId: user!.id,
          receiverId: isGroup ? null : peerId,
          groupId: isGroup ? peerId : null,
          content: data.url,
          type: 'video',
          isRecalled: false,
          replyToId: replyTo?.id || null,
          replyTo: replyTo ? { id: replyTo.id, content: replyTo.content, type: replyTo.type, sender: replyTo.sender } : null,
          createdAt: new Date().toISOString(),
          sender: { id: user!.id, username: user!.username, nickname: user!.nickname || user!.username, avatar: user!.avatar || '' },
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

        socket.emit('message:send', {
          ...(isGroup ? { groupId: peerId } : { receiverId: peerId }),
          content: data.url,
          type: 'video',
          replyToId: replyTo?.id || undefined,
        }, (res: any) => {
          if (res?.error) {
            toast(ERROR_MAP[res.error] || res.error, 'error');
            setMessages(prev => prev.filter(m => m.id !== tempId));
          } else if (res?.ok && res.message) {
            setMessages(prev => prev.map(m => m.id === tempId ? { ...res.message, sender: optimisticMsg.sender } : m));
          }
        });
      }
      setReplyTo(null);
    } catch (e: any) {
      toast(e.message || '视频上传失败', 'error');
      setMessages(prev => prev.filter(m => m.id !== tempId));
    }
  };

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
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            bottomRef.current?.scrollIntoView();
          });
        });
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

  useEffect(() => {
    const keepLatestVisible = () => {
      window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 80);
      window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' }), 260);
    };
    window.visualViewport?.addEventListener('resize', keepLatestVisible);
    return () => window.visualViewport?.removeEventListener('resize', keepLatestVisible);
  }, []);


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
        setMessages(prev => {
          // ID 去重
          if (prev.find(m => m.id === msg.id)) return prev;
          // 乐观更新回显去重：自己发的消息，内容+类型相同，2秒内视为重复
          if (msg.senderId === user?.id) {
            const isEcho = prev.some(m =>
              m.senderId === user?.id &&
              m.content === msg.content &&
              m.type === msg.type &&
              Math.abs(new Date(m.createdAt).getTime() - new Date(msg.createdAt).getTime()) < 2000
            );
            if (isEcho) {
              // 用真实消息替换临时消息
              return prev.map(m =>
                m.senderId === user?.id && m.content === msg.content && m.type === msg.type && m.id.startsWith('temp-')
                  ? { ...msg, sender: m.sender }
                  : m
              );
            }
          }
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

    const handleReadUpdateBatch = (data: { messageIds: string[]; readBy: string; readAt: string }) => {
      const idSet = new Set(data.messageIds);
      setMessages(prev => prev.map(m => {
        if (idSet.has(m.id)) {
          const receipts = m.readReceipts || [];
          if (receipts.some(r => r.userId === data.readBy)) return m;
          return { ...m, readReceipts: [...receipts, { userId: data.readBy, readAt: data.readAt }] };
        }
        return m;
      }));
    };

    // 撤回广播监听
    const handleRecalled = (data: { messageId: string }) => {
      setMessages(prev => prev.map(m => m.id === data.messageId ? { ...m, isRecalled: true } : m));
    };

    socket.on('message:receive', handleReceive);
    socket.on('message:recalled', handleRecalled);
    if (!isGroup) {
      socket.on('typing:update', handleTyping);
      socket.on('read:update', handleReadUpdate);
      socket.on('read:update_batch', handleReadUpdateBatch);
    }

    return () => {
      socket.off('message:receive', handleReceive);
      socket.off('message:recalled', handleRecalled);
      socket.off('typing:update', handleTyping);
      socket.off('read:update', handleReadUpdate);
      socket.off('read:update_batch', handleReadUpdateBatch);
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

  const recallMessage = async (msgId: string) => {
    try {
      await api('PUT', `/api/messages/${msgId}/recall`);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, isRecalled: true, content: '' } : m));
      toast('已撤回', 'success');
    } catch (e: any) { toast(e.message || '撤回失败', 'error'); }
  };

  const getPeerName = () => {
    if (isGroup) return groupName || '群聊';
    if (!peer) return '';
    return peer.nickname || peer.username;
  };

  const getSenderDisplayName = (msg: Message) => groupAliases[msg.senderId] || msg.sender.nickname || msg.sender.username;

  // Voice recording (via useAudioRecorder hook)
  const stopRecordingRef = useRef(false); // 防止重复 stop

  const startRecording = async () => {
    try {
      await startRecord();
      setRecording(true);
      setRecordingDuration(0);
      stopRecordingRef.current = false;
      recordTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } catch {
      toast('无法访问麦克风，请检查权限或确保在安全协议(HTTPS)下运行', 'error');
    }
  };

  // 监听录音时长：60秒自动停止
  useEffect(() => {
    if (recordingDuration >= 60 && recording) {
      handleStopRecording();
    }
  }, [recordingDuration, recording]);

  const handleStopRecording = async () => {
    // 防止重复调用
    if (stopRecordingRef.current) return;
    stopRecordingRef.current = true;

    if (recordTimerRef.current) clearInterval(recordTimerRef.current);

    // 最短1秒检查
    if (recordingDuration < 1) {
      await stopRecord().catch(() => {});
      setRecording(false);
      setRecordingDuration(0);
      toast('录音时间太短', 'error');
      return;
    }

    setRecording(false);
    setRecordingDuration(0);
    try {
      const file = await stopRecord();
      const base = getServerUrl();
      const token = localStorage.getItem('echo-token');
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(base + '/api/upload/voice', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // 乐观更新
      if (socket && data.url) {
        const tempId = 'temp-voice-' + Date.now();
        const optimisticMsg: Message = {
          id: tempId,
          senderId: user!.id,
          receiverId: isGroup ? null : peerId,
          groupId: isGroup ? peerId : null,
          content: data.url,
          type: 'voice',
          isRecalled: false,
          replyToId: replyTo?.id || null,
          replyTo: replyTo ? { id: replyTo.id, content: replyTo.content, type: replyTo.type, sender: replyTo.sender } : null,
          createdAt: new Date().toISOString(),
          sender: { id: user!.id, username: user!.username, nickname: user!.nickname || user!.username, avatar: user!.avatar || '' },
        };
        setMessages(prev => [...prev, optimisticMsg]);
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

        socket.emit('message:send', {
          ...(isGroup ? { groupId: peerId } : { receiverId: peerId }),
          content: data.url,
          type: 'voice',
          replyToId: replyTo?.id || undefined,
        }, (res: any) => {
          if (res?.error) {
            toast(res.error, 'error');
            setMessages(prev => prev.filter(m => m.id !== tempId));
          } else if (res?.ok && res.message) {
            setMessages(prev => prev.map(m => m.id === tempId ? { ...res.message, sender: optimisticMsg.sender } : m));
          }
        });
      }
      setReplyTo(null);
    } catch (e: any) {
      toast('语音发送失败', 'error');
    }
  };

  // Cleanup on unmount: stop recording if active
  useEffect(() => {
    return () => {
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (msgLongPressRef.current) clearTimeout(msgLongPressRef.current);
      if (autoCollapseRef.current) clearTimeout(autoCollapseRef.current);
      if (recorderActive) {
        stopRecord().catch(() => {});
      }
    };
  }, [recorderActive, stopRecord]);

  // Chat background
  const uploadBgFile = async (file: File) => {
    try {
      const url = await uploadAndGetUrl(file);
      setChatBg(url);
      saveChatBg(realPeerId, url);
      setShowBgPicker(false);
      toast('背景已更新', 'success');
    } catch (e: any) { toast(e.message || '上传失败', 'error'); }
  };

  const setBgUrl = () => {
    const url = bgUrlInput.trim();
    setChatBg(url);
    saveChatBg(realPeerId, url);
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
      setActivePanel(null);
      toast('定时消息已设置', 'success');
    } catch (e: any) { toast(e.message || '设置失败', 'error'); }
  };

  useEffect(() => {
    setChatBg(getChatBg(realPeerId));
    setShowBgPicker(false);
  }, [realPeerId, getChatBg]);

  // Effective background: per-chat > global chat bg
  const effectiveBg = chatBg || getBg('chat');

  const formatMsgTime = (iso: string) => {
    return new Date(iso).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const isRead = (msg: Message) => {
    // Symmetric: both users must have receipts enabled
    if (!readReceiptOn) return false;
    if (peer?.readReceiptsEnabled === false) return false;
    return msg.readReceipts?.some(r => r.userId === peerId);
  };

  // Swipe gestures (mobile) — must be before early return (Hook rules)
  const chatSwipeRef = useRef({ sx: 0, sy: 0 });

  if (!peerId) {
    return (
      <div className="flex h-full items-center justify-center text-gray-400 dark:text-gray-500">
        <p className="text-sm">搜索 Echo ID 开始聊天</p>
      </div>
    );
  }
  const handleChatTouchStart = (e: React.TouchEvent) => {
    chatSwipeRef.current = { sx: e.touches[0].clientX, sy: e.touches[0].clientY };
  };
  const handleChatTouchEnd = (e: React.TouchEvent) => {
    if (activePanel) return;
    const dx = e.changedTouches[0].clientX - chatSwipeRef.current.sx;
    const dy = Math.abs(e.changedTouches[0].clientY - chatSwipeRef.current.sy);
    if (Math.abs(dx) < 50 || Math.abs(dx) < dy) return;
    e.stopPropagation();
    if (dx > 50 && onBack) {
      onBack();
    } else if (dx < -50) {
      if (isGroup) setShowGroupOrbit(true);
      else if (peer) setShowPersonalOrbit(true);
    }
  };

  const handleEmojiTouchStart = (e: React.TouchEvent) => {
    e.stopPropagation();
    emojiSwipeRef.current = { sx: e.touches[0].clientX, sy: e.touches[0].clientY };
  };

  const handleEmojiTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    const dx = e.changedTouches[0].clientX - emojiSwipeRef.current.sx;
    const dy = Math.abs(e.changedTouches[0].clientY - emojiSwipeRef.current.sy);
    if (Math.abs(dx) < 40 || Math.abs(dx) < dy) return;
    setEmojiPage(page => Math.max(0, Math.min(emojiMaxPage, page + (dx < 0 ? 1 : -1))));
  };

  const shootMenu = showShootMenu ? createPortal(
    <div className="fixed inset-0 z-[9997]" onClick={() => setShowShootMenu(false)}>
      <div
        className="absolute bottom-0 left-0 right-0 rounded-t-2xl border-t border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-800"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => {
            setShowShootMenu(false);
            if (is5Plus()) capturePhoto5Plus();
            else shootPhotoRef.current?.click();
          }}
          className="flex w-full items-center justify-center border-b border-gray-100 px-4 py-4 text-base text-gray-800 dark:border-gray-700 dark:text-gray-100"
        >
          拍照
        </button>
        <button
          type="button"
          onClick={() => {
            setShowShootMenu(false);
            if (is5Plus()) captureVideo5Plus();
            else shootVideoRef.current?.click();
          }}
          className="flex w-full items-center justify-center border-b border-gray-100 px-4 py-4 text-base text-gray-800 dark:border-gray-700 dark:text-gray-100"
        >
          拍视频
        </button>
        <button
          type="button"
          onClick={() => setShowShootMenu(false)}
          className="mt-2 flex w-full items-center justify-center px-4 py-4 text-base text-gray-500 dark:text-gray-300"
        >
          取消
        </button>
      </div>
    </div>,
    document.body,
  ) : null;

  return (
    <div className="app-no-callout flex h-full flex-col relative overflow-hidden"
      onTouchStart={handleChatTouchStart}
      onTouchEnd={handleChatTouchEnd}
      onContextMenu={(e) => e.preventDefault()}>
      {shootMenu}
      {/* Chat background layer with GPU acceleration */}
      {effectiveBg && (
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-45 z-0"
          style={{ backgroundImage: `url(${assetUrl(effectiveBg)})`, willChange: 'transform', transform: 'translateZ(0)' }}
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
          {isGroup ? (groupAvatar ? <img src={assetUrl(groupAvatar)} alt="" className="h-full w-full rounded-xl object-cover" /> : (groupName?.[0]?.toUpperCase() || 'G')) : (
            peer?.avatar ? <img src={assetUrl(peer.avatar)} alt="" className="h-full w-full rounded-xl object-cover" /> :
            getPeerName()[0]?.toUpperCase() || '?'
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{getPeerName()}</h2>
          <p className="text-xs text-gray-400">
            {typingUser ? <span className="text-primary-500">正在输入...</span> :
             isUserOnline(peerId) ? <span className="text-green-500">在线</span> : '离线'}
            {!isGroup && peer?.autoReply && <span className="ml-2 text-amber-500">[自动回复中]</span>}
          </p>
        </div>
        {!isGroup && (
          <button onClick={() => startCall(peerId)}
            className="shrink-0 rounded-lg p-1.5 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="语音通话">
            <Phone size={18} />
          </button>
        )}
        {!isGroup && (
          <button onClick={toggleReadReceipt} className={`shrink-0 rounded-lg p-1.5 text-xs ${readReceiptOn ? 'text-primary-500' : 'text-gray-300'}`}
            title={readReceiptOn ? '已读回执：开' : '已读回执：关'}
          >{readReceiptOn ? '✓✓' : '✓'}</button>
        )}
        <button
          onClick={() => setClearConfirmOpen(true)}
          className="shrink-0 rounded-lg p-1.5 text-xs text-gray-400 transition-colors hover:text-red-500"
          title="清空聊天记录"
        >
          <Trash2 size={14} />
        </button>
      </header>

      {/* Message area */}
      <div
        ref={scrollContainerRef}
        className={`flex-1 overflow-y-auto overflow-x-hidden relative z-10 ${effectiveBg ? 'bg-transparent' : 'bg-gray-50 dark:bg-gray-950'}`}
        style={effectiveBg ? { backgroundImage: 'none' } : undefined}
        onClick={(e) => { if (e.target === e.currentTarget) closePanels(); }}
      >

        <div ref={topSentinelRef} className="h-1" />
        {older && <div className="py-2 text-center"><span className="text-xs text-gray-400">加载更多消息...</span></div>}
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">加载中...</div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-gray-400" onClick={closePanels}>
            <div className="text-center">
              <p className="text-4xl mb-3">💬</p>
              <p>{isGroup ? '群聊中，发送第一条消息吧' : '发送第一条消息吧'}</p>
            </div>
          </div>
        ) : (
          <div className="px-3 py-3 space-y-2 relative z-[1] min-h-full" onClick={(e) => { if (e.target === e.currentTarget) closePanels(); }}>
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
                      {msg.replyTo.type === 'image' ? '[图片]' : msg.replyTo.type === 'video' ? '[视频]' : msg.replyTo.content.slice(0, 30)}
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
                        {getSenderDisplayName(msg)[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    {!isMine && msg.isRecalled && (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gray-300 text-xs font-bold text-gray-500 dark:bg-gray-700 grayscale opacity-50">
                        {getSenderDisplayName(msg)[0]?.toUpperCase() || '?'}
                      </div>
                    )}

                    <div className="min-w-0">
                      {isGroup && !isMine && !msg.isRecalled && (
                        <p className="mb-0.5 text-[10px] text-primary-400 ml-1">
                          {getSenderDisplayName(msg)}
                        </p>
                      )}

                      <div
                        className={`message-media group relative rounded-2xl px-3.5 py-2 text-sm ${
                          msg.isRecalled
                            ? 'dm-collapse'
                            : isMine
                              ? 'bg-primary-500 text-white rounded-br-md'
                              : 'bg-white text-gray-800 dark:bg-gray-800 dark:text-gray-200 rounded-bl-md shadow-sm'
                        }`}
                        onContextMenu={(e) => e.preventDefault()}
                        onTouchStart={(e) => {
                          if (msg.isRecalled) return;
                          e.preventDefault();
                          msgLongPressRef.current = setTimeout(() => {
                            setMsgContextMenu({ msgId: msg.id, x: e.touches[0].clientX, y: e.touches[0].clientY, isMine, createdAt: msg.createdAt, type: msg.type, content: msg.content });
                          }, 500);
                        }}
                        onTouchMove={() => { if (msgLongPressRef.current) { clearTimeout(msgLongPressRef.current); msgLongPressRef.current = null; } }}
                        onTouchEnd={() => { if (msgLongPressRef.current) { clearTimeout(msgLongPressRef.current); msgLongPressRef.current = null; } }}
                      >
                        {msg.isRecalled ? (
                          <span className="text-xs text-gray-400 dark:text-gray-500 italic">
                            {isMine ? '你撤回了一条消息' : '对方撤回了一条消息'}
                          </span>
                        ) : (
                          <>
                            {msg.type === 'image' ? (
                              <div className="relative">
                                <img src={assetUrl(msg.content)} alt="" draggable={false} onContextMenu={(e) => e.preventDefault()} onDragStart={(e) => e.preventDefault()} onClick={() => setEmojiPreview(assetUrl(msg.content))} className="max-w-[160px] max-h-[160px] rounded-lg object-contain cursor-pointer" loading="lazy" onLoad={() => setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)} />
                                <button
                                  onClick={() => collectAsEmoji(msg.content)}
                                  className="absolute -bottom-5 right-0 hidden rounded bg-gray-700 px-1.5 py-0.5 text-[10px] text-white group-hover:block hover:bg-gray-600"
                                  title="收藏为表情"
                                >
                                  ⭐收藏
                                </button>
                              </div>
                            ) : msg.type === 'video' ? (
                              <video
                                src={assetUrl(msg.content)}
                                controls
                                playsInline
                                draggable={false}
                                preload="metadata"
                                className="max-w-56 rounded-lg"
                              />
                            ) : msg.type === 'voice' ? (
                              <VoiceBubble src={assetUrl(msg.content)} />
                            ) : (
                              <span className="whitespace-pre-wrap break-words overflow-wrap-anywhere">{msg.content}</span>
                            )}

                            {isMine && !msg.isRecalled && (Date.now() - new Date(msg.createdAt).getTime() < 120000) && (
                              <button
                                onClick={() => recallMessage(msg.id)}
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
            {replyTo.type === 'image' ? '[图片]' : replyTo.type === 'video' ? '[视频]' : replyTo.content.slice(0, 40)}
          </div>
          <button onClick={() => setReplyTo(null)} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}

      {activePanel === 'schedule' && (
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900">
          <div className="grid grid-cols-2 gap-2">
            <span className="text-xs text-gray-500">定时发送:</span>
            <input
              type="datetime-local"
              value={scheduleTime}
              onChange={(e) => setScheduleTime(e.target.value)}
              className="col-span-2 rounded-lg border border-gray-200 px-2 py-2 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
            <input
              type="text"
              value={scheduleContent}
              onChange={(e) => setScheduleContent(e.target.value)}
              placeholder="消息内容"
              className="col-span-2 rounded-lg border border-gray-200 px-2 py-2 text-xs dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200"
            />
            <button onClick={scheduleDelayed} className="rounded-lg bg-primary-500 px-2 py-1 text-xs text-white">确定</button>
            <button onClick={() => setActivePanel(null)} className="rounded-lg px-2 py-1 text-xs text-gray-400">取消</button>
          </div>
        </div>
      )}

      {/* Emoji panel */}
      {activePanel === 'emoji' && (
        <div
          className="border-t border-gray-100 bg-gray-50 px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
          style={{ height: emojiExpanded ? '280px' : '128px', display: 'flex', flexDirection: 'column' }}
          onTouchStart={handleEmojiTouchStart}
          onTouchMove={(e) => e.stopPropagation()}
          onTouchEnd={handleEmojiTouchEnd}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex shrink-0 items-center justify-between">
            <span className="text-xs text-gray-500 dark:text-gray-400">表情包</span>
            <div className="flex items-center gap-2">
              {emojiManageMode && selectedEmojis.size > 0 && (
                <button
                  onClick={async () => {
                    const ids = Array.from(selectedEmojis);
                    try {
                      await api('DELETE', '/api/emojis/batch', { ids });
                      toast(`已删除 ${ids.length} 个表情`, 'success');
                      setSelectedEmojis(new Set());
                      fetchEmojis(true);
                    } catch { toast('删除失败', 'error'); }
                  }}
                  className="rounded-lg bg-red-500 px-3 py-1 text-xs text-white hover:bg-red-600"
                >
                  删除 ({selectedEmojis.size})
                </button>
              )}
              <button
                onClick={() => {
                  setEmojiManageMode(!emojiManageMode);
                  setSelectedEmojis(new Set());
                }}
                className={`rounded-lg px-3 py-1 text-xs transition-colors ${emojiManageMode ? 'bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300' : 'bg-gray-200 dark:bg-gray-700 text-gray-500 hover:text-primary-500'}`}
              >
                {emojiManageMode ? '完成' : '管理'}
              </button>
              {!emojiManageMode && (
                <label className="cursor-pointer rounded-lg bg-primary-500 px-3 py-1 text-xs text-white hover:bg-primary-600">
                  + 上传
                  <input type="file" multiple accept="image/*,image/gif" className="hidden" onChange={async (e) => {
                    const files = e.target.files;
                    if (files) {
                      let uploaded = 0;
                      for (let i = 0; i < files.length; i++) {
                        try {
                          let uploadFile: File = files[i];
                          let compressOk = true;
                          if (uploadFile.type !== 'image/gif') { [uploadFile, compressOk] = await compressEmoji(files[i]); }
                          if (!compressOk) toast('压缩失败，已使用原图上传', 'info');
                          const base = getServerUrl();
                          const token = localStorage.getItem('echo-token');
                          const fd = new FormData(); fd.append('file', uploadFile);
                          const res = await fetch(base + '/api/upload/chat-image', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd });
                          const data = await res.json();
                          if (res.ok) { await api('POST', '/api/emojis', { imageUrl: data.url, name: 'sticker' }); uploaded++; }
                          else { toast(data.error || '上传失败', 'error'); }
                        } catch (err: any) { toast(err.message || '上传失败', 'error'); }
                      }
                      if (uploaded > 0) fetchEmojis(true);
                      if (uploaded < files.length) toast(`${files.length - uploaded} 个文件上传失败`, 'error');
                    }
                  }} />
                </label>
              )}
              <button
                onClick={() => { setEmojiPage(0); setEmojiExpanded(v => !v); }}
                className="rounded-lg bg-gray-200 px-3 py-1 text-xs text-gray-500 hover:text-primary-500 dark:bg-gray-700"
              >
                {emojiExpanded ? '收起' : '展开'}
              </button>
            </div>
          </div>
          {emojis.length === 0 ? (
            <span className="text-xs text-gray-400">上传表情包图片...</span>
          ) : (
            <div className="flex-1 overflow-hidden">
              <div
                className="grid h-full grid-cols-4 gap-2"
                style={{ gridTemplateRows: emojiExpanded ? 'repeat(3, 1fr)' : '1fr' }}
              >
              {visibleEmojis.map(emoji => (
                <div key={emoji.id} className="relative flex items-center justify-center group">
                  {/* 管理模式勾选圈 */}
                  {emojiManageMode && (
                    <button
                      onClick={() => {
                        setSelectedEmojis(prev => {
                          const next = new Set(prev);
                          if (next.has(emoji.id)) next.delete(emoji.id);
                          else next.add(emoji.id);
                          return next;
                        });
                      }}
                      className={`absolute -top-1 -left-1 z-10 h-5 w-5 rounded-full border-2 flex items-center justify-center text-[10px] transition-colors ${
                        selectedEmojis.has(emoji.id)
                          ? 'bg-primary-500 border-primary-500 text-white'
                          : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-500'
                      }`}
                    >
                      {selectedEmojis.has(emoji.id) ? '✓' : ''}
                    </button>
                  )}
                  <img
                    src={assetUrl(emoji.imageUrl)}
                    alt=""
                    draggable={false}
                    loading="lazy"
                    onContextMenu={(e) => e.preventDefault()}
                    onDragStart={(e) => e.preventDefault()}
                    className="w-16 h-16 rounded-xl object-cover cursor-pointer hover:opacity-80 transition-opacity min-w-[64px] min-h-[64px]"
                    onClick={() => {
                      if (emojiManageMode) {
                        setSelectedEmojis(prev => {
                          const next = new Set(prev);
                          if (next.has(emoji.id)) next.delete(emoji.id);
                          else next.add(emoji.id);
                          return next;
                        });
                        return;
                      }
                      if (!socket) return;
                      const tempId = 'temp-' + Date.now();
                      const optimisticMsg: Message = {
                        id: tempId,
                        senderId: user!.id,
                        receiverId: isGroup ? null : peerId,
                        groupId: isGroup ? peerId : null,
                        content: emoji.imageUrl,
                        type: 'image',
                        isRecalled: false,
                        replyToId: replyTo?.id || null,
                        replyTo: replyTo ? { id: replyTo.id, content: replyTo.content, type: replyTo.type, sender: replyTo.sender } : null,
                        createdAt: new Date().toISOString(),
                        sender: { id: user!.id, username: user!.username, nickname: user!.nickname || user!.username, avatar: user!.avatar || '' },
                      };
                      setMessages(prev => [...prev, optimisticMsg]);
                      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
                      socket.emit('message:send', {
                        ...(isGroup ? { groupId: peerId } : { receiverId: peerId }),
                        content: emoji.imageUrl, type: 'image',
                        replyToId: replyTo?.id || undefined,
                      }, (res: any) => {
                        if (res?.error) {
                          toast(ERROR_MAP[res.error] || res.error, 'error');
                          setMessages(prev => prev.filter(m => m.id !== tempId));
                        } else if (res?.ok && res.message) {
                          setMessages(prev => prev.map(m => m.id === tempId ? { ...res.message, sender: optimisticMsg.sender } : m));
                        }
                      });
                      setReplyTo(null);
                    }}
                  />
                  {!emojiManageMode && (
                    <button
                      onClick={async () => { await api('DELETE', `/api/emojis/${emoji.id}`); fetchEmojis(true); }}
                      className="absolute -top-1 -right-1 hidden group-hover:flex h-5 w-5 rounded-full bg-red-500 text-white text-[10px] items-center justify-center"
                    >✕</button>
                  )}
                </div>
              ))}
              </div>
            </div>
          )}
        </div>
      )}

      <motion.form layout onSubmit={sendMessage} transition={{ type: 'spring', stiffness: 200, damping: 25 }}
        className="flex items-end gap-2 px-3 py-2.5 relative bg-white/70 dark:bg-zinc-900/70 backdrop-blur-xl border-t border-white/20 dark:border-zinc-800/50 group/input"
        style={{ minHeight: '64px', paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
        {/* Toggle button */}
        <button
          type="button"
          onClick={() => { setActivePanel(activePanel === 'more' ? null : 'more'); setShowShootMenu(false); }}
          className={`rounded-lg p-2 shrink-0 transition-all duration-300 ${activePanel === 'more' ? 'text-primary-500' : 'text-gray-400'}`}
          title={activePanel === 'more' ? '收起' : '展开'}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: activePanel === 'more' ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s ease' }}>
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>

        {/* 左侧功能按钮组 */}
        <AnimatePresence initial={false}>
          {activePanel === 'more' && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 'auto', opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="flex items-center gap-1 shrink-0 origin-left">
              {/* 相册：图片+视频 */}
              <button
                type="button"
                onClick={() => albumFileInputRef.current?.click()}
                className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-primary-500 transition-colors"
                title="相册"
              >
                <Image size={18} strokeWidth={1.5} />
              </button>
              <input
                ref={albumFileInputRef}
                type="file"
                accept="image/*,video/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.type.startsWith('image/')) sendImage(f);
                  else if (f.type.startsWith('video/')) sendVideo(f);
                  e.target.value = '';
                }}
              />
              {/* 拍摄：弹子菜单 */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowShootMenu(!showShootMenu)}
                  className="flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-primary-500 transition-colors"
                  title="拍摄"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" /><circle cx="12" cy="13" r="4" />
                  </svg>
                </button>
                {/* 拍摄 ActionSheet */}
                {false && showShootMenu && (
                  <div className="fixed inset-0 z-[60]" onClick={() => setShowShootMenu(false)}>
                    <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-800 rounded-t-2xl shadow-2xl border-t border-gray-200 dark:border-gray-700"
                      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
                      onClick={(e) => e.stopPropagation()}>
                      <div className="py-1">
                        <button
                          type="button"
                          onClick={() => {
                            setShowShootMenu(false);
                            if (is5Plus()) { capturePhoto5Plus(); }
                            else { shootPhotoRef.current?.click(); }
                          }}
                          className="flex w-full items-center justify-center px-4 py-3.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700"
                        >
                          拍照
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowShootMenu(false);
                            if (is5Plus()) { captureVideo5Plus(); }
                            else { shootVideoRef.current?.click(); }
                          }}
                          className="flex w-full items-center justify-center px-4 py-3.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700"
                        >
                          拍视频
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowShootMenu(false)}
                        className="flex w-full items-center justify-center px-4 py-3.5 text-sm text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                )}
                <input ref={shootPhotoRef} type="file" accept="image/*" capture="environment" className="absolute h-px w-px opacity-0 pointer-events-none"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) sendImage(f); e.target.value = ''; }} />
                <input ref={shootVideoRef} type="file" accept="video/*" capture="environment" className="absolute h-px w-px opacity-0 pointer-events-none"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) sendVideo(f); e.target.value = ''; }} />
              </div>
              {/* 定时 */}
              <button
                type="button"
                onClick={() => setActivePanel('schedule')}
                className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors text-gray-400 hover:text-primary-500"
                title="定时发送"
              >
                <Clock size={18} strokeWidth={1.5} />
              </button>
              {/* 表情 */}
              <button
                type="button"
                onClick={() => { setEmojiPage(0); setActivePanel('emoji'); }}
                className="flex items-center justify-center w-9 h-9 rounded-lg transition-colors text-gray-400 hover:text-primary-500"
                title="表情包"
              >
                <Smile size={18} strokeWidth={1.5} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 二合一流体输入框（光球 + 麦克风） */}
        <div className="relative flex-1 flex items-center">
          <FluidInput
            ref={inputRef as any}
            value={input}
            isRecording={recording}
            onMicClick={() => {
              if (recording) {
                handleStopRecording();
              } else {
                startRecording();
              }
            }}
            onChange={(e) => {
              setInput(e.target.value);
              handleTyping();
              if (inkDrops.length < 3) {
                const id = dropCounter.current++;
                setInkDrops(prev => [...prev, { id, x: 20 + Math.random() * 60 }]);
                setTimeout(() => setInkDrops(prev => prev.filter(d => d.id !== id)), 800);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            rows={1}
            onFocus={() => {
              setActivePanel(null);
              setShowShootMenu(false);
              window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' }), 120);
              window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'auto', block: 'end' }), 320);
            }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = 'auto';
              el.style.height = Math.min(el.scrollHeight, 120) + 'px';
            }}
            style={{ maxHeight: '120px' }}
          />
        </div>

        {/* 发送按钮 */}
        <button
          type="submit"
          disabled={!input.trim()}
          className="shrink-0 flex items-center gap-1.5 rounded-2xl bg-primary-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-primary-600 active:scale-95 disabled:opacity-30 disabled:active:scale-100 transition-all shadow-sm shadow-primary-500/25"
        >
          <Send size={16} strokeWidth={2.5} />
          <span className="text-xs">发送</span>
        </button>
      </motion.form>

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
              {m.type === 'image' && m.content && (
                <>
                  <button onClick={(e) => { e.stopPropagation();
                    const a = document.createElement('a'); a.href = assetUrl(m.content!); a.download = `echo-${Date.now()}.jpg`;
                    document.body.appendChild(a); a.click(); document.body.removeChild(a);
                    setMsgContextMenu(null);
                  }}
                    className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                    保存图片
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); collectAsEmoji(m.content!); setMsgContextMenu(null); }}
                    className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                    收藏为表情
                  </button>
                </>
              )}
              <button onClick={(e) => { e.stopPropagation();
                setMessages(prev => prev.filter(msg => msg.id !== m.msgId));
                setMsgContextMenu(null);
              }}
                className="flex w-full items-center px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20">
                删除
              </button>
              {m.isMine && within2min && (
                <button onClick={(e) => { e.stopPropagation(); recallMessage(m.msgId); setMsgContextMenu(null); }}
                  className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700">
                  撤回
                </button>
              )}
            </div>
          </div>
        );
      })()}

      {/* Image preview modal */}
      {emojiPreview && (
        <div className="fixed inset-0 z-[80] bg-black/70 flex items-center justify-center" onClick={() => setEmojiPreview(null)}>
          <img src={emojiPreview} alt="" className="max-w-[80vw] max-h-[60vh] object-contain rounded-lg" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* Personal Orbit View — fullscreen overlay */}
      <Modal
        open={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        title="清空聊天记录"
        actions={
          <>
            <button
              type="button"
              onClick={() => setClearConfirmOpen(false)}
              className="rounded-xl px-4 py-2 text-sm text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              取消
            </button>
            <button
              type="button"
              onClick={async () => {
                try {
                  if (isGroup) {
                    await api('POST', '/api/messages/clear', { groupId: peerId });
                  } else {
                    await api('POST', '/api/messages/clear', { peerId });
                  }
                  setMessages([]);
                  setClearConfirmOpen(false);
                  toast('聊天记录已清空', 'success');
                } catch (err: any) {
                  toast(err.message || '清空失败', 'error');
                }
              }}
              className="rounded-xl bg-red-500 px-4 py-2 text-sm font-medium text-white hover:bg-red-600"
            >
              清空
            </button>
          </>
        }
      >
        <p>是否清空,不可恢复</p>
      </Modal>

      {showPersonalOrbit && peer && (
        <PersonalOrbitView
          peerId={peer.id}
          peerName={getPeerName()}
          peer={peer}
          onClose={() => setShowPersonalOrbit(false)}
        />
      )}
      {showGroupOrbit && isGroup && (
        <GroupOrbitView
          groupId={peerId}
          groupName={groupName}
          onClose={() => setShowGroupOrbit(false)}
        />
      )}
    </div>
  );
}
