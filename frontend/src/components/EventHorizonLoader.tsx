import { motion } from 'framer-motion';

export default function EventHorizonLoader() {
  const text = 'Gravity'.split('');

  const containerVariants: any = {
    animate: { transition: { staggerChildren: 0.12 } },
  };

  const letterVariants: any = {
    animate: {
      opacity: [0.6, 1, 0.6],
      transition: { duration: 3, repeat: Infinity, ease: 'easeInOut' },
    },
  };

  return (
    <>
      <style>{`
        @keyframes disk-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .accretion-disk {
          animation: disk-spin 6s linear infinite;
          background: conic-gradient(
            from 0deg,
            #fff 0%,
            #00d4ff 12%,
            #0088ff 25%,
            #0044ff 40%,
            #000 52%,
            #00aaff 60%,
            #00d4ff 75%,
            #0066ff 88%,
            #fff 100%
          );
          filter: blur(2px) drop-shadow(0 0 15px rgba(0, 212, 255, 0.9)) drop-shadow(0 0 45px rgba(0, 68, 255, 0.7));
        }
        .accretion-disk-2 {
          animation: disk-spin 10s linear infinite reverse;
          background: conic-gradient(
            from 0deg,
            transparent 0%,
            #00ccff 20%,
            #0044ff 35%,
            #000 50%,
            #0088ff 65%,
            #00ddff 80%,
            transparent 100%
          );
          filter: blur(1px) drop-shadow(0 0 25px rgba(0, 200, 255, 0.6));
        }
        .accretion-glow {
          background: radial-gradient(circle at center, rgba(0, 150, 255, 0.4) 0%, transparent 70%);
          filter: blur(20px);
          animation: disk-spin 4s linear infinite;
        }
        .cosmic-noise {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
        }
      `}</style>

      {/* Deep space noise-textured background */}
      <div className="cosmic-noise absolute inset-0 rounded-full pointer-events-none mix-blend-overlay z-0" />

      <div className="relative flex items-center justify-center w-[260px] h-[260px]">

        {/* GLOW — plasma bloom layer */}
        <div className="accretion-glow absolute inset-[-30px] rounded-full mix-blend-color-dodge pointer-events-none" />

        {/* Accretion disk layer 1 — fast, bright */}
        <div className="accretion-disk absolute inset-0 rounded-full" />

        {/* Accretion disk layer 2 — slow reverse, inner */}
        <div className="accretion-disk-2 absolute inset-[15px] rounded-full" />

        {/* Event horizon — pure black, spacetime distortion */}
        <motion.div
          className="absolute inset-[40px] rounded-full bg-black shadow-[inset_0_0_40px_rgba(0,0,0,0.95),0_0_30px_rgba(0,0,0,0.8)] z-[1]"
          animate={{ scaleY: [1, 1.06, 1], scaleX: [1, 1.03, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />

        {/* Gravitational lens ring */}
        <div className="absolute inset-[6px] rounded-full border border-white/15 shadow-[0_0_25px_rgba(0,180,255,0.3)] pointer-events-none" />

        {/* Text */}
        <motion.div className="relative z-10 flex font-light text-white text-base tracking-[0.2em] select-none drop-shadow-[0_0_12px_rgba(0,212,255,0.8)]" variants={containerVariants} animate="animate">
          {text.map((char, i) => (
            <motion.span key={i} variants={letterVariants}>{char}</motion.span>
          ))}
        </motion.div>
      </div>
    </>
  );
}
