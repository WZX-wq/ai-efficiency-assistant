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

interface TranslationMode {
  key: string;
  label: string;
  icon: string;
  description: string;
}

const TRANSLATION_MODES: TranslationMode[] = [
  { key: 'text', label: '文本翻译', icon: '📝', description: '标准文本翻译' },
  { key: 'document', label: '文档翻译', icon: '📄', description: '上传文档翻译' },
  { key: 'batch', label: '批量翻译', icon: '📋', description: '多段文本批量翻译' },
  { key: 'polish', label: '润色翻译', icon: '✨', description: '翻译并优化表达' },
];

interface LanguageOption {
  value: string;
  label: string;
  flag: string;
}

const SOURCE_LANGUAGES: LanguageOption[] = [
  { value: 'auto', label: '自动检测', flag: '🔍' },
  { value: 'zh', label: '中文', flag: '🇨🇳' },
  { value: 'en', label: '英语', flag: '🇺🇸' },
  { value: 'ja', label: '日语', flag: '🇯🇵' },
  { value: 'ko', label: '韩语', flag: '🇰🇷' },
  { value: 'fr', label: '法语', flag: '🇫🇷' },
  { value: 'de', label: '德语', flag: '🇩🇪' },
  { value: 'es', label: '西班牙语', flag: '🇪🇸' },
  { value: 'ru', label: '俄语', flag: '🇷🇺' },
  { value: 'ar', label: '阿拉伯语', flag: '🇸🇦' },
  { value: 'pt', label: '葡萄牙语', flag: '🇧🇷' },
];

const TARGET_LANGUAGES: LanguageOption[] = SOURCE_LANGUAGES.filter((l) => l.value !== 'auto');

const LANG_NAMES: Record<string, string> = {
  auto: '自动检测', zh: '中文', en: '英语', ja: '日语', ko: '韩语',
  fr: '法语', de: '德语', es: '西班牙语', ru: '俄语', ar: '阿拉伯语', pt: '葡萄牙语',
};

type TranslationStyle = 'literal' | 'free' | 'professional' | 'casual';

const STYLE_OPTIONS: { value: TranslationStyle; label: string }[] = [
  { value: 'literal', label: '直译' },
  { value: 'free', label: '意译' },
  { value: 'professional', label: '专业' },
  { value: 'casual', label: '口语化' },
];

interface BatchItem {
  id: string;
  source: string;
  translated: string;
  status: 'pending' | 'translating' | 'done' | 'error';
}

// ============================================================
// System Prompt Builder
// ============================================================

function getSystemPrompt(
  mode: string,
  sourceLang: string,
  targetLang: string,
  style: TranslationStyle,
  preserveFormatting: boolean,
  includePronunciation: boolean,
): string {
  const sourceName = LANG_NAMES[sourceLang] || sourceLang;
  const targetName = LANG_NAMES[targetLang] || targetLang;

  const modePrompts: Record<string, string> = {
    text: `你是一个专业的多语言翻译专家。请将以下${sourceName}文本翻译为${targetName}。`,
    document: `你是一个专业的文档翻译专家。请将以下${sourceName}文档内容翻译为${targetName}，保持原文档的格式结构（如标题、段落、列表等）。`,
    batch: `你是一个高效的批量翻译专家。请将以下${sourceName}文本翻译为${targetName}。只输出翻译结果，不要添加任何解释。`,
    polish: `你是一个翻译与润色专家。请将以下${sourceName}文本翻译为${targetName}，并在翻译的同时优化目标语言的表达质量，使译文更加地道、流畅、优美。`,
  };

  const stylePrompts: Record<TranslationStyle, string> = {
    literal: '请采用直译风格，尽可能保留原文的句式结构和表达方式，准确传达原文含义。',
    free: '请采用意译风格，在准确传达原文含义的前提下，使用目标语言中最自然的表达方式。',
    professional: '请采用专业翻译风格，使用正式、准确的术语和表达，适合商务、学术等正式场景。',
    casual: '请采用口语化翻译风格，使用日常交流中的自然表达，适合对话、社交媒体等非正式场景。',
  };

  const base = modePrompts[mode] || modePrompts.text;
  const styleDesc = stylePrompts[style];
  const extras: string[] = [styleDesc];

  if (preserveFormatting) {
    extras.push('请保持原文的格式，包括段落结构、标点符号风格、数字格式等。');
  }
  if (includePronunciation) {
    const cjkTargets = ['zh', 'ja', 'ko'];
    if (cjkTargets.includes(targetLang)) {
      extras.push(`请在每段翻译结果后用方括号标注读音/拼音。例如：[pīnyīn] 或 [読み方]。`);
    }
  }

  extras.push('请直接输出翻译结果，不要添加任何解释或说明。');

  return `${base}\n\n翻译风格：${styleDesc}\n${extras.join('\n')}`;
}

