import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useKnowledgeStore, type KnowledgeItem } from '../store/useKnowledgeStore';
import { useTranslation } from '../i18n';
import { useSeo } from '../components/SeoHead';
import KnowledgeEditor from '../components/KnowledgeEditor';

// ============================================================
// Type Icons & Helpers
// ============================================================

const TYPE_ICONS: Record<KnowledgeItem['type'], string> = {
  note: '📝',
  article: '📰',
  snippet: '💻',
  bookmark: '🔖',
  reference: '📚',
};

const TYPE_COLORS: Record<KnowledgeItem['type'], string> = {
  note: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  article: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  snippet: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  bookmark: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  reference: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins}分钟前`;
    const diffHours = Math.floor(diffMins / 60);
    return `${diffHours}小时前`;
  }
  if (diffDays === 1) return '昨天';
  if (diffDays < 7) return `${diffDays}天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

function formatFullDate(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ============================================================
// Component
// ============================================================

type ViewMode = 'grid' | 'list';
type SortMode = 'updated' | 'created' | 'title' | 'wordCount';

export default function KnowledgeBase() {
  const { t } = useTranslation();
  const {
    items,
    categories,
    search,
    getPinnedItems,
    getAllTags,
    togglePin,
    toggleFavorite,
    deleteItem,
    exportData,
    importData,
  } = useKnowledgeStore();

  useSeo({
    title: '知识库 - AI效率助手',
    description: 'AI效率助手知识库，管理笔记、文章、代码片段、书签和参考资料，构建你的个人知识体系。',
    keywords: '知识库,笔记管理,知识管理,AI效率助手,个人知识体系',
    canonicalUrl: '/knowledge',
  });

  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortMode, setSortMode] = useState<SortMode>('updated');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<KnowledgeItem | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editItem, setEditItem] = useState<KnowledgeItem | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Computed
  const pinnedItems = useMemo(() => getPinnedItems(), [items]);
  const allTags = useMemo(() => getAllTags().slice(0, 20), [items]);
  const filteredItems = useMemo(() => {
    const filters: { type?: string; category?: string; tags?: string[] } = {};
    if (filterType) filters.type = filterType;
    if (filterCategory) filters.category = filterCategory;
    if (selectedTag) filters.tags = [selectedTag];
    const result = search(searchQuery, filters);
    return result
      .filter((item) => !pinnedItems.some((p) => p.id === item.id))
      .sort((a, b) => {
        switch (sortMode) {
          case 'updated': return b.updatedAt - a.updatedAt;
          case 'created': return b.createdAt - a.createdAt;
          case 'title': return a.title.localeCompare(b.title, 'zh');
          case 'wordCount': return b.wordCount - a.wordCount;
          default: return 0;
        }
      });
  }, [items, searchQuery, filterType, filterCategory, selectedTag, sortMode, search, pinnedItems]);

  const totalItems = items.length;
  const storageEstimate = useMemo(() => {
    const bytes = new Blob([JSON.stringify(items)]).size;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, [items]);

  // Handlers
  const handleNew = useCallback(() => {
    setEditItem(null);
    setEditorOpen(true);
  }, []);

  const handleEdit = useCallback((item: KnowledgeItem) => {
    setEditItem(item);
    setEditorOpen(true);
  }, []);

  const handleDelete = useCallback(
    (id: string) => {
      if (deleteConfirmId === id) {
        deleteItem(id);
        setDeleteConfirmId(null);
        if (selectedItem?.id === id) setSelectedItem(null);
      } else {
        setDeleteConfirmId(id);
        setTimeout(() => setDeleteConfirmId(null), 3000);
      }
    },
    [deleteConfirmId, deleteItem, selectedItem]
  );

  const handleSelectCategory = useCallback(
    (catId: string) => {
      setFilterCategory(filterCategory === catId ? '' : catId);
      setSelectedTag(null);
    },
    [filterCategory]
  );

  const handleSelectTag = useCallback((tag: string) => {
    setSelectedTag(selectedTag === tag ? null : tag);
    setFilterCategory('');
  }, [selectedTag]);

  const handleExport = useCallback(() => {
    const json = exportData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `knowledge-base-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [exportData]);

  const handleImport = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        importData(text);
      };
      reader.readAsText(file);
    };
    input.click();
  }, [importData]);

  const isEmpty = items.length === 0;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
      <div className="flex h-[calc(100vh-4rem)]">
        {/* ====== Left Sidebar ====== */}
        <aside
          className={`${
            sidebarOpen ? 'w-[260px]' : 'w-0'
          } flex-shrink-0 overflow-hidden transition-all duration-300 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800`}
        >
          <div className="w-[260px] h-full flex flex-col">
            {/* New Button */}
            <div className="p-4">
              <button
                onClick={handleNew}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm hover:shadow-md"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                {t('knowledge.newItem')}
              </button>
            </div>

            {/* Categories */}
            <div className="px-3 flex-1 overflow-y-auto">
              <button
                onClick={() => { setFilterCategory(''); setSelectedTag(null); }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors mb-1 ${
                  !filterCategory && !selectedTag
                    ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span>📂</span>
                  {t('knowledge.all')}
                </span>
                <span className="text-xs bg-gray-100 dark:bg-gray-600 px-2 py-0.5 rounded-full">{totalItems}</span>
              </button>

              <div className="mt-1 space-y-0.5">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategory(cat.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                      filterCategory === cat.id
                        ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 font-medium'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <span>{cat.icon}</span>
                      {cat.name}
                    </span>
                    {cat.count > 0 && (
                      <span className="text-xs bg-gray-100 dark:bg-gray-600 px-2 py-0.5 rounded-full">{cat.count}</span>
                    )}
                  </button>
                ))}
              </div>

              {/* Tags Cloud */}
              {allTags.length > 0 && (
                <div className="mt-6">
                  <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {t('knowledge.tags')}
                  </h3>
                  <div className="flex flex-wrap gap-1.5 px-1">
                    {allTags.map(({ tag, count }) => (
                      <button
                        key={tag}
                        onClick={() => handleSelectTag(tag)}
                        className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-lg transition-colors ${
                          selectedTag === tag
                            ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 font-medium'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {tag}
                        <span className="text-[10px] opacity-60">{count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Storage & Actions */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 space-y-3">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{t('knowledge.storage')}</span>
                <span>{storageEstimate}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleExport}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  title={t('common.export')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {t('common.export')}
                </button>
                <button
                  onClick={handleImport}
                  className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 text-xs text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  title={t('common.import')}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                  {t('common.import')}
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* ====== Main Content ====== */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {/* Top Bar */}
          <div className="flex items-center gap-3 px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            {/* Sidebar Toggle */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              aria-label="Toggle sidebar"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Search */}
            <div className="flex-1 max-w-md relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('knowledge.searchPlaceholder')}
                className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
              />
            </div>

            {/* Type Filter */}
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            >
              <option value="">{t('knowledge.allTypes')}</option>
              <option value="note">{t('knowledge.type.note')}</option>
              <option value="article">{t('knowledge.type.article')}</option>
              <option value="snippet">{t('knowledge.type.snippet')}</option>
              <option value="bookmark">{t('knowledge.type.bookmark')}</option>
              <option value="reference">{t('knowledge.type.reference')}</option>
            </select>

            {/* Sort */}
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none"
            >
              <option value="updated">{t('knowledge.sort.updated')}</option>
              <option value="created">{t('knowledge.sort.created')}</option>
              <option value="title">{t('knowledge.sort.title')}</option>
              <option value="wordCount">{t('knowledge.sort.wordCount')}</option>
            </select>

            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 dark:bg-gray-700 rounded-lg p-0.5">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid' ? 'bg-white dark:bg-gray-600 shadow-sm text-amber-600' : 'text-gray-400'
                }`}
                aria-label="Grid view"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'list' ? 'bg-white dark:bg-gray-600 shadow-sm text-amber-600' : 'text-gray-400'
                }`}
                aria-label="List view"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {isEmpty ? (
              <EmptyState onNew={handleNew} />
            ) : (
              <>
                {/* Pinned Items */}
                {pinnedItems.length > 0 && (
                  <div className="mb-6">
                    <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">
                      <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                      </svg>
                      {t('knowledge.pinned')}
                    </h2>
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin">
                      {pinnedItems.map((item) => (
                        <PinnedCard
                          key={item.id}
                          item={item}
                          onSelect={setSelectedItem}
                          onEdit={handleEdit}
                          onTogglePin={togglePin}
                          onToggleFavorite={toggleFavorite}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Active Filters */}
                {(filterType || filterCategory || selectedTag || searchQuery) && (
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span className="text-xs text-gray-400">{t('knowledge.activeFilters')}:</span>
                    {searchQuery && (
                      <FilterChip label={`${t('knowledge.search')}: "${searchQuery}"`} onRemove={() => setSearchQuery('')} />
                    )}
                    {filterType && (
                      <FilterChip label={`${t('knowledge.type')}: ${t(`knowledge.type.${filterType}`)}`} onRemove={() => setFilterType('')} />
                    )}
                    {filterCategory && (
                      <FilterChip
                        label={`${t('knowledge.category')}: ${categories.find((c) => c.id === filterCategory)?.name || filterCategory}`}
                        onRemove={() => setFilterCategory('')}
                      />
                    )}
                    {selectedTag && (
                      <FilterChip label={`#${selectedTag}`} onRemove={() => setSelectedTag(null)} />
                    )}
                    <button
                      onClick={() => { setSearchQuery(''); setFilterType(''); setFilterCategory(''); setSelectedTag(null); }}
                      className="text-xs text-amber-600 hover:text-amber-700 dark:text-amber-400"
                    >
                      {t('knowledge.clearFilters')}
                    </button>
                  </div>
                )}

                {/* Items */}
                {filteredItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                    <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <p className="text-sm">{t('knowledge.noResults')}</p>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredItems.map((item) => (
                      <GridCard
                        key={item.id}
                        item={item}
                        onSelect={setSelectedItem}
                        onEdit={handleEdit}
                        onTogglePin={togglePin}
                        onToggleFavorite={toggleFavorite}
                        onDelete={handleDelete}
                        deleteConfirmId={deleteConfirmId}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredItems.map((item) => (
                      <ListRow
                        key={item.id}
                        item={item}
                        onSelect={setSelectedItem}
                        onEdit={handleEdit}
                        onTogglePin={togglePin}
                        onToggleFavorite={toggleFavorite}
                        onDelete={handleDelete}
                        deleteConfirmId={deleteConfirmId}
                      />
                    ))}
                  </div>
                )}

                {/* Count */}
                <div className="mt-6 text-center text-xs text-gray-400">
                  {t('knowledge.showingItems', { count: String(filteredItems.length), total: String(totalItems) })}
                </div>
              </>
            )}
          </div>
        </main>

        {/* ====== Right Detail Panel ====== */}
        <AnimatePresence>
          {selectedItem && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 400, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="flex-shrink-0 overflow-hidden border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
            >
              <DetailPanel
                item={selectedItem}
                onClose={() => setSelectedItem(null)}
                onEdit={handleEdit}
                onTogglePin={togglePin}
                onToggleFavorite={toggleFavorite}
                onDelete={handleDelete}
                deleteConfirmId={deleteConfirmId}
              />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Editor Modal */}
      <KnowledgeEditor
        open={editorOpen}
        onClose={() => { setEditorOpen(false); setEditItem(null); }}
        editItem={editItem}
      />
    </div>
  );
}

