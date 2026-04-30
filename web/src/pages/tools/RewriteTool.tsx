import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '../../components/SeoHead';
import { useToast } from '../../components/ToastProvider';
import { useAppStore } from '../../store/appStore';
import { chatWithAiStream } from '../../services/aiChat';

// ============================================================
// Constants
// ============================================================

const MAX_CHARS = 10000;

interface RewriteMode {
  key: string;
  label: string;
  icon: string;
  description: string;
}

const REWRITE_MODES: RewriteMode[] = [
  {
    key: 'smart',
    label: '智能改写',
    icon: '✨',
    description: '改善表达流畅度，保持原意',
  },
  {
    key: 'dedup',
    label: '降重改写',
    icon: '🔄',
    description: '深度改写句式结构，降低重复率',
  },
  {
    key: 'deai',
    label: '去AI痕迹',
    icon: '🧑',
    description: '人性化处理，让文本更自然',
  },
  {
    key: 'academic',
    label: '学术润色',
    icon: '🎓',
    description: '正式学术风格，严谨表达',
  },
  {
    key: 'casual',
    label: '口语化',
    icon: '💬',
    description: '轻松口语风格，适合社交场景',
  },
];

type IntensityLevel = 'conservative' | 'standard' | 'aggressive';

const INTENSITY_LABELS: Record<IntensityLevel, string> = {
  conservative: '保守',
  standard: '标准',
  aggressive: '激进',
};

const INTENSITY_PROMPTS: Record<IntensityLevel, string> = {
  conservative: '请进行轻度改写，尽量保持原文的句式结构和用词，仅做必要的优化和调整。',
  standard: '请进行中度改写，在保持原意的前提下适当调整句式结构和用词，使表达更加流畅。',
  aggressive: '请进行大幅改写，彻底重构句式结构，使用不同的表达方式，但务必保持核心含义不变。',
};

function getSystemPrompt(mode: string, intensity: IntensityLevel, preserveStructure: boolean, keepKeyTerms: boolean): string {
  const modePrompts: Record<string, string> = {
    smart: '你是一个专业文案改写专家，请改写以下文本，保持原意但改善表达。使文字更加流畅、清晰、有感染力。',
    dedup: '你是一个专业的文本降重专家，请对以下文本进行深度改写，大幅改变句式结构和用词，但保持核心含义不变。使用同义词替换、句式转换、语序调整等多种技巧来降低文本相似度。',
    deai: '你是一个文本人性化专家，请将以下AI生成的文本改写为更像人类写作的风格。增加口语化表达、长短句交替、适当加入个人观点和情感。避免使用"首先...其次...最后"、"值得注意的是"、"综上所述"等AI常用套话。适度加入不完美的表达，模拟真实写作过程。',
    academic: '你是一个学术写作专家，请将以下文本润色为更正式的学术风格。使用专业术语、严谨的逻辑表达、规范的学术用语，避免口语化和非正式表达。',
    casual: '你是一个社交媒体写作专家，请将以下正式文本改写为轻松口语化的风格。使用日常用语、网络流行语（适度）、短句为主，让文字更接地气、更有亲和力。',
  };

  const base = modePrompts[mode] || modePrompts.smart;
  const intensityDesc = INTENSITY_PROMPTS[intensity];
  const extras: string[] = [];
  if (preserveStructure) extras.push('请保持原文的段落结构和逻辑顺序不变。');
  if (keepKeyTerms) extras.push('请保留原文中的关键术语和专业名词，不要替换它们。');

  return `${base}\n\n改写强度：${intensityDesc}\n${extras.join('\n')}\n\n请直接输出改写后的文本，不要添加任何解释或说明。`;
}

const TIPS = [
  '"去AI痕迹"模式最适合处理AI生成的文章，使其更像人类写作',
  '"降重改写"配合"激进"强度，降重效果最佳',
  '勾选"保留关键术语"可防止专业名词被替换',
  '改写后可点击"对比视图"查看修改详情',
];

const RELATED = [
  { to: '/workspace/humanize', label: '人性化改写' },
  { to: '/workspace/polish', label: '文章润色' },
  { to: '/workspace/summarizer', label: '内容总结' },
];

// ============================================================
// Diff Highlight Component
// ============================================================

function DiffView({ original, rewritten }: { original: string; rewritten: string }) {
  // Simple word-level diff: split into segments and highlight differences
  const diffSegments = computeDiff(original, rewritten);

  return (
    <div className="text-sm leading-relaxed whitespace-pre-wrap">
      {diffSegments.map((seg, i) => {
        if (seg.type === 'same') {
          return <span key={i}>{seg.text}</span>;
        }
        if (seg.type === 'removed') {
          return (
            <span key={i} className="bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 line-through">
              {seg.text}
            </span>
          );
        }
        if (seg.type === 'added') {
          return (
            <span key={i} className="bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">
              {seg.text}
            </span>
          );
        }
        return null;
      })}
    </div>
  );
}

