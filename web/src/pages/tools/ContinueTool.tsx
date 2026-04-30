import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '../../components/SeoHead';
import { useAppStore } from '../../store/appStore';
import { useToast } from '../../components/ToastProvider';
import { chatWithAiStream } from '../../services/aiChat';

// ============================================================
// 类型定义
// ============================================================

type ContinueMode = 'continue' | 'expand' | 'ending' | 'title' | 'rewrite';
type LengthOption = 'short' | 'medium' | 'long' | 'custom';
type StyleOption = 'auto' | 'formal' | 'casual' | 'creative' | 'academic';

interface VersionResult {
  id: string;
  content: string;
  accepted: boolean;
}

// ============================================================
// 常量
// ============================================================

const MODE_TABS: { key: ContinueMode; label: string; icon: string }[] = [
  { key: 'continue', label: '智能续写', icon: '📝' },
  { key: 'expand', label: '扩写丰富', icon: '📖' },
  { key: 'ending', label: '结尾生成', icon: '🎯' },
  { key: 'title', label: '标题生成', icon: '🏷️' },
  { key: 'rewrite', label: '段落改写', icon: '🔄' },
];

const LENGTH_OPTIONS: { key: LengthOption; label: string; chars: number }[] = [
  { key: 'short', label: '短', chars: 100 },
  { key: 'medium', label: '中', chars: 300 },
  { key: 'long', label: '长', chars: 500 },
  { key: 'custom', label: '自定义', chars: 0 },
];

const STYLE_OPTIONS: { key: StyleOption; label: string }[] = [
  { key: 'auto', label: '自动检测' },
  { key: 'formal', label: '正式' },
  { key: 'casual', label: '轻松' },
  { key: 'creative', label: '创意' },
  { key: 'academic', label: '学术' },
];

const MAX_INPUT_CHARS = 10000;

const TIPS = [
  '粘贴越多上下文，续写效果越自然',
  '"扩写丰富"模式适合充实内容单薄的段落',
  '"结尾生成"会自动呼应前文、升华主题',
  '生成多个版本可以对比选择最佳结果',
  '段落改写模式下点击段落即可选中要改写的部分',
];

const RELATED = [
  { to: '/workspace/polish', label: '文章润色' },
  { to: '/workspace/humanize', label: '人性化改写' },
  { to: '/workspace/summarizer', label: '文本摘要' },
];

// ============================================================
// 系统提示词
// ============================================================

function getSystemPrompt(mode: ContinueMode, style: StyleOption, length: number): string {
  const styleMap: Record<StyleOption, string> = {
    auto: '自动检测并匹配原文风格',
    formal: '正式、严谨的书面语风格',
    casual: '轻松、口语化的风格',
    creative: '富有创意和想象力的风格',
    academic: '学术、客观、严谨的风格',
  };

  const lengthHint = length > 0 ? `续写长度约为${length}字。` : '';

  const base = `写作风格要求：${styleMap[style]}。${lengthHint}`;

  switch (mode) {
    case 'continue':
      return `你是一个专业写作助手。请根据以下已有文本的上下文、风格和主题，自然地续写内容。保持与原文一致的语气和风格，确保续写部分与原文无缝衔接。\n\n${base}\n\n请直接输出续写内容，不要重复原文，不要添加任何解释或说明。`;

    case 'expand':
      return `你是一个内容扩展专家。请将以下文本进行扩写，增加更多细节、例子、数据支撑，使内容更加丰富饱满。保持原文的核心观点不变，但让表达更加充实有力。\n\n${base}\n\n请直接输出扩写后的完整内容，不要添加任何解释。`;

    case 'ending':
      return `你是一个专业写作助手。请为以下文本生成一个精彩的结尾/总结，要呼应前文、升华主题，给读者留下深刻印象。\n\n${base}\n\n请直接输出结尾内容，不要添加任何解释。`;

    case 'title':
      return `你是一个标题创作专家。请为以下内容生成5个吸引人的标题，涵盖不同风格（疑问式、数字式、悬念式、利益式、情感式）。\n\n${base}\n\n请按以下格式输出，每个标题占一行：\n1. [疑问式] 标题内容\n2. [数字式] 标题内容\n3. [悬念式] 标题内容\n4. [利益式] 标题内容\n5. [情感式] 标题内容`;

    case 'rewrite':
      return `你是一个文本改写专家。请改写以下段落，保持核心含义但改善表达。使语言更加流畅、生动、有感染力。\n\n${base}\n\n请直接输出改写后的内容，不要添加任何解释。`;

    default:
      return base;
  }
}