// ============================================================
// Sub-components
// ============================================================

function EmptyState({ onNew }: { onNew: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center h-full py-20">
      {/* CSS Art Book Illustration */}
      <div className="relative mb-8">
        <div className="w-32 h-40 bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 rounded-2xl shadow-lg flex items-center justify-center">
          <div className="w-24 h-32 bg-white dark:bg-gray-700 rounded-xl shadow-inner flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-1.5 bg-amber-300 dark:bg-amber-600 rounded-full" />
            <div className="w-16 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full" />
            <div className="w-14 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full" />
            <div className="w-10 h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full" />
            <div className="mt-2 w-8 h-8 bg-amber-100 dark:bg-amber-900/40 rounded-lg flex items-center justify-center">
              <span className="text-lg">💡</span>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-amber-400 dark:bg-amber-600 rounded-xl shadow-md flex items-center justify-center">
          <span className="text-white text-lg">+</span>
        </div>
      </div>
      <h3 className="text-xl font-semibold text-gray-700 dark:text-gray-200 mb-2">
        {t('knowledge.emptyTitle')}
      </h3>
      <p className="text-sm text-gray-400 dark:text-gray-500 mb-6 max-w-xs text-center">
        {t('knowledge.emptyDesc')}
      </p>
      <button
        onClick={onNew}
        className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-xl transition-colors shadow-sm hover:shadow-md"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        {t('knowledge.createFirst')}
      </button>
    </div>
  );
}

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 text-xs rounded-lg">
      {label}
      <button onClick={onRemove} className="hover:text-amber-900 dark:hover:text-amber-200">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </span>
  );
}

