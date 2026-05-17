import { useState } from 'react';

export default function FluidInput({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className="relative w-full h-10 group">
      <style>{`
        .gooey-bg {
          background: #050505;
          filter: blur(8px) contrast(18);
        }
        .orb-fluid {
          position: absolute;
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background-color: var(--bg);
          animation: orb-anim 6s infinite ease-in-out;
          pointer-events: none;
        }
        @keyframes orb-anim {
          0% {
            opacity: 0;
            transform: translate(var(--x2), -50%) rotate(0deg) translateX(var(--x1)) scale(var(--scale));
          }
          30%, 70% { opacity: 1; }
          100% {
            opacity: 0;
            transform: translate(var(--x2), -50%) rotate(calc(var(--rot) * 360deg)) translateX(var(--x1)) scale(var(--scale));
          }
        }
      `}</style>

      {/* Fluid background layer — only visible when focused */}
      <div className={`absolute inset-0 overflow-hidden rounded-full transition-opacity duration-700 pointer-events-none z-0 ${
        isFocused ? 'opacity-100' : 'opacity-0'
      }`}>
        <div className="gooey-bg absolute inset-[-8px] w-[calc(100%+16px)] h-[calc(100%+16px)]">
          <div className="orb-fluid top-1/2 left-0" style={{ '--bg': 'rgba(120, 50, 200, 0.5)', '--scale': 0.8, '--x1': '30px', '--x2': '10%', '--rot': -1 } as React.CSSProperties} />
          <div className="orb-fluid top-1/2 left-1/4" style={{ '--bg': 'rgba(50, 100, 220, 0.45)', '--scale': 0.6, '--x1': '40px', '--x2': '20%', '--rot': 0.5 } as React.CSSProperties} />
          <div className="orb-fluid top-1/2 left-1/2" style={{ '--bg': 'rgba(80, 40, 180, 0.45)', '--scale': 0.9, '--x1': '50px', '--x2': '-10%', '--rot': -0.8 } as React.CSSProperties} />
          <div className="orb-fluid top-1/2 right-0" style={{ '--bg': 'rgba(40, 120, 180, 0.5)', '--scale': 0.7, '--x1': '20px', '--x2': '-30%', '--rot': 1.2 } as React.CSSProperties} />
        </div>
      </div>

      {/* Input layer — transparent bg, always crisp text */}
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder || '输入消息...'}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`relative z-10 w-full h-full bg-transparent px-4 rounded-full text-sm font-medium text-zinc-200 placeholder-zinc-600 outline-none transition-colors duration-300 ${
          isFocused
            ? 'border-transparent'
            : 'border border-zinc-800 bg-zinc-900/50'
        }`}
      />
    </div>
  );
}
