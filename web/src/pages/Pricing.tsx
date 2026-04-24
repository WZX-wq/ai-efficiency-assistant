import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import type { PricingPlan } from '../types';
import { useToast } from '../components/ToastProvider';
import { useSeo, PAGE_SEO } from '../components/SeoHead';

// ---------------------------------------------------------------------------
// 方案数据
// ---------------------------------------------------------------------------

const plans: PricingPlan[] = [
  {
    id: 'free',
    name: '免费版',
    price: 0,
    period: '每月',
    features: [
      '每月 50 次 AI 调用',
      '智能改写功能',
      '一键扩写功能',
      '基础翻译支持',
      '内容总结功能',
      '社区支持',
    ],
    callLimit: '50 次/月',
    highlighted: false,
    ctaText: '免费开始',
  },
  {
    id: 'pro',
    name: 'Pro 版',
    price: 9.9,
    period: '每月',
    features: [
      '每月 1000 次 AI 调用',
      '全部 AI 处理功能',
      '高级翻译（50+ 语言）',
      '优先处理队列',
      '历史记录保存',
      '邮件技术支持',
      '自定义模型选择',
    ],
    callLimit: '1000 次/月',
    highlighted: true,
    ctaText: '立即升级',
  },
  {
    id: 'team',
    name: 'Team 版',
    price: 29.9,
    period: '每月',
    features: [
      '无限 AI 调用次数',
      '全部 AI 处理功能',
      '高级翻译（50+ 语言）',
      '最高优先级处理',
      '无限历史记录',
      '专属客服通道',
      '团队协作功能',
      'API 接口访问',
      '自定义品牌定制',
    ],
    callLimit: '无限',
    highlighted: false,
    ctaText: '联系我们',
  },
];

// ---------------------------------------------------------------------------
// 功能对比表数据
// ---------------------------------------------------------------------------

interface ComparisonRow {
  feature: string;
  free: boolean | string;
  pro: boolean | string;
  team: boolean | string;
}

const comparisonData: ComparisonRow[] = [
  { feature: 'AI调用次数', free: '50 次/月', pro: '1000 次/月', team: '无限' },
  { feature: '核心AI功能', free: true, pro: true, team: true },
  { feature: '高级翻译', free: false, pro: true, team: true },
  { feature: '优先处理', free: false, pro: true, team: true },
  { feature: '历史记录', free: false, pro: true, team: true },
  { feature: '技术支持', free: '社区支持', pro: '邮件支持', team: '专属客服' },
  { feature: '团队协作', free: false, pro: false, team: true },
  { feature: 'API接口', free: false, pro: false, team: true },
  { feature: '品牌定制', free: false, pro: false, team: true },
  { feature: '自定义模型', free: false, pro: true, team: true },
];

// ---------------------------------------------------------------------------
// 企业版特性
// ---------------------------------------------------------------------------

const enterpriseFeatures = [
  '私有化部署',
  '专属客户经理',
  'SLA保障',
  '自定义集成',
  '培训支持',
  '优先新功能',
];

// ---------------------------------------------------------------------------
// 信任徽章数据
// ---------------------------------------------------------------------------

const trustBadges = [
  { icon: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  ), label: '7天无理由退款' },
  { icon: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </svg>
  ), label: 'SSL加密传输' },
  { icon: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  ), label: '数据本地存储' },
  { icon: (
    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
    </svg>
  ), label: '7×24小时客服' },
];

// ---------------------------------------------------------------------------
// FAQ 数据
// ---------------------------------------------------------------------------

const faqs = [
  {
    question: '免费版有什么限制？',
    answer: '免费版每月提供 50 次 AI 调用，包含所有基础功能。适合个人轻度使用和体验产品。',
  },
  {
    question: '可以随时升级或降级吗？',
    answer: '当然可以。你可以随时在账户设置中升级或降级你的订阅方案，费用将按比例计算。',
  },
  {
    question: '支持哪些支付方式？',
    answer: '我们支持微信支付、支付宝以及主流信用卡支付。',
  },
  {
    question: 'API Key 安全吗？',
    answer: '你的 API Key 仅保存在你的本地浏览器中，不会上传到我们的服务器。所有 AI 请求直接从你的浏览器发送到 AI 服务提供商。',
  },
];

// ---------------------------------------------------------------------------
// localStorage 辅助
// ---------------------------------------------------------------------------

const CURRENT_PLAN_KEY = 'ai-assistant-current-plan';

function getCurrentPlan(): string | null {
  try {
    return localStorage.getItem(CURRENT_PLAN_KEY);
  } catch {
    return null;
  }
}

