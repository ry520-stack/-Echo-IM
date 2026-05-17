import { useState, useRef } from 'react';

export default function VoiceBubble({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      if (intervalRef.current) clearInterval(intervalRef.current);
      setPlaying(false);
    } else {
      audio.play().catch(() => {});
      setPlaying(true);
      intervalRef.current = setInterval(() => {
        setCurrent(audio.currentTime);
      }, 100);
    }
  };

  const onEnded = () => {
    setPlaying(false);
    setCurrent(0);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-2 cursor-pointer min-w-[80px]" onClick={toggle}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={onEnded}
        className="hidden"
      />
      <span className="text-base">{playing ? '🔊' : '🎤'}</span>
      <span className="text-xs font-mono">
        {duration > 0 ? fmt(playing ? current : duration) : '...'}
      </span>
      {playing && (
        <span className="flex gap-0.5 items-end h-4">
          {[0, 1, 2].map(i => (
            <span key={i} className="w-0.5 bg-current rounded-full animate-pulse" style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.15}s` }} />
          ))}
        </span>
      )}
    </div>
  );
}
