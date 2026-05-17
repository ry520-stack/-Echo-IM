import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useToast } from '../contexts/ToastContext';
import { api, getServerUrl, setServerUrl } from '../api/client';
import ToggleSwitch from '../components/ToggleSwitch';
import { Camera, ChevronLeft, LogOut } from 'lucide-react';

interface BlockEntry {
  id: string;
  blocked: { id: string; username: string; nickname: string; avatar: string; digitalId: number };
}

export default function SettingsPage() {
  const { user, token, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const nav = useNavigate();

  const [nickname, setNickname] = useState(user?.nickname || '');
  const [status, setStatus] = useState(user?.status || '');
  const [autoReply, setAutoReply] = useState(user?.autoReply || '');
  const [strangerMsg, setStrangerMsg] = useState(user?.allowStrangerMessage !== false);
  const [serverUrl, setServerUrlState] = useState(getServerUrl());
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<BlockEntry[]>([]);
  const [notifOn, setNotifOn] = useState(() => localStorage.getItem('echo-notif-enabled') !== 'false');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const readReceiptGlobal = localStorage.getItem('echo-read-receipt-global') !== 'false';

  useEffect(() => {
    api<BlockEntry[]>('GET', '/api/blocks').then(setBlockedUsers).catch(() => {});
  }, []);

  const saveProfile = async () => {
    setSaving(true);
    setMsg('');
    try {
      const updated = await api<any>('PUT', '/api/users/me', { nickname, status, autoReply, allowStrangerMessage: strangerMsg });
      setMsg('保存成功');
      toast('个人资料已保存', 'success');
      const userKey = 'echo-user';
      const cached = JSON.parse(localStorage.getItem(userKey) || '{}');
      cached.nickname = updated.nickname;
      cached.status = updated.status;
      cached.autoReply = updated.autoReply;
      cached.allowStrangerMessage = updated.allowStrangerMessage;
      localStorage.setItem(userKey, JSON.stringify(cached));
    } catch (e: any) {
      setMsg(e.message || '保存失败');
      toast(e.message || '保存失败', 'error');
    } finally {
      setSaving(false);
    }
  };

  const unblock = async (userId: string) => {
    try {
      await api('DELETE', '/api/blocks/' + userId);
      setBlockedUsers(prev => prev.filter(b => b.blocked.id !== userId));
      toast('已取消拉黑', 'success');
    } catch (e: any) { toast(e.message || '操作失败', 'error'); }
  };

  const uploadAvatar = async (file: File) => {
    setAvatarUploading(true);
    setMsg('');
    try {
      const base = getServerUrl() || '';
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch(base + '/api/upload/avatar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '上传失败');

      const userKey = 'echo-user';
      const cached = JSON.parse(localStorage.getItem(userKey) || '{}');
      cached.avatar = data.url;
      localStorage.setItem(userKey, JSON.stringify(cached));
      setMsg('头像已更新');
      toast('头像已更新', 'success');
      window.location.reload();
    } catch (e: any) {
      setMsg(e.message || '上传失败');
      toast(e.message || '上传失败', 'error');
    } finally {
      setAvatarUploading(false);
    }
  };

  const saveServerUrl = () => {
    setServerUrl(serverUrl);
    setMsg('服务器地址已更新');
    toast('服务器地址已更新', 'success');
  };

  const avatarUrl = user?.avatar || '';

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700/50 dark:bg-gray-800/50">
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-gray-100/60 bg-white/80 backdrop-blur-md dark:border-gray-800/60 dark:bg-gray-900/80">
        <div className="flex items-center gap-3 px-4 py-3">
          <button
            onClick={() => nav('/')}
            className="rounded-xl p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800 transition-colors"
          >
            <ChevronLeft size={20} strokeWidth={1.5} />
          </button>
          <h1 className="text-base font-semibold text-gray-900 dark:text-gray-100">个人设置</h1>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-6 space-y-5">
        {/* Profile Header Card */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-700/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-4">
            {/* Avatar with camera badge */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="relative shrink-0 group"
              disabled={avatarUploading}
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100 text-2xl font-bold text-primary-600 overflow-hidden dark:bg-primary-900/30 dark:text-primary-400">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  (user?.nickname || user?.username || '?')[0]?.toUpperCase()
                )}
              </div>
              <div className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-gray-800 text-white ring-2 ring-white dark:ring-gray-800">
                <Camera size={12} strokeWidth={2} />
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadAvatar(file);
              }}
            />
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
                {user?.nickname || user?.username}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{user?.email}</p>
              <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-0.5 dark:bg-gray-700">
                <span className="text-[10px] uppercase tracking-wider text-gray-400">ID</span>
                <span className="font-mono text-sm font-bold tracking-wider text-primary-500">{user?.digitalId}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Personal Info */}
        <Section title="个人资料">
          <div>
            <label className="mb-1.5 block text-sm text-gray-600 dark:text-gray-400">昵称</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="设置昵称"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-colors focus:border-primary-300 focus:bg-white dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 dark:focus:border-primary-500 dark:focus:bg-gray-700"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-gray-600 dark:text-gray-400">个性签名</label>
            <input
              type="text"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              placeholder="写一句话..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-colors focus:border-primary-300 focus:bg-white dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 dark:focus:border-primary-500 dark:focus:bg-gray-700"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-gray-600 dark:text-gray-400">自动回复（留给陌生人）</label>
            <input
              type="text"
              value={autoReply}
              onChange={(e) => setAutoReply(e.target.value)}
              placeholder="例如：稍后回复你，可加我好友"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm transition-colors focus:border-primary-300 focus:bg-white dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 dark:focus:border-primary-500 dark:focus:bg-gray-700"
            />
          </div>
          <button
            onClick={saveProfile}
            disabled={saving}
            className="w-full rounded-xl bg-primary-500 py-2.5 text-sm font-semibold text-white hover:bg-primary-600 disabled:opacity-50 transition-colors"
          >
            {saving ? '保存中...' : '保存'}
          </button>
          {msg && <p className="text-center text-sm text-green-500">{msg}</p>}
        </Section>

        {/* Privacy */}
        <Section title="隐私">
          <ToggleSwitch
            label="允许陌生人给我发消息"
            checked={strangerMsg}
            onChange={setStrangerMsg}
          />
          <ToggleSwitch
            label="已读回执（全局）"
            checked={readReceiptGlobal}
            onChange={(v) => {
              localStorage.setItem('echo-read-receipt-global', String(v));
              toast(v ? '已读回执已开启' : '已读回执已关闭', 'info');
              setMsg(v ? '已读回执已开启' : '已读回执已关闭');
            }}
          />
          {blockedUsers.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">已拉黑的用户</p>
              {blockedUsers.map(b => (
                <div key={b.id} className="flex items-center justify-between py-1">
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {b.blocked.nickname || b.blocked.username} (ID: {b.blocked.digitalId})
                  </span>
                  <button onClick={() => unblock(b.blocked.id)} className="text-xs text-red-400 hover:underline">取消拉黑</button>
                </div>
              ))}
            </div>
          )}
        </Section>

        {/* System */}
        <Section title="系统">
          <ToggleSwitch
            label="暗黑模式"
            checked={theme === 'dark'}
            onChange={toggleTheme}
          />
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">消息通知</span>
            <button
              onClick={() => {
                const next = !notifOn;
                setNotifOn(next);
                localStorage.setItem('echo-notif-enabled', String(next));
                if (next && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
              }}
              className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-300 ${
                notifOn ? 'bg-primary-500' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <motion.span
                className="inline-block h-5 w-5 rounded-full bg-white shadow-sm"
                animate={{ x: notifOn ? 24 : 2 }}
                transition={{ type: 'spring', stiffness: 200, damping: 25 }}
              />
            </button>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-gray-600 dark:text-gray-400">服务器地址</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => setServerUrlState(e.target.value)}
                placeholder="例如 http://8.140.194.214:3001"
                className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs transition-colors focus:border-primary-300 focus:bg-white dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-100 dark:focus:border-primary-500 dark:focus:bg-gray-700"
              />
              <button onClick={saveServerUrl} className="shrink-0 rounded-xl bg-gray-100 px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 transition-colors">更新</button>
            </div>
          </div>
        </Section>

        {/* Logout */}
        <button
          onClick={() => { logout(); nav('/login'); }}
          className="w-full rounded-2xl border border-red-200 bg-white py-3 text-sm font-medium text-red-500 hover:bg-red-50 dark:border-red-900/50 dark:bg-gray-800/50 dark:hover:bg-red-900/20 transition-colors flex items-center justify-center gap-2"
        >
          <LogOut size={16} strokeWidth={1.5} />
          退出登录
        </button>

        {/* Developer Footer */}
        <div className="text-xs text-slate-400 mt-6 text-center pb-4 space-y-0.5">
          <p>开发者邮箱: ranyv520@gmail.com</p>
          <p>微信: Echo11238</p>
          <p className="font-mono text-primary-500">Echo ID: 260341</p>
        </div>
      </div>
    </div>
  );
}
