import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '../components/SeoHead';

// ============================================================
// Types
// ============================================================

type CodeTab = 'javascript' | 'python' | 'curl';

interface CodeExample {
  language: CodeTab;
  label: string;
  code: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

// ============================================================
// Data
// ============================================================

const features = [
  {
    title: '多模型支持',
    description: '支持 OpenAI GPT-4、Claude 3.5、DeepSeek、通义千问等主流大语言模型，一个 API 统一调用。',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0 1 12 15a9.065 9.065 0 0 0-6.23.693L5 14.5m14.8.8 1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0 1 12 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
      </svg>
    ),
  },
  {
    title: '简单易用',
    description: '标准 RESTful API 设计，清晰的文档和示例代码，5 分钟即可完成接入。',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
      </svg>
    ),
  },
  {
    title: '高可用',
    description: '99.9% SLA 服务保障，自动弹性扩容，全球 CDN 加速，确保服务稳定可靠。',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
  },
  {
    title: '灵活计费',
    description: '按量付费，阶梯定价，支持企业定制方案，用多少付多少，零浪费。',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
];

const codeExamples: CodeExample[] = [
  {
    language: 'javascript',
    label: 'JavaScript',
    code: `const response = await fetch('https://api.ai-assistant.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_API_KEY'
  },
  body: JSON.stringify({
    model: 'gpt-4',
    messages: [
      { role: 'user', content: '帮我写一段产品介绍文案' }
    ],
    temperature: 0.7
  })
});

const data = await response.json();
console.log(data.choices[0].message.content);`,
  },
  {
    language: 'python',
    label: 'Python',
    code: `import requests

response = requests.post(
    "https://api.ai-assistant.com/v1/chat/completions",
    headers={
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_API_KEY"
    },
    json={
        "model": "gpt-4",
        "messages": [
            {"role": "user", "content": "帮我写一段产品介绍文案"}
        ],
        "temperature": 0.7
    }
)

data = response.json()
print(data["choices"][0]["message"]["content"])`,
  },
  {
    language: 'curl',
    label: 'cURL',
    code: `curl -X POST https://api.ai-assistant.com/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "帮我写一段产品介绍文案"}
    ],
    "temperature": 0.7
  }'`,
  },
];

const apiEndpoints = [
  { endpoint: '/api/v1/chat/completions', method: 'POST', description: 'AI对话/文本生成', auth: 'Bearer Token' },
  { endpoint: '/api/v1/translate', method: 'POST', description: '文本翻译', auth: 'Bearer Token' },
  { endpoint: '/api/v1/summarize', method: 'POST', description: '文本摘要', auth: 'Bearer Token' },
  { endpoint: '/api/v1/rewrite', method: 'POST', description: '文本改写', auth: 'Bearer Token' },
  { endpoint: '/api/v1/code/generate', method: 'POST', description: '代码生成', auth: 'Bearer Token' },
  { endpoint: '/api/v1/mindmap', method: 'POST', description: '思维导图生成', auth: 'Bearer Token' },
  { endpoint: '/api/v1/models', method: 'GET', description: '获取可用模型列表', auth: 'Bearer Token' },
  { endpoint: '/api/v1/usage', method: 'GET', description: '获取用量统计', auth: 'Bearer Token' },
];

const pricingTiers = [
  { name: '免费体验', price: '¥0', quota: '1,000次/月', scenario: '个人开发、测试', highlight: false },
  { name: '开发者', price: '¥99/月', quota: '50,000次/月', scenario: '小型应用、MVP', highlight: false },
  { name: '专业版', price: '¥499/月', quota: '500,000次/月', scenario: '中型产品、SaaS', highlight: true },
  { name: '企业版', price: '联系我们', quota: '无限制', scenario: '大型企业、定制需求', highlight: false },
];

const sdks = [
  {
    name: 'JavaScript / TypeScript',
    install: 'npm install @ai-assistant/sdk',
    language: 'Node.js >= 18',
    icon: '{ }',
  },
  {
    name: 'Python',
    install: 'pip install ai-assistant-sdk',
    language: 'Python >= 3.8',
    icon: 'Py',
  },
  {
    name: 'Go',
    install: 'go get github.com/ai-assistant/sdk-go',
    language: 'Go >= 1.21',
    icon: 'Go',
  },
  {
    name: 'Java',
    install: 'Maven / Gradle',
    language: 'Java >= 11',
    icon: 'Jv',
  },
];

