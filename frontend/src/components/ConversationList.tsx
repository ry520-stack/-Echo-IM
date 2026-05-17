import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { api } from '../api/client';
import { useNotification } from '../hooks/useNotification';

interface Peer {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  digitalId: number;
  lastSeenAt: string;
  status: string;
}

interface LastMessage {
  id: string;
  content: string;
  type: string;
  createdAt: string;
  senderId: string;
}

interface Conversation {
  peer: Peer;
  lastMessage: LastMessage | null;
  unreadCount: number;
  lastTime: string;
}

const PINNED_KEY = 'echo-pinned-chats';
const ARCHIVED_KEY = 'echo-archived-chats';

function getPinned(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(PINNED_KEY) || '[]')); } catch { return new Set(); }
}
function getArchived(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(ARCHIVED_KEY) || '[]')); } catch { return new Set(); }
}

export default function ConversationList({ onSelect, onOpenGravity }: { onSelect?: () => void; onOpenGravity?: () => void }) {
  const { user } = useAuth();
  const { socket, connected, onlineUsers } = useSocket();
  const nav = useNavigate();
  const { id: chatId } = useParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const { permission, requestPermission } = useNotification();
  const [showPermAsk, setShowPermAsk] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [searchTab, setSearchTab] = useState<'contacts' | 'messages'>('contacts');
  const [msgResults, setMsgResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const asked = localStorage.getItem('echo-notif-asked');
    if (permission === 'default' && !asked) setShowPermAsk(true);
  }, [permission]);

  const handlePermAgree = () => {
    requestPermission();
    localStorage.setItem('echo-notif-asked', '1');
    setShowPermAsk(false);
  };
  const [pinned, setPinned] = useState<Set<string>>(getPinned());
  const [archived, setArchived] = useState<Set<string>>(getArchived());

  // Swipe state
  const [swipeId, setSwipeId] = useState<string | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const swipeXRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number; time: number }>({ x: 0, y: 0, time: 0 });
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);

  const togglePin = (peerId: string) => {
    setPinned(prev => {
      const next = new Set(prev);
      if (next.has(peerId)) next.delete(peerId); else next.add(peerId);
      localStorage.setItem(PINNED_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const toggleArchive = (peerId: string) => {
    setArchived(prev => {
      const next = new Set(prev);
      if (next.has(peerId)) next.delete(peerId); else next.add(peerId);
      localStorage.setItem(ARCHIVED_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const handleTouchStart = (e: React.TouchEvent, peerId: string) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() };
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      setContextMenu({ id: peerId, x: e.touches[0].clientX, y: e.touches[0].clientY });
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent, peerId: string) => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    const dx = e.touches[0].clientX - touchStartRef.current.x;
    const dy = Math.abs(e.touches[0].clientY - touchStartRef.current.y);
    // Only allow right swipe (positive dx), ignore left swipe entirely
    if (dx > 10 && Math.abs(dx) > dy) {
      e.preventDefault();
      setSwipeId(peerId);
      const clamped = Math.min(160, dx);
      swipeXRef.current = clamped;
      setSwipeX(clamped);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent, peerId: string) => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    if (swipeXRef.current > 100) {
      e.stopPropagation();
      togglePin(peerId);
    }
    swipeXRef.current = 0;
    setSwipeId(null);
    setSwipeX(0);
  };

  const fetchConversations = async () => {
    try {
      const data = await api<Conversation[]>('GET', '/api/messages/conversations');
      setConversations(data);
    } catch { /* offline */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Refresh on visibility change (returning from chat)
  useEffect(() => {
    const onVisible = () => { if (document.visibilityState === 'visible') fetchConversations(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const filteredConversations = searchText.trim()
    ? conversations.filter(c => {
        const p = c.peer;
        const s = searchText.trim().toLowerCase();
        return p.nickname?.toLowerCase().includes(s) ||
          p.username?.toLowerCase().includes(s) ||
          String(p.digitalId).includes(s);
      })
    : conversations;

  useEffect(() => {
    if (!socket) return;

    const handleMessage = (msg: any) => {
      // Immediately update local state for instant UI feedback
      const peerId = msg.senderId === user?.id ? msg.receiverId : msg.senderId;
      if (!peerId || msg.groupId) {
        fetchConversations();
        return;
      }
      setConversations(prev => {
        const exists = prev.find(c => c.peer.id === peerId);
        const content = msg.type === 'image' ? '[图片]' : msg.type === 'voice' ? '[语音]' : msg.content;
        const lastMsg = { id: msg.id, content, type: msg.type, createdAt: msg.createdAt, senderId: msg.senderId };
        if (exists) {
          const unreadInc = msg.senderId !== user?.id ? 1 : 0;
          return prev.map(c => c.peer.id === peerId ? {
            ...c,
            lastMessage: lastMsg,
            unreadCount: c.unreadCount + unreadInc,
            lastTime: msg.createdAt,
          } : c).sort((a, b) => new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime());
        }
        // New conversation — fetch full list
        fetchConversations();
        return prev;
      });

      // Notification when page is hidden
      if (document.hidden && msg.senderId !== user?.id && Notification.permission === 'granted') {
        try {
          const senderName = msg.sender?.nickname || msg.sender?.username || '新消息';
          const body = msg.type === 'image' ? '[图片]' : msg.type === 'voice' ? '[语音]' : (msg.content || '').slice(0, 60);
          new Notification(senderName, { body, icon: '/favicon.svg', tag: peerId });
        } catch { /* ignore */ }
      }
    };

    socket.on('message:receive', handleMessage);

    return () => {
      socket.off('message:receive', handleMessage);
    };
  }, [socket, user?.id]);

  const getDisplayName = (peer: Peer) => {
    return peer.nickname || peer.username;
  };

  const getLastSeenText = (peer: Peer) => {
    if (onlineUsers.has(peer.id)) return '在线';
    if (!peer.lastSeenAt) return '';
    const diff = Date.now() - new Date(peer.lastSeenAt).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return '刚刚在线';
    if (minutes < 60) return `${minutes}分钟前在线`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}小时前在线`;
    const days = Math.floor(hours / 24);
    return `${days}天前在线`;
  };

  const formatLastMsg = (msg: LastMessage | null) => {
    if (!msg) return '';
    if (msg.type === 'image') return '[图片]';
    if (msg.type === 'voice') return `[语音 ${msg.content}"]`;
    return msg.content.length > 20 ? msg.content.slice(0, 20) + '...' : msg.content;
  };

  // Global swipe-left on empty area → gravity zone
  const listTouchRef = useRef({ x: 0, y: 0 });
  const handleListTouchStart = (e: React.TouchEvent) => {
    listTouchRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const handleListTouchEnd = (e: React.TouchEvent) => {
    const dx = e.changedTouches[0].clientX - listTouchRef.current.x;
    const dy = Math.abs(e.changedTouches[0].clientY - listTouchRef.current.y);
    if (dx < -50 && Math.abs(dx) > dy) {
      e.stopPropagation();
      onOpenGravity?.();
    }
  };

  return (
    <div className="flex h-full flex-col" onTouchStart={handleListTouchStart} onTouchEnd={handleListTouchEnd}>
      {/* 搜索框 */}
      <div className="px-4 py-2">
        <div className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 dark:bg-zinc-900/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]">
          <span className="text-slate-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="搜索好友或聊天记录..."
            className="flex-1 bg-transparent text-sm text-gray-700 outline-none placeholder:text-slate-400 dark:text-gray-300"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={async (e) => {
              if (e.key === 'Enter' && searchText.trim()) {
                setSearching(true);
                try { setMsgResults(await api<any[]>('GET', `/api/messages/search?q=${encodeURIComponent(searchText.trim())}`)); }
                catch { setMsgResults([]); }
                finally { setSearching(false); }
              }
            }}
          />
        </div>
      </div>

      {/* Search tabs — show when searching */}
      {searchText.trim() && (
        <div className="flex gap-1 px-3 mb-1">
          <button onClick={() => setSearchTab('contacts')} className={`px-3 py-1 text-xs rounded-full transition-colors ${searchTab === 'contacts' ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>好友</button>
          <button onClick={() => setSearchTab('messages')} className={`px-3 py-1 text-xs rounded-full transition-colors ${searchTab === 'messages' ? 'bg-primary-500 text-white' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}`}>聊天记录</button>
        </div>
      )}

      {/* 连接状态 */}
      {!connected && (
        <div className="mx-3 mb-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs text-amber-600 dark:bg-amber-900/20 dark:text-amber-400">
          未连接，消息将无法实时接收
        </div>
      )}

      {/* Notification permission ask */}
      {showPermAsk && (
        <div className="mx-3 mb-2 rounded-xl bg-primary-50 dark:bg-primary-900/20 px-4 py-3 border border-primary-100 dark:border-primary-800">
          <p className="text-xs text-primary-700 dark:text-primary-300 mb-2">Echo 想要向你发送星际回声（通知）</p>
          <div className="flex gap-2">
            <button onClick={handlePermAgree}
              className="rounded-lg bg-primary-500 px-3 py-1 text-xs text-white font-medium">同意</button>
            <button onClick={() => setShowPermAsk(false)}
              className="rounded-lg bg-gray-200 dark:bg-gray-700 px-3 py-1 text-xs text-gray-500">暂不</button>
          </div>
        </div>
      )}

      {/* Message search results */}
      {searchTab === 'messages' && searchText.trim() && (
        <div className="flex-1 overflow-y-auto flex flex-col px-3">
          {searching ? (
            <p className="text-xs text-gray-400 text-center py-4">搜索中...</p>
          ) : msgResults.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">未找到相关消息</p>
          ) : (
            msgResults.map((msg: any) => (
              <div key={msg.id} onClick={() => nav(`/chat/${msg.senderId === user?.id ? msg.receiverId : msg.senderId}`)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer mb-1">
                <p className="text-xs text-gray-500 truncate">{msg.sender?.nickname || msg.sender?.username}</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 truncate">{msg.content}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* 会话列表 */}
      {searchTab === 'contacts' && (
      <div className="flex-1 overflow-y-auto flex flex-col">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm tracking-wide text-slate-400">加载中...</p>
          </div>
        ) : (() => {
          const visibleCount = conversations.filter(c => !archived.has(c.peer.id)).length;
          if (visibleCount === 0) {
            return (
              <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-3xl bg-primary-100 text-5xl dark:bg-primary-900/20 shadow-sm">💬</div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                  欢迎, {user?.nickname || user?.username}
                </h2>
                <div className="mt-4 inline-flex items-center gap-3 rounded-2xl bg-gray-100/80 px-5 py-2.5 dark:bg-gray-800/80">
                  <span className="text-xs tracking-widest text-gray-400 font-medium uppercase">ECHO ID</span>
                  <span className="font-mono text-lg font-bold tracking-wider text-gray-800 dark:text-gray-100 select-all">
                    {user?.digitalId}
                  </span>
                </div>
                <p className="mt-5 text-sm tracking-wide text-gray-400 dark:text-gray-500">搜索 ECHO ID 添加好友，开始聊天</p>
              </div>
            );
          }
          if (filteredConversations.length === 0) {
            return (
              <div className="flex-1 flex items-center justify-center" style={{ marginTop: '-10%' }}>
                <p className="text-sm tracking-wide text-slate-400">没有匹配的好友</p>
              </div>
            );
          }
          return [...filteredConversations]
            .sort((a, b) => (pinned.has(a.peer.id) ? -1 : 0) - (pinned.has(b.peer.id) ? -1 : 0))
            .filter(c => !archived.has(c.peer.id) || searchText.trim())
            .map((conv) => {
            const isActive = chatId === conv.peer.digitalId.toString() || chatId === conv.peer.id;
            const isOnline = onlineUsers.has(conv.peer.id);
            const isPinned = pinned.has(conv.peer.id);
            const isArchived = archived.has(conv.peer.id);
            const isSwiping = swipeId === conv.peer.id;
            return (
              <div key={conv.peer.id} className="relative overflow-hidden select-none">
                {/* Swipe right background — subtle glow only */}
                <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                  <div className="h-full bg-gradient-to-r from-purple-500/10 to-transparent" style={{ width: '100px' }} />
                </div>

                {/* Conversation item */}
                <div
                  onClick={() => {
                    if (contextMenu) { setContextMenu(null); return; }
                    if (Math.abs(swipeXRef.current) < 5) {
                      nav(`/chat/${conv.peer.digitalId}`);
                      onSelect?.();
                    }
                  }}
                  onTouchStart={(e) => handleTouchStart(e, conv.peer.id)}
                  onTouchMove={(e) => handleTouchMove(e, conv.peer.id)}
                  onTouchEnd={(e) => handleTouchEnd(e, conv.peer.id)}
                  style={isSwiping ? { transform: `translateX(${swipeX}px)`, transition: 'none' } : { transform: 'translateX(0)', transition: 'transform 0.3s ease' }}
                  className={`relative flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800/50 ${
                    isActive ? 'bg-primary-50 dark:bg-primary-900/20' : ''
                  } ${isPinned ? 'border-l-2 border-purple-400' : ''}`}
                >
                  {/* 头像 */}
                  <div className="relative shrink-0">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary-100 text-lg font-bold text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">
                      {conv.peer.avatar ? (
                        <img src={conv.peer.avatar} alt="" className="h-full w-full rounded-xl object-cover" />
                      ) : (
                        getDisplayName(conv.peer)[0]?.toUpperCase() || '?'
                      )}
                    </div>
                    {isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500 dark:border-gray-900 animate-pulse ring-2 ring-green-500/30" />
                    )}
                  </div>

                  {/* 信息 */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between">
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                        {getDisplayName(conv.peer)}
                      </span>
                      {conv.lastMessage && (
                        <span className="ml-2 shrink-0 text-[10px] text-gray-400">
                          {formatTime(conv.lastMessage.createdAt)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {formatLastMsg(conv.lastMessage)}
                      </span>
                      {conv.unreadCount > 0 && (
                        <span className="ml-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary-500 px-1.5 text-[10px] font-bold text-white">
                          {conv.unreadCount > 99 ? '99+' : conv.unreadCount}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      {getLastSeenText(conv.peer)}
                      {conv.peer.status && isOnline && ` · ${conv.peer.status}`}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        })()}
      </div>
      )}

      {/* Context menu */}
      {contextMenu && (
        <div className="fixed inset-0 z-[60]" onClick={() => setContextMenu(null)}>
          <div
            className="absolute rounded-2xl border border-gray-200 bg-white/95 backdrop-blur-xl shadow-2xl py-1.5 min-w-[140px] overflow-hidden dark:border-gray-700 dark:bg-gray-800/95"
            style={{ left: Math.min(contextMenu.x - 70, window.innerWidth - 160), top: Math.min(contextMenu.y - 100, window.innerHeight - 180) }}
          >
            <button
              onClick={(e) => { e.stopPropagation();
                const peer = conversations.find(c => c.peer.id === contextMenu.id)?.peer;
                if (peer) {
                  const key = 'echo-favorites';
                  const favs = JSON.parse(localStorage.getItem(key) || '[]');
                  if (!favs.find((f: any) => f.id === peer.id)) {
                    favs.unshift({ id: peer.id, peerId: peer.id, peerName: peer.nickname || peer.username, peerAvatar: peer.avatar, peerDigitalId: peer.digitalId, addedAt: new Date().toISOString() });
                    localStorage.setItem(key, JSON.stringify(favs));
                  }
                }
                setContextMenu(null);
              }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
            >
              <span>✦</span> Add to Gravity Zone
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); togglePin(contextMenu.id); setContextMenu(null); }}
              className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              {pinned.has(contextMenu.id) ? '取消置顶' : '置顶'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); toggleArchive(contextMenu.id); setContextMenu(null); }}
              className="flex w-full items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors"
            >
              {archived.has(contextMenu.id) ? '取消隐藏' : '隐藏'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setContextMenu(null); }}
              className="flex w-full items-center px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              删除会话
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) {
    return d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}
