import { Link } from 'react-router-dom';
import PlanGenerator from '../../components/PlanGenerator';

const TIPS = ['描述越具体，AI 生成的创意方案越精准', '可以指定目标受众年龄段和性别偏好', '多尝试不同行业品类获取跨界灵感'];

const RELATED = [
  { to: '/workspace/copywriting', label: '文案生成器' },
  { to: '/workspace/brand', label: '品牌声音' },
];

const fields = [
  {
    name: 'product',
    label: '商品/品牌名称',
    type: 'text' as const,
    placeholder: '例如：花西子蜜粉',
  },
  {
    name: 'category',
    label: '行业品类',
    type: 'select' as const,
    options: [
      { label: '美妆护肤', value: '美妆护肤' },
      { label: '食品饮料', value: '食品饮料' },
      { label: '服装鞋帽', value: '服装鞋帽' },
      { label: '数码家电', value: '数码家电' },
      { label: '家居生活', value: '家居生活' },
      { label: '教育培训', value: '教育培训' },
    ],
  },
  {
    name: 'scene',
    label: '使用场景',
    type: 'textarea' as const,
    placeholder: '例如：新品上市推广、双十一大促、品牌升级、日常种草',
  },
  {
    name: 'platform',
    label: '投放平台',
    type: 'select' as const,
    options: [
      { label: '小红书', value: '小红书' },
      { label: '抖音', value: '抖音' },
      { label: '微信朋友圈', value: '微信朋友圈' },
      { label: '电商详情页', value: '电商详情页' },
      { label: '线下海报', value: '线下海报' },
    ],
  },
];

export default function CreativeTool() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-pink-100/60 via-pink-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-pink-100/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-pink-600 transition-colors">
              工具
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">创意灵感</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-pink-600 via-pink-500 to-pink-600 bg-clip-text text-transparent">
              AI 创意灵感
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            输入产品信息，AI 生成视觉创意方案、拍摄建议和配色推荐
          </p>
        </div>
      </section>

      {/* Tool Section */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <PlanGenerator
            title="AI 创意灵感生成器"
            description="输入产品信息，AI 自动生成视觉创意方案"
            accentColor="rose"
            systemPrompt="你是一个资深视觉创意总监。请根据用户提供的商品/品牌信息，生成一份完整的视觉创意方案。方案必须包含：## 🎨 视觉风格定义（整体风格调性、参考品牌/案例、目标受众审美偏好）\n## 📸 拍摄建议（场景布置、灯光方案、模特/道具建议、拍摄角度）\n## 🖼️ 海报文案搭配（主标题+副标题+卖点文案，适配不同尺寸）\n## 🎨 配色方案（主色+辅助色+点缀色，给出HEX色值和使用场景）\n## 💡 创意亮点（3-5个差异化创意点，让内容脱颖而出）\n请用Markdown格式输出，方案具体可执行。"
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
