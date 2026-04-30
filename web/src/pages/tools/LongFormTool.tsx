import { useState, useCallback, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '../../components/SeoHead';
import { useAppStore } from '../../store/appStore';
import { chatWithAiStream } from '../../services/aiChat';
import { exportAsMarkdown, exportAsText, exportFile } from '../../utils/export';
import CollabToolbar from '../../components/CollabToolbar';

// ============================================================
// Types
// ============================================================

type Step = 'topic' | 'outline' | 'writing' | 'complete';

interface OutlineSection {
  id: string;
  title: string;
  content: string;
  status: 'pending' | 'generating' | 'done' | 'error';
}

type ArticleType = '论文' | '报告' | '小说' | '教程' | '方案';
type ArticleTone = '学术严谨' | '通俗易懂' | '专业商务' | '轻松活泼' | '深度分析';

const ARTICLE_TYPES: { label: ArticleType; desc: string }[] = [
  { label: '论文', desc: '学术论文、毕业论文' },
  { label: '报告', desc: '研究报告、分析报告' },
  { label: '小说', desc: '短篇小说、故事创作' },
  { label: '教程', desc: '技术教程、操作指南' },
  { label: '方案', desc: '策划方案、实施方案' },
];

const WORD_COUNTS = [3000, 5000, 10000, 20000] as const;

const ARTICLE_TONES: ArticleTone[] = ['学术严谨', '通俗易懂', '专业商务', '轻松活泼', '深度分析'];

const TIPS = [
  '先规划好大纲再生成内容，文章结构更清晰',
  '生成过程中可随时暂停，编辑已完成的章节',
  '建议从 3000 字开始体验，逐步尝试更长的篇幅',
  '每个章节生成后都可以手动编辑修改',
  '支持 Markdown/HTML/TXT 三种格式导出',
];

const RELATED = [
  { to: '/workspace/copywriting', label: '文案生成器' },
  { to: '/workspace/polish', label: '文章润色' },
  { to: '/workspace/summarizer', label: '内容总结' },
];

// ============================================================
// System Prompts
// ============================================================

const OUTLINE_SYSTEM_PROMPT = `你是一个专业的内容规划专家。用户会给你一个写作主题、文章类型、目标字数和写作风格。

请根据这些信息生成一个详细的文章大纲。要求：
1. 大纲应该包含合理的章节结构
2. 每个章节应该有明确的标题
3. 章节之间的逻辑关系清晰
4. 章节数量和每节预期字数应与目标总字数匹配

请严格按照以下 JSON 格式输出，不要输出任何其他内容：
[
  {"title": "第一章标题", "description": "这一章的主要内容描述"},
  {"title": "第二章标题", "description": "这一章的主要内容描述"}
]

注意：只输出 JSON 数组，不要有其他文字说明。`;

const SECTION_SYSTEM_PROMPT = `你是一个专业的长文写作助手。你正在逐章节撰写一篇长文。

写作要求：
1. 内容详实、有深度，避免空洞的套话
2. 段落之间过渡自然流畅
3. 适当使用小标题、列表等格式增强可读性
4. 保持全文风格统一
5. 每个章节的内容要充实，达到预期字数

请直接输出章节正文内容，使用 Markdown 格式。不要输出章节标题（标题已由系统提供），直接从正文开始。`;

// ============================================================
// Utility
// ============================================================

let idCounter = 0;
function genId() {
  return `sec_${Date.now()}_${++idCounter}`;
}

function countWords(text: string): number {
  if (!text) return 0;
  // Count Chinese characters + English words
  const chinese = text.match(/[\u4e00-\u9fff]/g)?.length || 0;
  const english = text.replace(/[\u4e00-\u9fff]/g, ' ').split(/\s+/).filter(Boolean).length;
  return chinese + english;
}

// ============================================================
// Component
// ============================================================

export default function LongFormTool() {
  useSeo('longform');
  const { addWordsGenerated, incrementActions, addRecentTool } = useAppStore();

  // Track recent tool
  useEffect(() => {
    addRecentTool('AI长文写作');
  }, [addRecentTool]);

  // Step state
  const [step, setStep] = useState<Step>('topic');

  // Step 1: Topic form
  const [topic, setTopic] = useState('');
  const [articleType, setArticleType] = useState<ArticleType>('论文');
  const [wordCount, setWordCount] = useState<number>(3000);
  const [tone, setTone] = useState<ArticleTone>('学术严谨');

  // Step 2: Outline
  const [outline, setOutline] = useState<OutlineSection[]>([]);
  const [outlineLoading, setOutlineLoading] = useState(false);
  const [outlineError, setOutlineError] = useState('');

  // Step 3: Writing
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [writingError, setWritingError] = useState('');
  const abortRef = useRef<AbortController | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Step 4: Complete
  const [showExport, setShowExport] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  // Toast
  const [toast, setToast] = useState('');
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(''), 2500);
      return () => clearTimeout(t);
    }
  }, [toast]);

  // Close export dropdown on outside click
  useEffect(() => {
    if (!showExport) return;
    const handler = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExport(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showExport]);

  // Auto-dismiss errors
  useEffect(() => {
    if (!outlineError) return;
    const t = setTimeout(() => setOutlineError(''), 5000);
    return () => clearTimeout(t);
  }, [outlineError]);

  useEffect(() => {
    if (!writingError) return;
    const t = setTimeout(() => setWritingError(''), 5000);
    return () => clearTimeout(t);
  }, [writingError]);

  // ============================================================
  // Step 1 -> 2: Generate outline
  // ============================================================

  const handleGenerateOutline = useCallback(async () => {
    if (!topic.trim()) {
      setOutlineError('请输入写作主题');
      return;
    }

    setOutlineLoading(true);
    setOutlineError('');
    incrementActions();

    const userMessage = `写作主题：${topic}
文章类型：${articleType}
目标字数：${wordCount} 字
写作风格：${tone}

请为这篇${articleType}生成一个详细的大纲。`;

    try {
      const { success, stream, error } = await chatWithAiStream(
        { messages: [{ role: 'user', content: userMessage }], systemPrompt: OUTLINE_SYSTEM_PROMPT, temperature: 0.7, maxTokens: 2048 },
      );

      if (!success || !stream) {
        setOutlineError(error || '大纲生成失败，请重试');
        setOutlineLoading(false);
        return;
      }

      const reader = stream.getReader();
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += value;
      }

      // Parse JSON from response
      let sections: { title: string; description?: string }[] = [];
      try {
        // Try to extract JSON array from the response
        const jsonMatch = fullText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          sections = JSON.parse(jsonMatch[0]);
        }
      } catch {
        // Fallback: try to parse line by line
        const lines = fullText.split('\n').filter(l => l.trim());
        sections = lines
          .filter(l => /^\d+[\.\、\)]\s*/.test(l.trim()) || l.trim().startsWith('-') || l.trim().startsWith('*'))
          .map(l => l.replace(/^\d+[\.\、\)]\s*/, '').replace(/^[-*]\s*/, '').trim())
          .filter(Boolean)
          .map(title => ({ title }));
      }

      if (sections.length === 0) {
        setOutlineError('大纲解析失败，请重试或修改主题');
        setOutlineLoading(false);
        return;
      }

      const newOutline: OutlineSection[] = sections.map(s => ({
        id: genId(),
        title: s.title || '未命名章节',
        content: '',
        status: 'pending' as const,
      }));

      setOutline(newOutline);
      setStep('outline');
    } catch (err) {
      setOutlineError(err instanceof Error ? err.message : '大纲生成失败');
    } finally {
      setOutlineLoading(false);
    }
  }, [topic, articleType, wordCount, tone, incrementActions]);

  // ============================================================
  // Step 2 -> 3: Start writing
  // ============================================================

  const handleStartWriting = useCallback(() => {
    setCurrentSectionIndex(0);
    setStep('writing');
  }, []);

  // ============================================================
  // Step 3: Generate a single section
  // ============================================================

  const generateSection = useCallback(async (index: number) => {
    if (index >= outline.length) {
      // All sections done
      setStep('complete');
      return;
    }

    const section = outline[index];
    if (section.status === 'done' && section.content) {
      // Already done, move to next
      setCurrentSectionIndex(index + 1);
      generateSection(index + 1);
      return;
    }

    // Mark current section as generating
    setOutline(prev => prev.map((s, i) => i === index ? { ...s, status: 'generating' as const, content: '' } : s));
    setIsGenerating(true);
    setWritingError('');

    // Build context: outline + previous sections
    const outlineContext = outline.map((s, i) => `${i + 1}. ${s.title}`).join('\n');
    const prevSections = outline
      .slice(0, index)
      .filter(s => s.content)
      .map((s) => `## ${s.title}\n${s.content}`)
      .join('\n\n');

    // Calculate target words for this section
    const avgWordsPerSection = Math.ceil(wordCount / outline.length);

    const userMessage = `你正在撰写一篇${articleType}，主题是"${topic}"。

## 完整大纲
${outlineContext}

## 写作要求
- 目标总字数：${wordCount} 字
- 写作风格：${tone}
- 当前需要撰写第 ${index + 1}/${outline.length} 节："${section.title}"
- 本节建议字数：约 ${avgWordsPerSection} 字
${prevSections ? `\n## 已完成的章节内容（供参考，保持连贯性）\n${prevSections}` : ''}

请撰写"${section.title}"这一节的正文内容。直接输出正文，不要输出章节标题。`;

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const { success, stream, error } = await chatWithAiStream(
        {
          messages: [{ role: 'user', content: userMessage }],
          systemPrompt: SECTION_SYSTEM_PROMPT,
          temperature: 0.7,
          maxTokens: Math.min(avgWordsPerSection * 2, 4096),
        },
        controller.signal,
      );

      if (!success || !stream) {
        setOutline(prev => prev.map((s, i) => i === index ? { ...s, status: 'error' as const } : s));
        setWritingError(error || '内容生成失败');
        setIsGenerating(false);
        return;
      }

      const reader = stream.getReader();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += value;
        setOutline(prev => prev.map((s, i) => i === index ? { ...s, content: accumulated } : s));
      }

      // Mark as done
      const wordCount = countWords(accumulated);
      addWordsGenerated(wordCount);
      setOutline(prev => prev.map((s, i) => i === index ? { ...s, status: 'done' as const } : s));
      setIsGenerating(false);

      // Auto-advance to next section after a short delay
      if (index + 1 < outline.length) {
        setTimeout(() => {
          setCurrentSectionIndex(index + 1);
          generateSection(index + 1);
        }, 500);
      } else {
        setStep('complete');
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled
        setOutline(prev => prev.map((s, i) => i === index ? { ...s, status: 'pending' as const } : s));
      } else {
        setOutline(prev => prev.map((s, i) => i === index ? { ...s, status: 'error' as const } : s));
        setWritingError(err instanceof Error ? err.message : '内容生成失败');
      }
      setIsGenerating(false);
    } finally {
      abortRef.current = null;
    }
  }, [outline, topic, articleType, wordCount, tone, addWordsGenerated]);

  // ============================================================
  // Outline editing
  // ============================================================

  const updateSectionTitle = useCallback((id: string, title: string) => {
    setOutline(prev => prev.map(s => s.id === id ? { ...s, title } : s));
  }, []);

  const removeSection = useCallback((id: string) => {
    setOutline(prev => prev.filter(s => s.id !== id));
  }, []);

  const addSection = useCallback((afterIndex: number) => {
    const newSection: OutlineSection = {
      id: genId(),
      title: '新章节',
      content: '',
      status: 'pending',
    };
    setOutline(prev => {
      const copy = [...prev];
      copy.splice(afterIndex + 1, 0, newSection);
      return copy;
    });
  }, []);

  const moveSection = useCallback((fromIndex: number, direction: 'up' | 'down') => {
    setOutline(prev => {
      const copy = [...prev];
      const toIndex = direction === 'up' ? fromIndex - 1 : fromIndex + 1;
      if (toIndex < 0 || toIndex >= copy.length) return prev;
      [copy[fromIndex], copy[toIndex]] = [copy[toIndex], copy[fromIndex]];
      return copy;
    });
  }, []);

  const updateSectionContent = useCallback((id: string, content: string) => {
    setOutline(prev => prev.map(s => s.id === id ? { ...s, content } : s));
  }, []);

  // ============================================================
  // Controls
  // ============================================================

  const handleStopGeneration = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsGenerating(false);
    setToast('已停止生成');
  }, []);

  const handleRegenerateAll = useCallback(() => {
    setOutline(prev => prev.map(s => ({ ...s, content: '', status: 'pending' as const })));
    setCurrentSectionIndex(0);
    generateSection(0);
  }, [generateSection]);

  const handleRegenerateSection = useCallback((index: number) => {
    setOutline(prev => prev.map((s, i) => i === index ? { ...s, content: '', status: 'pending' as const } : s));
    setCurrentSectionIndex(index);
    generateSection(index);
  }, [generateSection]);

  const handleContinueNext = useCallback(() => {
    const nextIndex = outline.findIndex(s => s.status === 'pending' || s.status === 'error');
    if (nextIndex >= 0) {
      setCurrentSectionIndex(nextIndex);
      generateSection(nextIndex);
    } else {
      setStep('complete');
    }
  }, [outline, generateSection]);

  // ============================================================
  // Export
  // ============================================================

  const getFullArticle = useCallback((): string => {
    return outline.map(s => `## ${s.title}\n\n${s.content || ''}`).join('\n\n---\n\n');
  }, [outline]);

  const handleExportMarkdown = useCallback(() => {
    const content = `# ${topic}\n\n${getFullArticle()}`;
    exportAsMarkdown(content, `长文_${topic}_${new Date().toISOString().slice(0, 10)}`);
    setShowExport(false);
    setToast('已导出 Markdown 文件');
  }, [topic, getFullArticle]);

  const handleExportText = useCallback(() => {
    const content = `${topic}\n${'='.repeat(topic.length)}\n\n${outline.map(s => `${s.title}\n${'-'.repeat(s.title.length)}\n${s.content || ''}`).join('\n\n')}`;
    exportAsText(content, `长文_${topic}_${new Date().toISOString().slice(0, 10)}`);
    setShowExport(false);
    setToast('已导出 TXT 文件');
  }, [topic, outline]);

  const handleExportHtml = useCallback(() => {
    const body = outline.map(s => `<h2>${s.title}</h2>\n<div>${(s.content || '').replace(/\n/g, '<br>')}</div>`).join('\n<hr>\n');
    const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${topic}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.8;color:#333}h1{color:#1a1a1a;border-bottom:2px solid #10b981;padding-bottom:8px}h2{color:#065f46;margin-top:2em}hr{border:none;border-top:1px solid #e5e7eb;margin:2em 0}</style></head><body><h1>${topic}</h1>${body}</body></html>`;
    exportFile(html, `长文_${topic}_${new Date().toISOString().slice(0, 10)}`, '.html', 'text/html;charset=utf-8');
    setShowExport(false);
    setToast('已导出 HTML 文件');
  }, [topic, outline]);

  // ============================================================
  // Computed
  // ============================================================

  const totalWords = outline.reduce((sum, s) => sum + countWords(s.content), 0);
  const doneSections = outline.filter(s => s.status === 'done').length;
  const progressPercent = outline.length > 0 ? Math.round((doneSections / outline.length) * 100) : 0;

  // ============================================================
  // Step indicator
  // ============================================================

  const STEPS: { key: Step; label: string }[] = [
    { key: 'topic', label: '主题设置' },
    { key: 'outline', label: '大纲规划' },
    { key: 'writing', label: '分段写作' },
    { key: 'complete', label: '完成导出' },
  ];

  const stepIndex = STEPS.findIndex(s => s.key === step);

  function StepIndicator() {
    return (
      <div className="flex items-center justify-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all ${
                i < stepIndex
                  ? 'bg-emerald-500 text-white'
                  : i === stepIndex
                  ? 'bg-emerald-500 text-white ring-4 ring-emerald-100 dark:ring-emerald-900/30'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
              }`}>
                {i < stepIndex ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  i + 1
                )}
              </div>
              <span className={`text-xs mt-1.5 font-medium ${i <= stepIndex ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`w-12 sm:w-20 h-0.5 mx-1 mt-[-12px] transition-all ${i < stepIndex ? 'bg-emerald-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
            )}
          </div>
        ))}
      </div>
    );
  }

  // ============================================================
  // Render: Step 1 - Topic
  // ============================================================

  function renderTopicStep() {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-emerald-100 dark:border-emerald-900/30 bg-gradient-to-r from-emerald-50 dark:from-emerald-900/20 to-transparent">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">设置写作参数</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">填写主题和偏好，AI 将为您规划大纲</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              写作主题 <span className="text-red-400">*</span>
            </label>
            <textarea
              value={topic}
              onChange={e => setTopic(e.target.value)}
              placeholder="例如：人工智能在教育领域的应用与未来发展"
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-200 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all placeholder:text-gray-400 bg-gray-50 dark:bg-gray-700"
            />
            <div className="mt-1 text-right text-xs text-gray-400">{topic.length} 字</div>
          </div>

          {/* Article Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">文章类型</label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ARTICLE_TYPES.map(t => (
                <button
                  key={t.label}
                  onClick={() => setArticleType(t.label)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all text-center ${
                    articleType === t.label
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">{t.label}</div>
                  <div className="mt-0.5 opacity-70 text-[10px]">{t.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Word Count */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">目标字数</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {WORD_COUNTS.map(w => (
                <button
                  key={w}
                  onClick={() => setWordCount(w)}
                  className={`px-3 py-2.5 rounded-xl text-xs font-medium border transition-all text-center ${
                    wordCount === w
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-500/20'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  <div className="font-semibold">{w >= 10000 ? `${w / 10000}万` : `${w / 1000}千`}字</div>
                </button>
              ))}
            </div>
          </div>

          {/* Tone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">写作风格</label>
            <div className="flex flex-wrap gap-2">
              {ARTICLE_TONES.map(t => (
                <button
                  key={t}
                  onClick={() => setTone(t)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    tone === t
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                      : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Error */}
          {outlineError && (
            <div className="px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 animate-fade-in">
              {outlineError}
            </div>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerateOutline}
            disabled={outlineLoading || !topic.trim()}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-md shadow-emerald-500/20 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {outlineLoading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                AI 正在规划大纲...
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
        </div>
      </div>
    );
  }

  // ============================================================
  // Render: Step 2 - Outline Review
  // ============================================================

  function renderOutlineStep() {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-emerald-100 dark:border-emerald-900/30 bg-gradient-to-r from-emerald-50 dark:from-emerald-900/20 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.007v.008H3.75V6.75zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zM3.75 12h.007v.008H3.75V12zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm-.375 5.25h.007v.008H3.75v-.008zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">大纲规划</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">共 {outline.length} 个章节，可编辑调整</p>
              </div>
            </div>
            <button
              onClick={() => setStep('topic')}
              className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
              </svg>
              返回
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-3">
          {outline.map((section, index) => (
            <div
              key={section.id}
              className="group flex items-center gap-2 p-3 rounded-xl border border-gray-100 dark:border-gray-700 hover:border-emerald-200 dark:hover:border-emerald-800 transition-colors bg-gray-50 dark:bg-gray-750"
            >
              <span className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center justify-center shrink-0">
                {index + 1}
              </span>
              <input
                value={section.title}
                onChange={e => updateSectionTitle(section.id, e.target.value)}
                className="flex-1 bg-transparent text-sm text-gray-800 dark:text-gray-200 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500 rounded px-1"
              />
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => moveSection(index, 'up')}
                  disabled={index === 0}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                  title="上移"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                  </svg>
                </button>
                <button
                  onClick={() => moveSection(index, 'down')}
                  disabled={index === outline.length - 1}
                  className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30"
                  title="下移"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                <button
                  onClick={() => addSection(index)}
                  className="p-1 text-gray-400 hover:text-emerald-600"
                  title="在下方添加章节"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                </button>
                <button
                  onClick={() => removeSection(section.id)}
                  disabled={outline.length <= 1}
                  className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-30"
                  title="删除"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          <button
            onClick={() => addSection(outline.length - 1)}
            className="w-full py-2.5 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-400 hover:text-emerald-600 hover:border-emerald-300 dark:hover:border-emerald-700 transition-colors flex items-center justify-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            添加章节
          </button>

          <button
            onClick={handleStartWriting}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white text-sm font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-md shadow-emerald-500/20 hover:shadow-lg flex items-center justify-center gap-2 mt-4"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
            </svg>
            开始写作（{outline.length} 个章节）
          </button>
        </div>
      </div>
    );
  }

  // ============================================================
  // Render: Step 3 - Writing
  // ============================================================

  function renderWritingStep() {
    const currentSection = outline[currentSectionIndex];

    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        {/* Progress bar */}
        <div className="px-6 py-3 border-b border-emerald-100 dark:border-emerald-900/30 bg-gradient-to-r from-emerald-50 dark:from-emerald-900/20 to-transparent">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {isGenerating ? `正在生成第 ${currentSectionIndex + 1}/${outline.length} 节...` : `第 ${currentSectionIndex + 1}/${outline.length} 节`}
              </span>
              {isGenerating && (
                <svg className="w-4 h-4 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
            </div>
            <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <span>{doneSections}/{outline.length} 节完成</span>
              <span>{totalWords} 字</span>
              <span>{progressPercent}%</span>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="flex flex-col lg:flex-row">
          {/* Sidebar: Outline navigation */}
          <div className="lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-100 dark:border-gray-700">
            {/* Mobile: dropdown */}
            <div className="lg:hidden px-4 py-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600"
              >
                <span className="text-gray-700 dark:text-gray-300 font-medium truncate">
                  {currentSection ? `${currentSectionIndex + 1}. ${currentSection.title}` : '选择章节'}
                </span>
                <svg className={`w-4 h-4 text-gray-400 transition-transform ${sidebarOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {sidebarOpen && (
                <div className="mt-2 space-y-1 max-h-60 overflow-y-auto">
                  {outline.map((s, i) => (
                    <button
                      key={s.id}
                      onClick={() => { setCurrentSectionIndex(i); setSidebarOpen(false); }}
                      className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center gap-2 ${
                        i === currentSectionIndex
                          ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium'
                          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                        s.status === 'done' ? 'bg-emerald-500 text-white' : s.status === 'generating' ? 'bg-amber-500 text-white' : s.status === 'error' ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-500'
                      }`}>
                        {s.status === 'done' ? (
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : i + 1}
                      </span>
                      <span className="truncate">{s.title}</span>
                      {s.content && <span className="ml-auto text-[10px] text-gray-400">{countWords(s.content)}字</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Desktop: sidebar list */}
            <div className="hidden lg:block p-3 space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto">
              {outline.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setCurrentSectionIndex(i)}
                  className={`w-full text-left px-3 py-2 text-xs rounded-lg transition-colors flex items-center gap-2 ${
                    i === currentSectionIndex
                      ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 font-medium'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
                    s.status === 'done' ? 'bg-emerald-500 text-white' : s.status === 'generating' ? 'bg-amber-500 text-white animate-pulse' : s.status === 'error' ? 'bg-red-500 text-white' : 'bg-gray-200 dark:bg-gray-600 text-gray-500'
                  }`}>
                    {s.status === 'done' ? (
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : i + 1}
                  </span>
                  <span className="truncate">{s.title}</span>
                  {s.content && <span className="ml-auto text-[10px] text-gray-400 shrink-0">{countWords(s.content)}字</span>}
                </button>
              ))}
            </div>
          </div>

          {/* Main content area */}
          <div className="flex-1 min-w-0">
            {currentSection && (
              <>
                {/* Section header */}
                <div className="px-6 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    <span className="text-emerald-500 mr-1">#{currentSectionIndex + 1}</span>
                    {currentSection.title}
                  </h4>
                  <div className="flex items-center gap-2">
                    {currentSection.content && (
                      <span className="text-xs text-gray-400">{countWords(currentSection.content)} 字</span>
                    )}
                    {currentSection.status === 'done' && !isGenerating && (
                      <button
                        onClick={() => handleRegenerateSection(currentSectionIndex)}
                        className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors"
                        title="重新生成此节"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                        </svg>
                        重写
                      </button>
                    )}
                  </div>
                </div>

                {/* Section content (editable) */}
                <div className="px-6 py-4">
                  {currentSection.status === 'generating' || (currentSection.content && currentSection.status === 'done') ? (
                    <div className="relative">
                      <textarea
                        value={currentSection.content}
                        onChange={e => updateSectionContent(currentSection.id, e.target.value)}
                        disabled={isGenerating}
                        rows={16}
                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-200 leading-relaxed resize-y focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all disabled:bg-gray-50 dark:disabled:bg-gray-750 bg-white dark:bg-gray-700 font-mono"
                      />
                      {isGenerating && (
                        <span className="absolute bottom-4 right-4 inline-block w-1.5 h-4 bg-emerald-500 animate-pulse" />
                      )}
                    </div>
                  ) : currentSection.status === 'error' ? (
                    <div className="text-center py-8">
                      <p className="text-sm text-red-500 mb-3">此节生成失败</p>
                      <button
                        onClick={() => handleRegenerateSection(currentSectionIndex)}
                        className="px-4 py-2 text-xs font-medium text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                      >
                        重试生成
                      </button>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-gray-400">
                      等待生成...
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Error */}
        {writingError && (
          <div className="mx-6 mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 animate-fade-in">
            {writingError}
          </div>
        )}

        {/* Action bar */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-2">
          {isGenerating ? (
            <button
              onClick={handleStopGeneration}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
              </svg>
              停止生成
            </button>
          ) : (
            <>
              <button
                onClick={handleRegenerateAll}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                </svg>
                全部重新生成
              </button>
              {outline.some(s => s.status === 'pending' || s.status === 'error') && (
                <button
                  onClick={handleContinueNext}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                  </svg>
                  继续生成下一节
                </button>
              )}
            </>
          )}
          {doneSections === outline.length && !isGenerating && (
            <button
              onClick={() => setStep('complete')}
              className="ml-auto flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-sm"
            >
              查看完整文章
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }

  // ============================================================
  // Render: Step 4 - Complete
  // ============================================================

  function renderCompleteStep() {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-emerald-100 dark:border-emerald-900/30 bg-gradient-to-r from-emerald-50 dark:from-emerald-900/20 to-transparent">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">写作完成</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  共 {outline.length} 个章节，{totalWords} 字
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setStep('writing')}
                className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 flex items-center gap-1"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                </svg>
                返回编辑
              </button>
              <div ref={exportRef} className="relative">
                <button
                  onClick={() => setShowExport(!showExport)}
                  className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-emerald-600 to-emerald-700 rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  导出文章
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {showExport && (
                  <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 z-10 animate-fade-in">
                    <button onClick={handleExportMarkdown} className="w-full text-left px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2">
                      <span className="text-base">📋</span> 导出 Markdown (.md)
                    </button>
                    <button onClick={handleExportText} className="w-full text-left px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2">
                      <span className="text-base">📄</span> 导出纯文本 (.txt)
                    </button>
                    <button onClick={handleExportHtml} className="w-full text-left px-4 py-2.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 flex items-center gap-2">
                      <span className="text-base">🌐</span> 导出网页 (.html)
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Full article */}
        <div className="px-6 py-6 max-h-[600px] overflow-y-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 pb-3 border-b border-gray-200 dark:border-gray-700">
            {topic}
          </h1>
          {outline.map((section, index) => (
            <div key={section.id} className="mb-8">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 text-emerald-800 dark:text-emerald-300">
                {index + 1}. {section.title}
              </h2>
              <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                {section.content || <span className="text-gray-400 italic">（此节无内容）</span>}
              </div>
              <div className="mt-2 text-xs text-gray-400 text-right">
                {countWords(section.content)} 字
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ============================================================
  // Main render
  // ============================================================

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-emerald-100/60 via-emerald-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-emerald-100/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-emerald-600 transition-colors">
              工具
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">长文写作</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 bg-clip-text text-transparent">
              AI 长文写作
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            支持大纲规划与分段生成，轻松创作万字论文、报告、小说、教程等专业长文内容
          </p>

          {/* Step Indicator */}
          <StepIndicator />
        </div>
      </section>

      {/* Tool Section */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {step === 'topic' && renderTopicStep()}
          {step === 'outline' && renderOutlineStep()}
          {step === 'writing' && renderWritingStep()}
          {step === 'complete' && renderCompleteStep()}
        </div>
      </section>

      {/* Usage Tips */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">💡 使用技巧</h3>
        <ul className="space-y-2">
          {TIPS.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="text-emerald-500 mt-0.5 shrink-0">•</span>
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
            <Link key={r.to} to={r.to} className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-emerald-300 dark:hover:border-emerald-700 hover:text-emerald-600 transition-colors">
              {r.label} →
            </Link>
          ))}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-sm rounded-lg shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}

      {/* Collaboration Toolbar - shown when there is content */}
      {(step === 'writing' || step === 'complete') && (
        <CollabToolbar
          title={topic || 'AI 长文写作'}
          content={getFullArticle()}
          onContentChange={() => {}}
        />
      )}
    </div>
  );
}