interface DiffSegment {
  type: 'same' | 'removed' | 'added';
  text: string;
}

function computeDiff(original: string, rewritten: string): DiffSegment[] {
  // Simple line-level diff
  const origLines = original.split('\n');
  const newLines = rewritten.split('\n');

  const result: DiffSegment[] = [];
  let oi = 0;
  let ni = 0;

  while (oi < origLines.length || ni < newLines.length) {
    if (oi < origLines.length && ni < newLines.length && origLines[oi] === newLines[ni]) {
      result.push({ type: 'same', text: origLines[oi] });
      oi++;
      ni++;
    } else if (oi < origLines.length && ni < newLines.length && isSimilar(origLines[oi], newLines[ni])) {
      // Similar lines - show removed then added
      result.push({ type: 'removed', text: origLines[oi] });
      result.push({ type: 'added', text: newLines[ni] });
      oi++;
      ni++;
    } else if (ni < newLines.length && !origLines.slice(oi).includes(newLines[ni])) {
      result.push({ type: 'added', text: newLines[ni] });
      ni++;
    } else if (oi < origLines.length) {
      result.push({ type: 'removed', text: origLines[oi] });
      oi++;
    } else {
      result.push({ type: 'added', text: newLines[ni] });
      ni++;
    }
    // Add newline between segments
    if (oi < origLines.length || ni < newLines.length) {
      result.push({ type: 'same', text: '\n' });
    }
  }

  return result;
}

function isSimilar(a: string, b: string): boolean {
  // Simple similarity check: share at least 30% of characters
  if (!a || !b) return false;
  const setA = new Set(a.split(''));
  const setB = new Set(b.split(''));
  let common = 0;
  for (const ch of setA) {
    if (setB.has(ch)) common++;
  }
  return common / Math.max(setA.size, setB.size) >= 0.3;
}

// ============================================================
// Main Component
// ============================================================