function setCurrentPlan(planId: string): void {
  try {
    localStorage.setItem(CURRENT_PLAN_KEY, planId);
  } catch {
    console.warn('[pricing] 写入 localStorage 失败');
  }
}

// ---------------------------------------------------------------------------
// 辅助组件：功能对比单元格
// ---------------------------------------------------------------------------

function ComparisonCell({ value }: { value: boolean | string }) {
  if (typeof value === 'string') {
    return <span className="text-sm text-gray-700 dark:text-gray-300">{value}</span>;
  }
  if (value) {
    return (
      <svg className="w-5 h-5 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }
  return (
    <svg className="w-5 h-5 mx-auto text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------

export default function Pricing() {
  useSeo(PAGE_SEO.pricing);
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isYearly, setIsYearly] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);
  const [currentPlanId, setCurrentPlanId] = useState<string | null>(null);

  // 读取当前方案
  useEffect(() => {
    setCurrentPlanId(getCurrentPlan());
  }, []);

  // 滚动显示动画
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' },
    );

    const elements = document.querySelectorAll('.scroll-reveal');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  // 计算年付价格（月付的 85%）
  const getDisplayPrice = (plan: PricingPlan) => {
    if (plan.price === 0) return 0;
    return isYearly ? Math.round(plan.price * 0.85 * 100) / 100 : plan.price;
  };

  const getDisplayPeriod = (plan: PricingPlan) => {
    if (plan.price === 0) return '永久免费';
    return isYearly ? '每月（年付）' : '每月';
  };

  const savingsPercent = 15;

  // 方案选择处理
  const handlePlanSelect = (plan: PricingPlan) => {
    setCurrentPlan(plan.id);
    setCurrentPlanId(plan.id);

    if (plan.id === 'free') {
      toast('已选择免费版方案', 'success');
      navigate('/workspace');
    } else {
      const planName = plan.name;
      toast(`已选择${planName}方案，请联系客服完成支付`, 'info');
      navigate('/services#contact');
    }
  };

  // FAQ 切换
  const toggleFaq = (index: number) => {
    setOpenFaqIndex(openFaqIndex === index ? null : index);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* 内联样式：滚动显示动画 */}
      <style>{`
        .scroll-reveal {
          opacity: 0;
          transform: translateY(30px);
          transition: opacity 0.6s ease-out, transform 0.6s ease-out;
        }
        .scroll-reveal.revealed {
          opacity: 1;
          transform: translateY(0);
        }
      `}</style>

      {/* Header */}
      <section className="pt-32 pb-16 sm:pt-40 sm:pb-20 scroll-reveal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 dark:text-white tracking-tight">
            简单透明的定价
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            选择适合你的方案，从免费版开始，随时升级
          </p>

          {/* 月付/年付切换 */}
          <div className="mt-8 flex items-center justify-center gap-4">
            <span className={`text-sm font-medium transition-colors ${!isYearly ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
              月付
            </span>
            <button
              onClick={() => setIsYearly(!isYearly)}
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-primary-500/20 ${
                isYearly ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
              aria-label="切换月付/年付"
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-white rounded-full shadow-sm transition-transform duration-300 ${
                  isYearly ? 'translate-x-7' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-sm font-medium transition-colors ${isYearly ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'}`}>
              年付
            </span>
            {isYearly && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 animate-fade-in">
                年付省 {savingsPercent}%
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 sm:pb-28 scroll-reveal">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => {
              const displayPrice = getDisplayPrice(plan);
              const isCurrentPlan = currentPlanId === plan.id;

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 ${
                    plan.highlighted
                      ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-2xl shadow-primary-500/25 scale-105 z-10'
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:shadow-gray-200/50'
                  }`}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full shadow-sm">
                      最受欢迎
                    </div>
                  )}

                  {/* 当前方案标记 */}
                  {isCurrentPlan && (
                    <div className="absolute -top-4 right-4 px-3 py-1 bg-green-500 text-white text-xs font-bold rounded-full shadow-sm animate-fade-in">
                      当前方案
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className={`text-xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                      {plan.name}
                    </h3>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className={`text-4xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                        {displayPrice === 0 ? '免费' : `¥${displayPrice}`}
                      </span>
                      {displayPrice > 0 && (
                        <span className={`text-sm ${plan.highlighted ? 'text-primary-200' : 'text-gray-500 dark:text-gray-400'}`}>
                          /{getDisplayPeriod(plan)}
                        </span>
                      )}
                    </div>
                    {/* 年付时显示原价 */}
                    {isYearly && plan.price > 0 && (
                      <p className={`mt-1 text-xs line-through ${plan.highlighted ? 'text-primary-300' : 'text-gray-400 dark:text-gray-500'}`}>
                        原价 ¥{plan.price}/月
                      </p>
                    )}
                  </div>

                  <div className={`mb-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                    plan.highlighted
                      ? 'bg-white/15 text-white'
                      : 'bg-primary-50 text-primary-700 dark:bg-primary-900/20 dark:text-primary-400'
                  }`}>
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    {plan.callLimit}
                  </div>

                  <ul className="space-y-3 mb-8">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <svg
                          className={`w-5 h-5 flex-shrink-0 mt-0.5 ${plan.highlighted ? 'text-primary-200' : 'text-green-500'}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className={`text-sm ${plan.highlighted ? 'text-primary-100' : 'text-gray-600 dark:text-gray-300'}`}>
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => handlePlanSelect(plan)}
                    className={`block w-full text-center px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
                      isCurrentPlan
                        ? 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-default'
                        : plan.highlighted
                          ? 'bg-white text-primary-700 hover:bg-primary-50 shadow-lg'
                          : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow-md'
                    }`}
                  >
                    {isCurrentPlan ? '当前方案' : plan.ctaText}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 退款保障横幅 */}
      <section className="pb-16 scroll-reveal">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-3 py-4 px-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl">
            <svg className="w-6 h-6 text-green-600 dark:text-green-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <p className="text-sm font-semibold text-green-800 dark:text-green-300">
              所有付费方案均享 7 天无理由退款保障
            </p>
          </div>
        </div>
      </section>

      {/* 企业定制方案 */}
      <section className="pb-20 sm:pb-28 scroll-reveal">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 dark:from-gray-800 dark:via-gray-900 dark:to-black p-10 sm:p-14">
            {/* 装饰背景 */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500 rounded-full blur-3xl" />
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl" />
            </div>

            <div className="relative z-10">
              <div className="text-center mb-10">
                <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
                  企业定制
                </h2>
                <p className="mt-3 text-lg text-gray-300 max-w-xl mx-auto">
                  为大型团队和企业提供完全定制化的 AI 效率解决方案
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
                {enterpriseFeatures.map((feature) => (
                  <div
                    key={feature}
                    className="flex items-center gap-2.5 px-4 py-3 bg-white/5 border border-white/10 rounded-xl"
                  >
                    <svg className="w-5 h-5 text-primary-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className="text-sm font-medium text-gray-200">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Link
                  to="/services#contact"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-gray-900 font-semibold rounded-xl hover:bg-gray-100 transition-colors shadow-lg"
                >
                  联系我们获取定制方案
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 功能对比表 */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 scroll-reveal">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            功能对比
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b-2 border-gray-200 dark:border-gray-700">
                  <th className="py-4 px-4 text-left text-sm font-semibold text-gray-500 dark:text-gray-400 w-1/4">
                    功能
                  </th>
                  <th className="py-4 px-4 text-center text-sm font-semibold text-gray-900 dark:text-white w-1/4">
                    免费版
                  </th>
                  <th className="py-4 px-4 text-center text-sm font-semibold text-primary-600 dark:text-primary-400 w-1/4">
                    Pro 版
                  </th>
                  <th className="py-4 px-4 text-center text-sm font-semibold text-gray-900 dark:text-white w-1/4">
                    Team 版
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisonData.map((row, index) => (
                  <tr
                    key={row.feature}
                    className={`border-b border-gray-100 dark:border-gray-800 ${
                      index % 2 === 0 ? 'bg-white dark:bg-gray-800/50' : 'bg-gray-50 dark:bg-gray-800'
                    }`}
                  >
                    <td className="py-4 px-4 text-sm font-medium text-gray-700 dark:text-gray-300">
                      {row.feature}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <ComparisonCell value={row.free} />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <ComparisonCell value={row.pro} />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <ComparisonCell value={row.team} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 信任徽章 */}
      <section className="py-16 scroll-reveal">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
            {trustBadges.map((badge) => (
              <div
                key={badge.label}
                className="flex flex-col items-center gap-3 py-6 px-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800"
              >
                <div className="text-primary-600 dark:text-primary-400">
                  {badge.icon}
                </div>
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300 text-center">
                  {badge.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 scroll-reveal">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            常见问题
          </h2>
          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;

              return (
                <div
                  key={faq.question}
                  className={`bg-white dark:bg-gray-800 rounded-xl border transition-all duration-300 ${
                    isOpen
                      ? 'border-primary-200 dark:border-primary-800 shadow-md'
                      : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  <button
                    onClick={() => toggleFaq(index)}
                    className="w-full flex items-center justify-between px-6 py-4 text-left"
                  >
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white pr-4">
                      {faq.question}
                    </h3>
                    <svg
                      className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${
                        isOpen ? 'rotate-180' : 'rotate-0'
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-300 ${
                      isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-6 pb-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
