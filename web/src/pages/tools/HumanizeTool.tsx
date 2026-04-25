import { Link } from 'react-router-dom';
import PlanGenerator from '../../components/PlanGenerator';
import { useSeo } from '../../components/SeoHead';

const TIPS = ['选择"自然口语"模式效果最接近真人写作', '改写后建议人工审核确保事实准确性', '可多次改写后挑选最自然的版本'];

const RELATED = [
  { to: '/workspace/polish', label: '文章润色' },
  { to: '/workspace/summarizer', label: '文本摘要' },
];

const fields = [
  {
    name: 'text',
    label: '待改写文本',
    type: 'textarea' as const,
    placeholder: '粘贴AI生成的文本...',
  },
  {
    name: 'mode',
    label: '改写模式',
    type: 'select' as const,
    options: [
      { label: '通用人性化', value: '通用人性化' },
      { label: '朋友圈/小红书风', value: '朋友圈/小红书风' },
      { label: '学术论文风', value: '学术论文风' },
      { label: '商务报告风', value: '商务报告风' },
      { label: '文学散文风', value: '文学散文风' },
    ],
  },
  {
    name: 'tone',
    label: '目标语气',
    type: 'select' as const,
    options: [
      { label: '自然随意', value: '自然随意' },
      { label: '专业严谨', value: '专业严谨' },
      { label: '活泼有趣', value: '活泼有趣' },
      { label: '温暖真诚', value: '温暖真诚' },
    ],
  },
];

export default function HumanizeTool() {
  useSeo('humanize');
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-rose-100/60 via-rose-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-rose-100/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-rose-600 transition-colors">
              工具
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">人性化改写</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 bg-clip-text text-transparent">
              AI 人性化改写
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            去除AI生成痕迹，让文字更自然、更有温度
          </p>
        </div>
      </section>

      {/* Tool Section */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <PlanGenerator
            title="AI 人性化改写器"
            description="粘贴AI生成的文本，一键改写为自然的人类语言"
            accentColor="rose"
            systemPrompt={'你是一个专业的文本人性化改写专家。你的任务是将AI生成的文本改写为更自然、更像人类写作的文本。\n\n请遵循以下原则：\n1. **打破AI腔调**：避免"首先...其次...最后"、"值得注意的是"、"综上所述"等AI常用套话\n2. **增加口语化表达**：适当使用口语、语气词、省略句，让文字更接地气\n3. **句式多样化**：混合使用短句（5-10字）和长句（30-50字），增加节奏感\n4. **加入个人色彩**：适当加入主观感受、个人经历引用、情绪波动\n5. **适度不完美**：允许一些口语化的重复、转折、自我纠正，模拟真实写作过程\n6. **保持原意**：不改变原文的核心信息和观点\n\n请直接输出改写后的文本，不要添加任何解释。'}
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
