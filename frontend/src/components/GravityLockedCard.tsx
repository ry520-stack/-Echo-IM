import { useRef } from 'react';

export default function GravityLockedCard({ name, avatar, onClick, onLongPress, isDark }: {
  name: string; avatar?: string; onClick: () => void; onLongPress: () => void; isDark?: boolean;
}) {
  const isLongPressing = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPos = useRef({ x: 0, y: 0 });

  return (
    <>
      <style>{`
        @keyframes blob-float {
          0% { transform: translate(0, 0) scale(1); }
          25% { transform: translate(60px, -20px) scale(1.3); }
          50% { transform: translate(-20px, 40px) scale(0.8); }
          75% { transform: translate(-50px, -30px) scale(1.2); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes blob-float-2 {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-40px, 30px) scale(1.4); }
          66% { transform: translate(50px, -10px) scale(0.7); }
          100% { transform: translate(0, 0) scale(1); }
        }
        .blob-1 { animation: blob-float 10s ease-in-out infinite; }
        .blob-2 { animation: blob-float-2 14s ease-in-out infinite; }
      `}</style>

      <div
        onClick={() => { if (!isLongPressing.current) onClick(); }}
        onTouchStart={(e) => {
          isLongPressing.current = false;
          startPos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          e.stopPropagation();
          if (timerRef.current) clearTimeout(timerRef.current);
          timerRef.current = setTimeout(() => {
            isLongPressing.current = true;
            e.preventDefault();
            onLongPress();
          }, 500);
        }}
        onTouchMove={(e) => {
          const dx = Math.abs(e.touches[0].clientX - startPos.current.x);
          const dy = Math.abs(e.touches[0].clientY - startPos.current.y);
          if (dx > 10 || dy > 10) {
            if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
          }
        }}
        onTouchEnd={(e) => {
          if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
          if (isLongPressing.current) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
        className={`relative flex items-center gap-4 p-4 rounded-2xl backdrop-blur-xl border shadow-[0_8px_32px_rgba(0,0,0,0.5)] cursor-pointer select-none overflow-hidden transition-colors ${
          isDark ? 'bg-zinc-900/40 border-white/5 active:bg-zinc-800/40' : 'bg-white/80 border-gray-200/50 active:bg-gray-50'
        }`}
        style={{ WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }}
      >
        {/* Floating blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-2xl">
          <div className="blob-1 absolute -bottom-4 -left-4 w-24 h-24 bg-purple-900/30 rounded-full filter blur-2xl" />
          <div className="blob-2 absolute -top-4 -right-4 w-20 h-20 bg-blue-900/30 rounded-full filter blur-2xl" />
        </div>

        {/* Avatar */}
        <div className="relative z-10 w-11 h-11 rounded-full bg-gradient-to-tr from-indigo-500/50 to-purple-500/50 p-[1px] shrink-0">
          <div className="w-full h-full rounded-full bg-amber-500 flex items-center justify-center text-base font-bold text-white overflow-hidden">
            {avatar ? <img src={avatar} alt="" className="w-full h-full object-cover" /> : name[0]?.toUpperCase()}
          </div>
        </div>

        {/* Name */}
        <div className="relative z-10 flex-1 min-w-0">
          <p className={`text-sm font-medium tracking-wide truncate ${isDark ? 'text-white/80' : 'text-gray-800'}`}>{name}</p>
          <p className={`text-[10px] mt-0.5 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>强力捕捉</p>
        </div>
      </div>
    </>
  );
}
