import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '../../components/SeoHead';
import { useToast } from '../../components/ToastProvider';
import { useAppStore } from '../../store/appStore';
import { chatWithAiStream } from '../../services/aiChat';

// ============================================================
// Constants
// ============================================================

const MAX_CHARS = 15000;

interface CodeMode {
  key: string;
  label: string;
  icon: string;
  description: string;
}

const CODE_MODES: CodeMode[] = [
  { key: 'generate', label: '代码生成', icon: '✨', description: '描述需求，AI生成代码' },
  { key: 'explain', label: '代码解释', icon: '📖', description: '粘贴代码，AI逐行解释' },
  { key: 'debug', label: '代码调试', icon: '🐛', description: '粘贴代码，AI查找修复bug' },
  { key: 'convert', label: '代码转换', icon: '🔄', description: '在不同语言间转换代码' },
  { key: 'optimize', label: '代码优化', icon: '⚡', description: '优化代码性能和可读性' },
];

interface LanguageOption {
  value: string;
  label: string;
  icon: string;
}

const LANGUAGES: LanguageOption[] = [
  { value: 'javascript', label: 'JavaScript', icon: 'JS' },
  { value: 'typescript', label: 'TypeScript', icon: 'TS' },
  { value: 'python', label: 'Python', icon: 'PY' },
  { value: 'java', label: 'Java', icon: 'JV' },
  { value: 'cpp', label: 'C++', icon: 'C+' },
  { value: 'go', label: 'Go', icon: 'GO' },
  { value: 'rust', label: 'Rust', icon: 'RS' },
  { value: 'php', label: 'PHP', icon: 'PH' },
  { value: 'ruby', label: 'Ruby', icon: 'RB' },
  { value: 'swift', label: 'Swift', icon: 'SW' },
  { value: 'sql', label: 'SQL', icon: 'SQ' },
  { value: 'html', label: 'HTML/CSS', icon: 'HT' },
];

// ============================================================
// System Prompt Builder
// ============================================================

function getSystemPrompt(
  mode: string,
  language: string,
  targetLanguage: string,
  includeComments: boolean,
  addErrorHandling: boolean,
  addTypeHints: boolean,
): string {
  const langLabel = LANGUAGES.find((l) => l.value === language)?.label || language;
  const targetLabel = LANGUAGES.find((l) => l.value === targetLanguage)?.label || targetLanguage;

  const modePrompts: Record<string, string> = {
    generate: `你是一个资深全栈开发工程师。请根据用户需求生成高质量、可运行的${langLabel}代码。包含必要的注释和错误处理，确保代码结构清晰、易于维护。`,
    explain: `你是一个编程导师。请逐行解释以下${langLabel}代码的功能，使用清晰易懂的语言。对每段代码说明其作用、原理和注意事项。`,
    debug: `你是一个调试专家。请找出以下${langLabel}代码中的bug，解释问题原因，并提供修复后的完整代码。标注修改的位置和原因。`,
    convert: `你是一个多语言编程专家。请将以下代码从${langLabel}语言转换为${targetLabel}语言，保持功能一致，并遵循目标语言的最佳实践。`,
    optimize: `你是一个代码优化专家。请优化以下${langLabel}代码的性能和可读性，并解释每个优化点。提供优化前后的对比。`,
  };

  const extras: string[] = [];
  if (includeComments) extras.push('请添加详细的中文注释。');
  if (addErrorHandling) extras.push('请添加完善的错误处理机制。');
  if (addTypeHints && ['typescript', 'python', 'go', 'rust', 'java'].includes(language)) {
    extras.push('请添加完整的类型标注。');
  }

  const base = modePrompts[mode] || modePrompts.generate;
  return extras.length > 0 ? `${base}\n\n${extras.join('\n')}` : base;
}

// ============================================================
// Line Numbers Component
// ============================================================

