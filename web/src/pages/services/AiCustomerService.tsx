import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import ChatInterface from '../../components/ChatInterface';

const FEATURES = ['7×24在线', '多轮对话', '上下文理解', '即时响应'];
const CTA_TEXT = '开始对话';
const RELATED = [
  { to: '/services/private-domain', label: '私域搭建' },
  { to: '/workspace/history', label: '历史记录' },
];

// ---------------------------------------------------------------------------
// 常量
// ---------------------------------------------------------------------------

const QUICK_QUESTIONS = [
  '你们提供哪些服务？',
  '如何开始使用？',
  '定价方案是什么？',
  '如何联系人工客服？',
  '有什么优惠活动？',
];

// ---------------------------------------------------------------------------
// 主组件
// ---------------------------------------------------------------------------

export default function AiCustomerService() {
  const [quickQuestion, setQuickQuestion] = useState<string | undefined>(undefined);

  // 处理快捷问题点击：直接发送到 ChatInterface
  const handleQuickQuestion = useCallback(
    (question: string) => {
      // 每次点击生成新的 key，确保即使重复点击同一问题也能触发
      setQuickQuestion(undefined);
      // 使用 setTimeout 确保 state 先重置再设置，触发 useEffect
      setTimeout(() => {
        setQuickQuestion(question);
      }, 50);
    },
    [],
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-28 pb-10">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-amber-100/60 via-amber-50/40 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/services" className="hover:text-amber-600 transition-colors">全部服务</Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">AI 智能客服</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-amber-500 to-amber-600 bg-clip-text text-transparent">AI 智能客服</span>
          </h1>
          <p className="mt-2 text-base text-gray-500 dark:text-gray-400 max-w-xl animate-slide-up">
            基于 AI 大模型的智能客服，7x24 小时在线，为您提供专业、友好的即时服务。
          </p>
        </div>
      </section>

      {/* Quick Questions */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-2 font-medium">常见问题（点击自动发送）</p>
        <div className="flex flex-wrap gap-2">
          {QUICK_QUESTIONS.map((question) => (
            <button
              key={question}
              onClick={() => handleQuickQuestion(question)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300 dark:hover:border-amber-700 hover:text-amber-700 dark:hover:text-amber-400 transition-all active:scale-95"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
              </svg>
              {question}
            </button>
          ))}
        </div>
      </section>

      {/* ChatInterface */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="h-[calc(100vh-280px)] min-h-[500px]">
          <ChatInterface
            systemPrompt={`你是一个专业友好的AI智能客服。你的职责是：\n1. 准确理解客户问题，给出专业、有帮助的回答\n2. 语气亲切友好，使用适当的emoji\n3. 如果客户问题不清楚，主动追问确认\n4. 适时推荐相关产品或服务\n5. 遇到无法解决的问题，建议客户联系人工客服\n\n当对话开始时（用户发送第一条消息前），请先发送一条欢迎消息："您好！我是 AI 智能客服，很高兴为您服务 😊 请问有什么可以帮助您的？"\n\n请始终用中文回复，保持专业但温暖的语气。`}
            title="AI 智能客服"
            placeholder="输入您的问题..."
            externalMessage={quickQuestion}
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
