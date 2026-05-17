import { motion } from 'framer-motion';

export default function GravityLoader() {
  const text = 'Gravity'.split('');

  const containerVariants: any = {
    animate: { transition: { staggerChildren: 0.1 } },
  };

  const letterVariants: any = {
    animate: {
      opacity: [0.3, 1, 0.3],
      scale: [1, 1.12, 1],
      transition: { duration: 2.5, repeat: Infinity, ease: 'easeInOut' },
    },
  };

  return (
    <>
      <style>{`
        @keyframes gravity-rotate {
          0% {
            transform: rotate(90deg);
            box-shadow: 0 10px 20px 0 #fff inset, 0 20px 40px 0 #00d4ff inset, 0 60px 60px 0 #0044ff inset;
          }
          50% {
            transform: rotate(270deg);
            box-shadow: 0 10px 20px 0 #fff inset, 0 20px 30px 0 #0a0a2a inset, 0 50px 60px 0 #0066cc inset;
          }
          100% {
            transform: rotate(450deg);
            box-shadow: 0 10px 20px 0 #fff inset, 0 20px 40px 0 #00d4ff inset, 0 60px 60px 0 #0044ff inset;
          }
        }
        @keyframes orbit-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .gravity-sphere {
          animation: gravity-rotate 2.5s linear infinite;
        }
        .orbit-track {
          animation: orbit-rotate 20s linear infinite;
        }
      `}</style>

      <div className="relative flex items-center justify-center w-[220px] h-[220px]">
        {/* Orbit ring — outer dashed ring */}
        <div className="orbit-track absolute inset-0 rounded-full border border-dashed border-zinc-700/40 pointer-events-none" />

        {/* Inner ring */}
        <div className="orbit-track absolute inset-[15px] rounded-full border border-zinc-800/30 pointer-events-none" style={{ animationDirection: 'reverse', animationDuration: '15s' }} />

        {/* Glowing sphere */}
        <div className="relative flex items-center justify-center w-[180px] h-[180px] rounded-full select-none">
          <div className="gravity-sphere absolute inset-0 w-full h-full rounded-full bg-transparent z-0" />

          {/* Black hole core — dark center */}
          <div className="absolute inset-[30px] rounded-full z-[1] pointer-events-none"
            style={{ background: 'radial-gradient(circle at center, #000 30%, transparent 70%)' }} />

          {/* Text */}
          <motion.div className="relative z-10 flex font-thin text-zinc-300 text-lg tracking-[0.2em]" variants={containerVariants} animate="animate">
            {text.map((char, i) => (
              <motion.span key={i} variants={letterVariants}>
                {char}
              </motion.span>
            ))}
          </motion.div>
        </div>
      </div>
    </>
  );
}
