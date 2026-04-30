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

interface LearningMode {
  key: string;
  label: string;
  icon: string;
  description: string;
}

const LEARNING_MODES: LearningMode[] = [
  { key: 'qa', label: '知识问答', icon: '💡', description: '提出问题，AI详细解答' },
  { key: 'concept', label: '概念解释', icon: '📖', description: '用类比和实例解释概念' },
  { key: 'quiz', label: '练习题生成', icon: '📝', description: '生成练习题和答案' },
  { key: 'plan', label: '学习计划', icon: '📅', description: '制定结构化学习计划' },
  { key: 'thesis', label: '论文助手', icon: '🎓', description: '构建论文框架和内容' },
];

interface SubjectOption {
  value: string;
  label: string;
}

const SUBJECTS: SubjectOption[] = [
  { value: 'math', label: '数学' },
  { value: 'physics', label: '物理' },
  { value: 'chemistry', label: '化学' },
  { value: 'biology', label: '生物' },
  { value: 'history', label: '历史' },
  { value: 'geography', label: '地理' },
  { value: 'literature', label: '文学' },
  { value: 'philosophy', label: '哲学' },
  { value: 'economics', label: '经济学' },
  { value: 'cs', label: '计算机科学' },
  { value: 'law', label: '法律' },
  { value: 'medicine', label: '医学' },
  { value: 'english', label: '英语' },
];

interface DifficultyOption {
  value: string;
  label: string;
}

const DIFFICULTIES: DifficultyOption[] = [
  { value: 'beginner', label: '入门' },
  { value: 'basic', label: '基础' },
  { value: 'intermediate', label: '进阶' },
  { value: 'advanced', label: '高级' },
];

const DIFFICULTY_LABELS: Record<string, string> = {
  beginner: '入门',
  basic: '基础',
  intermediate: '进阶',
  advanced: '高级',
};

// ============================================================
// System Prompt Builder
// ============================================================

function getSystemPrompt(
  mode: string,
  subject: string,
  difficulty: string,
): string {
  const subjectLabel = SUBJECTS.find((s) => s.value === subject)?.label || subject;
  const difficultyLabel = DIFFICULTY_LABELS[difficulty] || difficulty;

  const modePrompts: Record<string, string> = {
    qa: `你是一个博学多才的教育专家。请对以下问题提供详细、准确、有深度的回答。使用结构化格式，包含核心概念、详细解释、实例说明和延伸思考。难度级别：${difficultyLabel}。学科领域：${subjectLabel}。`,
    concept: `你是一个善于用类比和实例解释复杂概念的老师。请用通俗易懂的方式解释以下概念。按照以下结构回答：
1. **定义**：简洁准确地定义概念
2. **类比**：用生活中的类比帮助理解
3. **实例**：提供具体的应用实例
4. **相关概念**：列出相关联的概念
5. **练习思考**：提出1-2个思考题

难度级别：${difficultyLabel}。学科领域：${subjectLabel}。`,
    quiz: `你是一个出题专家。请为以下主题生成不同难度的练习题，包含选择题、简答题和论述题。每道题都要提供标准答案和详细解析。难度级别：${difficultyLabel}。学科领域：${subjectLabel}。

请按以下格式输出：
## 选择题（4-5题）
每题包含题目、4个选项、正确答案和解析

## 简答题（3-4题）
每题包含题目、参考答案和评分要点

## 论述题（1-2题）
每题包含题目、参考答案框架和评分标准`,
    plan: `你是一个学习规划专家。请为以下学习目标制定一个结构化的学习计划。难度级别：${difficultyLabel}。学科领域：${subjectLabel}。

请按以下格式输出：
## 学习目标分析
分析目标的可行性和关键知识点

## 学习阶段规划
将学习过程分为4-8个阶段，每个阶段包含：
- 阶段名称和时长
- 学习目标
- 具体学习内容
- 推荐资源

## 每周时间安排
提供每周的学习时间分配建议

## 里程碑与检测点
列出关键里程碑和自我检测方法

## 推荐资源
推荐书籍、课程、网站等学习资源`,
    thesis: `你是一个学术写作顾问。请帮助用户构建论文框架。学科领域：${subjectLabel}。难度级别：${difficultyLabel}。

请按以下格式输出：
## 论文结构大纲
包含各章节标题和内容要点

## 核心论点
列出2-3个核心论点及其论证思路

## 参考文献建议
推荐相关的参考文献类型和查找方向

## 写作建议
提供学术写作的技巧和注意事项

## 时间规划
建议的论文写作时间安排`,
  };

  return modePrompts[mode] || modePrompts.qa;
}