function PinnedCard({
  item,
  onSelect,
  onEdit,
  onTogglePin,
  onToggleFavorite,
}: {
  item: KnowledgeItem;
  onSelect: (item: KnowledgeItem) => void;
  onEdit: (item: KnowledgeItem) => void;
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}) {
  const cat = useKnowledgeStore((s) => s.categories.find((c) => c.id === item.category));
  return (
    <motion.div
      layout
      className="flex-shrink-0 w-56 p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800/40 rounded-xl cursor-pointer hover:shadow-md transition-shadow group"
      onClick={() => onSelect(item)}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-lg">{TYPE_ICONS[item.type]}</span>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(item); }}
            className="p-1 rounded hover:bg-white/50"
          >
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFavorite(item.id); }}
            className="p-1 rounded hover:bg-white/50"
          >
            <svg className={`w-3.5 h-3.5 ${item.favorite ? 'text-amber-500 fill-amber-500' : 'text-gray-400'}`} fill={item.favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onTogglePin(item.id); }}
            className="p-1 rounded hover:bg-white/50"
          >
            <svg className="w-3.5 h-3.5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
          </button>
        </div>
      </div>
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{item.title}</h3>
      {item.summary && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">{item.summary}</p>
      )}
      <div className="flex items-center gap-2 mt-3">
        {cat && <span className="text-xs text-gray-400">{cat.icon}</span>}
        <span className="text-xs text-gray-400">{formatDate(item.updatedAt)}</span>
      </div>
    </motion.div>
  );
}