const faqItems: FaqItem[] = [
  {
    question: '如何获取 API Key？',
    answer: '注册账号后，进入「设置 > API 密钥」页面，点击「创建新密钥」即可生成专属 API Key。每个账号最多可创建 5 个密钥，建议为不同环境使用不同密钥。',
  },
  {
    question: 'API 调用有频率限制吗？',
    answer: '免费版限制为 10 次/分钟，开发者版 60 次/分钟，专业版 300 次/分钟，企业版可定制。超出限制将返回 429 状态码，建议实现指数退避重试机制。',
  },
  {
    question: '支持哪些 AI 模型？',
    answer: '目前支持 GPT-4o、GPT-4 Turbo、Claude 3.5 Sonnet、Claude 3 Opus、DeepSeek V3、通义千问 Max、GLM-4 等主流模型。我们持续接入新模型，具体列表可通过 /api/v1/models 接口查询。',
  },
  {
    question: '数据安全如何保障？',
    answer: '所有 API 通信均使用 TLS 1.3 加密，请求日志默认保留 7 天后自动删除，企业版支持零日志模式。我们已通过 SOC 2 Type II 和 ISO 27001 认证，确保数据安全合规。',
  },
  {
    question: '是否支持私有化部署？',
    answer: '企业版支持私有化部署，可将整个 API 服务部署到您的私有云或本地服务器。部署方案包括 Docker 容器化部署和 Kubernetes 集群部署，详情请联系商务团队。',
  },
];

// ============================================================
// Syntax Highlighting Helper
// ============================================================

function highlightCode(code: string, language: CodeTab): string {
  // Simple syntax highlighting with colored spans
  let highlighted = code
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (language === 'javascript') {
    highlighted = highlighted
      // Strings (single and double quotes)
      .replace(/('(?:[^'\\]|\\.)*')/g, '<span class="text-green-400">$1</span>')
      .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="text-green-400">$1</span>')
      // Keywords
      .replace(/\b(const|let|var|await|async|function|return|console|JSON)\b/g, '<span class="text-purple-400">$1</span>')
      // Methods
      .replace(/\.(log|stringify|fetch)\b/g, '.<span class="text-yellow-300">$1</span>');
  } else if (language === 'python') {
    highlighted = highlighted
      // Strings
      .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="text-green-400">$1</span>')
      // Keywords
      .replace(/\b(import|from|requests|print|response|json)\b/g, '<span class="text-purple-400">$1</span>')
      // Methods
      .replace(/\.(post|json|get)\b/g, '.<span class="text-yellow-300">$1</span>');
  } else if (language === 'curl') {
    highlighted = highlighted
      // Strings
      .replace(/("(?:[^"\\]|\\.)*")/g, '<span class="text-green-400">$1</span>')
      // Flags
      .replace(/(-[XHd])/g, '<span class="text-yellow-300">$1</span>');
  }

  // Comments
  highlighted = highlighted.replace(/(\/\/.*)/g, '<span class="text-gray-500">$1</span>');

  return highlighted;
}

// ============================================================
// Copy Button Component
// ============================================================

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      className="absolute top-3 right-3 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200
        bg-gray-700/80 hover:bg-gray-600 text-gray-300 hover:text-white border border-gray-600/50"
      aria-label="复制代码"
    >
      {copied ? (
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
          已复制
        </span>
      ) : (
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
          </svg>
          复制
        </span>
      )}
    </button>
  );
}

// ============================================================
// Method Badge Component
// ============================================================

