import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '../../components/SeoHead';
import { chatWithAiStream } from '../../services/aiChat';
import { useAppStore } from '../../store/appStore';
import { useToast } from '../../components/ToastProvider';

// ============================================================
// Types
// ============================================================

interface SlideOutline {
  id: string;
  title: string;
  points: string[];
}

interface SlideContent {
  id: string;
  title: string;
  points: string[];
  speakerNotes: string;
}

type SlideCount = 5 | 8 | 10 | 15 | 20;
type PptStyle = 'business' | 'academic' | 'creative' | 'minimal' | 'tech';
type PptLanguage = 'zh' | 'en';
type Step = 1 | 2 | 3;

// ============================================================
// Constants
// ============================================================

const SLIDE_COUNTS: { value: SlideCount; label: string }[] = [
  { value: 5, label: '5 页' },
  { value: 8, label: '8 页' },
  { value: 10, label: '10 页' },
  { value: 15, label: '15 页' },
  { value: 20, label: '20 页' },
];

const PPT_STYLES: { key: PptStyle; label: string }[] = [
  { key: 'business', label: '商务' },
  { key: 'academic', label: '学术' },
  { key: 'creative', label: '创意' },
  { key: 'minimal', label: '简约' },
  { key: 'tech', label: '科技' },
];

const PPT_LANGUAGES: { key: PptLanguage; label: string }[] = [
  { key: 'zh', label: '中文' },
  { key: 'en', label: 'English' },
];

const STYLE_NAMES: Record<PptStyle, string> = {
  business: '商务',
  academic: '学术',
  creative: '创意',
  minimal: '简约',
  tech: '科技',
};

const STEP_LABELS = ['主题与设置', '大纲编辑', '幻灯片预览'];

const TIPS = [
  '主题越具体，生成的PPT内容越精准',
  '在大纲编辑阶段可以调整每页的要点数量',
  '点击幻灯片可查看演讲备注',
  '导出的HTML演示文稿支持打印为PDF',
];

const RELATED = [
  { to: '/workspace/mindmap', label: '思维导图' },
  { to: '/workspace/longform', label: '长文写作' },
  { to: '/workspace/creative', label: '创意灵感' },
];

// ============================================================
// Helpers
// ============================================================

let slideIdCounter = 0;
function genSlideId(): string {
  return `slide_${++slideIdCounter}`;
}

function getOutlineSystemPrompt(count: SlideCount, style: PptStyle, lang: PptLanguage): string {
  const langNote = lang === 'zh' ? '请使用中文生成内容。' : 'Please generate content in English.';
  return `你是一个专业的PPT策划师。${langNote}

请根据用户提供的主题生成一份 ${count} 页的PPT大纲，风格为「${STYLE_NAMES[style]}」。

要求：
- 每页包含一个标题和 3-5 个要点
- 第一页为封面/引言页
- 最后一页为总结/展望页
- 中间页面逻辑清晰、层层递进
- 要点简洁有力，每条不超过20字

请严格按照以下 JSON 数组格式输出，不要输出任何其他内容：
[
  {"title": "页面标题", "points": ["要点1", "要点2", "要点3"]},
  ...
]`;
}

function getContentSystemPrompt(style: PptStyle, lang: PptLanguage): string {
  const langNote = lang === 'zh' ? '请使用中文生成内容。' : 'Please generate content in English.';
  return `你是一个专业的PPT内容创作者。${langNote}

请根据提供的大纲为每一页幻灯片生成详细内容，风格为「${STYLE_NAMES[style]}」。

要求：
- 每页包含：标题（title）、要点列表（points，3-5个）、演讲备注（speakerNotes，50-100字的演讲提示）
- 要点内容要充实，每条20-40字
- 演讲备注要包含该页的核心观点和演讲建议

请严格按照以下 JSON 数组格式输出，不要输出任何其他内容：
[
  {"title": "页面标题", "points": ["要点1", "要点2", "要点3"], "speakerNotes": "演讲备注内容"},
  ...
]`;
}

function parseJsonArray(text: string): unknown[] | null {
  // Try to extract JSON array from the text
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    if (Array.isArray(parsed)) return parsed;
  } catch {
    // Try to fix common issues
    try {
      const fixed = match[0].replace(/,\s*]/g, ']').replace(/,\s*}/g, '}');
      const parsed = JSON.parse(fixed);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // give up
    }
  }
  return null;
}

