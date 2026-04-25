import { Link } from 'react-router-dom';
import PlanGenerator from '../../components/PlanGenerator';
import { useSeo } from '../../components/SeoHead';

const FEATURES = ['数据概览', '趋势分析', '问题诊断', '优化建议'];
const CTA_TEXT = '立即生成分析报告';
const RELATED = [
  { to: '/services/video', label: '短视频运营' },
  { to: '/workspace/seo', label: 'SEO优化' },
];

const fields = [
  { name: 'business', label: '业务类型', type: 'text' as const, placeholder: '例如：电商美妆店铺' },
  { name: 'metrics', label: '关键数据指标', type: 'textarea' as const, placeholder: '例如：\n- 月销售额：10万元\n- 访客数：5万人次\n- 转化率：3.2%\n- 客单价：200元\n- 退款率：5%\n- 复购率：15%' },
  { name: 'period', label: '分析周期', type: 'select' as const, options: [{ label: '近一周', value: '近一周' }, { label: '近一个月', value: '近一个月' }, { label: '近一个季度', value: '近一个季度' }, { label: '近半年', value: '近半年' }, { label: '近一年', value: '近一年' }] },
  { name: 'focus', label: '重点关注', type: 'text' as const, placeholder: '例如：提升转化率和复购率' },
];

export default function DataAnalysis() {
  useSeo('data-analysis');
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-rose-100/60 via-rose-50/40 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/services" className="hover:text-rose-600 transition-colors">全部服务</Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">数据分析</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-rose-500 to-rose-600 bg-clip-text text-transparent">数据分析</span>
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-xl animate-slide-up">
            输入您的业务数据，AI 将为您生成专业的数据分析报告，包含趋势洞察与优化建议。
          </p>
        </div>
      </section>

      {/* PlanGenerator */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <PlanGenerator
          title="数据分析报告"
          description="填写业务信息，AI 为您生成专业数据分析报告"
          systemPrompt={`你是一个资深的数据分析专家。请根据用户提供的业务数据，生成一份专业的数据分析报告。报告必须包含：## 📊 数据概览（关键指标汇总，用表格呈现）\n## 📈 趋势分析（数据变化趋势，同比环比分析）\n## 🔍 问题诊断（识别数据中的异常和问题点）\n## 💡 优化建议（基于数据的具体改进建议，至少5条）\n## 🎯 行动计划（按优先级排列的执行步骤）\n请用Markdown格式输出，分析深入、建议具体可执行。如果用户没有提供具体数据，请基于行业平均水平给出示例分析。`}
          fields={fields}
          accentColor="rose"
        />
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
