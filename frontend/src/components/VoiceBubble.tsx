import { useState, useRef, useEffect } from 'react';

export default function VoiceBubble({ src }: { src: string }) {
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // 全局互斥：监听其他语音气泡的播放事件，收到时暂停自己
  useEffect(() => {
    const handleGlobalPlay = (e: any) => {
      if (e.detail.src !== src && playing) {
        audioRef.current?.pause();
        setPlaying(false);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    };
    window.addEventListener('voice-play', handleGlobalPlay);
    return () => window.removeEventListener('voice-play', handleGlobalPlay);
  }, [src, playing]);

  // 卸载清理：停止 interval 和音频播放
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      audioRef.current?.pause();
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } else {
      // 派发全局事件，通知其他气泡闭嘴
      window.dispatchEvent(new CustomEvent('voice-play', { detail: { src } }));
      audio.play().catch(() => {});
      setPlaying(true);
      intervalRef.current = setInterval(() => setCurrent(audio.currentTime), 100);
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
        onLoadedMetadata={() => {
          const audio = audioRef.current;
          if (!audio) return;
          if (audio.duration === Infinity || isNaN(audio.duration)) {
            audio.currentTime = 1e101;
            const handleTimeUpdate = () => {
              audio.removeEventListener('timeupdate', handleTimeUpdate);
              audio.currentTime = 0;
              setDuration(audio.duration);
            };
            audio.addEventListener('timeupdate', handleTimeUpdate);
          } else {
            setDuration(audio.duration);
          }
        }}
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
