import { Link } from 'react-router-dom';
import PlanGenerator from '../../components/PlanGenerator';

const TIPS = ['选择较长的规划周期可获得更完整的排期表', '明确运营目标有助于 AI 生成针对性内容', '可结合品牌声音功能保持内容风格一致'];

const RELATED = [
  { to: '/workspace/copywriting', label: '文案生成器' },
  { to: '/workspace/calendar', label: '营销日历' },
];

const fields = [
  {
    name: 'industry',
    label: '行业/品类',
    type: 'text' as const,
    placeholder: '例如：美妆护肤',
  },
  {
    name: 'platform',
    label: '主要运营平台',
    type: 'select' as const,
    options: [
      { label: '小红书', value: '小红书' },
      { label: '抖音', value: '抖音' },
      { label: '微信公众号', value: '微信公众号' },
      { label: '视频号', value: '视频号' },
      { label: '多平台', value: '多平台' },
    ],
  },
  {
    name: 'period',
    label: '规划周期',
    type: 'select' as const,
    options: [
      { label: '一周（7天）', value: '一周' },
      { label: '两周（14天）', value: '两周' },
      { label: '一个月（30天）', value: '一个月' },
    ],
  },
  {
    name: 'goal',
    label: '运营目标',
    type: 'textarea' as const,
    placeholder: '例如：涨粉5000，提升品牌曝光，推广新品XX',
  },
];

export default function MarketingCalendar() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-emerald-100/60 via-emerald-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-emerald-100/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-emerald-600 transition-colors">
              工具
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">营销日历</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 bg-clip-text text-transparent">
              AI 营销日历
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            输入运营信息，AI 自动生成内容发布排期计划
          </p>
        </div>
      </section>

      {/* Tool Section */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <PlanGenerator
            title="AI 营销日历生成器"
            description="输入运营信息，AI 自动生成内容排期计划"
            accentColor="emerald"
            systemPrompt="你是一个资深的社交媒体运营专家。请根据用户提供的运营信息，生成一份完整的营销内容日历。方案必须包含：## 📅 月度运营主题（本月核心营销主题和目标）\n## 📋 内容排期表（用Markdown表格列出：日期、平台、内容类型、主题方向、文案要点、备注）\n## 🎯 关键节点标注（节日、促销日、行业热点等需要重点投入的日期）\n## 📊 内容配比建议（种草/促销/互动/干货等内容类型的比例分配）\n## 💡 爆款选题建议（5个高潜力选题方向）\n请用Markdown格式输出，排期表至少覆盖14天。"
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
