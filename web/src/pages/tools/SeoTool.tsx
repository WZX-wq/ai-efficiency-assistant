import { Link } from 'react-router-dom';
import PlanGenerator from '../../components/PlanGenerator';

const TIPS = ['提供 3-5 个目标关键词效果最佳', '文章内容越长，优化建议越详细', '可多次运行对比不同关键词的优化效果'];

const RELATED = [
  { to: '/workspace/copywriting', label: '文案生成器' },
  { to: '/workspace/summarizer', label: '文本摘要' },
];

const fields = [
  {
    name: 'title',
    label: '文章标题',
    type: 'text' as const,
    placeholder: '例如：2026年最值得买的10款面膜推荐',
  },
  {
    name: 'keyword',
    label: '目标关键词',
    type: 'text' as const,
    placeholder: '例如：面膜推荐、护肤好物',
  },
  {
    name: 'content',
    label: '文章内容',
    type: 'textarea' as const,
    placeholder: '粘贴你的文章内容...',
  },
  {
    name: 'platform',
    label: '目标平台',
    type: 'select' as const,
    options: [
      { label: '百度', value: '百度' },
      { label: 'Google', value: 'Google' },
      { label: '小红书', value: '小红书' },
      { label: '通用', value: '通用' },
    ],
  },
];

export default function SeoTool() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-emerald-100/60 via-emerald-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-emerald-100/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-emerald-600 transition-colors">
              工具
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">SEO 优化</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 bg-clip-text text-transparent">
              SEO 优化
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            AI 分析内容并生成 SEO 优化建议
          </p>
        </div>
      </section>

      {/* Tool Section */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <PlanGenerator
            title="AI SEO 内容优化"
            description="输入文章信息，AI 生成 SEO 优化方案"
            accentColor="emerald"
            systemPrompt="你是一个资深的SEO优化专家。请根据用户提供的文章信息，生成一份完整的SEO优化方案。方案必须包含：## 🔍 关键词分析（核心关键词、长尾关键词建议、搜索意图分析）\n## 📝 SEO标题建议（生成5个优化标题，包含核心关键词，控制在30字以内）\n## 📋 Meta Description（生成3条，包含关键词，控制在150字以内，带行动号召）\n## 📊 内容优化建议（标题结构、段落优化、关键词密度建议、内链建议）\n## 🎯 排名提升策略（5条具体可执行的优化建议）\n请用Markdown格式输出，建议具体可执行。"
            fields={fields}
          />
        </div>
      </section>

      {/* Usage Tips */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">💡 使用技巧</h3>
        <ul className="space-y-2">
          {TIPS.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="text-primary-500 mt-0.5 shrink-0">•</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Related Tools */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">🔗 相关工具</h3>
        <div className="flex flex-wrap gap-2">
          {RELATED.map((r) => (
            <Link key={r.to} to={r.to} className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-primary-300 dark:hover:border-primary-700 hover:text-primary-600 transition-colors">
              {r.label} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
