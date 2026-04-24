import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useToast } from '../components/ToastProvider';
import { useSeo, PAGE_SEO } from '../components/SeoHead';

// ---------------------------------------------------------------------------
// 联系表单提交记录类型
// ---------------------------------------------------------------------------

interface ContactSubmission {
  id: string;
  name: string;
  phone: string;
  business: string;
  message: string;
  createdAt: string;
  status: 'pending' | 'received';
}

const STORAGE_KEY = 'ai-assistant-contact-submissions';

function readSubmissions(): ContactSubmission[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as ContactSubmission[];
  } catch {
    return [];
  }
}

function writeSubmissions(data: ContactSubmission[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    console.warn('[contact] 写入 localStorage 失败');
  }
}

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

// ---------------------------------------------------------------------------
// 表单验证
// ---------------------------------------------------------------------------

interface FormErrors {
  name?: string;
  phone?: string;
  business?: string;
  message?: string;
}

function validateForm(formData: { name: string; phone: string; business: string; message: string }): FormErrors {
  const errors: FormErrors = {};
  if (!formData.name.trim() || formData.name.trim().length < 2) {
    errors.name = '姓名至少需要 2 个字符';
  }
  if (!/^1\d{10}$/.test(formData.phone.trim())) {
    errors.phone = '请输入有效的 11 位手机号码（以 1 开头）';
  }
  if (!formData.business.trim()) {
    errors.business = '请选择业务类型';
  }
  if (!formData.message.trim() || formData.message.trim().length < 10) {
    errors.message = '需求描述至少需要 10 个字符';
  }
  return errors;
}

// ---------------------------------------------------------------------------
// 业务类型标签映射
// ---------------------------------------------------------------------------

const businessLabels: Record<string, string> = {
  restaurant: '餐饮美食',
  beauty: '美容美发',
  education: '教育培训',
  retail: '零售商超',
  health: '医疗健康',
  other: '其他行业',
};

// ---------------------------------------------------------------------------
// 静态数据（保持不变）
// ---------------------------------------------------------------------------

const services = [
  {
    id: 'video',
    title: '短视频制作',
    description: 'AI 辅助脚本创作、智能剪辑、批量产出高质量短视频内容，覆盖抖音、快手、小红书等主流平台。',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
      </svg>
    ),
    color: 'from-blue-500 to-blue-600',
    textColor: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
  {
    id: 'group-buy',
    title: '团购运营',
    description: '团购商品上架优化、价格策略制定、活动策划执行，提升团购转化率和客单价。',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
    ),
    color: 'from-emerald-500 to-emerald-600',
    textColor: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    id: 'private-domain',
    title: '私域搭建',
    description: '企业微信/社群搭建、用户分层运营、自动化营销工具配置，构建商家私域流量池。',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
    color: 'from-purple-500 to-purple-600',
    textColor: 'text-purple-600',
    bgColor: 'bg-purple-50',
  },
  {
    id: 'ai-cs',
    title: 'AI 客服',
    description: '基于大语言模型的智能客服系统，7x24 小时自动回复，提升客户满意度与复购率。',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H8.25m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0H12m4.125 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
      </svg>
    ),
    color: 'from-amber-500 to-amber-600',
    textColor: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    id: 'data-analysis',
    title: '数据分析',
    description: '多维度数据看板、竞品分析、用户画像构建，用数据指导运营决策。',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
    color: 'from-rose-500 to-rose-600',
    textColor: 'text-rose-600',
    bgColor: 'bg-rose-50',
  },
  {
    id: 'live-stream',
    title: '直播操盘',
    description: '直播策划、话术设计、场控管理、数据复盘，全流程直播运营服务。',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.348 14.651a3.75 3.75 0 0 1 0-5.303m5.304 0a3.75 3.75 0 0 1 0 5.303m-7.425 2.122a6.75 6.75 0 0 1 0-9.546m9.546 0a6.75 6.75 0 0 1 0 9.546M5.106 18.894c-3.808-3.808-3.808-9.98 0-13.789m13.788 0c3.808 3.808 3.808 9.981 0 13.79M12 12.75h.008v.008H12v-.008Z" />
      </svg>
    ),
    color: 'from-indigo-500 to-indigo-600',
    textColor: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
];