// ============================================================
// Main Component
// ============================================================

export default function TranslationTool() {
  useSeo('translation');
  const { toast } = useToast();
  const addWordsGenerated = useAppStore((s) => s.addWordsGenerated);

  // Core state
  const [activeMode, setActiveMode] = useState('text');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('en');
  const [style, setStyle] = useState<TranslationStyle>('free');
  const [preserveFormatting, setPreserveFormatting] = useState(true);
  const [includePronunciation, setIncludePronunciation] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);

  // Text mode state
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Batch mode state
  const [batchItems, setBatchItems] = useState<BatchItem[]>([
    { id: '1', source: '', translated: '', status: 'pending' },
    { id: '2', source: '', translated: '', status: 'pending' },
    { id: '3', source: '', translated: '', status: 'pending' },
  ]);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);

  // Document mode state
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docContent, setDocContent] = useState('');
  const [docTranslated, setDocTranslated] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputText]);

  // Swap languages
  const handleSwap = useCallback(() => {
    if (sourceLang === 'auto') return;
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  }, [sourceLang, targetLang]);

  // ---- Text Translation ----
  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) {
      toast('请先输入需要翻译的文本', 'warning');
      return;
    }

    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setOutputText('');

    const systemPrompt = getSystemPrompt(
      activeMode, sourceLang, targetLang, style, preserveFormatting, includePronunciation,
    );

    const response = await chatWithAiStream(
      {
        messages: [{ role: 'user', content: inputText }],
        systemPrompt,
        temperature: 0.3,
        maxTokens: 4096,
      },
      controller.signal,
    );

    if (!response.success || !response.stream) {
      toast(response.error || '翻译失败，请重试', 'error');
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
      toast('翻译完成', 'success');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled
      } else {
        toast('翻译过程中出现错误', 'error');
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [inputText, activeMode, sourceLang, targetLang, style, preserveFormatting, includePronunciation, toast, addWordsGenerated]);

  // ---- Batch Translation ----
  const handleBatchTranslate = useCallback(async () => {
    const validItems = batchItems.filter((item) => item.source.trim());
    if (validItems.length === 0) {
      toast('请至少输入一条需要翻译的文本', 'warning');
      return;
    }

    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setIsBatchGenerating(true);
    setBatchProgress({ current: 0, total: validItems.length });

    const systemPrompt = getSystemPrompt(
      'batch', sourceLang, targetLang, style, preserveFormatting, includePronunciation,
    );

    for (let i = 0; i < validItems.length; i++) {
      const item = validItems[i];

      setBatchItems((prev) =>
        prev.map((b) => (b.id === item.id ? { ...b, status: 'translating' as const, translated: '' } : b)),
      );
      setBatchProgress({ current: i + 1, total: validItems.length });

      const response = await chatWithAiStream(
        {
          messages: [{ role: 'user', content: item.source }],
          systemPrompt,
          temperature: 0.3,
          maxTokens: 2048,
        },
        controller.signal,
      );

      if (!response.success || !response.stream) {
        setBatchItems((prev) =>
          prev.map((b) => (b.id === item.id ? { ...b, status: 'error' as const } : b)),
        );
        continue;
      }

      const reader = response.stream.getReader();
      let fullText = '';

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullText += value;
          setBatchItems((prev) =>
            prev.map((b) => (b.id === item.id ? { ...b, translated: fullText } : b)),
          );
        }
        addWordsGenerated(fullText.length);
        setBatchItems((prev) =>
          prev.map((b) => (b.id === item.id ? { ...b, status: 'done' as const } : b)),
        );
      } catch {
        setBatchItems((prev) =>
          prev.map((b) => (b.id === item.id ? { ...b, status: 'error' as const } : b)),
        );
      }
    }

    toast('批量翻译完成', 'success');
    setIsBatchGenerating(false);
    abortRef.current = null;
  }, [batchItems, sourceLang, targetLang, style, preserveFormatting, includePronunciation, toast, addWordsGenerated]);

  // ---- Document Translation ----
  const handleDocUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (file.size > 5 * 1024 * 1024) {
        toast('文件大小不能超过 5MB', 'warning');
        return;
      }

      setDocFile(file);
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setDocContent(text);
        setDocTranslated('');
      };
      reader.readAsText(file);
      toast('文件已加载', 'success');
    },
    [toast],
  );

  const handleDocTranslate = useCallback(async () => {
    if (!docContent.trim()) {
      toast('请先上传文档', 'warning');
      return;
    }

    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setDocTranslated('');

    const systemPrompt = getSystemPrompt(
      'document', sourceLang, targetLang, style, preserveFormatting, includePronunciation,
    );

    const response = await chatWithAiStream(
      {
        messages: [{ role: 'user', content: docContent }],
        systemPrompt,
        temperature: 0.3,
        maxTokens: 8192,
      },
      controller.signal,
    );

    if (!response.success || !response.stream) {
      toast(response.error || '文档翻译失败，请重试', 'error');
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
        setDocTranslated(fullText);
      }
      addWordsGenerated(fullText.length);
      toast('文档翻译完成', 'success');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled
      } else {
        toast('文档翻译过程中出现错误', 'error');
      }
    } finally {
      setIsGenerating(false);
      abortRef.current = null;
    }
  }, [docContent, sourceLang, targetLang, style, preserveFormatting, includePronunciation, toast, addWordsGenerated]);

  // ---- Common handlers ----
  const handleStop = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
  }, []);

  const handleCopy = useCallback(async () => {
    const textToCopy = activeMode === 'document' ? docTranslated : outputText;
    if (!textToCopy) return;
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      toast('已复制到剪贴板', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast('复制失败', 'error');
    }
  }, [activeMode, docTranslated, outputText, toast]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setInputText(text.slice(0, MAX_CHARS));
        toast('已粘贴剪贴板内容', 'success');
      } else {
        toast('剪贴板为空', 'info');
      }
    } catch {
      toast('无法读取剪贴板，请手动粘贴', 'warning');
    }
  }, [toast]);

  const handleClear = useCallback(() => {
    setInputText('');
    setOutputText('');
  }, []);

  // Batch helpers
  const addBatchRow = useCallback(() => {
    setBatchItems((prev) => [
      ...prev,
      { id: String(Date.now()), source: '', translated: '', status: 'pending' },
    ]);
  }, []);

  const removeBatchRow = useCallback((id: string) => {
    setBatchItems((prev) => prev.filter((b) => b.id !== id));
  }, []);

  const updateBatchSource = useCallback((id: string, value: string) => {
    setBatchItems((prev) =>
      prev.map((b) => (b.id === id ? { ...b, source: value, status: 'pending' as const, translated: '' } : b)),
    );
  }, []);

  const handleExportCsv = useCallback(() => {
    const doneItems = batchItems.filter((b) => b.status === 'done');
    if (doneItems.length === 0) {
      toast('没有可导出的翻译结果', 'warning');
      return;
    }
    const header = 'Source,Translation\n';
    const rows = doneItems
      .map((item) => `"${item.source.replace(/"/g, '""')}","${item.translated.replace(/"/g, '""')}"`)
      .join('\n');
    const csv = '\uFEFF' + header + rows; // BOM for Excel
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `批量翻译_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast('CSV 已导出', 'success');
  }, [batchItems, toast]);

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-28 pb-8 sm:pt-32 sm:pb-10">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-cyan-100/60 via-teal-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-teal-100/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-cyan-600 transition-colors">
              工具
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">智能翻译</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-cyan-600 via-teal-500 to-cyan-600 bg-clip-text text-transparent">
              AI 智能翻译
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up max-w-2xl">
            支持中英日韩法德西俄阿葡 10+ 语言互译，提供文本翻译、文档翻译、批量翻译、润色翻译四种模式
          </p>
        </div>
      </section>

      {/* Mode Selection */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex flex-wrap gap-2">
          {TRANSLATION_MODES.map((mode) => (
            <button
              key={mode.key}
              onClick={() => setActiveMode(mode.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeMode === mode.key
                  ? 'bg-cyan-600 text-white shadow-md shadow-cyan-200 dark:shadow-cyan-900/30'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700 hover:text-cyan-600 dark:hover:text-cyan-400'
              }`}
            >
              <span>{mode.icon}</span>
              <span>{mode.label}</span>
              <span className={`hidden sm:inline text-xs ${activeMode === mode.key ? 'text-cyan-200' : 'text-gray-400 dark:text-gray-500'}`}>
                {mode.description}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Language Selection */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Source Language */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">源语言</label>
            <select
              value={sourceLang}
              onChange={(e) => setSourceLang(e.target.value)}
              className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
            >
              {SOURCE_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.flag} {lang.label}
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <button
            onClick={handleSwap}
            disabled={sourceLang === 'auto'}
            className="p-2 rounded-full bg-cyan-50 dark:bg-cyan-900/20 text-cyan-600 dark:text-cyan-400 hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            title="交换源语言和目标语言"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
            </svg>
          </button>

          {/* Target Language */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">目标语言</label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none"
            >
              {TARGET_LANGUAGES.map((lang) => (
                <option key={lang.value} value={lang.value}>
                  {lang.flag} {lang.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* Options Panel */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <button
          onClick={() => setOptionsOpen(!optionsOpen)}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
        >
          <svg
            className={`w-4 h-4 transition-transform duration-200 ${optionsOpen ? 'rotate-90' : ''}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
          翻译选项
        </button>

        {optionsOpen && (
          <div className="mt-3 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 space-y-4 animate-fade-in">
            {/* Translation Style */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                翻译风格
              </label>
              <div className="flex flex-wrap gap-2">
                {STYLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setStyle(opt.value)}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                      style === opt.value
                        ? 'bg-cyan-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-cyan-50 dark:hover:bg-cyan-900/20 hover:text-cyan-600 dark:hover:text-cyan-400'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Checkboxes */}
            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preserveFormatting}
                  onChange={(e) => setPreserveFormatting(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">保留格式</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePronunciation}
                  onChange={(e) => setIncludePronunciation(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-cyan-600 focus:ring-cyan-500"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300">显示读音标注</span>
              </label>
            </div>
          </div>
        )}
      </section>

      {/* ========== TEXT MODE ========== */}
      {activeMode === 'text' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Input Panel */}
            <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">原文</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePaste}
                    disabled={isGenerating}
                    className="px-2.5 py-1 text-xs font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 rounded-md hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors disabled:opacity-50"
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
                placeholder="在此输入或粘贴需要翻译的文本..."
                disabled={isGenerating}
                className="flex-1 min-h-[320px] p-4 text-sm text-gray-800 dark:text-gray-200 bg-transparent resize-none focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50"
              />
            </div>

            {/* Output Panel */}
            <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">译文</span>
                </div>
                <div className="flex items-center gap-2">
                  {outputText.length > 0 && (
                    <>
                      <button
                        onClick={handleCopy}
                        className="px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                      >
                        {copied ? '已复制' : '复制'}
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
                  <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {outputText}
                    {isGenerating && (
                      <span className="inline-block w-1.5 h-4 ml-0.5 bg-cyan-500 animate-pulse rounded-sm" />
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                    <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m10.5 21 5.25-11.25L21 21m-9-3h7.5M3 5.621a48.474 48.474 0 0 1 6-.371m0 0c1.12 0 2.233.038 3.334.114M9 5.25V3m3.334 2.364C11.176 10.658 7.69 15.08 3 17.502m9.334-12.138c.896.061 1.785.147 2.666.257m-4.589 8.495a18.023 18.023 0 0 1-3.827-5.802" />
                    </svg>
                    <p className="text-sm">翻译结果将在这里显示</p>
                    <p className="text-xs mt-1 opacity-60">选择语言，输入文本后点击"开始翻译"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========== DOCUMENT MODE ========== */}
      {activeMode === 'document' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Upload / Source Panel */}
            <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">原文档</span>
                </div>
                {docFile && (
                  <span className="text-xs text-gray-400">{docFile.name}</span>
                )}
              </div>
              <div className="flex-1 min-h-[320px] p-4 overflow-y-auto">
                {!docFile ? (
                  <label className="flex flex-col items-center justify-center h-full border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-cyan-400 dark:hover:border-cyan-600 transition-colors">
                    <svg className="w-12 h-12 mb-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-sm text-gray-500 dark:text-gray-400">点击上传文档</p>
                    <p className="text-xs text-gray-400 mt-1">支持 .txt 文件，最大 5MB</p>
                    <input
                      type="file"
                      accept=".txt"
                      onChange={handleDocUpload}
                      className="hidden"
                    />
                  </label>
                ) : (
                  <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {docContent}
                  </div>
                )}
              </div>
            </div>

            {/* Translated Document Panel */}
            <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">译文</span>
                </div>
                <div className="flex items-center gap-2">
                  {docTranslated.length > 0 && (
                    <button
                      onClick={handleCopy}
                      className="px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                    >
                      {copied ? '已复制' : '复制'}
                    </button>
                  )}
                </div>
              </div>
              <div ref={outputRef} className="flex-1 min-h-[320px] p-4 overflow-y-auto">
                {docTranslated ? (
                  <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {docTranslated}
                    {isGenerating && (
                      <span className="inline-block w-1.5 h-4 ml-0.5 bg-cyan-500 animate-pulse rounded-sm" />
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                    <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                    <p className="text-sm">文档翻译结果将在这里显示</p>
                    <p className="text-xs mt-1 opacity-60">上传文档后点击"开始翻译"</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ========== BATCH MODE ========== */}
      {activeMode === 'batch' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
            {/* Batch Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">批量翻译</span>
                {isBatchGenerating && (
                  <span className="text-xs text-cyan-600 dark:text-cyan-400">
                    翻译中 {batchProgress.current} / {batchProgress.total}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={addBatchRow}
                  disabled={isBatchGenerating}
                  className="px-2.5 py-1 text-xs font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 rounded-md hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors disabled:opacity-50"
                >
                  + 添加行
                </button>
                {batchItems.some((b) => b.status === 'done') && (
                  <button
                    onClick={handleExportCsv}
                    className="px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                  >
                    导出 CSV
                  </button>
                )}
              </div>
            </div>

            {/* Batch Table */}
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <th className="w-10 px-3 py-2 text-xs font-medium text-gray-400 text-center">#</th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-400 text-left">原文</th>
                    <th className="px-3 py-2 text-xs font-medium text-gray-400 text-left">译文</th>
                    <th className="w-16 px-3 py-2 text-xs font-medium text-gray-400 text-center">状态</th>
                    <th className="w-10 px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {batchItems.map((item, index) => (
                    <tr key={item.id} className="border-b border-gray-50 dark:border-gray-700/50">
                      <td className="px-3 py-2 text-xs text-gray-400 text-center">{index + 1}</td>
                      <td className="px-3 py-2">
                        <textarea
                          value={item.source}
                          onChange={(e) => updateBatchSource(item.id, e.target.value)}
                          disabled={isBatchGenerating}
                          placeholder="输入需要翻译的文本..."
                          rows={2}
                          className="w-full px-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <div className="min-h-[56px] px-2 py-1.5 text-sm text-gray-800 dark:text-gray-200 bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600 rounded-lg overflow-y-auto whitespace-pre-wrap">
                          {item.translated || (
                            <span className="text-gray-400 dark:text-gray-500 text-xs">
                              {item.status === 'translating' ? '翻译中...' : '等待翻译'}
                            </span>
                          )}
                          {item.status === 'translating' && (
                            <span className="inline-block w-1 h-3 ml-0.5 bg-cyan-500 animate-pulse rounded-sm" />
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {item.status === 'done' && (
                          <span className="inline-block w-2 h-2 rounded-full bg-green-400" title="完成" />
                        )}
                        {item.status === 'translating' && (
                          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" title="翻译中" />
                        )}
                        {item.status === 'error' && (
                          <span className="inline-block w-2 h-2 rounded-full bg-red-400" title="错误" />
                        )}
                        {item.status === 'pending' && (
                          <span className="inline-block w-2 h-2 rounded-full bg-gray-300 dark:bg-gray-600" title="等待" />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        {batchItems.length > 1 && (
                          <button
                            onClick={() => removeBatchRow(item.id)}
                            disabled={isBatchGenerating}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
                            title="删除行"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ========== POLISH MODE ========== */}
      {activeMode === 'polish' && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Input Panel */}
            <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">原文</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePaste}
                    disabled={isGenerating}
                    className="px-2.5 py-1 text-xs font-medium text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/20 rounded-md hover:bg-cyan-100 dark:hover:bg-cyan-900/30 transition-colors disabled:opacity-50"
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
                placeholder="在此输入或粘贴需要润色翻译的文本..."
                disabled={isGenerating}
                className="flex-1 min-h-[320px] p-4 text-sm text-gray-800 dark:text-gray-200 bg-transparent resize-none focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50"
              />
            </div>

            {/* Output Panel */}
            <div className="flex flex-col bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">润色译文</span>
                </div>
                <div className="flex items-center gap-2">
                  {outputText.length > 0 && (
                    <button
                      onClick={handleCopy}
                      className="px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
                    >
                      {copied ? '已复制' : '复制'}
                    </button>
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
                  <div className="text-sm leading-relaxed text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                    {outputText}
                    {isGenerating && (
                      <span className="inline-block w-1.5 h-4 ml-0.5 bg-cyan-500 animate-pulse rounded-sm" />
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                    <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                    </svg>
                    <p className="text-sm">润色翻译结果将在这里显示</p>
                    <p className="text-xs mt-1 opacity-60">输入文本后点击"开始翻译"，AI 将翻译并优化表达</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Action Buttons */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {activeMode === 'batch' ? (
            <>
              {!isBatchGenerating ? (
                <button
                  onClick={handleBatchTranslate}
                  disabled={!batchItems.some((b) => b.source.trim())}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-cyan-600 text-white text-sm font-medium rounded-xl hover:bg-cyan-700 transition-all shadow-md shadow-cyan-200 dark:shadow-cyan-900/30 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                  开始批量翻译
                </button>
              ) : (
                <button
                  onClick={handleStop}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-red-500 text-white text-sm font-medium rounded-xl hover:bg-red-600 transition-all shadow-md"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                  </svg>
                  停止翻译
                </button>
              )}
            </>
          ) : (
            <>
              {!isGenerating ? (
                <button
                  onClick={activeMode === 'document' ? handleDocTranslate : handleTranslate}
                  disabled={activeMode === 'document' ? !docContent.trim() : !inputText.trim()}
                  className="inline-flex items-center gap-2 px-8 py-3 bg-cyan-600 text-white text-sm font-medium rounded-xl hover:bg-cyan-700 transition-all shadow-md shadow-cyan-200 dark:shadow-cyan-900/30 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                  开始翻译
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

              {/* Re-translate button */}
              {((activeMode === 'text' || activeMode === 'polish') && outputText.length > 0 && !isGenerating) ||
              (activeMode === 'document' && docTranslated.length > 0 && !isGenerating) ? (
                <button
                  onClick={activeMode === 'document' ? handleDocTranslate : handleTranslate}
                  className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700 hover:text-cyan-600 dark:hover:text-cyan-400 transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                  重新翻译
                </button>
              ) : null}
            </>
          )}
        </div>
      </section>

      {/* Usage Tips */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">💡 使用技巧</h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="text-cyan-500 mt-0.5 shrink-0">•</span>
            "润色翻译"模式不仅翻译，还会优化目标语言的表达质量
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="text-cyan-500 mt-0.5 shrink-0">•</span>
            批量翻译支持逐行输入，翻译完成后可导出为 CSV 文件
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="text-cyan-500 mt-0.5 shrink-0">•</span>
            开启"显示读音标注"可在翻译中日韩文时获得发音参考
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="text-cyan-500 mt-0.5 shrink-0">•</span>
            "专业"翻译风格适合商务和学术场景，"口语化"适合日常交流
          </li>
        </ul>
      </div>

      {/* Related Tools */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">🔗 相关工具</h3>
        <div className="flex flex-wrap gap-2">
          <Link to="/workspace/polish" className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-cyan-300 dark:hover:border-cyan-700 hover:text-cyan-600 transition-colors">
            文章润色 →
          </Link>
          <Link to="/workspace/rewrite" className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-cyan-300 dark:hover:border-cyan-700 hover:text-cyan-600 transition-colors">
            智能改写 →
          </Link>
          <Link to="/workspace/humanize" className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-cyan-300 dark:hover:border-cyan-700 hover:text-cyan-600 transition-colors">
            人性化改写 →
          </Link>
        </div>
      </div>
    </div>
  );
}