function MethodBadge({ method }: { method: string }) {
  const colorMap: Record<string, string> = {
    GET: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    POST: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    PUT: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    DELETE: 'bg-red-500/15 text-red-400 border-red-500/30',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs font-bold rounded border ${colorMap[method] || colorMap.GET}`}>
      {method}
    </span>
  );
}

// ============================================================
// FAQ Item Component
// ============================================================

function FaqAccordion({ item, isOpen, onToggle }: { item: FaqItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden transition-colors">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-6 py-4 text-left bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-sm font-semibold text-gray-900 dark:text-white pr-4">{item.question}</span>
        <svg
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${isOpen ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{item.answer}</p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function ApiPlatform() {
  const [activeTab, setActiveTab] = useState<CodeTab>('javascript');
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useSeo({
    title: 'API 开放平台 - AI效率助手',
    description:
      'AI效率助手 API 开放平台，提供多模型 AI 能力接入，包括对话生成、文本翻译、内容摘要、代码生成等 RESTful API，支持 JavaScript、Python、Go、Java 等多语言 SDK。',
    keywords:
      'AI API,开放平台,RESTful API,AI接口,文本生成API,翻译API,代码生成,SDK,开发者工具',
    canonicalUrl: '/api-platform',
  });

  const currentCode = codeExamples.find((e) => e.language === activeTab)!;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* ==================== Hero Section ==================== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 dark:from-indigo-800 dark:via-blue-900 dark:to-gray-900">
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-400/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-300/10 rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-20 sm:pt-40 sm:pb-28">
          <div className="text-center max-w-3xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white/90 text-sm font-medium">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              API v2.0 已发布
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-tight">
              API 开放平台
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-blue-100/90 leading-relaxed max-w-2xl mx-auto">
              将AI能力集成到你的产品中，几行代码即可调用
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/login"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-all shadow-lg shadow-blue-900/20 hover:shadow-xl hover:shadow-blue-900/30 hover:-translate-y-0.5"
              >
                立即接入
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <a
                href="#quick-start"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/25 hover:bg-white/20 transition-all hover:-translate-y-0.5"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
                查看文档
              </a>
            </div>

            {/* Stats */}
            <div className="mt-16 grid grid-cols-3 gap-8 max-w-lg mx-auto">
              {[
                { value: '8+', label: 'API 端点' },
                { value: '99.9%', label: 'SLA 保障' },
                { value: '<100ms', label: '平均延迟' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl sm:text-3xl font-bold text-white">{stat.value}</div>
                  <div className="mt-1 text-sm text-blue-200/70">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Wave separator */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 60L48 55C96 50 192 40 288 35C384 30 480 30 576 33.3C672 36.7 768 43.3 864 45C960 46.7 1056 43.3 1152 38.3C1248 33.3 1344 26.7 1392 23.3L1440 20V60H0Z" className="fill-gray-50 dark:fill-gray-950" />
          </svg>
        </div>
      </section>

      {/* ==================== Features Grid ==================== */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              为什么选择我们的 API
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              企业级基础设施，开发者友好设计，让 AI 能力触手可及
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="group relative p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-4 group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{feature.title}</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== Quick Start Code ==================== */}
      <section id="quick-start" className="py-20 sm:py-28 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              快速开始
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              三步即可完成接入，支持多种编程语言
            </p>
          </div>

          {/* Steps */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-0 mb-12">
            {[
              { step: '1', title: '注册获取 API Key' },
              { step: '2', title: '安装 SDK 或直接调用' },
              { step: '3', title: '开始使用' },
            ].map((item, idx) => (
              <div key={item.step} className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">
                    {item.step}
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">{item.title}</span>
                </div>
                {idx < 2 && (
                  <svg className="w-8 h-8 text-gray-300 dark:text-gray-600 hidden sm:block" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                )}
              </div>
            ))}
          </div>

          {/* Code Tabs */}
          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-xl">
              {/* Tab bar */}
              <div className="flex items-center bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                {codeExamples.map((example) => (
                  <button
                    key={example.language}
                    onClick={() => setActiveTab(example.language)}
                    className={`relative px-6 py-3 text-sm font-medium transition-colors ${
                      activeTab === example.language
                        ? 'text-indigo-600 dark:text-indigo-400 bg-white dark:bg-gray-900'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                    }`}
                  >
                    {example.label}
                    {activeTab === example.language && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 dark:bg-indigo-400" />
                    )}
                  </button>
                ))}
              </div>

              {/* Code block */}
              <div className="relative bg-[#0d1117] dark:bg-[#0d1117]">
                <CopyButton text={currentCode.code} />
                <pre className="p-6 overflow-x-auto text-sm leading-relaxed">
                  <code
                    className="text-gray-300 font-mono"
                    dangerouslySetInnerHTML={{ __html: highlightCode(currentCode.code, activeTab) }}
                  />
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== API Endpoints Table ==================== */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              API 端点
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              完整的 RESTful API 接口，覆盖主流 AI 能力
            </p>
          </div>

          <div className="max-w-5xl mx-auto overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Endpoint</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Method</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">Description</th>
                    <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">Auth</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {apiEndpoints.map((ep) => (
                    <tr key={ep.endpoint} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                      <td className="px-6 py-4">
                        <code className="text-sm font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-2 py-1 rounded">
                          {ep.endpoint}
                        </code>
                      </td>
                      <td className="px-6 py-4">
                        <MethodBadge method={ep.method} />
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 hidden sm:table-cell">{ep.description}</td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                          </svg>
                          {ep.auth}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== Pricing Tiers ==================== */}
      <section className="py-20 sm:py-28 bg-white dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              定价方案
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              灵活的计费方式，满足从个人开发者到大型企业的不同需求
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative p-6 rounded-2xl border transition-all duration-300 ${
                  tier.highlight
                    ? 'bg-gradient-to-br from-indigo-600 to-blue-600 border-indigo-500 text-white shadow-xl shadow-indigo-500/20 scale-105'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg'
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-400 text-amber-900 text-xs font-bold rounded-full">
                    最受欢迎
                  </div>
                )}
                <h3 className={`text-lg font-semibold mb-2 ${tier.highlight ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                  {tier.name}
                </h3>
                <div className={`text-3xl font-extrabold mb-1 ${tier.highlight ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                  {tier.price}
                </div>
                <div className={`text-sm mb-4 ${tier.highlight ? 'text-blue-100' : 'text-gray-500 dark:text-gray-400'}`}>
                  {tier.quota}
                </div>
                <div className={`text-sm mb-6 ${tier.highlight ? 'text-blue-100' : 'text-gray-600 dark:text-gray-300'}`}>
                  {tier.scenario}
                </div>
                <button
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    tier.highlight
                      ? 'bg-white text-indigo-700 hover:bg-blue-50'
                      : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
                >
                  {tier.name === '企业版' ? '联系我们' : '立即开始'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== SDK Downloads ==================== */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              SDK 下载
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
              官方 SDK，一行命令即可安装，快速集成到你的项目中
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {sdks.map((sdk) => (
              <div
                key={sdk.name}
                className="group p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-lg transition-all duration-300"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-xs font-bold">
                    {sdk.icon}
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{sdk.name}</h3>
                    <p className="text-xs text-gray-400">{sdk.language}</p>
                  </div>
                </div>

                {/* Install command */}
                <div className="relative bg-[#0d1117] rounded-lg p-3 mb-4">
                  <code className="text-xs text-gray-300 font-mono block overflow-x-auto">{sdk.install}</code>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <a href="#" className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                    安装
                  </a>
                  <a href="#" className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                    GitHub
                  </a>
                </div>
              </div>
            ))}
          </div>

          {/* GitHub stars banner */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-3 bg-white dark:bg-gray-900 rounded-full border border-gray-200 dark:border-gray-700 shadow-sm">
              <svg className="w-5 h-5 text-gray-700 dark:text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Star us on GitHub
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded-full text-xs font-semibold text-gray-700 dark:text-gray-300">
                <svg className="w-3.5 h-3.5 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                2.3k
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ==================== FAQ Section ==================== */}
      <section className="py-20 sm:py-28 bg-white dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
              常见问题
            </h2>
            <p className="mt-4 text-lg text-gray-500 dark:text-gray-400">
              关于 API 接入的常见问题解答
            </p>
          </div>

          <div className="space-y-3">
            {faqItems.map((item, idx) => (
              <FaqAccordion
                key={idx}
                item={item}
                isOpen={openFaq === idx}
                onToggle={() => setOpenFaq(openFaq === idx ? null : idx)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* ==================== CTA Section ==================== */}
      <section className="py-20 sm:py-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 dark:from-indigo-800 dark:via-blue-900 dark:to-gray-900 px-8 py-16 sm:px-16 sm:py-20 text-center">
            {/* Background decoration */}
            <div className="absolute inset-0 overflow-hidden">
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-400/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-400/20 rounded-full blur-3xl" />
            </div>

            <div className="relative max-w-2xl mx-auto">
              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                准备好开始了吗？
              </h2>
              <p className="mt-4 text-lg text-blue-100/90">
                免费注册即可获得 1,000 次 API 调用额度，无需绑定信用卡
              </p>
              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
                >
                  免费注册
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </Link>
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 px-8 py-3.5 bg-white/10 backdrop-blur-sm text-white font-semibold rounded-xl border border-white/25 hover:bg-white/20 transition-all hover:-translate-y-0.5"
                >
                  查看定价
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
