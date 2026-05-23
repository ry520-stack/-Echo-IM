import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../api/client';

export type PrivacyType = 'PUBLIC' | 'PRIVATE' | 'VISIBLE_TO' | 'INVISIBLE_TO';

export interface FriendGroup {
  id: string;
  name: string;
  members: { id: string; nickname: string; username: string; avatar: string }[];
}

interface StarZoneSelectorProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (privacyType: PrivacyType, selectedGroupIds: string[]) => void;
  onManageGroups: () => void;
}

export default function StarZoneSelector({ open, onClose, onConfirm, onManageGroups }: StarZoneSelectorProps) {
  const [activeTab, setActiveTab] = useState<'VISIBLE_TO' | 'INVISIBLE_TO'>('VISIBLE_TO');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groups, setGroups] = useState<FriendGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());
    setActiveTab('VISIBLE_TO');
    setLoading(true);
    api<FriendGroup[]>('GET', '/api/friend-groups')
      .then(setGroups)
      .catch(() => setGroups([]))
      .finally(() => setLoading(false));
  }, [open]);

  if (!open) return null;

  const toggleSelection = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleConfirm = () => {
    if (selectedIds.size === 0) {
      onConfirm('PUBLIC', []);
    } else {
      onConfirm(activeTab, Array.from(selectedIds));
    }
  };

  const selectedPeopleCount = (() => {
    const peerIds = new Set<string>();
    for (const id of selectedIds) {
      const group = groups.find(g => g.id === id);
      if (group) group.members.forEach(m => peerIds.add(m.id));
    }
    return peerIds.size;
  })();

  const privacyLabel: Record<string, string> = {
    PUBLIC: '🌍 公开',
    PRIVATE: '🔒 仅自己可见',
    VISIBLE_TO: '👁️ 部分可见',
    INVISIBLE_TO: '🚫 不给谁看',
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={onClose} className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

        <motion.div
          initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="relative w-full max-w-md flex flex-col bg-white dark:bg-gray-900 rounded-t-3xl sm:rounded-3xl max-h-[85vh] shadow-2xl"
        >
          {/* 顶部 */}
          <div className="px-5 pt-6 pb-2 border-b border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">谁可以看</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
            </div>

            <div className="flex p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
              <button onClick={() => setActiveTab('VISIBLE_TO')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  activeTab === 'VISIBLE_TO' ? 'bg-white dark:bg-gray-700 text-primary-500 shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}>👁️ 部分可见</button>
              <button onClick={() => setActiveTab('INVISIBLE_TO')}
                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all duration-300 ${
                  activeTab === 'INVISIBLE_TO' ? 'bg-white dark:bg-gray-700 text-red-500 shadow-sm' : 'text-gray-500 dark:text-gray-400'
                }`}>🚫 不给谁看</button>
            </div>
            <p className="text-xs text-gray-400 mt-3 mb-1 px-1">
              {activeTab === 'VISIBLE_TO' ? '选中的分组将可以看见这条动态。' : '选中的分组将【绝对无法】看见这条动态。'}
            </p>
          </div>

          {/* 分组列表 */}
          <div className="flex-1 overflow-y-auto p-3">
            {loading ? (
              <p className="py-10 text-center text-sm text-gray-400">加载中...</p>
            ) : groups.length === 0 ? (
              <div className="py-10 text-center flex flex-col items-center">
                <p className="text-sm text-gray-400">你还没有创建任何星域分组</p>
                <button onClick={() => { onClose(); onManageGroups(); }}
                  className="mt-3 text-sm text-primary-500 hover:underline">去创建</button>
              </div>
            ) : (
              <div className="space-y-1">
                {groups.map(group => {
                  const isSelected = selectedIds.has(group.id);
                  return (
                    <label key={group.id}
                      className={`flex items-center justify-between p-3 rounded-2xl cursor-pointer transition-colors ${
                        isSelected
                          ? (activeTab === 'VISIBLE_TO' ? 'bg-primary-50 dark:bg-primary-900/20' : 'bg-red-50 dark:bg-red-900/20')
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                      onClick={() => toggleSelection(group.id)}>
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                          isSelected
                            ? (activeTab === 'VISIBLE_TO' ? 'border-primary-500 bg-primary-500' : 'border-red-500 bg-red-500')
                            : 'border-gray-300 dark:border-gray-600'
                        }`}>
                          {isSelected && <span className="text-white text-xs font-bold">✓</span>}
                        </div>
                        <div>
                          <p className={`text-sm font-medium ${isSelected && activeTab === 'INVISIBLE_TO' ? 'text-red-500' : 'text-gray-800 dark:text-gray-200'}`}>
                            {group.name}
                          </p>
                          <p className="text-xs text-gray-400 mt-0.5">{group.members.length} 位成员</p>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          {/* 底部 */}
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 rounded-b-3xl">
            <div className="flex items-center gap-3">
              <button onClick={() => { onClose(); onManageGroups(); }}
                className="px-4 py-3 rounded-xl bg-gray-200 dark:bg-gray-800 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-300 transition-colors">
                管理星域
              </button>
              <button onClick={handleConfirm}
                className={`flex-1 py-3 rounded-xl text-sm font-bold text-white transition-all shadow-sm ${
                  selectedIds.size === 0 ? 'bg-gray-800 dark:bg-gray-700'
                    : activeTab === 'VISIBLE_TO' ? 'bg-primary-500 hover:bg-primary-600 shadow-primary-500/25'
                    : 'bg-red-500 hover:bg-red-600 shadow-red-500/25'
                }`}>
                {selectedIds.size === 0 ? '设为公开' : `确定 (${selectedIds.size}个组, ${selectedPeopleCount}人)`}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
