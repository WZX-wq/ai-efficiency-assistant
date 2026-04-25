import { Link } from 'react-router-dom';
import PlanGenerator from '../../components/PlanGenerator';
import { useSeo } from '../../components/SeoHead';

const FEATURES = ['选品分析', '定价策略', '活动方案', '推广话术'];
const CTA_TEXT = '立即生成团购方案';
const RELATED = [
  { to: '/services/private-domain', label: '私域搭建' },
  { to: '/services/data-analysis', label: '数据分析' },
];

const fields = [
  {
    name: 'product',
    label: '商品名称',
    type: 'text' as const,
    placeholder: '例如：有机红富士苹果 5斤装',
  },
  {
    name: 'category',
    label: '商品品类',
    type: 'select' as const,
    options: [
      { label: '生鲜水果', value: '生鲜水果' },
      { label: '食品零食', value: '食品零食' },
      { label: '日用百货', value: '日用百货' },
      { label: '美妆护肤', value: '美妆护肤' },
      { label: '服装鞋帽', value: '服装鞋帽' },
      { label: '数码家电', value: '数码家电' },
      { label: '其他', value: '其他' },
    ],
  },
  {
    name: 'price',
    label: '成本价格区间',
    type: 'text' as const,
    placeholder: '例如：15-25元',
  },
  {
    name: 'audience',
    label: '目标人群',
    type: 'textarea' as const,
    placeholder: '例如：25-40岁女性，注重健康饮食，有家庭团购习惯',
  },
];

export default function GroupBuy() {
  useSeo('group-buy');
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
            <Link to="/services" className="hover:text-emerald-600 transition-colors">
              服务
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">团购运营</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 bg-clip-text text-transparent">
              团购运营
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            AI 智能团购运营方案生成，输入商品信息即可获得完整运营方案
          </p>
        </div>
      </section>

      {/* Tool Section */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <PlanGenerator
            title="AI 团购运营方案生成器"
            description="输入商品信息，AI 自动生成完整团购运营方案"
            accentColor="emerald"
            systemPrompt="你是一个资深的团购运营专家。请根据用户提供的商品信息，生成一份完整的团购运营方案。方案必须包含：## 📊 选品分析（商品竞争力分析、目标人群画像）\n## 💰 定价策略（建议定价、利润分析、价格梯度设计）\n## 🎯 活动方案（推荐活动类型：满减/秒杀/拼团/优惠券，具体规则设计）\n## 📄 详情页文案（商品标题、卖点提炼、详情页描述文案）\n## 📢 推广话术（朋友圈文案、社群推广话术、客服话术）\n请用Markdown格式输出，包含具体数据和可执行方案。"
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
