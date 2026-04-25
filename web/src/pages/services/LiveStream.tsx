import { Link } from 'react-router-dom';
import PlanGenerator from '../../components/PlanGenerator';
import { useSeo } from '../../components/SeoHead';

const FEATURES = ['选品排品', '直播脚本', '话术模板', '场控流程'];
const CTA_TEXT = '立即生成直播方案';
const RELATED = [
  { to: '/services/video', label: '短视频制作' },
  { to: '/workspace/scripts', label: '话术库' },
];

const fields = [
  {
    name: 'category',
    label: '直播品类',
    type: 'text' as const,
    placeholder: '例如：女装/美妆/食品',
  },
  {
    name: 'gmv',
    label: '目标GMV',
    type: 'text' as const,
    placeholder: '例如：10万元',
  },
  {
    name: 'duration',
    label: '直播时长',
    type: 'select' as const,
    options: [
      { label: '2小时', value: '2小时' },
      { label: '3小时', value: '3小时' },
      { label: '4小时', value: '4小时' },
      { label: '6小时以上', value: '6小时以上' },
    ],
  },
  {
    name: 'style',
    label: '主播风格',
    type: 'select' as const,
    options: [
      { label: '专业讲解型', value: '专业讲解型' },
      { label: '亲和互动型', value: '亲和互动型' },
      { label: '激情带货型', value: '激情带货型' },
      { label: '知识分享型', value: '知识分享型' },
    ],
  },
];

export default function LiveStream() {
  useSeo('live-stream');
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
            <Link to="/services" className="hover:text-blue-600 transition-colors">
              服务
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">直播操盘</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 bg-clip-text text-transparent">
              直播操盘
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            AI 直播策划方案生成，全流程直播运营支持
          </p>
        </div>
      </section>

      {/* Tool Section */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <PlanGenerator
            title="AI 直播策划方案生成器"
            description="输入直播信息，AI 自动生成完整直播策划方案"
            accentColor="blue"
            systemPrompt="你是一个资深的直播运营操盘手。请根据用户提供的直播信息，生成一份完整的直播策划方案。方案必须包含：## 📋 选品排品表（用表格列出：品名、价格、库存、讲解顺序、预估销量）\n## 🎬 直播脚本（分阶段脚本：开场预热→产品讲解→互动抽奖→逼单促单→收尾预告）\n## 💬 话术模板（开场话术、产品介绍话术、互动话术、逼单话术、应急话术）\n## 🎛️ 场控流程（用表格列出时间节点、动作、负责人）\n## ⚡ 应急预案（常见问题及应对方案：流量低、转化差、黑粉、设备故障等）\n请用Markdown格式输出，方案详实专业、可直接执行。"
            fields={fields}
          />
        </div>
      </section>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
              <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{f}</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="bg-gradient-to-r from-primary-600 to-purple-600 rounded-2xl p-8 text-center">
          <h3 className="text-xl font-bold text-white mb-2">{CTA_TEXT}</h3>
          <p className="text-sm text-white/80 mb-4">AI 智能生成，专业级输出，立即体验</p>
          <a href="#generator" className="inline-flex items-center gap-2 px-6 py-2.5 bg-white text-primary-700 text-sm font-semibold rounded-xl hover:bg-primary-50 transition-colors">
            {CTA_TEXT}
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </a>
        </div>
      </div>

      {/* Related Services */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">相关推荐</h3>
        <div className="flex flex-wrap gap-3">
          {RELATED.map((r) => (
            <Link key={r.to} to={r.to} className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-700 dark:text-gray-300 hover:border-primary-300 dark:hover:border-primary-700 hover:text-primary-600 transition-colors">
              {r.label} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
