import { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore, type ChatSession } from '../store/useChatStore';
import { useSeo } from '../components/SeoHead';
import { useToast } from '../components/ToastProvider';

// ============================================================
// Types
// ============================================================

type FilterType = 'all' | 'pinned' | 'week' | 'month';

// ============================================================
// Helpers
// ============================================================

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return '今天';
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays} 天前`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`;
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
}

function isThisWeek(timestamp: number): boolean {
  const now = new Date();
  const date = new Date(timestamp);
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - now.getDay());
  weekStart.setHours(0, 0, 0, 0);
  return date.getTime() >= weekStart.getTime();
}

function isThisMonth(timestamp: number): boolean {
  const now = new Date();
  const date = new Date(timestamp);
  return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
}

// ============================================================
// Component
// ============================================================

export default function ChatHistory() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { sessions, deleteSession, switchSession } = useChatStore();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // SEO
  useSeo({
    title: '对话历史 - AI效率助手',
    description: '查看和管理你的所有 AI 对话记录，支持搜索、筛选、批量操作和导入导出。',
    keywords: 'AI对话历史,对话记录,聊天记录管理,AI效率助手',
    canonicalUrl: '/chat-history',
  });

  // Filter sessions
  const filteredSessions = useMemo(() => {
    let result = [...sessions];

    // Apply filter
    switch (filter) {
      case 'pinned':
        result = result.filter((s) => s.pinned);
        break;
      case 'week':
        result = result.filter((s) => isThisWeek(s.updatedAt));
        break;
      case 'month':
        result = result.filter((s) => isThisMonth(s.updatedAt));
        break;
    }

    // Apply search
    if (search.trim()) {
      const lowerQuery = search.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(lowerQuery) ||
          s.messages.some((m) => m.content.toLowerCase().includes(lowerQuery)) ||
          s.tags?.some((tag) => tag.toLowerCase().includes(lowerQuery))
      );
    }

    // Sort by updatedAt desc
    result.sort((a, b) => b.updatedAt - a.updatedAt);
    return result;
  }, [sessions, filter, search]);

  // Stats
  const stats = useMemo(() => {
    const totalSessions = sessions.length;
    const weekSessions = sessions.filter((s) => isThisWeek(s.updatedAt)).length;
    const totalMessages = sessions.reduce((sum, s) => sum + s.messages.length, 0);

    // Most used "command" - count slash commands in messages
    const commandCounts: Record<string, number> = {};
    for (const session of sessions) {
      for (const msg of session.messages) {
        if (msg.role === 'user' && msg.content.startsWith('/')) {
          const cmd = msg.content.split(' ')[0];
          commandCounts[cmd] = (commandCounts[cmd] || 0) + 1;
        }
      }
    }
    const topCommand = Object.entries(commandCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '无';

    return { totalSessions, weekSessions, totalMessages, topCommand };
  }, [sessions]);

  // ---- Handlers ----

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredSessions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSessions.map((s) => s.id)));
    }
  }, [selectedIds.size, filteredSessions]);

  const handleDeleteSelected = useCallback(() => {
    if (selectedIds.size === 0) {
      toast('请先选择要删除的对话', 'warning');
      return;
    }
    if (window.confirm(`确定要删除选中的 ${selectedIds.size} 个对话吗？`)) {
      for (const id of selectedIds) {
        deleteSession(id);
      }
      toast(`已删除 ${selectedIds.size} 个对话`, 'success');
      setSelectedIds(new Set());
    }
  }, [selectedIds, deleteSession, toast]);

  const handleExportSelected = useCallback(() => {
    if (selectedIds.size === 0) {
      toast('请先选择要导出的对话', 'warning');
      return;
    }
    const selected = sessions.filter((s) => selectedIds.has(s.id));
    const data = JSON.stringify(selected, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast(`已导出 ${selectedIds.size} 个对话`, 'success');
  }, [selectedIds, sessions, toast]);

  const handleExportAll = useCallback(() => {
    const data = JSON.stringify(sessions, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-chats-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('已导出所有对话', 'success');
  }, [sessions, toast]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      try {
        const text = await file.text();
        const imported = JSON.parse(text) as ChatSession[];
        if (!Array.isArray(imported)) throw new Error('Invalid format');
        // Merge with existing sessions
        const existing = useChatStore.getState().sessions;
        const existingIds = new Set(existing.map((s) => s.id));
        const newSessions = imported.filter((s) => !existingIds.has(s.id));
        useChatStore.setState({ sessions: [...newSessions, ...existing] });
        toast(`已导入 ${newSessions.length} 个对话`, 'success');
      } catch {
        toast('导入失败，请检查文件格式', 'error');
      }
    };
    input.click();
  }, [toast]);

  const handleOpenSession = useCallback(
    (id: string) => {
      switchSession(id);
      navigate('/chat');
    },
    [switchSession, navigate]
  );

  const handleDeleteSession = useCallback(
    (id: string) => {
      if (window.confirm('确定要删除此对话吗？')) {
        deleteSession(id);
        toast('对话已删除', 'success');
      }
    },
    [deleteSession, toast]
  );

  // ---- Render ----

  const filterOptions: { key: FilterType; label: string }[] = [
    { key: 'all', label: '全部' },
    { key: 'pinned', label: '已置顶' },
    { key: 'week', label: '本周' },
    { key: 'month', label: '本月' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            对话历史
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            查看和管理你的所有 AI 对话记录
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">总对话数</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalSessions}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">本周对话</p>
            <p className="text-2xl font-bold text-primary-600 dark:text-primary-400">{stats.weekSessions}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">总消息数</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalMessages}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
            <p className="text-xs text-gray-400 dark:text-gray-500 mb-1">最常用指令</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.topCommand}</p>
          </div>
        </div>

        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            {/* Search */}
            <div className="flex-1 w-full">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索对话标题或内容..."
                className="w-full px-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2">
              {filterOptions.map((opt) => (
                <button
                  key={opt.key}
                  onClick={() => setFilter(opt.key)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                    filter === opt.key
                      ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-400 font-medium'
                      : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Bulk actions */}
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
            <button
              onClick={handleSelectAll}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              {selectedIds.size === filteredSessions.length && filteredSessions.length > 0
                ? '取消全选'
                : '全选'}
            </button>

            {selectedIds.size > 0 && (
              <>
                <span className="text-sm text-gray-400">
                  已选 {selectedIds.size} 项
                </span>
                <button
                  onClick={handleDeleteSelected}
                  className="text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                >
                  删除选中
                </button>
                <button
                  onClick={handleExportSelected}
                  className="text-sm text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300 transition-colors"
                >
                  导出选中
                </button>
              </>
            )}

            <div className="flex-1" />

            <button
              onClick={handleImport}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              导入
            </button>
            <button
              onClick={handleExportAll}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
            >
              导出全部
            </button>
          </div>
        </div>

        {/* Session list */}
        {filteredSessions.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-800 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {search ? '未找到匹配的对话' : '暂无对话记录'}
            </p>
            {!search && (
              <button
                onClick={() => navigate('/chat')}
                className="mt-3 text-sm text-primary-600 dark:text-primary-400 hover:underline"
              >
                开始新对话
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredSessions.map((session) => (
              <div
                key={session.id}
                className={`bg-white dark:bg-gray-800 rounded-xl border transition-colors ${
                  selectedIds.has(session.id)
                    ? 'border-primary-300 dark:border-primary-600 bg-primary-50/50 dark:bg-primary-900/10'
                    : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <div className="flex items-start gap-3 p-4">
                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={selectedIds.has(session.id)}
                    onChange={() => handleToggleSelect(session.id)}
                    className="mt-1 w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500 cursor-pointer"
                  />

                  {/* Content */}
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleOpenSession(session.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {session.pinned && (
                        <span className="text-xs text-amber-500" title="已置顶">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </span>
                      )}
                      <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                        {session.title}
                      </h3>
                    </div>

                    {/* Preview */}
                    {session.messages.length > 0 && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 mb-2">
                        {session.messages[session.messages.length - 1].content.slice(0, 120)}
                        {session.messages[session.messages.length - 1].content.length > 120 ? '...' : ''}
                      </p>
                    )}

                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                      <span>{formatDate(session.updatedAt)}</span>
                      <span>{session.messages.length} 条消息</span>
                      {session.tags && session.tags.length > 0 && (
                        <div className="flex items-center gap-1">
                          {session.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleOpenSession(session.id)}
                      className="p-1.5 text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 rounded-lg transition-colors"
                      title="打开对话"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDeleteSession(session.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded-lg transition-colors"
                      title="删除"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
