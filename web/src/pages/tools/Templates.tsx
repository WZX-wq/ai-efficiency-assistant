import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import PlanGenerator from '../../components/PlanGenerator';
import { templates, categoryMeta, type Template } from '../../data/templates';
import { useSeo } from '../../components/SeoHead';

type CategoryFilter = Template['category'] | 'all';

const CATEGORIES: { key: CategoryFilter; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'marketing', label: '营销文案' },
  { key: 'social', label: '社交媒体' },
  { key: 'ecommerce', label: '电商运营' },
  { key: 'office', label: '办公效率' },
];

export default function Templates() {
  useSeo('templates');
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);

  const filteredTemplates = useMemo(() => {
    let result = templates;
    if (activeCategory !== 'all') {
      result = result.filter((t) => t.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.description.toLowerCase().includes(query) ||
          t.icon.includes(query)
      );
    }
    return result;
  }, [activeCategory, searchQuery]);

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
                placeholder="搜索模板..."
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

            {/* Category Tabs */}
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
                      ({templates.filter((t) => t.category === cat.key).length})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Results count */}
          <div className="mb-4">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              共 {filteredTemplates.length} 个模板
              {searchQuery && <span> · 搜索 "{searchQuery}"</span>}
            </span>
          </div>

          {/* Template Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => {
              const meta = categoryMeta[template.category];
              return (
                <button
                  key={template.id}
                  onClick={() => setSelectedTemplate(template)}
                  className="group text-left bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-2xl">{template.icon}</span>
                    <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${meta.color}`}>
                      {meta.label}
                    </span>
                  </div>
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-1.5">
                    {template.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed line-clamp-2">
                    {template.description}
                  </p>
                  <div className="mt-3 flex items-center gap-1 text-xs text-blue-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>立即使用</span>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </div>
                </button>
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
              <p className="text-gray-500 dark:text-gray-400 mb-2">未找到匹配的模板</p>
              <button
                onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
                className="text-sm text-blue-500 hover:text-blue-600 font-medium"
              >
                清除筛选条件
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
