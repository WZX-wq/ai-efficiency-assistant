import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import PlanGenerator from '../../components/PlanGenerator';
import { templates, categoryMeta, type Template } from '../../data/templates';
import { useSeo } from '../../components/SeoHead';

type CategoryFilter = Template['category'] | 'all' | 'favorites';

type SortOption = 'default' | 'popular';

const CATEGORIES: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'marketing', label: '营销文案' },
  { key: 'social', label: '社交媒体' },
  { key: 'ecommerce', label: '电商运营' },
  { key: 'office', label: '办公效率' },
  { key: 'education', label: '教育培训' },
  { key: 'tech', label: '技术开发' },
  { key: 'life', label: '生活日常' },
  { key: 'creative', label: '创意灵感' },
  { key: 'seo', label: 'SEO优化' },
];

const FAVORITES_KEY = 'ai-assistant-template-favorites';
const USAGE_KEY = 'ai-assistant-template-usage';

function loadFavorites(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFavorites(ids: string[]) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(ids));
}

function loadUsage(): Record<string, number> {
  try {
    const raw = localStorage.getItem(USAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveUsage(data: Record<string, number>) {
  localStorage.setItem(USAGE_KEY, JSON.stringify(data));
}

function recordUsage(templateId: string) {
  const usage = loadUsage();
  usage[templateId] = (usage[templateId] || 0) + 1;
  saveUsage(usage);
}

/** Extract output format description from systemPrompt */
function extractOutputFormat(systemPrompt: string): string[] {
  const lines = systemPrompt.split('\n');
  const formats: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('##') || trimmed.startsWith('请用')) {
      formats.push(trimmed);
    }
  }
  return formats;
}

/** Highlight matched text in a string */
function HighlightText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <>{text}</>;
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const idx = lowerText.indexOf(lowerQuery);
  if (idx === -1) return <>{text}</>;
  const before = text.slice(0, idx);
  const match = text.slice(idx, idx + query.length);
  const after = text.slice(idx + query.length);
  return (
    <>
      {before}
      <mark className="bg-yellow-200 dark:bg-yellow-700/60 text-inherit rounded px-0.5">{match}</mark>
      {after}
    </>
  );
}

