import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import EventHorizonLoader from './EventHorizonLoader';
import GravityLockedCard from './GravityLockedCard';

export default function GravityZoneContent({ onClose }: { onClose: () => void }) {
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
      <div className="px-4 pt-8 pb-4 relative z-10">
        <h2 className={`text-sm font-semibold tracking-[0.2em] uppercase ${isDark ? 'text-white/50' : 'text-gray-400'}`}>Gravity Zone</h2>
      </div>

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
              onLongPress={() => { lock(); setCtxMenu({ id: item.id, x: 100, y: 200 }); }}
            />
          ))}
        </div>
      )}

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