export default function RewriteTool() {
  useSeo('rewrite');
  const { toast } = useToast();
  const addWordsGenerated = useAppStore((s) => s.addWordsGenerated);

  // State
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [activeMode, setActiveMode] = useState('smart');
  const [intensity, setIntensity] = useState<IntensityLevel>('standard');
  const [preserveStructure, setPreserveStructure] = useState(true);
  const [keepKeyTerms, setKeepKeyTerms] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputText]);

  const handleRewrite = useCallback(async () => {
    if (!inputText.trim()) {
      toast('请先输入需要改写的文本', 'warning');
      return;
    }

    // Cancel previous request
    if (abortRef.current) {
      abortRef.current.abort();
    }

    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setOutputText('');
    setShowDiff(false);

    const systemPrompt = getSystemPrompt(activeMode, intensity, preserveStructure, keepKeyTerms);

    const response = await chatWithAiStream(
      {
        messages: [{ role: 'user', content: inputText }],
        systemPrompt,
        temperature: intensity === 'conservative' ? 0.5 : intensity === 'aggressive' ? 0.9 : 0.7,
        maxTokens: 4096,
      },
      controller.signal,
    );

    if (!response.success || !response.stream) {
      toast(response.error || '改写失败，请重试', 'error');
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
        setOutputText(fullText);
      }
      addWordsGenerated(fullText.length);
      toast('改写完成', 'success');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled
      } else {
        toast('改写过程中出现错误', 'error');
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [inputText, activeMode, intensity, preserveStructure, keepKeyTerms, toast, addWordsGenerated]);

  const handleStop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
    }
  }, []);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        const trimmed = text.slice(0, MAX_CHARS);
        setInputText(trimmed);
        toast('已粘贴剪贴板内容', 'success');
      } else {
        toast('剪贴板为空', 'info');
      }
    } catch {
      toast('无法读取剪贴板，请手动粘贴', 'warning');
    }
  }, [toast]);

  const handleCopy = useCallback(async () => {
    if (!outputText) return;
    try {
      await navigator.clipboard.writeText(outputText);
      setCopied(true);
      toast('已复制到剪贴板', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('复制失败', 'error');
    }
  }, [outputText, toast]);

  const handleExport = useCallback(() => {
    if (!outputText) return;
    const blob = new Blob([outputText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `改写结果_${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast('文件已下载', 'success');
  }, [outputText, toast]);

  const handleClear = useCallback(() => {
    setInputText('');
    setOutputText('');
    setShowDiff(false);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-28 pb-8 sm:pt-32 sm:pb-10">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-violet-100/60 via-violet-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-purple-100/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-violet-600 transition-colors">
              工具
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">智能改写</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-violet-600 via-purple-500 to-violet-600 bg-clip-text text-transparent">
              AI 智能改写
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up max-w-2xl">
            支持智能改写、降重改写、去AI痕迹、学术润色、口语化等多种模式，一键提升文本质量
          </p>
        </div>
      </section>

      {/* Mode Selection */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex flex-wrap gap-2">
          {REWRITE_MODES.map((mode) => (
            <button
              key={mode.key}
              onClick={() => setActiveMode(mode.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeMode === mode.key
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-200 dark:shadow-violet-900/30'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 hover:text-violet-600 dark:hover:text-violet-400'
              }`}
            >
              <span>{mode.icon}</span>
              <span>{mode.label}</span>
              <span className={`hidden sm:inline text-xs ${activeMode === mode.key ? 'text-violet-200' : 'text-gray-400 dark:text-gray-500'}`}>
                {mode.description}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Options Panel */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <button
          onClick={() => setOptionsOpen(!optionsOpen)}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${optionsOpen ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          高级选项
        </button>

        {optionsOpen && (
          <div className="mt-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4 animate-fade-in">
            {/* Intensity Slider */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                改写强度
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 w-12">保守</span>
                <input
                  type="range"
                  min={0}
                  max={2}
                  step={1}
                  value={intensity === 'conservative' ? 0 : intensity === 'standard' ? 1 : 2}
                  onChange={(e) => {
                    const v = Number(e.target.value);
                    setIntensity(v === 0 ? 'conservative' : v === 1 ? 'standard' : 'aggressive');
                  }}
                  className="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-violet-600"
                />
                <span className="text-xs text-gray-400 w-12 text-right">激进</span>
              </div>
              <div className="text-center mt-1">
                <span className="inline-block px-2 py-0.5 text-xs font-medium rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400">
                  {INTENSITY_LABELS[intensity]}
                </span>
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preserveStructure}
                  onChange={(e) => setPreserveStructure(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">保留原文结构</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={keepKeyTerms}
                  onChange={(e) => setKeepKeyTerms(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">保留关键术语</span>
              </label>
            </div>
          </div>
        )}
      </section>

      {/* Two-Panel Layout */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Input Panel */}
          <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">改写前</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePaste}
                  disabled={isGenerating}
                  className="px-2.5 py-1 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 rounded-md hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors disabled:opacity-50"
                >
                  一键粘贴
                </button>
                {inputText.length > 0 && (
                  <button
                    onClick={handleClear}
                    disabled={isGenerating}
                    className="px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    清空
                  </button>
                )}
                <span className={`text-xs ${inputText.length > MAX_CHARS ? 'text-red-500' : 'text-gray-400'}`}>
                  {inputText.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                </span>
              </div>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value.slice(0, MAX_CHARS))}
              placeholder="在此粘贴或输入需要改写的文本..."
              disabled={isGenerating}
              className="flex-1 min-h-[320px] p-4 text-sm text-gray-800 dark:text-gray-200 bg-transparent resize-none focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50"
            />
          </div>

          {/* Output Panel */}
          <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">改写后</span>
              </div>
              <div className="flex items-center gap-2">
                {outputText.length > 0 && (
                  <>
                    <button
                      onClick={() => setShowDiff(!showDiff)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                        showDiff
                          ? 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30'
                          : 'text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400'
                      }`}
                    >
                      {showDiff ? '原文视图' : '对比视图'}
                    </button>
                    <button
                      onClick={handleCopy}
                      className="px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                    >
                      {copied ? '已复制' : '复制'}
                    </button>
                    <button
                      onClick={handleExport}
                      className="px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                    >
                      导出
                    </button>
                  </>
                )}
                {outputText.length > 0 && (
                  <span className="text-xs text-gray-400">
                    {outputText.length.toLocaleString()} 字
                  </span>
                )}
              </div>
            </div>
            <div ref={outputRef} className="flex-1 min-h-[320px] p-4 overflow-y-auto">
              {outputText ? (
                showDiff ? (
                  <DiffView original={inputText} rewritten={outputText} />
                ) : (
                  <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {outputText}
                    {isGenerating && (
                      <span className="inline-block w-1.5 h-4 ml-0.5 bg-violet-500 animate-pulse rounded-sm" />
                    )}
                  </div>
                )
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                  <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
                  </svg>
                  <p className="text-sm">改写结果将在这里显示</p>
                  <p className="text-xs mt-1 opacity-60">选择改写模式，输入文本后点击"开始改写"</p>
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
              onClick={handleRewrite}
              disabled={!inputText.trim()}
              className="inline-flex items-center gap-2 px-8 py-3 bg-violet-600 text-white text-sm font-medium rounded-xl hover:bg-violet-700 transition-all shadow-md shadow-violet-200 dark:shadow-violet-900/30 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
              开始改写
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

          {outputText.length > 0 && !isGenerating && (
            <button
              onClick={handleRewrite}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700 hover:text-violet-600 dark:hover:text-violet-400 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              重新改写
            </button>
          )}
        </div>
      </section>

      {/* Usage Tips */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">💡 使用技巧</h3>
        <ul className="space-y-2">
          {TIPS.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="text-violet-500 mt-0.5 shrink-0">•</span>
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
            <Link
              key={r.to}
              to={r.to}
              className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-violet-300 dark:hover:border-violet-700 hover:text-violet-600 transition-colors"
            >
              {r.label} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
