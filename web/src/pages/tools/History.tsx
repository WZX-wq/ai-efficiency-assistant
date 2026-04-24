import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useHistory } from '../../hooks/useHistory';
import { exportAsMarkdown, exportAsText } from '../../utils/export';
import MarkdownRenderer from '../../components/MarkdownRenderer';
import { useToast } from '../../components/ToastProvider';
import type { HistoryRecord } from '../../services/history';

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const PAGE_SIZE = 10;

const TOOL_FILTERS = [
  { label: '全部', value: '' },
  { label: '改写', value: '智能改写' },
  { label: '扩写', value: '一键扩写' },
  { label: '翻译', value: '多语言翻译' },
  { label: '总结', value: '内容总结' },
  { label: '创意', value: '创意生成' },
  { label: '文案', value: '文案生成' },
  { label: '话术', value: '话术生成' },
  { label: '日历', value: '日历规划' },
  { label: 'SEO', value: 'SEO 优化' },
  { label: '人性化', value: '人性化改写' },
  { label: '润色', value: '文本润色' },
  { label: '摘要', value: '智能摘要' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format an ISO date string to a readable local format. */
function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Truncate text to a maximum length, appending ellipsis when needed. */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + '...';
}

/** Estimate storage usage in KB. */
function estimateStorageUsage(): string {
  try {
    const raw = localStorage.getItem('ai-assistant-history');
    if (!raw) return '0 KB';
    const bytes = new Blob([raw]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } catch {
    return '未知';
  }
}

/** Check if a date string is today. */
function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function History() {
  const { records, remove, clear, search } = useHistory();
  const { toast } = useToast();

  const [query, setQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [openExportId, setOpenExportId] = useState<string | null>(null);

  // 筛选与排序
  const [activeFilter, setActiveFilter] = useState('');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // 批量操作
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // 分页
  const [currentPage, setCurrentPage] = useState(1);

  const exportMenuRef = useRef<HTMLDivElement>(null);

  // Close export dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        exportMenuRef.current &&
        !exportMenuRef.current.contains(e.target as Node)
      ) {
        setOpenExportId(null);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // 筛选 + 搜索 + 排序后的记录
  const processed = useMemo(() => {
    let result: HistoryRecord[];

    // 搜索过滤
    if (query.trim()) {
      result = search(query);
    } else {
      result = [...records];
    }

    // 工具类型过滤
    if (activeFilter) {
      result = result.filter((r) => r.tool === activeFilter);
    }

    // 排序
    result.sort((a, b) => {
      const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? -diff : diff;
    });

    return result;
  }, [query, records, search, activeFilter, sortOrder]);

  // 分页计算
  const totalPages = Math.max(1, Math.ceil(processed.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedRecords = processed.slice(
    (safeCurrentPage - 1) * PAGE_SIZE,
    safeCurrentPage * PAGE_SIZE,
  );

  // 统计数据
  const totalCount = records.length;
  const todayCount = records.filter((r) => isToday(r.createdAt)).length;
  const storageUsage = estimateStorageUsage();

  // 当筛选条件变化时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [query, activeFilter, sortOrder]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleClearAll() {
    clear();
    setShowClearConfirm(false);
    setExpandedId(null);
    setSelectedIds(new Set());
    setSelectMode(false);
    toast('已清空全部历史记录', 'success');
  }

  function handleExport(record: HistoryRecord, format: 'md' | 'txt') {
    const filename = `${record.tool}_${record.title}`;
    if (format === 'md') {
      exportAsMarkdown(record.content, filename);
    } else {
      exportAsText(record.content, filename);
    }
    setOpenExportId(null);
    toast(`已导出为 ${format === 'md' ? 'Markdown' : '纯文本'} 文件`, 'success');
  }

  function handleDelete(id: string) {
    remove(id);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast('记录已删除', 'success');
  }

  // 全选/取消全选
  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === paginatedRecords.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(paginatedRecords.map((r) => r.id)));
    }
  }, [selectedIds.size, paginatedRecords]);

  const toggleSelect = useCallback((id: string) => {
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

  // 批量删除
  const handleBatchDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    selectedIds.forEach((id) => remove(id));
    toast(`已批量删除 ${selectedIds.size} 条记录`, 'success');
    setSelectedIds(new Set());
    setSelectMode(false);
  }, [selectedIds, remove, toast]);

  // 批量导出
  const handleBatchExport = useCallback(() => {
    if (selectedIds.size === 0) return;
    const selectedRecords = records.filter((r) => selectedIds.has(r.id));
    const content = selectedRecords
      .map(
        (r) =>
          `## ${r.title}\n\n**工具**: ${r.tool}\n**时间**: ${formatDate(r.createdAt)}\n\n${r.content}\n\n---\n`,
      )
      .join('\n');
    exportAsMarkdown(content, `批量导出_${new Date().toISOString().slice(0, 10)}`);
    toast(`已批量导出 ${selectedIds.size} 条记录`, 'success');
  }, [selectedIds, records, toast]);

  // 退出选择模式
  const exitSelectMode = useCallback(() => {
    setSelectMode(false);
    setSelectedIds(new Set());
  }, []);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-gray-200/60 via-gray-100/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-gray-200/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-gray-700 transition-colors">
              工具
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">历史记录</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600 bg-clip-text text-transparent">
              历史记录
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            查看和管理你的所有AI生成记录
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* 统计栏 */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-gray-900 dark:text-white">{totalCount}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">总记录数</div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-primary-600 dark:text-primary-400">{todayCount}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">今日新增</div>
            </div>
            <div className="bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 text-center">
              <div className="text-xl font-bold text-gray-900 dark:text-white">{storageUsage}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">存储占用</div>
            </div>
          </div>

          {/* 类型筛选标签 */}
          <div className="flex flex-wrap gap-2 mb-4">
            {TOOL_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setActiveFilter(filter.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  activeFilter === filter.value
                    ? 'bg-primary-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {/* Search & Actions Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
            {/* Search input */}
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="搜索标题或内容..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-shadow text-sm"
              />
            </div>

            {/* Sort dropdown */}
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as 'desc' | 'asc')}
              className="px-3 py-2.5 rounded-xl border border-gray-200 bg-white dark:bg-gray-800 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-gray-400 focus:border-transparent transition-shadow"
            >
              <option value="desc">最新优先</option>
              <option value="asc">最早优先</option>
            </select>

            {/* Select mode toggle */}
            <button
              onClick={() => {
                if (selectMode) {
                  exitSelectMode();
                } else {
                  setSelectMode(true);
                }
              }}
              className={`px-4 py-2.5 text-sm font-medium rounded-xl border transition-colors whitespace-nowrap ${
                selectMode
                  ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 border-primary-200 dark:border-primary-800'
                  : 'text-gray-600 dark:text-gray-300 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:bg-gray-50'
              }`}
            >
              {selectMode ? '退出选择' : '批量管理'}
            </button>

            {/* Clear all button */}
            {records.length > 0 && (
              <div className="relative">
                {showClearConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 dark:text-gray-300 whitespace-nowrap">确认清空？</span>
                    <button
                      onClick={handleClearAll}
                      className="px-3 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
                    >
                      确认
                    </button>
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      取消
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 hover:text-red-600 hover:border-red-200 transition-colors whitespace-nowrap"
                  >
                    清空全部
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Select mode: 全选提示 */}
          {selectMode && paginatedRecords.length > 0 && (
            <div className="flex items-center gap-3 mb-4 px-1">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-600 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={selectedIds.size === paginatedRecords.length && paginatedRecords.length > 0}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                全选当前页
              </label>
              <span className="text-xs text-gray-400 dark:text-gray-500">
                已选择 {selectedIds.size} 条
              </span>
            </div>
          )}

          {/* Empty State */}
          {processed.length === 0 && (
            <div className="text-center py-20">
              <svg className="mx-auto w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-gray-400 dark:text-gray-500 text-lg mb-1">
                {query.trim() || activeFilter ? '没有找到匹配的记录' : '暂无历史记录'}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                {query.trim() || activeFilter ? '尝试更换关键词或筛选条件' : '使用AI工具生成内容后，记录会出现在这里'}
              </p>
            </div>
          )}

          {/* History Cards */}
          <div className="space-y-3">
            {paginatedRecords.map((record) => {
              const isExpanded = expandedId === record.id;
              const isSelected = selectedIds.has(record.id);

              return (
                <div
                  key={record.id}
                  className={`bg-white dark:bg-gray-800 rounded-2xl border shadow-sm hover:shadow-md transition-shadow ${
                    isSelected
                      ? 'border-primary-300 dark:border-primary-700 ring-1 ring-primary-200 dark:ring-primary-800'
                      : 'border-gray-100 dark:border-gray-700'
                  }`}
                >
                  {/* Card Header */}
                  <div className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Select checkbox */}
                        {selectMode && (
                          <div className="pt-0.5">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleSelect(record.id)}
                              className="w-4 h-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                            />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          {/* Tool badge + title */}
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium bg-gray-100 dark:bg-gray-700 dark:text-gray-300 shrink-0">
                              {record.tool}
                            </span>
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                              {truncate(record.title, 50)}
                            </h3>
                          </div>

                          {/* Date */}
                          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">
                            {formatDate(record.createdAt)}
                          </p>

                          {/* Content preview (only when collapsed) */}
                          {!isExpanded && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                              {truncate(record.content, 100)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Action buttons */}
                      {!selectMode && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* View / Collapse toggle */}
                          <button
                            onClick={() => setExpandedId(isExpanded ? null : record.id)}
                            className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                          >
                            {isExpanded ? '收起' : '查看'}
                          </button>

                          {/* Export dropdown */}
                          <div className="relative" ref={openExportId === record.id ? exportMenuRef : undefined}>
                            <button
                              onClick={() => setOpenExportId(openExportId === record.id ? null : record.id)}
                              className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            >
                              导出
                            </button>
                            {openExportId === record.id && (
                              <div className="absolute right-0 top-full mt-1 w-32 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-lg py-1 z-10">
                                <button
                                  onClick={() => handleExport(record, 'md')}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                  Markdown
                                </button>
                                <button
                                  onClick={() => handleExport(record, 'txt')}
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                >
                                  纯文本
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(record.id)}
                            className="px-3 py-1.5 text-xs font-medium text-red-500 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                          >
                            删除
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-5 pb-5 border-t border-gray-100 dark:border-gray-700 pt-4">
                      <MarkdownRenderer content={record.content} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safeCurrentPage <= 1}
                className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                上一页
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 text-sm font-medium rounded-lg transition-colors ${
                    page === safeCurrentPage
                      ? 'bg-primary-600 text-white'
                      : 'text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safeCurrentPage >= totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                下一页
              </button>
            </div>
          )}

          {/* Pagination info */}
          {processed.length > 0 && (
            <p className="text-center text-xs text-gray-400 dark:text-gray-500 mt-3">
              共 {processed.length} 条记录，第 {safeCurrentPage}/{totalPages} 页
            </p>
          )}
        </div>
      </section>

      {/* Floating action bar for batch operations */}
      {selectMode && selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="flex items-center gap-3 px-6 py-3 bg-gray-900 dark:bg-gray-800 border border-gray-700 rounded-2xl shadow-2xl">
            <span className="text-sm text-gray-300 font-medium">
              已选择 {selectedIds.size} 条
            </span>
            <button
              onClick={handleBatchExport}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              批量导出
            </button>
            <button
              onClick={handleBatchDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
            >
              批量删除
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