/** Heart icon SVG */
function HeartIcon({ filled, className = 'w-5 h-5' }: { filled: boolean; className?: string }) {
  return filled ? (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  ) : (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

/** Eye icon SVG */
function EyeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

/** Preview Modal */
function PreviewModal({
  template,
  onClose,
  onUse,
}: {
  template: Template;
  onClose: () => void;
  onUse: () => void;
}) {
  const meta = categoryMeta[template.category];
  const outputFormats = extractOutputFormat(template.systemPrompt);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      />
      {/* Modal */}
      <motion.div
        className="relative w-full max-w-2xl max-h-[85vh] bg-white dark:bg-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{template.icon}</span>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">{template.name}</h2>
              <span className={`inline-block mt-1 px-2.5 py-0.5 text-xs font-medium rounded-full ${meta.color}`}>
                {meta.label}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">描述</h3>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{template.description}</p>
          </div>

          {/* Tags */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">标签</h3>
            <div className="flex flex-wrap gap-2">
              {(template.tags ?? []).map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* Form Fields Preview */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">需要填写的信息</h3>
            <div className="space-y-2">
              {template.fields.map((field) => (
                <div
                  key={field.name}
                  className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg flex items-center justify-center text-xs font-bold">
                    {field.type === 'text' ? 'T' : field.type === 'textarea' ? 'P' : 'S'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{field.label}</p>
                    {field.placeholder && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{field.placeholder}</p>
                    )}
                  </div>
                  <span className="flex-shrink-0 text-xs text-gray-400 dark:text-gray-500">
                    {field.type === 'text' ? '单行文本' : field.type === 'textarea' ? '多行文本' : '下拉选择'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Output Format */}
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">输出格式</h3>
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
              {outputFormats.length > 0 ? (
                <ul className="space-y-1.5">
                  {outputFormats.map((fmt, i) => (
                    <li key={i} className="text-sm text-gray-600 dark:text-gray-300 font-mono">
                      {fmt}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">Markdown 格式输出</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-gray-100 dark:border-gray-700 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            关闭
          </button>
          <button
            onClick={onUse}
            className="px-6 py-2.5 text-sm font-medium text-white bg-blue-500 rounded-xl hover:bg-blue-600 shadow-md shadow-blue-500/25 transition-colors"
          >
            立即使用
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function Templates() {
  useSeo('templates');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<Template | null>(null);
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);
  const [usageData, setUsageData] = useState<Record<string, number>>(loadUsage);
  const [sortOption, setSortOption] = useState<SortOption>('default');

  // Sync favorites to localStorage
  useEffect(() => {
    saveFavorites(favorites);
  }, [favorites]);

  // Sync usage data to localStorage
  useEffect(() => {
    saveUsage(usageData);
  }, [usageData]);

  const toggleFavorite = useCallback((templateId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) =>
      prev.includes(templateId)
        ? prev.filter((id) => id !== templateId)
        : [...prev, templateId]
    );
  }, []);

  const handleUseTemplate = useCallback((template: Template) => {
    recordUsage(template.id);
    setUsageData(loadUsage());
    setPreviewTemplate(null);
    setSelectedTemplate(template);
  }, []);

  const filteredTemplates = useMemo(() => {
    let result = templates;

    // Category filter
    if (activeCategory === 'favorites') {
      result = result.filter((t) => favorites.includes(t.id));
    } else if (activeCategory !== 'all') {
      result = result.filter((t) => t.category === activeCategory);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Sort
    if (sortOption === 'popular') {
      result = [...result].sort((a, b) => (usageData[b.id] || 0) - (usageData[a.id] || 0));
    }

    return result;
  }, [activeCategory, searchQuery, favorites, sortOption, usageData]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const t of templates) {
      counts[t.category] = (counts[t.category] || 0) + 1;
    }
    return counts;
  }, []);

  // Template use view
  if (selectedTemplate) {
    const meta = categoryMeta[selectedTemplate.category];
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12">
          <div className="absolute inset-0 -z-10">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-blue-100/60 via-blue-50/40 to-transparent rounded-full blur-3xl" />
          </div>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
              <Link to="/workspace" className="hover:text-blue-600 transition-colors">工具</Link>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              <button onClick={() => setSelectedTemplate(null)} className="hover:text-blue-600 transition-colors">模板库</button>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
              <span className="text-gray-900 dark:text-white font-medium">{selectedTemplate.name}</span>
            </div>
            <div className="flex items-center gap-3 animate-slide-up">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
                返回模板库
              </button>
            </div>
            <h1 className="mt-4 text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
              <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 bg-clip-text text-transparent">
                {selectedTemplate.icon} {selectedTemplate.name}
              </span>
            </h1>
            <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">{selectedTemplate.description}</p>
            <div className="mt-3">
              <span className={`inline-block px-2.5 py-0.5 text-xs font-medium rounded-full ${meta.color}`}>{meta.label}</span>
            </div>
          </div>
        </section>
        <section className="pb-20 sm:pb-28">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <PlanGenerator
              title={selectedTemplate.name}
              description={selectedTemplate.description}
              accentColor="blue"
              systemPrompt={selectedTemplate.systemPrompt}
              fields={selectedTemplate.fields}
            />
          </div>
        </section>
      </div>
    );
  }

  // Template list view
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-blue-100/60 via-blue-50/40 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-blue-600 transition-colors">工具</Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">模板库</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 bg-clip-text text-transparent">模板库</span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            {templates.length}+ 专业模板，一键生成高质量内容
          </p>
        </div>
      </section>

      <section className="pb-20 sm:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Search + Category Tabs */}
          <div className="space-y-4 mb-8">
            {/* Search Bar */}
            <div className="relative">
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索模板名称、描述或标签..."
                className="w-full pl-11 pr-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-800 dark:text-gray-200 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Category Tabs + Sort */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all ${
                      activeCategory === cat.key
                        ? 'bg-blue-500 text-white shadow-md shadow-blue-500/25'
                        : 'bg-white dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                    }`}
                  >
                    {cat.label}
                    {cat.key !== 'all' && (
                      <span className="ml-1.5 text-xs opacity-70">
                        ({categoryCounts[cat.key] || 0})
                      </span>
                    )}
                  </button>
                ))}
                {/* Favorites tab */}
                <button
                  onClick={() => setActiveCategory('favorites')}
                  className={`px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-all ${
                    activeCategory === 'favorites'
                      ? 'bg-amber-500 text-white shadow-md shadow-amber-500/25'
                      : 'bg-white dark:bg-gray-800 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    <HeartIcon filled={activeCategory === 'favorites'} className="w-3.5 h-3.5" />
                    我的收藏
                    {favorites.length > 0 && (
                      <span className="ml-1 text-xs opacity-70">({favorites.length})</span>
                    )}
                  </span>
                </button>
              </div>

              {/* Sort */}
              <div className="flex-shrink-0">
                <select
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value as SortOption)}
                  className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-600 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  <option value="default">默认排序</option>
                  <option value="popular">最受欢迎</option>
                </select>
              </div>
            </div>
          </div>

          {/* Results count */}
          <div className="mb-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              共 {filteredTemplates.length} 个模板
              {searchQuery && <span> · 搜索 "<HighlightText text={searchQuery} query={searchQuery} /></span>}
            </span>
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => {
              const meta = categoryMeta[template.category];
              const isFavorite = favorites.includes(template.id);
              const useCount = usageData[template.id] || 0;
              return (
                <div
                  key={template.id}
                  className={`group relative text-left bg-white dark:bg-gray-800 rounded-2xl border p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 ${
                    isFavorite
                      ? 'border-amber-300 dark:border-amber-500 shadow-amber-100/50 dark:shadow-amber-900/20'
                      : 'border-gray-100 dark:border-gray-700 shadow-sm'
                  }`}
                >
                  {/* Favorite button - top right */}
                  <button
                    onClick={(e) => toggleFavorite(template.id, e)}
                    className={`absolute top-3 right-3 p-1.5 rounded-lg transition-all z-10 ${
                      isFavorite
                        ? 'text-amber-500 hover:text-amber-600 bg-amber-50 dark:bg-amber-900/20'
                        : 'text-gray-300 dark:text-gray-600 hover:text-amber-400 hover:bg-gray-50 dark:hover:bg-gray-700 opacity-0 group-hover:opacity-100'
                    }`}
                    title={isFavorite ? '取消收藏' : '收藏'}
                  >
                    <HeartIcon filled={isFavorite} className="w-5 h-5" />
                  </button>

                  {/* Favorite star indicator */}
                  {isFavorite && (
                    <div className="absolute top-3 left-3">
                      <svg className="w-4 h-4 text-amber-400" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z" />
                      </svg>
                    </div>
                  )}

                  {/* Card content */}
                  <div className="cursor-pointer" onClick={() => setSelectedTemplate(template)}>
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-2xl">{template.icon}</span>
                      <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${meta.color}`}>
                        {meta.label}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1.5">
                      <HighlightText text={template.name} query={searchQuery} />
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                      <HighlightText text={template.description} query={searchQuery} />
                    </p>
                  </div>

                  {/* Bottom actions */}
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                      {useCount > 0 && (
                        <span>使用 {useCount} 次</span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {/* Preview button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewTemplate(template);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                        title="预览"
                      >
                        <EyeIcon className="w-3.5 h-3.5" />
                        <span>预览</span>
                      </button>
                      {/* Use button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUseTemplate(template);
                        }}
                        className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      >
                        <span>立即使用</span>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty state */}
          {filteredTemplates.length === 0 && (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
              </div>
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                {activeCategory === 'favorites' ? '暂无收藏的模板' : '未找到匹配的模板'}
              </p>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                className="text-sm text-blue-500 hover:text-blue-600 font-medium"
              >
                {activeCategory === 'favorites' ? '浏览全部模板' : '清除筛选条件'}
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewTemplate && (
          <PreviewModal
            template={previewTemplate}
            onClose={() => setPreviewTemplate(null)}
            onUse={() => handleUseTemplate(previewTemplate)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
