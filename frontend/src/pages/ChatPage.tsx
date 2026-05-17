import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useSocket } from '../contexts/SocketContext';
import ConversationList from '../components/ConversationList';
import ChatWindow from '../components/ChatWindow';
import SidebarDrawer from '../components/SidebarDrawer';
import BlackHoleBackground from '../components/BlackHoleBackground';
import GravityLoader from '../components/GravityLoader';
import EventHorizonLoader from '../components/EventHorizonLoader';
import GravityLockedCard from '../components/GravityLockedCard';
import { api } from '../api/client';

function GravityZoneContent({ onClose }: { onClose: () => void }) {
  const nav = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [items, setItems] = useState<any[]>(() => {
    try { return JSON.parse(localStorage.getItem('echo-favorites') || '[]'); } catch { return []; }
  });
  const [ctxMenu, setCtxMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lockRef = useRef(false);
  const ref = { sx: 0, sy: 0 };

  const lock = () => { lockRef.current = true; setTimeout(() => { lockRef.current = false; }, 300); };
  const removeFromGravity = (id: string) => {
    const next = items.filter(i => i.id !== id);
    setItems(next);
    localStorage.setItem('echo-favorites', JSON.stringify(next));
    setCtxMenu(null);
  };

  return (
    <div
      className="w-full min-h-[100dvh] text-white overflow-y-auto"
      style={{ background: isDark ? 'radial-gradient(circle at 50% 40%, #1a2240 0%, #0d1220 50%, #050810 100%)' : '#f8fafc' }}
      onTouchStart={(e) => { ref.sx = e.touches[0].clientX; ref.sy = e.touches[0].clientY; }}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - ref.sx;
        const dy = Math.abs(e.changedTouches[0].clientY - ref.sy);
        if (dx > 40 && Math.abs(dx) > dy && !lockRef.current) onClose();
      }}
    >
      {/* Title */}
      <div className="px-4 pt-8 pb-4 relative z-10">
        <h2 className={`text-sm font-semibold tracking-[0.2em] uppercase ${isDark ? 'text-white/50' : 'text-gray-400'}`}>Gravity Zone</h2>
      </div>

      {/* Event Horizon — always visible background */}
      <div className="absolute inset-0 flex items-center justify-center opacity-60 pointer-events-none z-0">
        <EventHorizonLoader />
      </div>

      {items.length === 0 ? (
        <div className="flex-1 flex items-center justify-center relative z-10" />
      ) : (
        <div className="flex flex-col gap-3 px-4 pb-8 relative z-10">
          {items.map((item: any) => (
            <GravityLockedCard
              key={item.id}
              name={item.peerName}
              avatar={item.peerAvatar}
              isDark={isDark}
              onClick={() => { onClose(); localStorage.setItem('echo-gravity-return', '1'); nav(`/chat/${item.peerDigitalId}`); }}
              onLongPress={() => {
                lock();
                setCtxMenu({ id: item.id, x: 100, y: 200 });
              }}
            />
          ))}
        </div>
      )}

      {/* Context menu */}
      {ctxMenu && (
        <div className="fixed inset-0 z-[60]" onClick={() => { lock(); setCtxMenu(null); }}>
          <div className="absolute rounded-2xl border border-zinc-700 bg-zinc-800/90 backdrop-blur-md shadow-2xl py-1.5 min-w-[160px]"
            style={{ left: Math.min(ctxMenu.x - 80, window.innerWidth - 180), top: Math.min(ctxMenu.y - 60, window.innerHeight - 120) }}>
            <button onClick={(e) => { e.stopPropagation(); removeFromGravity(ctxMenu.id); }}
              className="flex w-full items-center px-4 py-2.5 text-sm text-red-400 hover:bg-zinc-700/50">
              移出引力圈
            </button>
          </div>
        </div>
      )}
    </div>
  );
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
}

interface GroupInfo {
  id: string;
  name: string;
  creatorId: string;
  role: string;
  memberCount: number;
}

type ChatTarget =
  | { type: 'user'; peer: Peer }
  | { type: 'group'; group: GroupInfo }
  | null;