function generatePresentationHtml(
  topic: string,
  slides: SlideContent[],
  style: PptStyle,
): string {
  const styleMap: Record<PptStyle, { bg: string; accent: string; text: string; subtext: string }> = {
    business: { bg: '#1a1a2e', accent: '#e94560', text: '#ffffff', subtext: '#a0a0b0' },
    academic: { bg: '#f5f5f0', accent: '#2c3e50', text: '#2c3e50', subtext: '#666666' },
    creative: { bg: '#ff6b6b', accent: '#ffffff', text: '#ffffff', subtext: '#ffe0e0' },
    minimal: { bg: '#ffffff', accent: '#333333', text: '#333333', subtext: '#999999' },
    tech: { bg: '#0a0a1a', accent: '#00d4ff', text: '#ffffff', subtext: '#8899aa' },
  };
  const s = styleMap[style];

  const slidesHtml = slides
    .map(
      (slide, i) => `
    <div class="slide">
      <div class="slide-number">${i + 1} / ${slides.length}</div>
      <h1 class="slide-title">${escapeHtml(slide.title)}</h1>
      <ul class="slide-points">
        ${slide.points.map((p) => `<li>${escapeHtml(p)}</li>`).join('\n        ')}
      </ul>
      <div class="slide-notes">
        <strong>Speaker Notes:</strong> ${escapeHtml(slide.speakerNotes)}
      </div>
    </div>`,
    )
    .join('\n');

  return `<!DOCTYPE html>
<html lang="zh">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(topic)} - Presentation</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  @page { size: 16:9; margin: 0; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .slide {
    width: 100vw; height: 100vh;
    display: flex; flex-direction: column; justify-content: center; align-items: center;
    background: ${s.bg}; color: ${s.text};
    padding: 60px 80px; page-break-after: always; position: relative;
  }
  .slide-number {
    position: absolute; top: 20px; right: 30px;
    font-size: 14px; color: ${s.subtext};
  }
  .slide-title {
    font-size: 42px; font-weight: 700; margin-bottom: 40px;
    text-align: center; color: ${s.accent};
  }
  .slide-points {
    list-style: none; max-width: 800px; width: 100%;
  }
  .slide-points li {
    font-size: 22px; line-height: 1.8; padding-left: 24px;
    position: relative; color: ${s.text};
  }
  .slide-points li::before {
    content: ""; position: absolute; left: 0; top: 12px;
    width: 8px; height: 8px; border-radius: 50%;
    background: ${s.accent};
  }
  .slide-notes {
    position: absolute; bottom: 30px; left: 80px; right: 80px;
    font-size: 12px; color: ${s.subtext}; border-top: 1px solid ${s.subtext};
    padding-top: 10px; opacity: 0.7;
  }
  @media print {
    .slide { page-break-after: always; }
  }
</style>
</head>
<body>
${slidesHtml}
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// Main Component
// ============================================================

export default function PptGeneratorTool() {
  useSeo('ppt-generator');
  const { addRecentTool, incrementActions } = useAppStore();
  const { toast } = useToast();

  // Step 1 state
  const [topic, setTopic] = useState('');
  const [slideCount, setSlideCount] = useState<SlideCount>(8);
  const [pptStyle, setPptStyle] = useState<PptStyle>('business');
  const [pptLanguage, setPptLanguage] = useState<PptLanguage>('zh');

  // Step 2 state
  const [outline, setOutline] = useState<SlideOutline[]>([]);
  const [editingSlide, setEditingSlide] = useState<string | null>(null);

  // Step 3 state
  const [slides, setSlides] = useState<SlideContent[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());

  // General state
  const [step, setStep] = useState<Step>(1);
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const abortRef = useRef<AbortController | null>(null);

  // Track tool usage
  useEffect(() => {
    addRecentTool('ppt-generator');
  }, [addRecentTool]);

  // ---- Step 1: Generate Outline ----
  const handleGenerateOutline = useCallback(async () => {
    if (!topic.trim()) {
      toast('请输入PPT主题', 'warning');
      return;
    }
    setLoading(true);
    setStreamingText('');
    try {
      const controller = new AbortController();
      abortRef.current = controller;
      const sysPrompt = getOutlineSystemPrompt(slideCount, pptStyle, pptLanguage);
      const res = await chatWithAiStream(
        { messages: [{ role: 'user', content: topic }], systemPrompt: sysPrompt, temperature: 0.7, maxTokens: 4096 },
        controller.signal,
      );
      if (!res.success || !res.stream) {
        toast(res.error || '生成大纲失败', 'error');
        return;
      }
      let fullText = '';
      const reader = res.stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += value;
        setStreamingText(fullText);
      }
      const parsed = parseJsonArray(fullText);
      if (parsed && parsed.length > 0) {
        const slides: SlideOutline[] = (parsed as Record<string, unknown>[]).map((item) => ({
          id: genSlideId(),
          title: String(item.title || ''),
          points: Array.isArray(item.points) ? item.points.map(String) : [],
        }));
        setOutline(slides);
        setStep(2);
        incrementActions();
        toast(`已生成 ${slides.length} 页大纲`, 'success');
      } else {
        toast('AI 返回格式异常，请重试', 'warning');
      }
    } catch {
      // aborted
    } finally {
      setLoading(false);
      setStreamingText('');
    }
  }, [topic, slideCount, pptStyle, pptLanguage, toast, incrementActions]);

  // ---- Step 2: Generate Slides ----
  const handleGenerateSlides = useCallback(async () => {
    if (outline.length === 0) {
      toast('大纲为空，请先生成大纲', 'warning');
      return;
    }
    setLoading(true);
    setStreamingText('');
    try {
      const controller = new AbortController();
      abortRef.current = controller;
      const sysPrompt = getContentSystemPrompt(pptStyle, pptLanguage);
      const outlineText = JSON.stringify(outline.map((s) => ({ title: s.title, points: s.points })));
      const res = await chatWithAiStream(
        { messages: [{ role: 'user', content: `主题：${topic}\n\n大纲：\n${outlineText}` }], systemPrompt: sysPrompt, temperature: 0.7, maxTokens: 8192 },
        controller.signal,
      );
      if (!res.success || !res.stream) {
        toast(res.error || '生成幻灯片失败', 'error');
        return;
      }
      let fullText = '';
      const reader = res.stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += value;
        setStreamingText(fullText);
      }
      const parsed = parseJsonArray(fullText);
      if (parsed && parsed.length > 0) {
        const result: SlideContent[] = (parsed as Record<string, unknown>[]).map((item, i) => ({
          id: outline[i]?.id || genSlideId(),
          title: String(item.title || ''),
          points: Array.isArray(item.points) ? item.points.map(String) : [],
          speakerNotes: String(item.speakerNotes || ''),
        }));
        setSlides(result);
        setCurrentSlideIndex(0);
        setStep(3);
        incrementActions();
        toast(`已生成 ${result.length} 页幻灯片`, 'success');
      } else {
        toast('AI 返回格式异常，请重试', 'warning');
      }
    } catch {
      // aborted
    } finally {
      setLoading(false);
      setStreamingText('');
    }
  }, [topic, outline, pptStyle, pptLanguage, toast, incrementActions]);

  // ---- Outline Editing ----
  const handleAddSlide = useCallback(() => {
    setOutline((prev) => [...prev, { id: genSlideId(), title: '新页面', points: ['要点1'] }]);
  }, []);

  const handleRemoveSlide = useCallback((id: string) => {
    setOutline((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleMoveSlide = useCallback((id: string, dir: -1 | 1) => {
    setOutline((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const newIdx = idx + dir;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
      return next;
    });
  }, []);

  const handleUpdateOutlineSlide = useCallback((id: string, field: 'title' | 'points', value: string | string[]) => {
    setOutline((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  }, []);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  // ---- Export ----
  const handleExportHtml = useCallback(() => {
    if (slides.length === 0) return;
    const html = generatePresentationHtml(topic, slides, pptStyle);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      toast('演示文稿已在新标签页打开，可使用 Ctrl+P 打印为PDF', 'success');
    } else {
      // Fallback: download file
      const a = document.createElement('a');
      a.href = url;
      a.download = `${topic || 'presentation'}.html`;
      a.click();
      URL.revokeObjectURL(url);
      toast('演示文稿已下载', 'success');
    }
  }, [slides, topic, pptStyle, toast]);

  const handleExportNotes = useCallback(() => {
    if (slides.length === 0) return;
    const notes = slides
      .map((s, i) => `=== 第 ${i + 1} 页: ${s.title} ===\n\n要点:\n${s.points.map((p) => `  - ${p}`).join('\n')}\n\n演讲备注:\n${s.speakerNotes}\n`)
      .join('\n---\n\n');
    const blob = new Blob([notes], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${topic || 'presentation'}_演讲稿.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast('演讲稿已下载', 'success');
  }, [slides, topic, toast]);

  const toggleNotes = useCallback((id: string) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-28 pb-8 sm:pt-32 sm:pb-10">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-orange-100/60 via-amber-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-orange-100/40 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-orange-600 transition-colors">工具</Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">PPT 生成器</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-orange-600 via-amber-500 to-orange-600 bg-clip-text text-transparent">AI PPT 生成器</span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            输入主题，AI 自动生成大纲和幻灯片内容，支持多种风格和导出
          </p>
        </div>
      </section>

      {/* Step Indicator */}
      <section className="pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center gap-2">
            {STEP_LABELS.map((label, i) => {
              const s = (i + 1) as Step;
              const isActive = step === s;
              const isDone = step > s;
              return (
                <div key={i} className="flex items-center gap-2">
                  {i > 0 && <div className={`w-8 sm:w-16 h-0.5 ${isDone ? 'bg-orange-500' : 'bg-gray-200 dark:bg-gray-700'}`} />}
                  <button
                    onClick={() => {
                      if (isDone && !loading) setStep(s);
                    }}
                    disabled={!isDone && !isActive}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-orange-500 text-white shadow-sm'
                        : isDone
                          ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 cursor-pointer hover:bg-orange-100 dark:hover:bg-orange-900/30'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                      isActive ? 'bg-white/20 text-white' : isDone ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                    }`}>
                      {isDone ? '\u2713' : s}
                    </span>
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ====== Step 1: Topic & Settings ====== */}
          {step === 1 && (
            <div className="max-w-2xl mx-auto space-y-6">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <label className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">PPT 主题</label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !loading && handleGenerateOutline()}
                  placeholder="例如：2025年AI行业趋势分析、年度工作总结..."
                  className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-sm"
                  disabled={loading}
                />

                <label className="block text-sm font-semibold text-gray-900 dark:text-white mt-5 mb-2">幻灯片数量</label>
                <div className="flex flex-wrap gap-2">
                  {SLIDE_COUNTS.map((sc) => (
                    <button
                      key={sc.value}
                      onClick={() => setSlideCount(sc.value)}
                      disabled={loading}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        slideCount === sc.value
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {sc.label}
                    </button>
                  ))}
                </div>

                <label className="block text-sm font-semibold text-gray-900 dark:text-white mt-5 mb-2">风格</label>
                <div className="flex flex-wrap gap-2">
                  {PPT_STYLES.map((st) => (
                    <button
                      key={st.key}
                      onClick={() => setPptStyle(st.key)}
                      disabled={loading}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        pptStyle === st.key
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>

                <label className="block text-sm font-semibold text-gray-900 dark:text-white mt-5 mb-2">语言</label>
                <div className="flex gap-2">
                  {PPT_LANGUAGES.map((lg) => (
                    <button
                      key={lg.key}
                      onClick={() => setPptLanguage(lg.key)}
                      disabled={loading}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        pptLanguage === lg.key
                          ? 'bg-orange-500 text-white shadow-sm'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {lg.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={loading ? handleStop : handleGenerateOutline}
                  disabled={!topic.trim() && !loading}
                  className={`mt-6 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                    loading
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white shadow-orange-200 dark:shadow-orange-900/30 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      停止生成
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                      </svg>
                      生成大纲
                    </>
                  )}
                </button>

                {loading && streamingText && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg max-h-32 overflow-auto">
                    <p className="text-xs text-gray-400 mb-1">AI 正在生成...</p>
                    <pre className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap font-mono">{streamingText.slice(-300)}</pre>
                  </div>
                )}
              </div>

              {/* Quick Examples */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">快速试试</h3>
                <div className="space-y-2">
                  {[
                    '2025年AI行业趋势分析',
                    '年度工作总结与规划',
                    'Introduction to Machine Learning',
                    '新产品发布会策划方案',
                  ].map((ex) => (
                    <button
                      key={ex}
                      onClick={() => setTopic(ex)}
                      disabled={loading}
                      className="w-full text-left px-3 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 hover:text-orange-600 dark:hover:text-orange-400 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ====== Step 2: Outline Editor ====== */}
          {step === 2 && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900 dark:text-white">编辑大纲</h2>
                  <span className="text-sm text-gray-400">{outline.length} 页</span>
                </div>

                <div className="space-y-3">
                  {outline.map((slide, idx) => (
                    <div
                      key={slide.id}
                      className={`p-4 rounded-lg border transition-all ${
                        editingSlide === slide.id
                          ? 'border-orange-300 dark:border-orange-700 bg-orange-50/50 dark:bg-orange-900/10'
                          : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span className="shrink-0 w-7 h-7 rounded-full bg-orange-500 text-white text-xs font-bold flex items-center justify-center mt-0.5">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <input
                            type="text"
                            value={slide.title}
                            onChange={(e) => handleUpdateOutlineSlide(slide.id, 'title', e.target.value)}
                            onFocus={() => setEditingSlide(slide.id)}
                            className="w-full px-2 py-1 bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-orange-500 text-sm font-semibold text-gray-900 dark:text-white outline-none transition-colors"
                          />
                          <div className="mt-2 space-y-1">
                            {slide.points.map((point, pi) => (
                              <div key={pi} className="flex items-center gap-2">
                                <span className="text-orange-400 text-xs shrink-0">-</span>
                                <input
                                  type="text"
                                  value={point}
                                  onChange={(e) => {
                                    const newPoints = [...slide.points];
                                    newPoints[pi] = e.target.value;
                                    handleUpdateOutlineSlide(slide.id, 'points', newPoints);
                                  }}
                                  onFocus={() => setEditingSlide(slide.id)}
                                  className="flex-1 px-2 py-0.5 bg-transparent border-b border-transparent hover:border-gray-300 dark:hover:border-gray-600 focus:border-orange-500 text-sm text-gray-700 dark:text-gray-300 outline-none transition-colors"
                                />
                                <button
                                  onClick={() => {
                                    const newPoints = slide.points.filter((_, i) => i !== pi);
                                    handleUpdateOutlineSlide(slide.id, 'points', newPoints);
                                  }}
                                  className="shrink-0 p-0.5 text-gray-300 hover:text-red-500 transition-colors"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                  </svg>
                                </button>
                              </div>
                            ))}
                            <button
                              onClick={() => handleUpdateOutlineSlide(slide.id, 'points', [...slide.points, '新要点'])}
                              className="text-xs text-orange-500 hover:text-orange-600 mt-1"
                            >
                              + 添加要点
                            </button>
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button onClick={() => handleMoveSlide(slide.id, -1)} disabled={idx === 0} className="p-1 text-gray-300 hover:text-gray-600 dark:hover:text-gray-400 disabled:opacity-30 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" /></svg>
                          </button>
                          <button onClick={() => handleMoveSlide(slide.id, 1)} disabled={idx === outline.length - 1} className="p-1 text-gray-300 hover:text-gray-600 dark:hover:text-gray-400 disabled:opacity-30 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                          </button>
                          <button onClick={() => handleRemoveSlide(slide.id)} disabled={outline.length <= 2} className="p-1 text-gray-300 hover:text-red-500 disabled:opacity-30 transition-colors">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" /></svg>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleAddSlide}
                  className="mt-4 w-full py-2 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-400 hover:text-orange-500 hover:border-orange-300 dark:hover:border-orange-700 transition-colors"
                >
                  + 添加新页面
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 px-4 py-3 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  返回上一步
                </button>
                <button
                  onClick={loading ? handleStop : handleGenerateSlides}
                  disabled={outline.length < 2 || loading}
                  className={`flex-[2] flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                    loading
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      停止生成
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                      </svg>
                      确认大纲，生成 PPT
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* ====== Step 3: Slide Preview ====== */}
          {step === 3 && slides.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Thumbnail Sidebar (desktop) */}
              <div className="hidden lg:block lg:col-span-2">
                <div className="sticky top-24 space-y-2 max-h-[70vh] overflow-y-auto pr-1">
                  {slides.map((slide, idx) => (
                    <button
                      key={slide.id}
                      onClick={() => setCurrentSlideIndex(idx)}
                      className={`w-full text-left p-2 rounded-lg border transition-all text-xs ${
                        currentSlideIndex === idx
                          ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 dark:border-orange-700'
                          : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          currentSlideIndex === idx ? 'bg-orange-500 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <span className="truncate font-medium text-gray-800 dark:text-gray-200">{slide.title}</span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Main Slide Preview */}
              <div className="lg:col-span-7">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                  {/* Mobile thumbnail scroll */}
                  <div className="lg:hidden flex gap-2 p-3 overflow-x-auto border-b border-gray-100 dark:border-gray-800">
                    {slides.map((slide, idx) => (
                      <button
                        key={slide.id}
                        onClick={() => setCurrentSlideIndex(idx)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                          currentSlideIndex === idx
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                        }`}
                      >
                        {idx + 1}
                      </button>
                    ))}
                  </div>

                  {/* Slide Card */}
                  <div className="p-6 sm:p-10 min-h-[400px] flex flex-col justify-center">
                    <div className="mb-2">
                      <span className="inline-block px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-bold rounded">
                        {currentSlideIndex + 1} / {slides.length}
                      </span>
                    </div>
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">
                      {slides[currentSlideIndex].title}
                    </h2>
                    <ul className="space-y-3 mb-6">
                      {slides[currentSlideIndex].points.map((point, pi) => (
                        <li key={pi} className="flex items-start gap-3">
                          <span className="shrink-0 w-2 h-2 rounded-full bg-orange-500 mt-2" />
                          <span className="text-base text-gray-700 dark:text-gray-300">{point}</span>
                        </li>
                      ))}
                    </ul>
                    {slides[currentSlideIndex].speakerNotes && (
                      <div className="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                        <button
                          onClick={() => toggleNotes(slides[currentSlideIndex].id)}
                          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-orange-500 transition-colors"
                        >
                          <svg className={`w-4 h-4 transition-transform ${expandedNotes.has(slides[currentSlideIndex].id) ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                          演讲备注
                        </button>
                        {expandedNotes.has(slides[currentSlideIndex].id) && (
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                            {slides[currentSlideIndex].speakerNotes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Navigation */}
                  <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-gray-800">
                    <button
                      onClick={() => setCurrentSlideIndex((i) => Math.max(0, i - 1))}
                      disabled={currentSlideIndex === 0}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-30"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                      上一页
                    </button>
                    <span className="text-sm text-gray-400">{currentSlideIndex + 1} / {slides.length}</span>
                    <button
                      onClick={() => setCurrentSlideIndex((i) => Math.min(slides.length - 1, i + 1))}
                      disabled={currentSlideIndex === slides.length - 1}
                      className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-30"
                    >
                      下一页
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Export Panel */}
              <div className="lg:col-span-3 space-y-4">
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">导出</h3>
                  <div className="space-y-2">
                    <button
                      onClick={handleExportHtml}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-medium rounded-lg hover:from-orange-600 hover:to-amber-600 transition-all shadow-sm"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                      </svg>
                      导出 PPT
                    </button>
                    <button
                      onClick={handleExportNotes}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                      导出演讲稿
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setStep(2)}
                  className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  返回编辑大纲
                </button>
              </div>
            </div>
          )}

          {/* Loading overlay for steps 2->3 */}
          {step === 2 && loading && streamingText && (
            <div className="max-w-3xl mx-auto mt-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 shadow-sm">
                <p className="text-sm text-gray-500 mb-2">AI 正在生成幻灯片内容...</p>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full animate-pulse" style={{ width: '60%' }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Usage Tips */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">使用技巧</h3>
        <ul className="space-y-2">
          {TIPS.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="text-orange-500 mt-0.5 shrink-0">-</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Related Tools */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">相关工具</h3>
        <div className="flex flex-wrap gap-2">
          {RELATED.map((r) => (
            <Link key={r.to} to={r.to} className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-orange-300 dark:hover:border-orange-700 hover:text-orange-600 transition-colors">
              {r.label} &rarr;
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