function GridCard({
  item,
  onSelect,
  onEdit,
  onTogglePin,
  onToggleFavorite,
  onDelete,
  deleteConfirmId,
}: {
  item: KnowledgeItem;
  onSelect: (item: KnowledgeItem) => void;
  onEdit: (item: KnowledgeItem) => void;
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  deleteConfirmId: string | null;
}) {
  const cat = useKnowledgeStore((s) => s.categories.find((c) => c.id === item.category));
  return (
    <motion.div
      layout
      className="group relative p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:shadow-lg hover:border-amber-300 dark:hover:border-amber-700 transition-all"
      onClick={() => onSelect(item)}
    >
      {/* Hover Actions */}
      <div className="absolute top-2 right-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <ActionBtn icon="edit" onClick={() => onEdit(item)} />
        <ActionBtn icon="pin" onClick={() => onTogglePin(item.id)} active={item.pinned} />
        <ActionBtn icon="favorite" onClick={() => onToggleFavorite(item.id)} active={item.favorite} />
        <ActionBtn
          icon="delete"
          onClick={() => onDelete(item.id)}
          active={deleteConfirmId === item.id}
          danger
        />
      </div>

      {/* Type Badge */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md ${TYPE_COLORS[item.type]}`}>
          {TYPE_ICONS[item.type]} {item.type}
        </span>
        {item.favorite && (
          <svg className="w-3.5 h-3.5 text-amber-500 fill-amber-500" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        )}
      </div>

      {/* Title */}
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-1 line-clamp-2 pr-16">
        {item.title}
      </h3>

      {/* Summary */}
      {item.summary && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">{item.summary}</p>
      )}

      {/* Tags */}
      {item.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {item.tags.slice(0, 3).map((tag) => (
            <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
              #{tag}
            </span>
          ))}
          {item.tags.length > 3 && (
            <span className="text-[10px] text-gray-400">+{item.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-400 pt-2 border-t border-gray-100 dark:border-gray-700">
        <span>{cat ? `${cat.icon} ${cat.name}` : ''}</span>
        <span>{formatDate(item.updatedAt)}</span>
      </div>
    </motion.div>
  );
}

function ListRow({
  item,
  onSelect,
  onEdit,
  onTogglePin,
  onToggleFavorite,
  onDelete,
  deleteConfirmId,
}: {
  item: KnowledgeItem;
  onSelect: (item: KnowledgeItem) => void;
  onEdit: (item: KnowledgeItem) => void;
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  deleteConfirmId: string | null;
}) {
  const cat = useKnowledgeStore((s) => s.categories.find((c) => c.id === item.category));
  return (
    <div
      className="group flex items-center gap-4 px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer hover:shadow-md hover:border-amber-300 dark:hover:border-amber-700 transition-all"
      onClick={() => onSelect(item)}
    >
      <span className="text-lg flex-shrink-0">{TYPE_ICONS[item.type]}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 truncate">{item.title}</h3>
          {item.pinned && (
            <svg className="w-3 h-3 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
            </svg>
          )}
          {item.favorite && (
            <svg className="w-3 h-3 text-amber-500 fill-amber-500 flex-shrink-0" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
          )}
        </div>
        {item.summary && (
          <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{item.summary}</p>
        )}
      </div>
      <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
        {item.tags.slice(0, 2).map((tag) => (
          <span key={tag} className="px-1.5 py-0.5 text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
            #{tag}
          </span>
        ))}
      </div>
      <span className="text-xs text-gray-400 flex-shrink-0 hidden md:block">{cat?.name}</span>
      <span className="text-xs text-gray-400 flex-shrink-0 w-16 text-right">{formatDate(item.updatedAt)}</span>
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <ActionBtn icon="edit" onClick={() => onEdit(item)} />
        <ActionBtn icon="pin" onClick={() => onTogglePin(item.id)} active={item.pinned} />
        <ActionBtn icon="favorite" onClick={() => onToggleFavorite(item.id)} active={item.favorite} />
        <ActionBtn icon="delete" onClick={() => onDelete(item.id)} active={deleteConfirmId === item.id} danger />
      </div>
    </div>
  );
}

function DetailPanel({
  item,
  onClose,
  onEdit,
  onTogglePin,
  onToggleFavorite,
  onDelete,
  deleteConfirmId,
}: {
  item: KnowledgeItem;
  onClose: () => void;
  onEdit: (item: KnowledgeItem) => void;
  onTogglePin: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  onDelete: (id: string) => void;
  deleteConfirmId: string | null;
}) {
  const { t } = useTranslation();
  const cat = useKnowledgeStore((s) => s.categories.find((c) => c.id === item.category));
  return (
    <div className="w-[400px] h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-200 truncate">{t('knowledge.detail')}</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Title */}
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{item.title}</h2>

        {/* Meta Row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md ${TYPE_COLORS[item.type]}`}>
            {TYPE_ICONS[item.type]} {t(`knowledge.type.${item.type}`)}
          </span>
          {cat && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-md">
              {cat.icon} {cat.name}
            </span>
          )}
        </div>

        {/* Tags */}
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <span key={tag} className="px-2 py-1 text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="prose prose-sm dark:prose-invert max-w-none">
          <pre className="whitespace-pre-wrap font-mono text-sm text-gray-700 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-200 dark:border-gray-600 leading-relaxed">
            {item.content}
          </pre>
        </div>

        {/* Metadata */}
        <div className="space-y-2 text-xs text-gray-400">
          <div className="flex justify-between">
            <span>{t('knowledge.created')}</span>
            <span>{formatFullDate(item.createdAt)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('knowledge.updated')}</span>
            <span>{formatFullDate(item.updatedAt)}</span>
          </div>
          <div className="flex justify-between">
            <span>{t('knowledge.wordCount')}</span>
            <span>{item.wordCount}</span>
          </div>
          {item.source && (
            <div className="flex justify-between">
              <span>{t('knowledge.sourceUrl')}</span>
              <a href={item.source} target="_blank" rel="noopener noreferrer" className="text-amber-600 dark:text-amber-400 hover:underline truncate max-w-[200px]">
                {item.source}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
        <button
          onClick={() => onEdit(item)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          {t('common.edit')}
        </button>
        <button
          onClick={() => onTogglePin(item.id)}
          className={`p-2 rounded-lg transition-colors ${item.pinned ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
          title={t('knowledge.unpin')}
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
          </svg>
        </button>
        <button
          onClick={() => onToggleFavorite(item.id)}
          className={`p-2 rounded-lg transition-colors ${item.favorite ? 'text-amber-500' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
        >
          <svg className="w-4 h-4" fill={item.favorite ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className={`p-2 rounded-lg transition-colors ${
            deleteConfirmId === item.id
              ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
              : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
          title={deleteConfirmId === item.id ? t('knowledge.confirmDelete') : t('common.delete')}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function ActionBtn({
  icon,
  onClick,
  active,
  danger,
}: {
  icon: 'edit' | 'pin' | 'favorite' | 'delete';
  onClick: () => void;
  active?: boolean;
  danger?: boolean;
}) {
  const IconMap = {
    edit: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    pin: (
      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
      </svg>
    ),
    favorite: (
      <svg className="w-3.5 h-3.5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    delete: (
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
  };

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className={`p-1.5 rounded-lg transition-colors ${
        active
          ? danger
            ? 'bg-red-100 dark:bg-red-900/30 text-red-600'
            : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600'
          : danger
            ? 'text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20'
            : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-200'
      }`}
    >
      {IconMap[icon]}
    </button>
  );
}