const plans = [
  {
    id: 'basic',
    name: '基础版',
    price: '2,000',
    period: '元/月',
    tag: '入门首选',
    tagColor: 'bg-gray-100 text-gray-700',
    features: [
      '短视频制作 10 条/月',
      '团购基础维护',
      '基础数据报表',
      '工作日在线客服',
    ],
    highlighted: false,
    ctaText: '立即咨询',
  },
  {
    id: 'standard',
    name: '标准版',
    price: '5,000',
    period: '元/月',
    tag: '最受欢迎',
    tagColor: 'bg-amber-100 text-amber-800',
    features: [
      '短视频制作 20 条/月',
      '团购优化运营',
      '私域流量搭建',
      'AI 智能客服',
      '数据分析报告',
      '7x12 小时客服支持',
    ],
    highlighted: true,
    ctaText: '立即咨询',
  },
  {
    id: 'premium',
    name: '高级版',
    price: '10,000',
    period: '元/月',
    tag: '全能旗舰',
    tagColor: 'bg-primary-100 text-primary-800',
    features: [
      '短视频制作 40 条/月',
      '团购深度运营',
      '私域体系搭建',
      'AI 智能客服',
      '深度数据分析',
      '直播操盘服务',
      '全域运营策略',
      '专属运营顾问',
      '7x24 小时 VIP 支持',
    ],
    highlighted: false,
    ctaText: '立即咨询',
  },
];

const processSteps = [
  {
    step: '01',
    title: '需求沟通',
    description: '深入了解您的业务模式、目标用户和当前痛点，明确运营目标和预期效果。',
    color: 'from-blue-500 to-blue-600',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-600',
  },
  {
    step: '02',
    title: '方案制定',
    description: '根据需求量身定制运营方案，包含内容策略、投放计划、数据指标等详细规划。',
    color: 'from-emerald-500 to-emerald-600',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-600',
  },
  {
    step: '03',
    title: '执行交付',
    description: '专业团队按计划执行，定期产出内容、优化运营，确保各项指标稳步提升。',
    color: 'from-amber-500 to-amber-600',
    bgColor: 'bg-amber-50',
    textColor: 'text-amber-600',
  },
  {
    step: '04',
    title: '数据复盘',
    description: '定期进行数据分析与复盘，总结经验教训，持续优化运营策略和执行方案。',
    color: 'from-purple-500 to-purple-600',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-600',
  },
];

const caseMetrics = [
  { value: '200+', label: 'GitHub Star' },
  { value: '1000+', label: 'Web 端日活' },
  { value: '50K+', label: '累计用户' },
  { value: '4.9/5', label: '用户评分' },
];

const serviceGuarantees = [
  { icon: '✅', title: '效果保障', desc: '未达标免费优化' },
  { icon: '🔒', title: '数据安全', desc: '严格保密协议' },
  { icon: '💬', title: '专属对接', desc: '1对1项目经理' },
  { icon: '📊', title: '数据透明', desc: '周报月报可查' },
];

const serviceFaqs = [
  {
    question: '服务流程是怎样的？',
    answer: '从需求沟通到方案制定，通常3-5个工作日出方案，执行周期根据项目规模1-4周不等。全程有专属项目经理跟进。',
  },
  {
    question: '可以只选择单项服务吗？',
    answer: '当然可以。我们提供灵活的服务组合，你可以根据需求选择单项或多项服务，我们会为你定制专属方案。',
  },
  {
    question: '服务效果如何保证？',
    answer: '我们承诺数据可量化、效果可追踪。每个项目都有明确的KPI指标，未达标部分免费优化至达标。',
  },
  {
    question: '如何收费？',
    answer: '我们提供基础版、标准版、高级版三档套餐，也支持按需定制。具体费用根据项目规模和需求复杂度评估，详情请查看上方套餐或联系我们获取报价。',
  },
  {
    question: '合作后多久能看到效果？',
    answer: '根据服务类型不同，SEO优化通常1-3个月见效，内容运营1-2周即可看到数据变化，短视频运营首月即可产出成果。',
  },
];

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------

