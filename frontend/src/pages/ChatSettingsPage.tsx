import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { compressImage } from '../utils/compressImage';
import { useToast } from '../contexts/ToastContext';

interface Peer {
  id: string;
  username: string;
  nickname: string;
  avatar: string;
  digitalId: number;
}

export default function ChatSettingsPage() {
  const { userId } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [peer, setPeer] = useState<Peer | null>(null);
  const [alias, setAlias] = useState('');
  const [saving, setSaving] = useState(false);
  const [bgUrl, setBgUrl] = useState(() => localStorage.getItem(`echo-bg-${userId}`) || '');
  const [bgUploading, setBgUploading] = useState(false);
  const bgInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!userId) return;
    api<Peer[]>('GET', `/api/users/search?q=${userId}`).then(r => {
      const p = r.find(x => x.digitalId.toString() === userId || x.id === userId);
      if (p) { setPeer(p); setAlias(p.nickname || ''); }
    }).catch(() => {});
  }, [userId]);

  const saveAlias = async () => {
    if (!peer) return;
    setSaving(true);
    try {
      await api('PUT', `/api/users/me/alias/${peer.id}`, { alias });
      toast('备注已保存', 'success');
    } catch { toast('保存失败', 'error'); }
    finally { setSaving(false); }
  };

  if (!peer) return <div className="flex h-full items-center justify-center text-gray-400">加载中...</div>;

  return (
    <div className="flex h-full overflow-y-auto flex-col bg-gray-50 dark:bg-gray-950">
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
        <button onClick={() => nav(-1)} className="text-sm text-primary-500">← 返回</button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">好友设置</h1>
      </header>
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-white dark:bg-gray-900">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-500 text-2xl font-bold text-white">
            {peer.avatar ? <img src={peer.avatar} alt="" className="h-full w-full rounded-2xl object-cover" /> : peer.nickname?.[0] || peer.username[0]}
          </div>
          <div>
            <p className="text-base font-semibold text-gray-900 dark:text-gray-100">{peer.nickname || peer.username}</p>
            <p className="text-sm text-gray-400">ID: {peer.digitalId}</p>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-900 p-4 space-y-3">
          <label className="text-sm text-gray-600 dark:text-gray-400">设置备注</label>
          <input value={alias} onChange={e => setAlias(e.target.value)} className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm" placeholder="输入备注..." />
          <button onClick={saveAlias} disabled={saving} className="w-full rounded-xl bg-primary-500 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{saving ? '保存中...' : '保存备注'}</button>
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-900 p-4 space-y-3">
          <label className="text-sm text-gray-600 dark:text-gray-400">聊天背景</label>
          <div className="flex gap-3 items-center">
            <div className="w-20 h-20 rounded-xl bg-gray-100 dark:bg-gray-800 overflow-hidden">
              {bgUrl ? <img src={bgUrl} alt="" className="w-full h-full object-cover" /> : <div className="flex items-center justify-center h-full text-2xl text-gray-300">🖼</div>}
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <button onClick={() => bgInputRef.current?.click()} disabled={bgUploading} className="rounded-lg bg-primary-500 px-3 py-1.5 text-xs text-white">
                {bgUploading ? '上传中...' : '选择图片'}
              </button>
              {bgUrl && <button onClick={() => { setBgUrl(''); localStorage.removeItem(`echo-bg-${userId}`); }} className="rounded-lg bg-red-100 dark:bg-red-900/30 px-3 py-1.5 text-xs text-red-500">移除背景</button>}
              <input ref={bgInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                const f = e.target.files?.[0]; if (!f) return;
                setBgUploading(true);
                try {
                  const compressed = await compressImage(f);
                  const base = localStorage.getItem('echo-server-url') || '';
                  const token = localStorage.getItem('echo-token');
                  const fd = new FormData(); fd.append('file', compressed);
                  const res = await fetch(base + '/api/upload/chat-image', { method: 'POST', headers: { 'Authorization': `Bearer ${token}` }, body: fd });
                  const data = await res.json();
                  if (res.ok) { setBgUrl(data.url); localStorage.setItem(`echo-bg-${userId}`, data.url); }
                } catch { /* */ }
                finally { setBgUploading(false); }
              }} />
            </div>
          </div>
        </div>
        <div className="rounded-2xl bg-white dark:bg-gray-900 p-4 space-y-3">
          <label className="text-sm text-gray-600 dark:text-gray-400">星域分组</label>
          {(() => {
            const zones = JSON.parse(localStorage.getItem('echo-star-zones') || '["可见星域","不可见星域"]');
            return zones.map((zone: string) => (
              <label key={zone} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                <input type="checkbox" className="w-4 h-4 accent-primary-500" />
                <span className="text-sm text-gray-700 dark:text-gray-300">{zone}</span>
              </label>
            ));
          })()}
          <p className="text-xs text-gray-400">将此好友加入或移出星域</p>
        </div>
      </div>
    </div>
  );
}
