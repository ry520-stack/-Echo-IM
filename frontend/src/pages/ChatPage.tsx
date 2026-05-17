import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import ConversationList from '../components/ConversationList';
import ChatWindow from '../components/ChatWindow';
import SidebarDrawer from '../components/SidebarDrawer';
import GravityZoneContent from '../components/GravityZoneContent';
import { api } from '../api/client';

interface Peer {
  id: string; username: string; nickname: string; avatar: string;
  digitalId: number; lastSeenAt: string; status: string;
  autoReply?: string; allowStrangerMessage?: boolean;
}

interface GroupInfo {
  id: string; name: string; creatorId: string; role: string; memberCount: number;
}

type ChatTarget = { type: 'user'; peer: Peer } | { type: 'group'; group: GroupInfo } | null;

export default function ChatPage() {
  const { user } = useAuth();
  const { connected } = useSocket();
  const { id: paramId } = useParams();
  const nav = useNavigate();
  const [target, setTarget] = useState<ChatTarget>(null);
  const [searchError, setSearchError] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showGravity, setShowGravity] = useState(false);
  const [showChatMobile, setShowChatMobile] = useState(false);
  const edgeSwipeRef = useRef({ x: 0, tracking: false });

  useEffect(() => {
    if (!paramId) {
      setTarget(null); setSearchError(''); setShowChatMobile(false);
      if (localStorage.getItem('echo-gravity-return') === '1') {
        localStorage.removeItem('echo-gravity-return');
        setTimeout(() => setShowGravity(true), 100);
      }
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const r = await api<Peer[]>('GET', `/api/users/search?q=${paramId}`);
        if (cancelled) return;
        const f = r.find(x => x.digitalId.toString() === paramId || x.id === paramId);
        if (f) { setTarget({ type: 'user', peer: f }); setSearchError(''); setShowChatMobile(true); return; }
      } catch {}
      try {
        const gs = await api<GroupInfo[]>('GET', '/api/groups');
        if (cancelled) return;
        const g = gs.find(x => x.id === paramId);
        if (g) { setTarget({ type: 'group', group: g }); setSearchError(''); setShowChatMobile(true); return; }
      } catch {}
      if (!cancelled) setSearchError(`未找到: ${paramId}`);
    })();
    return () => { cancelled = true; };
  }, [paramId]);

  const getChatWindowProps = () => {
    if (!paramId) return { peerId: '', peer: null, chatType: 'user' as const };
    if (!target) return { peerId: paramId, peer: null, chatType: 'user' as const };
    if (target.type === 'user') return { peerId: target.peer.id, peer: target.peer, chatType: 'user' as const };
    return { peerId: target.group.id, peer: null, chatType: 'group' as const, groupName: target.group.name };
  };

  const handleBackToList = () => { setShowChatMobile(false); nav('/'); };

  return (
    <div className="w-full h-full overflow-hidden flex flex-col bg-gray-50 dark:bg-gray-950"
      onTouchStart={(e) => {
        if ((paramId && showChatMobile) || showGravity || window.location.hash.includes('/favorites')) return;
        const x = e.touches[0].clientX;
        if (x < window.innerWidth * 0.20) edgeSwipeRef.current = { x, tracking: true };
        else edgeSwipeRef.current.tracking = false;
      }}
      onTouchEnd={(e) => {
        if ((paramId && showChatMobile) || showGravity) return;
        const { x, tracking } = edgeSwipeRef.current;
        if (!tracking) return;
        if (e.changedTouches[0].clientX - x > 40) { e.stopPropagation(); setDrawerOpen(true); }
        edgeSwipeRef.current.tracking = false;
      }}>
      <SidebarDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />

      {!(paramId && showChatMobile) && (
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-gray-100/60 bg-white/80 backdrop-blur-md px-4 dark:border-gray-800/60 dark:bg-gray-900/80">
          <button onClick={() => setDrawerOpen(true)} className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800">☰</button>
          <div className="flex flex-1 items-center gap-2">
            <span className="text-lg font-extrabold tracking-tight text-gray-900 dark:text-gray-100 select-none">Echo</span>
            <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
          </div>
          <button onClick={() => nav('/friends')} className="rounded-xl bg-primary-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-primary-600 transition-colors">+ 好友</button>
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className={`w-full flex-col bg-white dark:bg-gray-900 md:flex ${paramId ? 'md:w-80 md:border-r md:border-gray-200 md:dark:border-gray-700' : ''} ${paramId && showChatMobile ? 'hidden md:flex' : 'flex'}`}>
          <ConversationList onOpenGravity={() => setShowGravity(true)} />
        </div>

        {paramId && (
          <div className="hidden md:flex flex-1 flex-col">
            {searchError ? (
              <div className="flex flex-1 items-center justify-center"><p className="text-4xl mb-3">🔍</p><p className="text-sm text-gray-400">{searchError}</p><button onClick={() => nav('/')} className="mt-3 text-sm text-primary-500 hover:underline">返回首页</button></div>
            ) : (
              <ChatWindow {...getChatWindowProps()} onBack={handleBackToList} />
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {paramId && showChatMobile && (
          <motion.div className="fixed inset-0 z-50 bg-white dark:bg-gray-950 md:hidden" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 150, damping: 20, mass: 0.8 }}>
            {searchError ? (
              <div className="flex h-full items-center justify-center"><p className="text-4xl mb-3">🔍</p><p className="text-sm text-gray-400">{searchError}</p><button onClick={() => nav('/')} className="mt-3 text-sm text-primary-500 hover:underline">返回首页</button></div>
            ) : (
              <ChatWindow {...getChatWindowProps()} onBack={handleBackToList} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showGravity && (
          <motion.div className="fixed inset-0 z-50 bg-white dark:bg-[#05050A]" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 150, damping: 20, mass: 0.8 }}>
            <GravityZoneContent onClose={() => setShowGravity(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