export default function Services() {
  useSeo(PAGE_SEO.services);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    business: '',
    message: '',
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [lastSubmission, setLastSubmission] = useState<ContactSubmission | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [isYearly, setIsYearly] = useState(false);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // 从 localStorage 读取历史提交
  const submissions = useMemo(() => readSubmissions(), [submitted, showHistory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationErrors = validateForm(formData);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      toast('请检查表单中的错误信息', 'error');
      return;
    }

    setErrors({});

    const newSubmission: ContactSubmission = {
      id: generateId(),
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      business: formData.business.trim(),
      message: formData.message.trim(),
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    const existing = readSubmissions();
    existing.unshift(newSubmission);
    writeSubmissions(existing);

    setLastSubmission(newSubmission);
    setSubmitted(true);
    toast('咨询提交成功！我们将尽快与您联系', 'success');
  };

  const handleReset = () => {
    setFormData({ name: '', phone: '', business: '', message: '' });
    setErrors({});
    setSubmitted(false);
    setLastSubmission(null);
  };

  function formatDate(iso: string): string {
    const d = new Date(iso);
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-20 sm:pt-40 sm:pb-28">
        {/* Background Decoration */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-br from-primary-100/60 via-primary-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-gradient-to-bl from-emerald-100/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-gradient-to-tr from-purple-100/30 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-primary-50 border border-primary-100 rounded-full text-sm text-primary-700 font-medium mb-8 animate-fade-in">
              <span className="w-2 h-2 bg-primary-500 rounded-full animate-pulse" />
              专业 AI 代运营服务
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 dark:text-white leading-tight tracking-tight animate-slide-up">
              AI 数字化代运营服务
              <br />
              <span className="bg-gradient-to-r from-primary-600 via-primary-500 to-purple-600 bg-clip-text text-transparent">
                用 AI 工具帮您获客、转化、复购
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-lg sm:text-xl text-gray-600 dark:text-gray-300 leading-relaxed max-w-2xl mx-auto animate-slide-up">
              短视频制作、团购运营、私域搭建、AI 客服、数据分析 --
              全方位数字化运营解决方案，让 AI 赋能您的生意
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-slide-up">
              <a
                href="#contact"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary-600 text-white text-base font-semibold rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5"
              >
                免费咨询
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </a>
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 text-base font-semibold rounded-xl border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all hover:-translate-y-0.5"
              >
                查看套餐报价
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              六大核心服务
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              覆盖数字化运营全链路，AI 技术驱动，专业团队执行
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <Link
                key={service.id}
                to={`/services/${service.id}`}
                className="group relative bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl p-6 hover:shadow-xl hover:shadow-gray-200/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
              >
                {/* Icon */}
                <div className={`w-14 h-14 ${service.bgColor} rounded-2xl flex items-center justify-center ${service.textColor} mb-5 group-hover:scale-110 transition-transform duration-300`}>
                  {service.icon}
                </div>

                {/* Content */}
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {service.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                  {service.description}
                </p>

                {/* Arrow indicator */}
                <div className={`mt-4 flex items-center gap-1 text-sm font-medium ${service.textColor} opacity-0 group-hover:opacity-100 transition-opacity duration-300`}>
                  了解详情
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>

                {/* Hover gradient line */}
                <div className={`absolute bottom-0 left-6 right-6 h-0.5 bg-gradient-to-r ${service.color} rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 sm:py-28 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              透明灵活的定价
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              三档套餐满足不同需求，年付享 85 折优惠
            </p>
          </div>

          {/* 月付/年付切换 */}
          <div className="flex items-center justify-center gap-4 mb-10">
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
                年付省 15%
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => {
              const monthlyPrice = parseInt(plan.price.replace(/,/g, ''), 10);
              const displayPrice = isYearly ? Math.round(monthlyPrice * 0.85) : monthlyPrice;
              const formattedPrice = displayPrice.toLocaleString();

              return (
              <div
                key={plan.id}
                className={`relative rounded-2xl p-8 transition-all duration-300 hover:-translate-y-1 ${
                  plan.highlighted
                    ? 'bg-gradient-to-br from-primary-600 to-primary-700 text-white shadow-2xl shadow-primary-500/25 scale-105 z-10'
                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:shadow-xl hover:shadow-gray-200/50'
                }`}
              >
                {/* Tag */}
                <div className="mb-4">
                  <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${plan.tagColor}`}>
                    {plan.tag}
                  </span>
                </div>

                <div className="mb-6">
                  <h3 className={`text-xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                    {plan.name}
                  </h3>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span className={`text-4xl font-bold ${plan.highlighted ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                      ¥{formattedPrice}
                    </span>
                    <span className={`text-sm ${plan.highlighted ? 'text-primary-200' : 'text-gray-500 dark:text-gray-400'}`}>
                      /{plan.period}
                    </span>
                  </div>
                  {isYearly && (
                    <p className={`mt-1 text-xs line-through ${plan.highlighted ? 'text-primary-300' : 'text-gray-400 dark:text-gray-500'}`}>
                      原价 ¥{plan.price}/月
                    </p>
                  )}
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

                <a
                  href="#contact"
                  className={`block w-full text-center px-6 py-3 rounded-xl text-sm font-semibold transition-all ${
                    plan.highlighted
                      ? 'bg-white text-primary-700 hover:bg-primary-50 shadow-lg'
                      : 'bg-primary-600 text-white hover:bg-primary-700 shadow-sm hover:shadow-md'
                  }`}
                >
                  {plan.ctaText}
                </a>
              </div>
            );
            })}
          </div>
        </div>
      </section>

      {/* Case Study Section */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              成功案例
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              用实际成果说话
            </p>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800 rounded-3xl p-8 sm:p-12">
            {/* Background decoration */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                  <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">AI 效率助手</h3>
                  <p className="text-primary-200 text-sm">开源 AI 内容创作工具</p>
                </div>
              </div>

              <p className="text-primary-100 leading-relaxed mb-8 max-w-3xl">
                AI 效率助手是一款开源的 AI 内容创作工具，提供智能改写、一键扩写、多语言翻译、
                内容总结等核心功能。项目在 GitHub 上获得广泛好评，Web 端日活跃用户持续增长，
                是 AI + 运营理念的标杆实践。
              </p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {caseMetrics.map((metric) => (
                  <div key={metric.label} className="bg-white/10 rounded-xl p-4 text-center backdrop-blur-sm">
                    <div className="text-2xl sm:text-3xl font-bold text-white">{metric.value}</div>
                    <div className="mt-1 text-sm text-primary-200">{metric.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-8">
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 text-white hover:text-primary-200 transition-colors font-medium"
                >
                  了解更多
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 sm:py-28 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              服务流程
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              标准化服务流程，确保每个环节高效推进
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {/* Connecting line (desktop) */}
            <div className="hidden md:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-blue-300 via-emerald-300 via-amber-300 to-purple-300" />

            {processSteps.map((item, index) => (
              <div key={item.step} className="relative text-center">
                {/* Step number circle */}
                <div className="relative z-10 w-16 h-16 mx-auto mb-6">
                  <div className={`absolute inset-0 bg-gradient-to-br ${item.color} rounded-2xl rotate-6 opacity-20`} />
                  <div className={`relative w-full h-full bg-gradient-to-br ${item.color} rounded-2xl flex items-center justify-center shadow-lg`}>
                    <span className="text-xl font-bold text-white">{item.step}</span>
                  </div>
                </div>

                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{item.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-xs mx-auto">
                  {item.description}
                </p>

                {/* Arrow for mobile */}
                {index < processSteps.length - 1 && (
                  <div className="md:hidden flex justify-center my-4">
                    <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Service Guarantee Section */}
      <section className="py-20 sm:py-28 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              服务保障
            </h2>
            <p className="mt-4 text-lg text-gray-600 dark:text-gray-300">
              四大承诺，让您合作无忧
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {serviceGuarantees.map((item) => (
              <div
                key={item.title}
                className="flex flex-col items-center gap-3 py-8 px-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <span className="text-4xl">{item.icon}</span>
                <h3 className="text-base font-semibold text-gray-900 dark:text-white">{item.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 sm:py-28">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
            常见问题
          </h2>
          <div className="space-y-3">
            {serviceFaqs.map((faq, index) => {
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
                    onClick={() => setOpenFaqIndex(openFaqIndex === index ? null : index)}
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

      {/* Contact / CTA Section */}
      <section id="contact" className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left: CTA Text */}
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-4">
                准备好让 AI 赋能您的生意了吗？
              </h2>
              <p className="text-lg text-gray-600 dark:text-gray-300 leading-relaxed mb-8">
                填写右侧表单，我们的运营顾问将在 24 小时内与您联系，
                为您提供免费的运营诊断和定制方案。
              </p>

              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">免费运营诊断</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">专业团队为您分析当前运营状况</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-emerald-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">24 小时快速响应</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">提交后我们将在一天内与您联系</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <svg className="w-5 h-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">定制化方案</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">根据您的业务需求量身打造</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Contact Form */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl p-8 shadow-sm">
              {submitted && lastSubmission ? (
                <div className="text-center py-8">
                  {/* 成功图标 */}
                  <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">提交成功！</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-6">我们的运营顾问将在 24 小时内与您联系。</p>

                  {/* 提交详情 */}
                  <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-left mb-6 space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400 dark:text-gray-500 w-16 shrink-0">姓名：</span>
                      <span className="text-gray-900 dark:text-white font-medium">{lastSubmission.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400 dark:text-gray-500 w-16 shrink-0">电话：</span>
                      <span className="text-gray-900 dark:text-white font-medium">{lastSubmission.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400 dark:text-gray-500 w-16 shrink-0">业务：</span>
                      <span className="text-gray-900 dark:text-white font-medium">{businessLabels[lastSubmission.business] || lastSubmission.business}</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm">
                      <span className="text-gray-400 dark:text-gray-500 w-16 shrink-0">需求：</span>
                      <span className="text-gray-700 dark:text-gray-300">{lastSubmission.message}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400 dark:text-gray-500 w-16 shrink-0">时间：</span>
                      <span className="text-gray-700 dark:text-gray-300">{formatDate(lastSubmission.createdAt)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-400 dark:text-gray-500 w-16 shrink-0">状态：</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        待处理
                      </span>
                    </div>
                  </div>

                  {/* 提交计数 */}
                  <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
                    您已累计提交 {submissions.length} 次咨询
                  </p>

                  {/* 操作按钮 */}
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <button
                      onClick={handleReset}
                      className="px-6 py-2.5 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-all shadow-sm hover:shadow-md"
                    >
                      继续咨询
                    </button>
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="px-6 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                    >
                      {showHistory ? '收起历史' : '查看历史提交'}
                    </button>
                  </div>

                  {/* 历史提交列表 */}
                  {showHistory && submissions.length > 0 && (
                    <div className="mt-6 text-left">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                        历史提交记录（共 {submissions.length} 条）
                      </h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {submissions.map((sub) => (
                          <div
                            key={sub.id}
                            className="bg-white dark:bg-gray-700/50 border border-gray-100 dark:border-gray-600 rounded-xl p-3"
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{sub.name}</span>
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                sub.status === 'pending'
                                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400'
                                  : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                              }`}>
                                {sub.status === 'pending' ? '待处理' : '已收到'}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {businessLabels[sub.business] || sub.business} · {sub.phone} · {formatDate(sub.createdAt)}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">
                              {sub.message}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      您的姓名
                    </label>
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => {
                        setFormData({ ...formData, name: e.target.value });
                        if (errors.name) setErrors({ ...errors, name: undefined });
                      }}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors dark:bg-gray-700 dark:text-gray-200 ${
                        errors.name
                          ? 'border-red-400 dark:border-red-500'
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                      placeholder="请输入您的姓名（至少 2 个字符）"
                    />
                    {errors.name && (
                      <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.name}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      联系电话
                    </label>
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => {
                        setFormData({ ...formData, phone: e.target.value });
                        if (errors.phone) setErrors({ ...errors, phone: undefined });
                      }}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors dark:bg-gray-700 dark:text-gray-200 ${
                        errors.phone
                          ? 'border-red-400 dark:border-red-500'
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                      placeholder="请输入 11 位手机号码"
                    />
                    {errors.phone && (
                      <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.phone}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="business" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      业务类型
                    </label>
                    <select
                      id="business"
                      value={formData.business}
                      onChange={(e) => {
                        setFormData({ ...formData, business: e.target.value });
                        if (errors.business) setErrors({ ...errors, business: undefined });
                      }}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors bg-white dark:bg-gray-700 dark:text-gray-200 ${
                        errors.business
                          ? 'border-red-400 dark:border-red-500'
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                    >
                      <option value="">请选择业务类型</option>
                      <option value="restaurant">餐饮美食</option>
                      <option value="beauty">美容美发</option>
                      <option value="education">教育培训</option>
                      <option value="retail">零售商超</option>
                      <option value="health">医疗健康</option>
                      <option value="other">其他行业</option>
                    </select>
                    {errors.business && (
                      <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.business}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                      需求描述
                    </label>
                    <textarea
                      id="message"
                      rows={4}
                      value={formData.message}
                      onChange={(e) => {
                        setFormData({ ...formData, message: e.target.value });
                        if (errors.message) setErrors({ ...errors, message: undefined });
                      }}
                      className={`w-full px-4 py-2.5 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-colors resize-none dark:bg-gray-700 dark:text-gray-200 ${
                        errors.message
                          ? 'border-red-400 dark:border-red-500'
                          : 'border-gray-200 dark:border-gray-600'
                      }`}
                      placeholder="请简要描述您的运营需求（至少 10 个字符）..."
                    />
                    {errors.message && (
                      <p className="mt-1 text-xs text-red-500 dark:text-red-400">{errors.message}</p>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="w-full px-6 py-3 bg-primary-600 text-white text-sm font-semibold rounded-xl hover:bg-primary-700 transition-all shadow-sm hover:shadow-md"
                  >
                    提交咨询
                  </button>
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center">
                    提交即表示您同意我们的隐私政策，我们承诺保护您的个人信息安全。
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
