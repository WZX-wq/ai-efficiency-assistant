import { Link } from 'react-router-dom';
import type { PricingPlan } from '../types';

const plans: PricingPlan[] = [
  {
    id: 'free',
    name: '免费版',
    price: 0,
    period: '永久免费',
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

export default function Pricing() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <section className="pt-32 pb-16 sm:pt-40 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-tight">
            简单透明的定价
          </h1>
          <p className="mt-4 text-lg text-gray-600 max-w-2xl mx-auto">
            选择适合你的方案，从免费版开始，随时升级
          </p>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-2xl shadow-primary-500/25 scale-105 z-10'
                    : 'bg-white border border-gray-200 hover:shadow-xl hover:shadow-gray-200/50'
                }`}
              >
                {plan.highlighted && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full shadow-sm">
                    最受欢迎
                  </div>
                )}

                <div className="mb-6">
                  <h3 className={`text-xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                    {plan.name}
                  </h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className={`text-4xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900'}`}>
                      {plan.price === 0 ? '免费' : `¥${plan.price}`}
                    </span>
                    {plan.price > 0 && (
                      <span className={`text-sm ${plan.highlighted ? 'text-primary-200' : 'text-gray-500'}`}>
                        /{plan.period}
                      </span>
                    )}
                  </div>
                </div>

                <div className={`mb-6 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                  plan.highlighted
                    ? 'bg-white/15 text-white'
                    : 'bg-primary-50 text-primary-700'
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
                      <span className={`text-sm ${plan.highlighted ? 'text-primary-100' : 'text-gray-600'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/workspace"
                  className={`block w-full text-center px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
                    plan.highlighted
                      ? 'bg-white text-primary-700 hover:bg-primary-50 shadow-lg'
                      : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow-md'
                  }`}
                >
                  {plan.ctaText}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gray-50 border-t border-gray-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            常见问题
          </h2>
          <div className="space-y-6">
            {faqs.map((faq) => (
              <div
                key={faq.question}
                className="bg-white rounded-xl border border-gray-100 p-6"
              >
                <h3 className="text-base font-semibold text-gray-900 mb-2">
                  {faq.question}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