// ============================================================
// Main Component
// ============================================================

export default function LearningTool() {
  useSeo('learning');
  const { toast } = useToast();
  const addWordsGenerated = useAppStore((s) => s.addWordsGenerated);

  // Core state
  const [activeMode, setActiveMode] = useState('qa');
  const [subject, setSubject] = useState('cs');
  const [difficulty, setDifficulty] = useState('basic');

  // Text state
  const [inputText, setInputText] = useState('');
  const [outputText, setOutputText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  // Expand/collapse for quiz mode
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const abortRef = useRef<AbortController | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Auto-scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputText]);

  // Toggle section expand/collapse
  const toggleSection = useCallback((section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  }, []);

  // Handle generate
  const handleGenerate = useCallback(async () => {
    if (!inputText.trim()) {
      toast('请输入问题或主题', 'warning');
      return;
    }

    if (abortRef.current) abortRef.current.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setOutputText('');
    setExpandedSections(new Set());

    const systemPrompt = getSystemPrompt(activeMode, subject, difficulty);

    const response = await chatWithAiStream(
      {
        messages: [{ role: 'user', content: inputText }],
        systemPrompt,
        temperature: 0.5,
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
        setOutputText(fullText);
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
  }, [inputText, activeMode, subject, difficulty, toast, addWordsGenerated]);

  // Common handlers
  const handleStop = useCallback(() => {
    if (abortRef.current) abortRef.current.abort();
  }, []);

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

  const handleClear = useCallback(() => {
    setInputText('');
    setOutputText('');
    setExpandedSections(new Set());
  }, []);

  const getInputPlaceholder = () => {
    switch (activeMode) {
      case 'qa': return '输入你想要了解的问题...\n\n例如：什么是机器学习中的梯度下降算法？';
      case 'concept': return '输入你想要解释的概念...\n\n例如：区块链、量子纠缠、相对论';
      case 'quiz': return '输入练习题的主题...\n\n例如：高中物理力学、线性代数基础';
      case 'plan': return '输入你的学习目标...\n\n例如：3个月内掌握Python数据分析';
      case 'thesis': return '输入论文的主题或方向...\n\n例如：人工智能对教育行业的影响';
      default: return '输入问题或主题...';
    }
  };

  const getActionButtonLabel = () => {
    switch (activeMode) {
      case 'qa': return '获取答案';
      case 'concept': return '解释概念';
      case 'quiz': return '生成题目';
      case 'plan': return '制定计划';
      case 'thesis': return '生成框架';
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
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-indigo-100/60 via-purple-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-indigo-100/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-indigo-600 transition-colors">
              工具
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">学习助手</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-indigo-600 via-purple-500 to-indigo-600 bg-clip-text text-transparent">
              AI 学习助手
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up max-w-2xl">
            覆盖 13 个学科领域，提供知识问答、概念解释、练习题生成、学习计划和论文助手五大功能
          </p>
        </div>
      </section>

      {/* Mode Selection */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex gap-2 overflow-x-auto flex-nowrap scrollbar-hide pb-1">
          {LEARNING_MODES.map((mode) => (
            <button
              key={mode.key}
              onClick={() => setActiveMode(mode.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium transition-all duration-200 ${
                activeMode === mode.key
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-indigo-900/30'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400'
              }`}
            >
              <span>{mode.icon}</span>
              <span>{mode.label}</span>
              <span className={`shrink-0 text-xs ${activeMode === mode.key ? 'text-indigo-200' : 'text-gray-400 dark:text-gray-500'}`}>
                {mode.description}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Subject & Difficulty Row */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Subject Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">学科</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            >
              {SUBJECTS.map((sub) => (
                <option key={sub.value} value={sub.value}>
                  {sub.label}
                </option>
              ))}
            </select>
          </div>

          {/* Difficulty Selector */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">难度</label>
            <div className="flex gap-1">
              {DIFFICULTIES.map((diff) => (
                <button
                  key={diff.value}
                  onClick={() => setDifficulty(diff.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                    difficulty === diff.value
                      ? 'bg-indigo-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:text-indigo-600 dark:hover:text-indigo-400'
                  }`}
                >
                  {diff.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Input Area */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">输入</span>
            </div>
            <div className="flex items-center gap-2">
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
            placeholder={getInputPlaceholder()}
            disabled={isGenerating}
            className="w-full min-h-[160px] p-4 text-sm text-gray-800 dark:text-gray-200 bg-transparent resize-none focus:outline-none placeholder-gray-400 dark:placeholder-gray-500 disabled:opacity-50"
          />
        </div>
      </section>

      {/* Action Buttons */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
        <div className="flex flex-wrap items-center gap-3">
          {!isGenerating ? (
            <button
              onClick={handleGenerate}
              disabled={!inputText.trim()}
              className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/30 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
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

          {outputText.length > 0 && !isGenerating && (
            <button
              onClick={handleGenerate}
              className="inline-flex items-center gap-2 px-6 py-3 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
              重新生成
            </button>
          )}
        </div>
      </section>

      {/* Output Area */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">输出</span>
            </div>
            <div className="flex items-center gap-2">
              {outputText.length > 0 && (
                <>
                  <button
                    onClick={handleCopy}
                    className="px-2.5 py-1 text-xs font-medium text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    {copied ? '已复制' : '复制'}
                  </button>
                  <span className="text-xs text-gray-400">
                    {outputText.length.toLocaleString()} 字
                  </span>
                </>
              )}
            </div>
          </div>
          <div ref={outputRef} className="min-h-[400px] p-6 overflow-y-auto">
            {outputText ? (
              <div className="prose prose-gray dark:prose-invert max-w-none">
                {outputText.split(/^(## .+)$/gm).map((part, i) => {
                  // Check if this is a section header
                  if (part.startsWith('## ')) {
                    const sectionTitle = part.replace('## ', '').trim();
                    const isExpanded = expandedSections.has(sectionTitle);
                    const sectionIndex = i;

                    return (
                      <div key={i} className="mt-6 first:mt-0">
                        <button
                          onClick={() => toggleSection(sectionTitle)}
                          className="flex items-center gap-2 w-full text-left group"
                        >
                          <svg
                            className={`w-4 h-4 text-indigo-500 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                          <h2 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {sectionTitle}
                          </h2>
                        </button>
                        <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-[9999px] opacity-100' : 'max-h-0 opacity-0'}`}>
                          <div className="mt-2 pl-6 text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                            {/* Render the content after this header */}
                            {(() => {
                              // Find the next section header
                              const parts = outputText.split(/^(## .+)$/gm);
                              let content = '';
                              for (let j = sectionIndex + 1; j < parts.length; j++) {
                                if (parts[j].startsWith('## ')) break;
                                content += parts[j];
                              }
                              return content;
                            })()}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // Skip content that is rendered inside sections
                  const prevParts = outputText.split(/^(## .+)$/gm).slice(0, i);
                  const hasPrevHeader = prevParts.some(p => p.startsWith('## '));
                  if (hasPrevHeader && i > 0) return null;

                  // Render non-section content
                  return (
                    <div key={i} className="text-sm leading-relaxed text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {part}
                      {isGenerating && i === outputText.split(/^(## .+)$/gm).length - 1 && (
                        <span className="inline-block w-1.5 h-4 ml-0.5 bg-indigo-500 animate-pulse rounded-sm" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[360px] text-gray-400 dark:text-gray-500">
                <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
                </svg>
                <p className="text-sm">学习内容将在这里显示</p>
                <p className="text-xs mt-1 opacity-60">
                  {activeMode === 'qa' && '输入问题后点击"获取答案"'}
                  {activeMode === 'concept' && '输入概念后点击"解释概念"'}
                  {activeMode === 'quiz' && '输入主题后点击"生成题目"'}
                  {activeMode === 'plan' && '输入学习目标后点击"制定计划"'}
                  {activeMode === 'thesis' && '输入论文主题后点击"生成框架"'}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Usage Tips */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">使用技巧</h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="text-indigo-500 mt-0.5 shrink-0">-</span>
            "知识问答"模式适合深入理解某个知识点，AI会提供结构化的详细解答
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="text-indigo-500 mt-0.5 shrink-0">-</span>
            "概念解释"模式会用类比和实例帮助理解复杂概念，适合初学者
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="text-indigo-500 mt-0.5 shrink-0">-</span>
            "练习题生成"模式会生成选择题、简答题和论述题，点击标题可展开/折叠答案
          </li>
          <li className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span className="text-indigo-500 mt-0.5 shrink-0">-</span>
            "学习计划"模式会生成包含阶段规划、时间安排和资源推荐的完整计划
          </li>
        </ul>
      </div>

      {/* Related Tools */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">相关工具</h3>
        <div className="flex flex-wrap gap-2">
          <Link to="/workspace/code-assistant" className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 transition-colors">
            AI代码助手
          </Link>
          <Link to="/workspace/mindmap" className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 transition-colors">
            思维导图
          </Link>
          <Link to="/workspace/summarizer" className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-700 hover:text-indigo-600 transition-colors">
            内容总结
          </Link>
        </div>
      </div>
    </div>
  );
}
