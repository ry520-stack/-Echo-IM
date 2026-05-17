import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic } from 'lucide-react';

type VoiceStatus = 'idle' | 'recording' | 'sending';

interface Props {
  onStartRecord: () => void;
  onStopRecord: () => void;
}

export default function FluidVoiceInput({ onStartRecord, onStopRecord }: Props) {
  const [status, setStatus] = useState<VoiceStatus>('idle');

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setStatus('recording');
    onStartRecord();
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    e.preventDefault();
    e.currentTarget.releasePointerCapture(e.pointerId);
    setStatus('sending');
    onStopRecord();
    setTimeout(() => setStatus('idle'), 800);
  };

  return (
    <div className="relative w-full h-14 flex items-center justify-center overflow-hidden rounded-full bg-white/10 dark:bg-zinc-900/50 border border-white/20 backdrop-blur-xl touch-none select-none"
      style={{ boxShadow: 'inset 0 0 6px rgba(255,255,255,0.1), 0 8px 16px -8px rgba(0,0,0,0.3)' }}>

      <style>{`
        .voice-orb { position: absolute; width: 60px; height: 60px; border-radius: 50%; top: -14px; left: 0; transform-origin: 50% 50%; pointer-events: none; }
        @keyframes voice-orb-anim {
          0% { opacity: 0.2; transform: translate(var(--x2), 0) scale(var(--scale)); }
          50% { opacity: 1; }
          100% { opacity: 0.2; transform: translate(var(--x2), 0) rotate(180deg) translateX(var(--x1)) scale(var(--scale)); }
        }
      `}</style>

      {/* Fluid orbs — visible in idle and recording */}
      {status !== 'sending' && (
        <div className="absolute inset-0 pointer-events-none opacity-50">
          <div className="voice-orb" style={{ '--scale': '0.6', '--x1': '40px', '--x2': '-10%', background: 'rgba(190,242,255,0.4)', animation: 'voice-orb-anim 6s infinite ease-in-out' } as any} />
          <div className="voice-orb" style={{ '--scale': '0.3', '--x1': '70px', '--x2': '50%', background: 'rgba(174,243,255,0.5)', animation: 'voice-orb-anim 7s infinite ease-in-out 1s' } as any} />
        </div>
      )}

      {/* Text layer */}
      <div className="relative z-10 font-medium text-zinc-400 dark:text-zinc-300 tracking-wider pointer-events-none text-sm">
        <AnimatePresence mode="wait">
          {status === 'idle' && <motion.span key="i" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}>按住说话</motion.span>}
          {status === 'recording' && <motion.span key="r" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.8)]">正在录音...</motion.span>}
          {status === 'sending' && <motion.span key="s" initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} className="text-blue-400">发送中</motion.span>}
        </AnimatePresence>
      </div>

      {/* Mic button — slides when sending */}
      <motion.div
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        animate={{
          left: status === 'sending' ? 'calc(100% - 56px)' : '4px',
          scale: status === 'recording' ? 1.1 : 1,
          backgroundColor: status === 'recording' ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.05)',
          boxShadow: status === 'recording' ? 'inset 0 0 10px rgba(34,211,238,0.5)' : 'inset 0 4px 6px 3px rgba(255,255,255,0.1)',
        }}
        transition={{ type: 'spring', stiffness: status === 'sending' ? 300 : 500, damping: status === 'sending' ? 25 : 30 }}
        className="absolute w-12 h-12 rounded-full flex items-center justify-center cursor-pointer backdrop-blur-md z-20"
      >
        <Mic size={20} className={status === 'recording' ? 'text-cyan-400' : 'text-zinc-400'} />
      </motion.div>
    </div>
  );
}
