import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

interface Sender {
  id: string; username: string; nickname: string; avatar: string;
}
interface SearchResult {
  id: string; senderId: string; receiverId: string | null; groupId: string | null;
  content: string; type: string; createdAt: string; sender: Sender;
}

export default function SearchMessagesPage() {
  const nav = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const doSearch = async () => {
    if (!query.trim()) return;
    setSearching(true); setSearched(true);
    try { setResults(await api<SearchResult[]>('GET', `/api/messages/search?q=${encodeURIComponent(query.trim())}`)); }
    catch { setResults([]); }
    finally { setSearching(false); }
  };

  const highlight = (text: string) => {
    const q = query.trim();
    if (!q) return text;
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = text.split(new RegExp(`(${escaped})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === q.toLowerCase()
        ? <mark key={i} className="bg-yellow-200 dark:bg-yellow-700/50 rounded px-0.5">{part}</mark>
        : <span key={i}>{part}</span>
    );
  };

  return (
    <div className="flex h-full overflow-y-auto flex-col bg-gray-50 dark:bg-gray-950">
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-900">
        <button onClick={() => nav('/')} className="text-sm text-primary-500 hover:underline">← 返回</button>
        <h1 className="text-lg font-bold text-gray-900 dark:text-gray-100">消息搜索</h1>
      </header>
      <div className="p-4">
        <div className="flex gap-2 mb-4">
          <input type="text" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()}
            placeholder="搜索聊天记录关键词..." autoFocus
            className="flex-1 rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100" />
          <button onClick={doSearch} disabled={searching || !query.trim()}
            className="rounded-xl bg-primary-500 px-4 py-2 text-sm font-medium text-white hover:bg-primary-600 disabled:opacity-50">
            {searching ? '...' : '搜索'}
          </button>
        </div>
        {searched && (
          <div className="space-y-2">
            {results.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-400">未找到相关消息</p>
            ) : (
              results.map(msg => {
                const displayName = msg.sender.nickname || msg.sender.username;
                const time = new Date(msg.createdAt).toLocaleString('zh-CN');
                const content = msg.content.length > 80 ? msg.content.slice(0, 80) + '...' : msg.content;
                return (
                  <div key={msg.id} onClick={() => {
                    const peerId = msg.receiverId || msg.senderId;
                    nav(`/chat/${peerId}`);
                  }}
                    className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-900 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-primary-500">{displayName}</span>
                      <span className="text-[10px] text-gray-400">{time}</span>
                      <span className="text-[10px] text-gray-300 ml-auto">
                        {msg.type === 'image' ? '📷' : msg.type === 'voice' ? '🎤' : '💬'}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {highlight(content)}
                    </p>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
