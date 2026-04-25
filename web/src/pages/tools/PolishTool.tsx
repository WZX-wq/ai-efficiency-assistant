import { Link } from 'react-router-dom';
import PlanGenerator from '../../components/PlanGenerator';
import { useSeo } from '../../components/SeoHead';

const TIPS = ['"学术严谨"模式适合论文和正式文档', '"文学优美"模式适合散文和创意写作', '润色后可用人性化改写进一步增加自然感'];

const RELATED = [
  { to: '/workspace/humanize', label: '人性化改写' },
  { to: '/workspace/summarizer', label: '文本摘要' },
];

const fields = [
  {
    name: 'text',
    label: '待润色文章',
    type: 'textarea' as const,
    placeholder: '粘贴你的文章...',
  },
  {
    name: 'mode',
    label: '润色风格',
    type: 'select' as const,
    options: [
      { label: '标准润色', value: '标准润色' },
      { label: '学术润色', value: '学术润色' },
      { label: '商务润色', value: '商务润色' },
      { label: '创意润色', value: '创意润色' },
    ],
  },
];

export default function PolishTool() {
  useSeo('polish');
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-blue-100/60 via-blue-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-blue-100/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-blue-600 transition-colors">
              工具
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">文章润色</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 bg-clip-text text-transparent">
              AI 文章润色
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            一键提升文章质量，让表达更精准、更有力
          </p>
        </div>
      </section>

      {/* Tool Section */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <PlanGenerator
            title="AI 文章润色器"
            description="粘贴你的文章，AI 自动润色提升表达质量"
            accentColor="blue"
            systemPrompt="你是一个资深的文章润色编辑。请对用户提供的文章进行专业润色。\n\n润色要求：\n1. **语法纠错**：修正语法错误、标点符号、错别字\n2. **表达优化**：替换重复用词，优化句式结构，使表达更精准\n3. **逻辑梳理**：检查段落间的逻辑关系，优化过渡衔接\n4. **文采提升**：适当使用修辞手法，增强文章的表现力和感染力\n5. **保持风格**：根据用户选择的润色风格调整文本\n\n请直接输出润色后的完整文章，不要添加任何解释。如果原文有明显问题，在文末用括号简要说明修改了什么。"
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