export default function ChatPage() {
  const { user } = useAuth();
  const { connected } = useSocket();
  const { id: paramId } = useParams();
  const nav = useNavigate();

  const [target, setTarget] = useState<ChatTarget>(null);
  const [searchError, setSearchError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showGravity, setShowGravity] = useState(false);
  const edgeSwipeRef = useRef({ x: 0, tracking: false });

  // Mobile: track whether we're showing the chat view (pushed in)
  const [showChatMobile, setShowChatMobile] = useState(false);

  useEffect(() => {
    if (!paramId) {
      setTarget(null);
      setSearchError('');
      setShowChatMobile(false);
      // Restore gravity zone if coming back from chat
      if (localStorage.getItem('echo-gravity-return') === '1') {
        localStorage.removeItem('echo-gravity-return');
        setTimeout(() => setShowGravity(true), 100);
      }
      return;
    }

    let cancelled = false;

    const resolve = async () => {
      // Try user first
      try {
        const results = await api<Peer[]>('GET', `/api/users/search?q=${paramId}`);
        if (cancelled) return;
        const found = results.find(
          (r) => r.digitalId.toString() === paramId || r.id === paramId
        );
        if (found) {
          setTarget({ type: 'user', peer: found });
          setSearchError('');
          setShowChatMobile(true);
          return;
        }
      } catch { /* continue */ }

      // Try group
      try {
        const groups = await api<GroupInfo[]>('GET', '/api/groups');
        if (cancelled) return;
        const found = groups.find(g => g.id === paramId);
        if (found) {
          setTarget({ type: 'group', group: found });
          setSearchError('');
          setShowChatMobile(true);
          return;
        }
      } catch { /* continue */ }

      if (!cancelled) setSearchError(`未找到: ${paramId}`);
    };

    resolve();
    return () => { cancelled = true; };
  }, [paramId]);

  const getChatWindowProps = () => {
    if (!paramId) return { peerId: '', peer: null, chatType: 'user' as const };
    if (!target) return { peerId: paramId, peer: null, chatType: 'user' as const };
    if (target.type === 'user') {
      return { peerId: target.peer.id, peer: target.peer, chatType: 'user' as const };
    }
    return { peerId: target.group.id, peer: null, chatType: 'group' as const, groupName: target.group.name };
  };

  const handleConversationSelect = () => {
    // On mobile, the route change will trigger showChatMobile via paramId effect
  };

  const handleBackToList = () => {
    setShowChatMobile(false);
    nav('/');
  };

  return (
    <div className="w-full h-full overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-950"
      onTouchStart={(e) => {
        // Block sidebar swipe when chat is fullscreen OR gravity zone is open OR on gravity route
        if ((paramId && showChatMobile) || showGravity || window.location.hash.includes('/favorites')) return;
        const x = e.touches[0].clientX;
        if (x < window.innerWidth * 0.20) {
          edgeSwipeRef.current = { x, tracking: true };
        } else {
          edgeSwipeRef.current.tracking = false;
        }
      }}
      onTouchEnd={(e) => {
        if (paramId && showChatMobile) return;
        const { x, tracking } = edgeSwipeRef.current;
        if (!tracking) return;
        const dx = e.changedTouches[0].clientX - x;
        if (dx > 40) {
          e.stopPropagation();
          setDrawerOpen(true);
        }
        edgeSwipeRef.current.tracking = false;
      }}
    >
      {/* Sidebar drawer — highest z-index */}
      <SidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {/* Minimal header — hidden on mobile when chat is open */}
      {!(paramId && showChatMobile) && (
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-100/60 bg-white/80 backdrop-blur-md px-4 dark:border-gray-800/60 dark:bg-gray-900/80">
          <button
            onClick={() => setDrawerOpen(true)}
            className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >☰</button>

          <div className="flex flex-1 items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-gray-100 select-none">Echo</span>
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
          </div>

          <button
            onClick={() => nav('/friends')}
            className="rounded-xl bg-primary-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-600 transition-colors"
          >
            + 好友
          </button>
        </header>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Conversation list */}
        <div className={`w-full flex-col bg-white dark:bg-gray-900 md:flex ${paramId ? 'md:w-80 md:border-r md:border-gray-200 md:dark:border-gray-700' : ''} ${paramId && showChatMobile ? 'hidden md:flex' : 'flex'}`}>
          <ConversationList onSelect={handleConversationSelect} onOpenGravity={() => setShowGravity(true)} />
        </div>

        {/* Desktop: inline chat */}
        {paramId && (
          <div className="hidden md:flex flex-1 flex-col">
            {searchError ? (
              <div className="flex flex-1 items-center justify-center">
                <div className="text-center"><p className="text-4xl mb-3">🔍</p><p className="text-sm text-gray-400">{searchError}</p><button onClick={() => nav('/')} className="mt-3 text-sm text-primary-500 hover:underline">返回首页</button></div>
              </div>
            ) : (
              <ChatWindow {...getChatWindowProps()} onBack={handleBackToList} />
            )}
          </div>
        )}
      </div>

      {/* Mobile: fullscreen chat overlay */}
      <AnimatePresence>
        {paramId && showChatMobile && (
          <motion.div
            className="fixed inset-0 z-50 bg-white dark:bg-gray-950 md:hidden"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 150, damping: 20, mass: 0.8 }}
          >
            {searchError ? (
              <div className="flex h-full items-center justify-center">
                <div className="text-center"><p className="text-4xl mb-3">🔍</p><p className="text-sm text-gray-400">{searchError}</p><button onClick={() => nav('/')} className="mt-3 text-sm text-primary-500 hover:underline">返回首页</button></div>
              </div>
            ) : (
              <ChatWindow {...getChatWindowProps()} onBack={handleBackToList} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Gravity Zone — spring animation */}
      <AnimatePresence>
        {showGravity && (
          <motion.div
            className="fixed inset-0 z-50 bg-white dark:bg-[#05050A]"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 150, damping: 20, mass: 0.8 }}
          >
            <GravityZoneContent onClose={() => setShowGravity(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
