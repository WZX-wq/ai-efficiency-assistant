import { Link } from 'react-router-dom';
import PlanGenerator from '../../components/PlanGenerator';
import { useSeo } from '../../components/SeoHead';

const FEATURES = ['专业分镜脚本', '爆款标题生成', 'BGM推荐', '多平台适配'];
const CTA_TEXT = '立即生成短视频脚本';
const RELATED = [
  { to: '/services/live-stream', label: '直播操盘' },
  { to: '/workspace/copywriting', label: '文案生成器' },
];

const fields = [
  {
    name: 'topic',
    label: '视频主题',
    type: 'textarea' as const,
    placeholder: '例如：iPhone 16 开箱测评',
  },
  {
    name: 'platform',
    label: '目标平台',
    type: 'select' as const,
    options: [
      { label: '抖音', value: '抖音' },
      { label: '快手', value: '快手' },
      { label: '小红书', value: '小红书' },
      { label: '视频号', value: '视频号' },
    ],
  },
  {
    name: 'style',
    label: '视频风格',
    type: 'select' as const,
    options: [
      { label: '种草推荐', value: '种草推荐' },
      { label: '产品测评', value: '产品测评' },
      { label: '剧情故事', value: '剧情故事' },
      { label: '口播知识', value: '口播知识' },
    ],
  },
  {
    name: 'duration',
    label: '视频时长',
    type: 'select' as const,
    options: [
      { label: '15秒以内', value: '15秒以内' },
      { label: '15-30秒', value: '15-30秒' },
      { label: '30-60秒', value: '30-60秒' },
      { label: '1-3分钟', value: '1-3分钟' },
      { label: '3分钟以上', value: '3分钟以上' },
    ],
  },
];

export default function VideoProduction() {
  useSeo('video');
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
            <span className="text-gray-900 dark:text-white font-medium">短视频制作</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 bg-clip-text text-transparent">
              短视频制作
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            AI 驱动短视频脚本创作，输入主题即可生成专业分镜脚本
          </p>
        </div>
      </section>

      {/* Tool Section */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <PlanGenerator
            title="AI 短视频脚本生成器"
            description="输入视频主题和参数，AI 自动生成专业短视频脚本"
            accentColor="blue"
            systemPrompt="你是一个专业的短视频脚本创作专家。请根据用户提供的主题、平台、风格等信息，生成一份完整的短视频脚本。脚本必须包含：## 📌 视频标题（吸引眼球的标题，含emoji）\n## 🎯 开头钩子（前3秒吸引注意力的文案）\n## 📝 分镜脚本（按时间线列出每个镜头的画面描述、字幕文案、时长）\n## 💬 结尾引导（引导点赞、评论、关注的话术）\n## 🎵 BGM建议（推荐背景音乐风格）\n请用Markdown格式输出，内容详实、可直接使用。"
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
