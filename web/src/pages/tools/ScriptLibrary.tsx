import { Link } from 'react-router-dom';
import PlanGenerator from '../../components/PlanGenerator';
import { useSeo } from '../../components/SeoHead';

const TIPS = ['详细描述核心卖点，AI 会据此生成更有说服力的话术', '选择具体的话术场景可获得更专业的输出', '生成后可用人性化改写工具进一步优化语气'];

const RELATED = [
  { to: '/workspace/humanize', label: '人性化改写' },
  { to: '/workspace/polish', label: '文章润色' },
];

const fields = [
  {
    name: 'scene',
    label: '话术场景',
    type: 'select' as const,
    options: [
      { label: '客服咨询', value: '客服咨询' },
      { label: '销售跟进', value: '销售跟进' },
      { label: '直播带货', value: '直播带货' },
      { label: '社群运营', value: '社群运营' },
      { label: '售后处理', value: '售后处理' },
      { label: '电话邀约', value: '电话邀约' },
    ],
  },
  {
    name: 'product',
    label: '产品/服务名称',
    type: 'text' as const,
    placeholder: '例如：AI代运营服务套餐',
  },
  {
    name: 'feature',
    label: '核心卖点',
    type: 'textarea' as const,
    placeholder: '例如：7x24小时AI客服、数据分析看板、一键生成营销方案',
  },
  {
    name: 'audience',
    label: '目标客户',
    type: 'text' as const,
    placeholder: '例如：中小电商商家、实体店老板',
  },
];

export default function ScriptLibrary() {
  useSeo('scripts');
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-amber-100/60 via-amber-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-amber-100/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-amber-600 transition-colors">
              工具
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">话术库</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 bg-clip-text text-transparent">
              AI 话术库
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            选择场景，AI 自动生成专业话术方案
          </p>
        </div>
      </section>

      {/* Tool Section */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <PlanGenerator
            title="AI 话术库生成器"
            description="选择场景和产品信息，AI 自动生成专业话术"
            accentColor="amber"
            systemPrompt="你是一个资深的营销话术专家。请根据用户提供的场景和产品信息，生成一套完整的专业话术方案。方案必须包含：## 🗣️ 开场白（3种不同风格的开场方式）\n## 💬 核心话术（按场景分类的标准话术，每个至少3条）\n## ❓ 常见问答（客户最常问的5-8个问题及标准回答）\n## 🔄 异议处理（客户拒绝/犹豫时的应对话术）\n## 🎯 促单话术（引导成交的关键话术）\n## ⚡ 应急话术（遇到投诉/差评/突发情况的应对）\n请用Markdown格式输出，话术自然、专业、可直接使用。"
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
