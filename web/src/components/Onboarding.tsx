import { useState, useEffect } from 'react';

const STORAGE_KEY = 'ai-assistant-onboarded';

const steps = [
  {
    title: '欢迎使用 AI 效率助手',
    description: '14个AI工具，覆盖内容创作全流程',
    highlights: ['14+ AI 核心工具', '6 大专业服务', '企业级安全保障'],
  },
  {
    title: '快速开始',
    description: '选择工具 → 输入需求 → AI生成结果',
    tips: [
      '从工具栏选择适合的AI工具',
      '输入您的具体需求或上传素材',
      'AI自动生成高质量结果，支持一键导出',
    ],
  },
  {
    title: '开始使用',
    description: '一切准备就绪，立即开启AI创作之旅',
    shortcuts: ['Ctrl+K 打开命令面板', 'Ctrl+Enter 快速生成', 'AI 助手随时待命'],
  },
];

export default function Onboarding() {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(STORAGE_KEY)) {
      setVisible(true);
      requestAnimationFrame(() => setAnimating(true));
    }
  }, []);

  // Keyboard support: ESC to close, Left/Right arrows to navigate steps
  useEffect(() => {
    if (!visible) return;
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          close();
          break;
        case 'ArrowRight':
          e.preventDefault();
          next();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prev();
          break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, step]);

  const close = () => {
    setAnimating(false);
    setTimeout(() => {
      setVisible(false);
      localStorage.setItem(STORAGE_KEY, 'true');
    }, 200);
  };

  const next = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    }
  };

  const prev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  if (!visible) return null;

  const current = steps[step];
  const progressPercent = ((step + 1) / steps.length) * 100;

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-200 ${
        animating ? 'opacity-100' : 'opacity-0'
      }`}
      onClick={(e) => e.target === e.currentTarget && close()}
    >
      <div
        className={`w-full max-w-lg rounded-2xl bg-white p-8 shadow-xl dark:bg-gray-800 transition-all duration-200 ${
          animating ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
      >
        {/* Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl overflow-hidden bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-blue-500 transition-all duration-300 ease-out"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Skip */}
        <div className="flex justify-end">
          <button
            onClick={close}
            className="text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-pointer"
          >
            跳过
          </button>
        </div>

        {/* Content with step transition animation */}
        <div key={step} className="mt-2 text-center animate-fade-in">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {current.title}
          </h2>
          <p className="mt-3 text-gray-500 dark:text-gray-400">
            {current.description}
          </p>

          {/* Step 1 highlights */}
          {current.highlights && (
            <ul className="mt-6 space-y-3 text-left">
              {current.highlights.map((item, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          )}

          {/* Step 2 tips */}
          {current.tips && (
            <ul className="mt-6 space-y-3 text-left">
              {current.tips.map((tip, i) => (
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-gray-600 dark:text-gray-300"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-xs font-medium text-blue-600 dark:bg-blue-900 dark:text-blue-300">
                    {i + 1}
                  </span>
                  {tip}
                </li>
              ))}
            </ul>
          )}

          {/* Step 3 shortcuts */}
          {current.shortcuts && (
            <ul className="mt-6 space-y-3 text-left">
              {current.shortcuts.map((shortcut, i) => (
                <li
                  key={i}
                  className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-300"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </span>
                  {shortcut}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Dots */}
        <div className="mt-8 flex justify-center gap-2">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-2 rounded-full transition-all duration-200 cursor-pointer ${
                i === step
                  ? 'w-6 bg-blue-500'
                  : 'w-2 bg-gray-300 dark:bg-gray-600'
              }`}
            />
          ))}
        </div>

        {/* Actions */}
        <div className="mt-6 flex items-center justify-between">
          <button
            onClick={prev}
            disabled={step === 0}
            className="rounded-lg px-4 py-2 text-sm text-gray-500 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
          >
            上一步
          </button>

          {step === steps.length - 1 ? (
            <button
              onClick={close}
              className="rounded-lg bg-blue-500 px-6 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors cursor-pointer"
            >
              立即体验
            </button>
          ) : (
            <button
              onClick={next}
              className="rounded-lg bg-blue-500 px-6 py-2 text-sm font-medium text-white hover:bg-blue-600 transition-colors cursor-pointer"
            >
              下一步
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