function LineNumbers({ text }: { text: string }) {
  const lines = text.split('\n').length;
  return (
    <div className="flex-shrink-0 w-12 bg-[#181825] text-gray-500 text-xs text-right select-none border-r border-gray-700/50">
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="px-2 py-0 leading-5">
          {i + 1}
        </div>
      ))}
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function CodeAssistantTool() {
  useSeo('code-assistant');
  const { toast } = useToast();
  const addWordsGenerated = useAppStore((s) => s.addWordsGenerated);

  // Core state
  const [activeMode, setActiveMode] = useState('generate');
  const [language, setLanguage] = useState('javascript');
  const [targetLanguage, setTargetLanguage] = useState('python');
  const [includeComments, setIncludeComments] = useState(true);
  const [addErrorHandling, setAddErrorHandling] = useState(false);
  const [addTypeHints, setAddTypeHints] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  // Text state
  const [inputCode, setInputCode] = useState('');
  const [outputCode, setOutputCode] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Modal state
  const [showModal, setShowModal] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputCode]);

  // Handle generate
  const handleGenerate = useCallback(async () => {
    if (activeMode === 'generate') {
      if (!inputCode.trim()) {
        toast('请描述你的代码需求', 'warning');
        return;
      }
    } else if (activeMode === 'convert') {
      if (!inputCode.trim()) {
        toast('请粘贴需要转换的代码', 'warning');
        return;
      }
    } else {
      if (!inputCode.trim()) {
        toast('请粘贴代码', 'warning');
        return;
      }
    }

    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setOutputCode('');

    const systemPrompt = getSystemPrompt(
      activeMode, language, targetLanguage, includeComments, addErrorHandling, addTypeHints,
    );

    const response = await chatWithAiStream(
      {
        messages: [{ role: 'user', content: inputCode }],
        systemPrompt,
        temperature: 0.3,
        maxTokens: 8192,
      },
      controller.signal,
    );

    if (!response.success || !response.stream) {
      toast(response.error || '生成失败，请重试', 'error');
      setIsGenerating(false);
      return;
    }

    const reader = response.stream.getReader();
    let fullText = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += value;
        setOutputCode(fullText);
      }
      addWordsGenerated(fullText.length);
      toast('生成完成', 'success');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled
      } else {
        toast('生成过程中出现错误', 'error');
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [inputCode, activeMode, language, targetLanguage, includeComments, addErrorHandling, addTypeHints, toast, addWordsGenerated]);

  // Common handlers
  const handleStop = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
  }, []);

  const handleCopy = useCallback(async () => {
    if (!outputCode) return;
    try {
      await navigator.clipboard.writeText(outputCode);
      setCopied(true);
      toast('已复制到剪贴板', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('复制失败', 'error');
    }
  }, [outputCode, toast]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputCode(text.slice(0, MAX_CHARS));
        toast('已粘贴剪贴板内容', 'success');
      } else {
        toast('剪贴板为空', 'info');
      }
    } catch {
      toast('无法读取剪贴板，请手动粘贴', 'warning');
    }
  }, [toast]);

  const handleClear = useCallback(() => {
    setInputCode('');
    setOutputCode('');
  }, []);

  const getInputPlaceholder = () => {
    switch (activeMode) {
      case 'generate': return '描述你想要实现的功能...\n\n例如：写一个 React 自定义 Hook，用于防抖处理用户输入';
      case 'explain': return '在此粘贴需要解释的代码...\n\nAI 将逐行为你解释代码的功能和原理';
      case 'debug': return '在此粘贴有 bug 的代码...\n\nAI 将找出问题并提供修复方案';
      case 'convert': return '在此粘贴需要转换的代码...\n\nAI 将将其转换为所选的目标语言';
      case 'optimize': return '在此粘贴需要优化的代码...\n\nAI 将优化性能和可读性';
      default: return '输入代码或描述...';
    }
  };

  const getActionButtonLabel = () => {
    switch (activeMode) {
      case 'generate': return '生成代码';
      case 'explain': return '解释代码';
      case 'debug': return '调试代码';
      case 'convert': return '转换代码';
      case 'optimize': return '优化代码';
      default: return '开始';
    }
  };

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-28 pb-8 sm:pt-32 sm:pb-10">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-slate-200/60 via-gray-100/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-slate-200/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-slate-600 transition-colors">
              工具
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">代码助手</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-slate-700 via-gray-600 to-slate-700 bg-clip-text text-transparent">
              AI 代码助手
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up max-w-2xl">
            支持 12+ 编程语言，提供代码生成、解释、调试、转换和优化五大功能，让编程更高效
          </p>
        </div>
      </section>

      {/* Mode Selection */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex gap-2 overflow-x-auto flex-nowrap scrollbar-hide pb-1">
          {CODE_MODES.map((mode) => (
            <button
              key={mode.key}
              onClick={() => setActiveMode(mode.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeMode === mode.key
                  ? 'bg-slate-700 text-white shadow-md shadow-slate-300 dark:shadow-slate-900/30'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-slate-400 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              <span>{mode.icon}</span>
              <span>{mode.label}</span>
              <span className={`shrink-0 text-xs ${activeMode === mode.key ? 'text-slate-300' : 'text-gray-400 dark:text-gray-500'}`}>
                {mode.description}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Language & Options Row */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Language Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">语言</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Target Language (only for convert mode) */}
          {activeMode === 'convert' && (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
              </svg>
              <select
                value={targetLanguage}
                onChange={(e) => setTargetLanguage(e.target.value)}
                className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-slate-500 focus:border-transparent outline-none"
              >
                {LANGUAGES.filter((l) => l.value !== language).map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Options Toggle */}
          <button
            onClick={() => setOptionsOpen(!optionsOpen)}
            className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-slate-600 dark:hover:text-slate-400 transition-colors"
          >
            <svg
              className={`w-4 h-4 transition-transform duration-200 ${optionsOpen ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            选项
          </button>
        </div>

        {/* Options Panel */}
        {optionsOpen && (
          <div className="mt-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 animate-fade-in">
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeComments}
                  onChange={(e) => setIncludeComments(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">包含注释</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addErrorHandling}
                  onChange={(e) => setAddErrorHandling(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">添加错误处理</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addTypeHints}
                  onChange={(e) => setAddTypeHints(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">添加类型标注</span>
              </label>
            </div>
          </div>
        )}
      </section>

      {/* Two-Panel Layout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Input Panel */}
          <div className="flex flex-col bg-[#1e1e2e] rounded-xl border border-gray-700/50 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-[#181825]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span className="text-sm font-medium text-gray-300">
                  {activeMode === 'generate' ? '需求描述' : '输入代码'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePaste}
                  disabled={isGenerating}
                  className="px-2.5 py-1 text-xs font-medium text-slate-400 bg-slate-700/50 rounded-md hover:bg-slate-700 transition-colors disabled:opacity-50"
                >
                  粘贴
                </button>
                {inputCode.length > 0 && (
                  <button
                    onClick={handleClear}
                    disabled={isGenerating}
                    className="px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-red-400 transition-colors disabled:opacity-50"
                  >
                    清空
                  </button>
                )}
                <span className={`text-xs ${inputCode.length > MAX_CHARS ? 'text-red-400' : 'text-gray-500'}`}>
                  {inputCode.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="flex flex-1 min-h-[400px]">
              {inputCode.length > 0 && (
                <LineNumbers text={inputCode} />
              )}
              <textarea
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.slice(0, MAX_CHARS))}
                placeholder={getInputPlaceholder()}
                disabled={isGenerating}
                className="flex-1 p-4 text-sm text-gray-200 bg-transparent resize-none focus:outline-none placeholder-gray-600 disabled:opacity-50 font-mono leading-5"
                spellCheck={false}
              />
            </div>
          </div>

          {/* Output Panel */}
          <div className="flex flex-col bg-[#1e1e2e] rounded-xl border border-gray-700/50 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50 bg-[#181825]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="text-sm font-medium text-gray-300">输出</span>
              </div>
              <div className="flex items-center gap-2">
                {outputCode.length > 0 && (
                  <>
                    <button
                      onClick={handleCopy}
                      className="px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-slate-400 transition-colors"
                    >
                      {copied ? '已复制' : '复制'}
                    </button>
                    <button
                      onClick={() => setShowModal(true)}
                      className="px-2.5 py-1 text-xs font-medium text-gray-500 hover:text-slate-400 transition-colors"
                    >
                      在新窗口运行
                    </button>
                  </>
                )}
                {outputCode.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {outputCode.length.toLocaleString()} 字符
                  </span>
                )}
              </div>
            </div>
            <div ref={outputRef} className="flex flex-1 min-h-[400px] overflow-y-auto">
              {outputCode ? (
                <div className="flex w-full">
                  <LineNumbers text={outputCode} />
                  <pre className="flex-1 p-4 text-sm text-gray-200 font-mono leading-5 whitespace-pre-wrap">
                    {outputCode}
                    {isGenerating && (
                      <span className="inline-block w-1.5 h-4 ml-0.5 bg-slate-400 animate-pulse rounded-sm" />
                    )}
                  </pre>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75 22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3-4.5 16.5" />
                  </svg>
                  <p className="text-sm">代码输出将在这里显示</p>
                  <p className="text-xs mt-1 opacity-60">
                    {activeMode === 'generate' ? '描述需求后点击"生成代码"' : '粘贴代码后点击操作按钮'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Action Buttons */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!isGenerating ? (
            <button
              onClick={handleGenerate}
              disabled={!inputCode.trim()}
              className="inline-flex items-center gap-2 px-8 py-3 bg-slate-700 text-white text-sm font-medium rounded-xl hover:bg-slate-800 transition-all shadow-md shadow-slate-300 dark:shadow-slate-900/30 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
              {getActionButtonLabel()}
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="inline-flex items-center gap-2 px-8 py-3 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-all shadow-md"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
              </svg>
              停止生成
            </button>
          )}

          {outputCode.length > 0 && !isGenerating && (
            <button
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 hover:border-slate-400 dark:hover:border-slate-600 hover:text-slate-700 dark:hover:text-slate-300 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              重新生成
            </button>
          )}
        </div>
      </section>

      {/* Usage Tips */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">使用技巧</h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="text-slate-500 mt-0.5 shrink-0">-</span>
            "代码生成"模式下，描述越详细，生成的代码质量越高
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="text-slate-500 mt-0.5 shrink-0">-</span>
            "代码转换"模式支持 JS/TS/Python/Java/C++/Go/Rust 等 12 种语言互转
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="text-slate-500 mt-0.5 shrink-0">-</span>
            开启"添加类型标注"选项可为 TypeScript/Python/Go/Rust 代码添加完整类型
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="text-slate-500 mt-0.5 shrink-0">-</span>
            "代码优化"模式会对比优化前后的差异，并解释每个优化点的原因
          </li>
        </ul>
      </div>

      {/* Related Tools */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">相关工具</h3>
        <div className="flex flex-wrap gap-2">
          <Link to="/workspace/learning" className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-slate-400 dark:hover:border-slate-600 hover:text-slate-700 transition-colors">
            AI学习助手
          </Link>
          <Link to="/workspace/doc-analysis" className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-slate-400 dark:hover:border-slate-600 hover:text-slate-700 transition-colors">
            文档分析
          </Link>
          <Link to="/workspace/mindmap" className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-slate-400 dark:hover:border-slate-600 hover:text-slate-700 transition-colors">
            思维导图
          </Link>
        </div>
      </div>

      {/* Run in New Window Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="w-full max-w-4xl max-h-[80vh] mx-4 bg-[#1e1e2e] rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50 bg-[#181825]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-400" />
                <span className="w-3 h-3 rounded-full bg-yellow-400" />
                <span className="w-3 h-3 rounded-full bg-green-400" />
                <span className="ml-3 text-sm font-medium text-gray-300">代码预览</span>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-gray-500 hover:text-white transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto max-h-[calc(80vh-60px)]">
              <div className="flex">
                <LineNumbers text={outputCode} />
                <pre className="flex-1 p-6 text-sm text-gray-200 font-mono leading-5 whitespace-pre-wrap">
                  {outputCode}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
