import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { api } from '../api/client';
import GooeyToggle from './GooeyToggle';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SidebarDrawer({ open, onClose }: Props) {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const nav = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [editingStatus, setEditingStatus] = useState(false);
  const [statusText, setStatusText] = useState(user?.status || '');

  const navigate = (path: string) => {
    nav(path);
    onClose();
  };

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            className="fixed inset-y-0 left-0 z-50 w-72 bg-white/90 dark:bg-gray-900/90 backdrop-blur-2xl shadow-2xl border-r border-white/20 dark:border-white/5"
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', stiffness: 150, damping: 20, mass: 0.8 }}
          >
        <div className="flex h-full flex-col overflow-y-auto">
          {/* Identity Card */}
          <div className="px-5 pt-6 pb-4">
            <div className="flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-500 text-xl font-bold text-white shadow-lg shadow-primary-500/20">
                  {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full rounded-2xl object-cover" /> :
                   (user?.nickname || user?.username || 'E')[0]?.toUpperCase()}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-gray-900 bg-green-500 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base font-bold text-gray-900 dark:text-gray-100 truncate">
                  {user?.nickname || user?.username}
                </p>
                <p className="text-xs text-gray-400 font-mono mt-0.5">ID: {user?.digitalId}</p>
                {editingStatus ? (
                  <input
                    type="text"
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                    onBlur={async () => {
                      setEditingStatus(false);
                      if (statusText !== (user?.status || '')) {
                        try {
                          await api('PUT', '/api/users/me', { status: statusText });
                          const cached = JSON.parse(localStorage.getItem('echo-user') || '{}');
                          cached.status = statusText;
                          localStorage.setItem('echo-user', JSON.stringify(cached));
                        } catch { /* ignore */ }
                      }
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
                    placeholder="设置个性签名..."
                    className="text-[11px] text-gray-600 dark:text-gray-300 mt-1 bg-gray-100 dark:bg-gray-800 rounded-lg px-2 py-1 w-full outline-none italic"
                    autoFocus
                  />
                ) : (
                  <p
                    onClick={() => setEditingStatus(true)}
                    className="text-[11px] text-gray-400/70 mt-1 truncate italic cursor-pointer hover:text-gray-500 dark:hover:text-gray-400 transition-colors"
                  >
                    {user?.status || '设置个性签名...'}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Dashboard Cards */}
          <div className="px-4 space-y-3 flex-1">
            {/* 通讯录 Card */}
            <button
              onClick={() => navigate('/friends')}
              className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border border-blue-100/50 dark:border-blue-500/10 p-4 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">通讯录</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">好友 · 群组</p>
                </div>
                <span className="text-blue-400 text-lg opacity-60 group-hover:opacity-100 transition-opacity">👥</span>
              </div>
            </button>

            {/* 星轨 Card */}
            <button
              onClick={() => { localStorage.setItem('echo-moments-last-read', String(Date.now())); navigate('/moments'); }}
              className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border border-purple-100/50 dark:border-purple-500/10 p-4 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">星轨</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">好友动态 · 星球轨迹</p>
                </div>
                <span className="text-purple-400 text-lg opacity-60 group-hover:opacity-100 transition-opacity">☄️</span>
              </div>
              {/* Red dot indicator */}
              {(() => {
                const lastRead = Number(localStorage.getItem('echo-moments-last-read') || '0');
                const hasNew = Date.now() - lastRead > 60000; // Simplified: show dot if >1min since last read
                return hasNew ? <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-red-500" /> : null;
              })()}
            </button>

            {/* 回声胶囊 Card */}
            <button
              onClick={() => navigate('/time-capsule')}
              className="group relative w-full overflow-hidden rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-100/50 dark:border-amber-500/10 p-4 text-left hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">回声胶囊</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">定时消息 · 私密日记</p>
                </div>
                <span className="text-amber-400 text-lg opacity-60 group-hover:opacity-100 transition-opacity">⏳</span>
              </div>
            </button>
          </div>

          {/* Bottom Bar */}
          <div className="px-4 py-4 border-t border-gray-100/50 dark:border-white/5 mt-2">
            {/* Day/Night Toggle */}
            <div className="mb-3">
              <GooeyToggle isDark={theme === 'dark'} onToggle={toggleTheme} />
            </div>

            {/* Settings Gear */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="flex w-full items-center justify-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors py-1"
              >
                <span>⚙️</span>
              </button>
              {showSettings && (
                <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 shadow-lg py-1 overflow-hidden">
                  <button
                    onClick={() => { navigate('/settings'); setShowSettings(false); }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    <span>设置</span>
                  </button>
                  <button
                    onClick={() => { logout(); nav('/login'); }}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    <span>退出登录</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