// ============================================================
// 工具函数
// ============================================================

function countChars(text: string): number {
  return text.replace(/\s/g, '').length;
}

function splitParagraphs(text: string): string[] {
  return text.split(/\n\s*\n|\n/).filter((p) => p.trim().length > 0);
}

let versionIdCounter = 0;
function nextVersionId(): string {
  return `v_${++versionIdCounter}_${Date.now()}`;
}

// ============================================================
// 组件
// ============================================================

export default function ContinueTool() {
  useSeo('continue');
  const { addWordsGenerated, incrementActions, addRecentTool } = useAppStore();
  const { toast } = useToast();

  // 状态
  const [inputText, setInputText] = useState('');
  const [mode, setMode] = useState<ContinueMode>('continue');
  const [lengthOption, setLengthOption] = useState<LengthOption>('medium');
  const [customLength, setCustomLength] = useState(200);
  const [style, setStyle] = useState<StyleOption>('auto');
  const [versionCount, setVersionCount] = useState(1);
  const [selectedParagraph, setSelectedParagraph] = useState<number>(-1);

  // 输出状态
  const [versions, setVersions] = useState<VersionResult[]>([]);
  const [activeVersionId, setActiveVersionId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const [currentStreamVersionId, setCurrentStreamVersionId] = useState<string | null>(null);
  const [mergedText, setMergedText] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  const paragraphs = splitParagraphs(inputText);
  const effectiveLength = lengthOption === 'custom' ? customLength : LENGTH_OPTIONS.find((l) => l.key === lengthOption)?.chars ?? 300;

  // 段落选择器（仅段落改写模式）
  const handleParagraphSelect = useCallback(
    (index: number) => {
      setSelectedParagraph((prev) => (prev === index ? -1 : index));
    },
    [],
  );

  // 获取用户输入文本（段落改写模式下使用选中的段落）
  const getEffectiveInput = useCallback((): string => {
    if (mode === 'rewrite' && selectedParagraph >= 0 && selectedParagraph < paragraphs.length) {
      return paragraphs[selectedParagraph];
    }
    return inputText;
  }, [mode, selectedParagraph, paragraphs, inputText]);

  // 生成续写
  const handleGenerate = useCallback(async () => {
    const text = getEffectiveInput();
    if (!text.trim()) {
      toast('请先输入或粘贴文本内容', 'warning');
      return;
    }

    setIsGenerating(true);
    setStreamingContent('');
    setVersions([]);
    setActiveVersionId(null);
    setMergedText('');

    const newVersionId = nextVersionId();
    setCurrentStreamVersionId(newVersionId);

    const systemPrompt = getSystemPrompt(mode, style, effectiveLength);

    // 生成多个版本
    const totalVersions = versionCount;
    const allResults: VersionResult[] = [];

    for (let i = 0; i < totalVersions; i++) {
      const vid = i === 0 ? newVersionId : nextVersionId();
      setCurrentStreamVersionId(vid);
      setStreamingContent('');

      abortRef.current = new AbortController();

      const userMessage =
        mode === 'title'
          ? `请为以下内容生成标题：\n\n${text}`
          : mode === 'rewrite'
          ? `请改写以下段落：\n\n${text}`
          : mode === 'ending'
          ? `请为以下文本生成结尾：\n\n${text}`
          : mode === 'expand'
          ? `请扩写以下文本：\n\n${text}`
          : `请续写以下文本：\n\n${text}`;

      const { success, stream, error } = await chatWithAiStream(
        {
          messages: [{ role: 'user', content: userMessage }],
          systemPrompt,
          temperature: 0.8,
          maxTokens: Math.max(1024, effectiveLength * 3),
        },
        abortRef.current.signal,
      );

      if (!success || !stream) {
        toast(error || '生成失败，请重试', 'error');
        setIsGenerating(false);
        setCurrentStreamVersionId(null);
        return;
      }

      let accumulated = '';
      const reader = stream.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          accumulated += value;
          setStreamingContent(accumulated);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          break;
        }
        toast('读取流数据失败', 'error');
        setIsGenerating(false);
        setCurrentStreamVersionId(null);
        return;
      }

      allResults.push({ id: vid, content: accumulated, accepted: false });
    }

    setVersions(allResults);
    if (allResults.length > 0) {
      setActiveVersionId(allResults[0].id);
    }
    setCurrentStreamVersionId(null);
    setIsGenerating(false);

    // 统计
    const totalNewChars = allResults.reduce((sum, v) => sum + countChars(v.content), 0);
    addWordsGenerated(totalNewChars);
    incrementActions();
    addRecentTool('continue');
  }, [getEffectiveInput, mode, style, effectiveLength, versionCount, toast, addWordsGenerated, incrementActions, addRecentTool]);

  // 停止生成
  const handleStop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // 采用某个版本
  const handleAccept = useCallback(
    (versionId: string) => {
      const version = versions.find((v) => v.id === versionId);
      if (!version) return;

      setVersions((prev) => prev.map((v) => (v.id === versionId ? { ...v, accepted: true } : v)));

      // 合并文本
      let merged: string;
      if (mode === 'title') {
        merged = version.content;
      } else if (mode === 'rewrite' && selectedParagraph >= 0) {
        const newParagraphs = [...paragraphs];
        newParagraphs[selectedParagraph] = version.content;
        merged = newParagraphs.join('\n\n');
      } else {
        merged = inputText + '\n\n' + version.content;
      }
      setMergedText(merged);
      toast('已采用该版本', 'success');
    },
    [versions, mode, selectedParagraph, paragraphs, inputText, toast],
  );

  // 重新生成
  const handleRegenerate = useCallback(() => {
    handleGenerate();
  }, [handleGenerate]);

  // 复制全文
  const handleCopyAll = useCallback(async () => {
    const textToCopy = mergedText || (activeVersionId ? versions.find((v) => v.id === activeVersionId)?.content ?? '' : '');
    if (!textToCopy) {
      toast('没有可复制的内容', 'warning');
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      toast('已复制到剪贴板', 'success');
    } catch {
      // fallback
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toast('已复制到剪贴板', 'success');
    }
  }, [mergedText, activeVersionId, versions, toast]);

  // 滚动到输出区域
  useEffect(() => {
    if (versions.length > 0 && outputRef.current) {
      outputRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [versions.length]);

  // 切换模式时重置段落选择
  useEffect(() => {
    setSelectedParagraph(-1);
  }, [mode]);

  const activeVersion = versions.find((v) => v.id === activeVersionId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-blue-100/60 via-blue-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-blue-100/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-blue-600 transition-colors">
              工具
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">续写扩写</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-600 bg-clip-text text-transparent">
              AI续写扩写
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            智能理解上下文，一键续写文章、扩写段落、生成结尾，支持多版本对比选择
          </p>
        </div>
      </section>

      {/* Main Tool Section */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* ===== Left Panel: Input ===== */}
            <div className="space-y-4">
              {/* Mode Tabs */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">写作模式</label>
                <div className="flex flex-wrap gap-2">
                  {MODE_TABS.map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setMode(tab.key)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 ${
                        mode === tab.key
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span>{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Text Input */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {mode === 'rewrite' ? '原文内容（点击下方段落选择要改写的部分）' : '输入文本'}
                  </label>
                  <span className={`text-xs ${countChars(inputText) > MAX_INPUT_CHARS ? 'text-red-500' : 'text-gray-400 dark:text-gray-500'}`}>
                    {countChars(inputText)} / {MAX_INPUT_CHARS}
                  </span>
                </div>
                <textarea
                  value={inputText}
                  onChange={(e) => {
                    if (e.target.value.length <= MAX_INPUT_CHARS) {
                      setInputText(e.target.value);
                    }
                  }}
                  placeholder={
                    mode === 'continue'
                      ? '粘贴或输入你的文章，AI 将根据上下文智能续写...'
                      : mode === 'expand'
                      ? '粘贴需要扩写的文本，AI 将增加更多细节和内容...'
                      : mode === 'ending'
                      ? '粘贴你的文章，AI 将生成一个精彩的结尾...'
                      : mode === 'title'
                      ? '粘贴你的文章内容，AI 将生成多个吸引人的标题...'
                      : '粘贴文章，然后点击下方段落选择要改写的部分...'
                  }
                  className="w-full h-64 px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y"
                />

                {/* Paragraph Selector (rewrite mode only) */}
                {mode === 'rewrite' && paragraphs.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">点击选择要改写的段落：</p>
                    <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                      {paragraphs.map((para, index) => (
                        <button
                          key={index}
                          onClick={() => handleParagraphSelect(index)}
                          className={`w-full text-left px-3 py-2 text-xs rounded-lg border transition-all duration-200 line-clamp-2 ${
                            selectedParagraph === index
                              ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-600 text-blue-700 dark:text-blue-300'
                              : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <span className="text-gray-400 dark:text-gray-500 mr-1.5">P{index + 1}</span>
                          {para.trim().slice(0, 80)}
                          {para.trim().length > 80 ? '...' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Options */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm space-y-4">
                {/* Length */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">续写长度</label>
                  <div className="flex flex-wrap gap-2">
                    {LENGTH_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setLengthOption(opt.key)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          lengthOption === opt.key
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {opt.label}
                        {opt.chars > 0 && <span className="ml-1 text-xs opacity-70">({opt.chars}字)</span>}
                      </button>
                    ))}
                  </div>
                  {lengthOption === 'custom' && (
                    <input
                      type="number"
                      value={customLength}
                      onChange={(e) => setCustomLength(Math.max(10, Math.min(2000, parseInt(e.target.value) || 10)))}
                      min={10}
                      max={2000}
                      className="mt-2 w-32 px-3 py-1.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    />
                  )}
                </div>

                {/* Style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">风格匹配</label>
                  <div className="flex flex-wrap gap-2">
                    {STYLE_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setStyle(opt.key)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                          style === opt.key
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Version Count */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">生成版本数</label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map((n) => (
                      <button
                        key={n}
                        onClick={() => setVersionCount(n)}
                        className={`w-12 h-9 rounded-lg text-sm font-medium transition-all duration-200 ${
                          versionCount === n
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Generate Button */}
              <div className="flex gap-3">
                {!isGenerating ? (
                  <button
                    onClick={handleGenerate}
                    disabled={!inputText.trim()}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white text-sm font-medium rounded-xl hover:bg-blue-700 disabled:bg-gray-300 disabled:dark:bg-gray-700 disabled:text-gray-500 transition-all shadow-sm hover:shadow-md"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                    </svg>
                    {mode === 'title' ? '生成标题' : mode === 'rewrite' ? '开始改写' : mode === 'ending' ? '生成结尾' : mode === 'expand' ? '开始扩写' : '开始续写'}
                  </button>
                ) : (
                  <button
                    onClick={handleStop}
                    className="flex-1 inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-all shadow-sm"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                    </svg>
                    停止生成
                  </button>
                )}
              </div>
            </div>

            {/* ===== Right Panel: Output ===== */}
            <div ref={outputRef} className="space-y-4">
              {/* Streaming Output */}
              {isGenerating && currentStreamVersionId && streamingContent && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-blue-200 dark:border-blue-800 p-4 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                    <span className="text-sm font-medium text-blue-600 dark:text-blue-400">正在生成...</span>
                  </div>
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                    {streamingContent}
                    <span className="inline-block w-0.5 h-4 bg-blue-500 animate-pulse ml-0.5 align-middle" />
                  </div>
                </div>
              )}

              {/* Version Results */}
              {versions.length > 0 && (
                <>
                  {/* Version Tabs (if multiple) */}
                  {versions.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {versions.map((v, i) => (
                        <button
                          key={v.id}
                          onClick={() => setActiveVersionId(v.id)}
                          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            activeVersionId === v.id
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700'
                              : v.accepted
                              ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400'
                              : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                          }`}
                        >
                          {v.accepted ? '✓ ' : ''}版本 {i + 1}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Active Version Content */}
                  {activeVersion && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                      {/* Version Header */}
                      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            {mode === 'title' ? '生成的标题' : mode === 'rewrite' ? '改写结果' : mode === 'ending' ? '生成的结尾' : mode === 'expand' ? '扩写结果' : '续写内容'}
                          </span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">
                            ({countChars(activeVersion.content)}字)
                          </span>
                        </div>
                        {activeVersion.accepted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30 rounded-full">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            已采用
                          </span>
                        )}
                      </div>

                      {/* Content with divider */}
                      <div className="p-4">
                        {/* Original text (except for title mode) */}
                        {mode !== 'title' && (
                          <>
                            <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap leading-relaxed mb-0">
                              {mode === 'rewrite' && selectedParagraph >= 0
                                ? paragraphs[selectedParagraph]
                                : inputText}
                            </div>

                            {/* Visual Divider */}
                            <div className="flex items-center gap-3 my-4">
                              <div className="flex-1 border-t-2 border-dashed border-blue-300 dark:border-blue-700" />
                              <span className="shrink-0 inline-flex items-center gap-1 px-3 py-1 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 rounded-full">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                                </svg>
                                AI{mode === 'rewrite' ? '改写' : mode === 'ending' ? '结尾' : mode === 'expand' ? '扩写' : '续写'}
                              </span>
                              <div className="flex-1 border-t-2 border-dashed border-blue-300 dark:border-blue-700" />
                            </div>
                          </>
                        )}

                        {/* Generated content */}
                        <div className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                          {activeVersion.content}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
                        {!activeVersion.accepted ? (
                          <button
                            onClick={() => handleAccept(activeVersion.id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                            </svg>
                            采用此版本
                          </button>
                        ) : (
                          <span className="text-sm text-green-600 dark:text-green-400 font-medium">已采用此版本</span>
                        )}

                        <button
                          onClick={handleRegenerate}
                          disabled={isGenerating}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                          </svg>
                          重新生成
                        </button>

                        {(activeVersion.accepted || mergedText) && (
                          <button
                            onClick={handleCopyAll}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors ml-auto"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                            </svg>
                            复制全文
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Merged Text Preview */}
                  {mergedText && (
                    <div className="bg-white dark:bg-gray-900 rounded-xl border border-green-200 dark:border-green-800 p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-green-600 dark:text-green-400">合并后全文</span>
                          <span className="text-xs text-gray-400 dark:text-gray-500">({countChars(mergedText)}字)</span>
                        </div>
                        <button
                          onClick={handleCopyAll}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                          </svg>
                          复制
                        </button>
                      </div>
                      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                        {mergedText}
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Empty State */}
              {!isGenerating && versions.length === 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-8 shadow-sm text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                    </svg>
                  </div>
                  <h3 className="text-base font-medium text-gray-900 dark:text-white mb-1">等待生成</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    在左侧输入文本，选择模式和选项后点击生成按钮
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Usage Tips */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">💡 使用技巧</h3>
        <ul className="space-y-2">
          {TIPS.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="text-blue-500 mt-0.5 shrink-0">•</span>
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
              className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-blue-300 dark:hover:border-blue-700 hover:text-blue-600 transition-colors"
            >
              {r.label} →
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
