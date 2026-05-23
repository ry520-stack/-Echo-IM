import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';
import { useToast } from '../contexts/ToastContext';
import { assetUrl } from '../utils/assetUrl';

interface FriendGroup {
  id: string;
  name: string;
  color: string;
  members: { peerId: string; peer: { id: string; username: string; nickname: string; avatar: string } }[];
}

interface Friend {
  id: string;
  peer: { id: string; username: string; nickname: string; avatar: string; digitalId: number };
  alias: string;
}

const PRESET_COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#8b5cf6', '#ef4444', '#84cc16'];

export default function StarZoneManagePage() {
  const nav = useNavigate();
  const toast = useToast();
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6366f1');

  // Edit form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  // Add member
  const [addingToId, setAddingToId] = useState<string | null>(null);
  const [friendSearch, setFriendSearch] = useState('');
  const [searchResults, setSearchResults] = useState<{ id: string; username: string; nickname: string; avatar: string; digitalId: number }[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchGroups = async () => {
    try {
      const data = await api<FriendGroup[]>('GET', '/api/friend-groups');
      setGroups(data);
    } catch { /* offline */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroups(); }, []);

  const createGroup = async () => {
    if (!newName.trim()) return;
    try {
      await api('POST', '/api/friend-groups', { name: newName.trim(), color: newColor });
      setNewName('');
      setNewColor('#6366f1');
      setShowCreate(false);
      fetchGroups();
      toast('星域已创建', 'success');
    } catch (e: any) { toast(e.message || '创建失败', 'error'); }
  };

  const updateGroup = async (groupId: string) => {
    if (!editName.trim()) return;
    try {
      await api('PATCH', `/api/friend-groups/${groupId}`, { name: editName.trim(), color: editColor });
      setEditingId(null);
      fetchGroups();
      toast('已更新', 'success');
    } catch (e: any) { toast(e.message || '更新失败', 'error'); }
  };

  const deleteGroup = async (groupId: string) => {
    if (!confirm('确定删除此星域？')) return;
    try {
      await api('DELETE', `/api/friend-groups/${groupId}`);
      fetchGroups();
      toast('已删除', 'info');
    } catch (e: any) { toast(e.message || '删除失败', 'error'); }
  };

  const removeMember = async (groupId: string, peerId: string) => {
    try {
      await api('DELETE', `/api/friend-groups/${groupId}/members/${peerId}`);
      fetchGroups();
    } catch (e: any) { toast(e.message || '移除失败', 'error'); }
  };

  const searchFriends = async () => {
    if (!friendSearch.trim()) return;
    setSearching(true);
    try {
      const friends = await api<Friend[]>('GET', '/api/friends');
      const q = friendSearch.trim().toLowerCase();
      const filtered = friends
        .map(f => f.peer)
        .filter(p =>
          p.nickname?.toLowerCase().includes(q) ||
          p.username?.toLowerCase().includes(q) ||
          String(p.digitalId).includes(q)
        );
      setSearchResults(filtered);
    } catch { /* */ } finally {
      setSearching(false);
    }
  };

  const addMember = async (groupId: string, peerId: string) => {
    try {
      await api('POST', `/api/friend-groups/${groupId}/members`, { peerId });
      fetchGroups();
      setSearchResults(prev => prev.filter(p => p.id !== peerId));
      toast('已添加', 'success');
    } catch (e: any) { toast(e.message || '添加失败', 'error'); }
  };

  return (
    <div className="flex h-full overflow-y-auto flex-col bg-gray-50 dark:bg-gray-950">
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900 shrink-0">
        <button onClick={() => nav(-1)} className="text-sm text-primary-500 hover:underline">← 返回</button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">星域管理</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <button
          onClick={() => setShowCreate(true)}
          className="w-full rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-600 py-3 text-sm text-gray-500 hover:border-primary-400 hover:text-primary-500 transition-colors"
        >
          + 新建星域
        </button>

        {loading ? (
          <p className="py-8 text-center text-sm text-gray-400">加载中...</p>
        ) : groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">暂无星域分组</p>
        ) : (
          groups.map(group => (
            <div key={group.id} className="rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900 overflow-hidden">
              <div
                className="flex items-center gap-3 p-4 cursor-pointer"
                onClick={() => setExpandedId(expandedId === group.id ? null : group.id)}
              >
                <span className="inline-block w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
                <span className="flex-1 text-sm font-semibold text-gray-800 dark:text-gray-200">{group.name}</span>
                <span className="text-xs text-gray-400">{group.members.length} 人</span>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingId(group.id); setEditName(group.name); setEditColor(group.color); }}
                  className="text-xs text-gray-400 hover:text-primary-500 px-1"
                >编辑</button>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteGroup(group.id); }}
                  className="text-xs text-gray-400 hover:text-red-500 px-1"
                >删除</button>
              </div>

              <AnimatePresence initial={false}>
                {expandedId === group.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 space-y-2">
                      {group.members.length === 0 ? (
                        <p className="text-xs text-gray-400 py-2">暂无成员</p>
                      ) : (
                        group.members.map(m => (
                          <div key={m.peerId} className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2">
                              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-100 text-xs font-bold text-primary-600 dark:bg-primary-900/30">
                                {m.peer.avatar ? <img src={assetUrl(m.peer.avatar)} alt="" className="h-full w-full rounded-lg object-cover" /> : (m.peer.nickname || m.peer.username)[0]?.toUpperCase()}
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">{m.peer.nickname || m.peer.username}</span>
                            </div>
                            <button onClick={() => removeMember(group.id, m.peerId)} className="text-xs text-red-400 hover:text-red-500">移除</button>
                          </div>
                        ))
                      )}

                      {addingToId === group.id ? (
                        <div className="pt-2 space-y-2 border-t border-gray-100 dark:border-gray-800">
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={friendSearch}
                              onChange={(e) => setFriendSearch(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && searchFriends()}
                              placeholder="搜索好友..."
                              className="flex-1 rounded-lg bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-xs dark:text-gray-200"
                              autoFocus
                            />
                            <button onClick={searchFriends} disabled={searching} className="rounded-lg bg-primary-500 px-3 py-1.5 text-xs text-white">{searching ? '...' : '搜索'}</button>
                            <button onClick={() => { setAddingToId(null); setSearchResults([]); setFriendSearch(''); }} className="rounded-lg px-2 py-1.5 text-xs text-gray-400">取消</button>
                          </div>
                          {searchResults.map(p => (
                            <div key={p.id} className="flex items-center justify-between gap-2 py-1">
                              <div className="flex items-center gap-2">
                                <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary-100 text-[10px] font-bold text-primary-600">
                                  {(p.nickname || p.username)[0]?.toUpperCase()}
                                </div>
                                <span className="text-xs text-gray-700 dark:text-gray-300">{p.nickname || p.username}</span>
                              </div>
                              <button onClick={() => addMember(group.id, p.id)} className="rounded-lg bg-primary-100 px-2 py-0.5 text-xs text-primary-600 dark:bg-primary-900/30 dark:text-primary-400">添加</button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <button onClick={() => setAddingToId(group.id)} className="text-xs text-primary-500 hover:underline">+ 添加成员</button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setShowCreate(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">新建星域</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="星域名称"
              className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm dark:text-gray-200 mb-3"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && createGroup()}
            />
            <div className="flex gap-2 mb-4">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setNewColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${newColor === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 rounded-xl bg-gray-100 dark:bg-gray-800 py-2.5 text-sm text-gray-500">取消</button>
              <button onClick={createGroup} className="flex-1 rounded-xl bg-primary-500 py-2.5 text-sm font-semibold text-white">创建</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editingId && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" onClick={() => setEditingId(null)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">编辑星域</h2>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="星域名称"
              className="w-full rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-2.5 text-sm dark:text-gray-200 mb-3"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && updateGroup(editingId)}
            />
            <div className="flex gap-2 mb-4">
              {PRESET_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setEditColor(c)}
                  className={`w-8 h-8 rounded-full transition-transform ${editColor === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setEditingId(null)} className="flex-1 rounded-xl bg-gray-100 dark:bg-gray-800 py-2.5 text-sm text-gray-500">取消</button>
              <button onClick={() => updateGroup(editingId)} className="flex-1 rounded-xl bg-primary-500 py-2.5 text-sm font-semibold text-white">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
