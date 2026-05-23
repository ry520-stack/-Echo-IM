import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import { useSocket } from '../contexts/SocketContext';
import { assetUrl } from '../utils/assetUrl';
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

interface PeerInfo {
  avatar: string;
  nickname: string;
  username: string;
  digitalId: number;
}

export default function PersonalOrbitView({
  peerId,
  peerName,
  peer,
  onClose,
}: {
  peerId: string;
  peerName: string;
  peer?: PeerInfo | null;
  onClose: () => void;
}) {
  const { isUserOnline } = useSocket();
  const online = isUserOnline(peerId);
  const [moments, setMoments] = useState<MomentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const data = await api<{ moments: MomentData[]; total: number; hasMore: boolean }>(
          'GET',
          `/api/moments?page=1&userId=${peerId}`,
        );
        setMoments(data.moments || []);
      } catch {
        /* ignore */
      } finally {
        setLoading(false);
      }
    })();
  }, [peerId]);

  const touchStartRef = useRef({ sx: 0, sy: 0 });

  const navigateToSettings = () => {
    if (peer?.digitalId) {
      window.location.hash = `#/chat/${peer.digitalId}/settings`;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[60] bg-white dark:bg-[#05050A] flex flex-col"
        initial={{ x: '100%' }}
        animate={{ x: 0, transition: { type: 'spring', stiffness: 200, damping: 25, mass: 0.8 } }}
        exit={{ x: '100%', transition: { type: 'spring', stiffness: 200, damping: 25, mass: 0.8 } }}
        onTouchStart={(e) => {
          touchStartRef.current.sx = e.touches[0].clientX;
          touchStartRef.current.sy = e.touches[0].clientY;
        }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touchStartRef.current.sx;
          const dy = Math.abs(e.changedTouches[0].clientY - touchStartRef.current.sy);
          if (dx > 50 && Math.abs(dx) > dy) {
            e.stopPropagation();
            onClose();
          }
        }}
      >
        {/* Header */}
        <header className="flex items-center gap-3 border-b border-gray-100 dark:border-gray-800 px-4 py-3 shrink-0">
          <button
            onClick={onClose}
            className="rounded-xl p-1.5 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          >
            ←
          </button>
          <h1 className="text-base font-semibold text-gray-800 dark:text-gray-200">
            与 {peerName} 的星域
          </h1>
        </header>

        <div className="flex-1 overflow-y-auto">
          {/* Profile section */}
          <div className="flex flex-col items-center px-4 pt-8 pb-6">
            <div
              className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-500 text-3xl font-bold text-white mb-3 cursor-pointer overflow-hidden shrink-0"
              onClick={navigateToSettings}
            >
              {peer?.avatar ? (
                <img src={assetUrl(peer.avatar)} alt="" className="h-full w-full object-cover" />
              ) : (
                peerName[0]?.toUpperCase() || '?'
              )}
            </div>
            <h2
              className="text-lg font-semibold text-gray-800 dark:text-gray-200 cursor-pointer"
              onClick={navigateToSettings}
            >
              {peerName}
            </h2>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`inline-block w-2 h-2 rounded-full ${
                  online ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
              <span className="text-sm text-gray-400">{online ? '在线' : '离线'}</span>
            </div>
            {peer?.digitalId != null && (
              <p className="text-xs text-gray-400 mt-1">Echo ID: {peer.digitalId}</p>
            )}
          </div>

          {/* Relationship stats */}
          <div className="px-4 mb-6">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 px-1">
              关系数据
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: '所属星域', value: '--' },
                { label: '认识时间', value: '--' },
                { label: '最近互动', value: '--' },
                { label: '共同图片', value: '--' },
              ].map((item) => (
                <div
                  key={item.label}
                  className="rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 px-4 py-3"
                >
                  <p className="text-xs text-gray-400">{item.label}</p>
                  <p className="text-sm font-medium text-gray-300 dark:text-gray-600 mt-0.5">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent moments */}
          <div className="px-4 pb-8">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 px-1">
              最近动态
            </h3>
            {loading ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-400">
                加载中...
              </div>
            ) : moments.length === 0 ? (
              <div className="flex items-center justify-center py-12 text-sm text-gray-400">
                暂无动态
              </div>
            ) : (
              <div className="space-y-3">
                {moments.map((m) => {
                  const imgs = parseImages(m.images);
                  return (
                    <div
                      key={m.id}
                      className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden"
                    >
                      <div className="px-4 pt-4 pb-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                          {m.content}
                        </p>
                      </div>
                      {imgs.length > 0 && (
                        <div className="px-4 pb-4 mt-2">
                          {imgs.length === 1 ? (
                            <img
                              src={imgs[0]}
                              alt=""
                              className="rounded-xl object-cover w-full max-h-64 cursor-pointer"
                              onClick={() => setLightbox(imgs[0])}
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          ) : (
                            <FloatingStackGallery
                              images={imgs}
                              onPreview={(url) => setLightbox(url)}
                            />
                          )}
                        </div>
                      )}
                      <div className="text-right px-4 pb-3">
                        <span className="text-[10px] text-gray-400">
                          {new Date(m.createdAt).toLocaleDateString('zh-CN')}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Lightbox */}
        {lightbox && (
          <div
            className="fixed inset-0 z-[70] flex items-center justify-center bg-black/95"
            onClick={() => setLightbox(null)}
          >
            <img
              src={lightbox}
              alt=""
              className="max-h-[90vh] max-w-[90vw] object-contain"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
