import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '../contexts/ToastContext';
import Modal from '../components/Modal';
import { api } from '../api/client';

interface Member {
  userId: string;
  role: string;
  user: {
    id: string;
    username: string;
    nickname: string;
    avatar: string;
  };
}

interface Group {
  id: string;
  name: string;
  creatorId: string;
  role: string;
  memberCount: number;
  members: Member[];
  createdAt: string;
}

export default function GroupsPage() {
  const nav = useNavigate();
  const toast = useToast();
  const [groups, setGroups] = useState<Group[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // Rename modal
  const [renameModalOpen, setRenameModalOpen] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState('');
  const [renameInput, setRenameInput] = useState('');

  const fetchGroups = async () => {
    try {
      const data = await api<Group[]>('GET', '/api/groups');
      setGroups(data);
    } catch { /* offline */ } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroups(); }, []);

  const createGroup = async () => {
    if (!groupName.trim()) { setError('请输入群组名称'); return; }
    try {
      await api('POST', '/api/groups', { name: groupName.trim() });
      setShowCreate(false);
      setGroupName('');
      setError('');
      fetchGroups();
      toast('群组已创建', 'success');
    } catch (e: any) {
      setError(e.message);
    }
  };

  const openRename = (groupId: string, currentName: string) => {
    setRenameTargetId(groupId);
    setRenameInput(currentName);
    setRenameModalOpen(true);
  };

  const renameGroup = async () => {
    if (!renameInput.trim()) return;
    setRenameModalOpen(false);
    try {
      await api('PUT', `/api/groups/${renameTargetId}/name`, { name: renameInput.trim() });
      fetchGroups();
      toast('群名已更新', 'success');
    } catch (e: any) { toast(e.message || '修改失败', 'error'); }
  };

  const getDisplayName = (member: Member) => member.user.nickname || member.user.username;

  const roleLabel = (role: string) => {
    if (role === 'owner') return '群主';
    if (role === 'admin') return '管理员';
    return '成员';
  };

  return (
    <div className="flex h-full overflow-y-auto flex-col bg-gray-50 dark:bg-gray-950">
      <header className="flex items-center justify-between border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <button onClick={() => nav('/')} className="text-sm text-primary-500 hover:underline">← 返回</button>
          <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">群组</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="rounded-lg bg-primary-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-600"
        >
          创建群组
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {showCreate && (
          <div className="mb-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
            <h3 className="mb-3 text-sm font-semibold text-gray-800 dark:text-gray-200">创建群组</h3>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="群组名称"
              className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
              autoFocus
            />
            {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
            <div className="mt-3 flex gap-2">
              <button onClick={() => { setShowCreate(false); setError(''); }} className="flex-1 rounded-xl border border-gray-200 py-2 text-sm text-gray-500">取消</button>
              <button onClick={createGroup} className="flex-1 rounded-xl bg-primary-500 py-2 text-sm text-white hover:bg-primary-600">创建</button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="py-8 text-center text-sm text-gray-400">加载中...</p>
        ) : groups.length === 0 ? (
          <p className="py-8 text-center text-sm text-gray-400">暂无群组</p>
        ) : (
          <div className="space-y-3">
            {groups.map(group => (
              <div key={group.id} className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50"
                  onClick={() => nav(`/chat/${group.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-lg font-bold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
                      {group.name[0]?.toUpperCase() || 'G'}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{group.name}</p>
                      <p className="text-xs text-gray-400">{group.memberCount} 人 · {roleLabel(group.role)}</p>
                    </div>
                  </div>
                  {group.role === 'owner' && (
                    <button
                      onClick={(e) => { e.stopPropagation(); openRename(group.id, group.name); }}
                      className="rounded-lg px-2 py-1 text-xs text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      改名
                    </button>
                  )}
                </div>

                <div className="border-t border-gray-100 px-4 py-2 dark:border-gray-800">
                  <p className="mb-2 text-xs text-gray-400">成员</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.members.slice(0, 15).map(m => (
                      <span key={m.userId} className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                        {getDisplayName(m)}
                        {m.role !== 'member' && (
                          <span className="text-[10px] text-primary-400 ml-0.5">({roleLabel(m.role)})</span>
                        )}
                      </span>
                    ))}
                    {group.memberCount > 15 && (
                      <span className="text-xs text-gray-400">+{group.memberCount - 15} 人</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rename modal */}
      <Modal
        open={renameModalOpen}
        onClose={() => setRenameModalOpen(false)}
        title="修改群名"
        actions={
          <>
            <button
              onClick={() => setRenameModalOpen(false)}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-300 hover:bg-slate-800"
            >
              取消
            </button>
            <button
              onClick={renameGroup}
              className="rounded-lg bg-primary-500 px-4 py-2 text-sm text-white hover:bg-primary-600"
            >
              确认
            </button>
          </>
        }
      >
        <input
          type="text"
          value={renameInput}
          onChange={(e) => setRenameInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && renameGroup()}
          placeholder="新群名"
          autoFocus
          className="w-full rounded-lg border-0 border-b-2 border-slate-700 bg-transparent px-1 py-2 text-sm text-white placeholder-slate-500 outline-none transition-colors focus:border-primary-500"
        />
      </Modal>
    </div>
  );
}
