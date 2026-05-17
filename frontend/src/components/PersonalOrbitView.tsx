import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import FloatingStackGallery from './FloatingStackGallery';

interface MomentData {
  id: string;
  userId: string;
  content: string;
  images: string;
  createdAt: string;
  user: { id: string; username: string; nickname: string; avatar: string };
  likes: { userId: string }[];
  _count: { likes: number; comments: number };
}

function parseImages(images: string): string[] {
  try { return JSON.parse(images); } catch { return []; }
}

export default function PersonalOrbitView({ peerId, peerName, onClose }: { peerId: string; peerName: string; onClose: () => void }) {
  const [moments, setMoments] = useState<MomentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ moments: MomentData[]; total: number; hasMore: boolean }>('GET', `/api/moments?page=1`);
        let all = data.moments || [];
        // Fetch more pages if needed
        if (data.hasMore && all.length < data.total && all.filter(m => m.userId === peerId).length === 0) {
          const p2 = await api<{ moments: MomentData[] }>('GET', `/api/moments?page=2`);
          all = [...all, ...(p2.moments || [])];
        }
        setMoments(all.filter(m => m.userId === peerId));
      } catch { /* ignore */ } finally {
        setLoading(false);
      }
    })();
  }, [peerId]);

  const ref = { sx: 0, sy: 0 };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] bg-white dark:bg-[#05050A] flex flex-col"
        initial={{ x: '100%' }}
        animate={{ x: 0, transition: { type: 'spring', stiffness: 200, damping: 25, mass: 0.8 } }}
        exit={{ x: '100%', transition: { type: 'spring', stiffness: 200, damping: 25, mass: 0.8 } }}
        onTouchStart={(e) => { ref.sx = e.touches[0].clientX; ref.sy = e.touches[0].clientY; }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - ref.sx;
          const dy = Math.abs(e.changedTouches[0].clientY - ref.sy);
          if (dx > 50 && Math.abs(dx) > dy) { e.stopPropagation(); onClose(); }
        }}
      >
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-400">加载中...</div>
          ) : moments.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-gray-400">
              <span className="text-6xl mb-4 opacity-30">🌌</span>
              <p className="text-sm">{peerName} 还没有发过星轨</p>
            </div>
          ) : (
            <div className="p-4 space-y-4 pb-8">
              {moments.map(m => {
                const imgs = parseImages(m.images);
                return (
                  <div key={m.id} className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
                    <div className="px-4 pt-4 pb-1">
                      <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{m.content}</p>
                    </div>
                    {imgs.length > 0 && (
                      <div className="px-4 pb-4 mt-2">
                        {imgs.length === 1 ? (
                          <img src={imgs[0]} alt="" className="rounded-xl object-cover w-full max-h-64 cursor-pointer" onClick={() => setLightbox(imgs[0])}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        ) : (
                          <FloatingStackGallery images={imgs} onPreview={(url) => setLightbox(url)} />
                        )}
                      </div>
                    )}
                    <div className="text-right px-4 pb-3">
                      <span className="text-[10px] text-gray-400">{new Date(m.createdAt).toLocaleDateString('zh-CN')}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Lightbox */}
        {lightbox && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95" onClick={() => setLightbox(null)}>
            <img src={lightbox} alt="" className="max-h-[90vh] max-w-[90vw] object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
