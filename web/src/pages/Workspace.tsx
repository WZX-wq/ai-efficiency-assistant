import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import AiTextProcessor from '../components/AiTextProcessor';
import ChatInterface from '../components/ChatInterface';
import RichTextEditor from '../components/RichTextEditor';
import { exportAsMarkdown, exportAsHtml, exportAsPlainText } from '../utils/export';
import { useSeo, PAGE_SEO } from '../components/SeoHead';
import { useAppStore } from '../store/appStore';

const TABS = [
  { key: 'text', label: 'AI 文本处理' },
  { key: 'chat', label: 'AI 对话' },
  { key: 'editor', label: '富文本编辑器' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

const CHAT_SYSTEM_PROMPT =
  '你是一个专业的内容创作助手，擅长撰写营销文案、社交媒体内容、产品描述和品牌故事。请用中文回答，保持专业且富有创意的风格。';

const QUICK_TOOLS = [
  { to: '/workspace/creative', icon: '🎨', name: '创意灵感', desc: 'AI视觉创意' },
  { to: '/workspace/copywriting', icon: '✍️', name: '文案生成', desc: '批量生成文案' },
  { to: '/workspace/seo', icon: '🔍', name: 'SEO优化', desc: '搜索排名提升' },
  { to: '/workspace/humanize', icon: '🧑', name: '人性化改写', desc: '去除AI痕迹' },
  { to: '/workspace/polish', icon: '✨', name: '文章润色', desc: '提升文章质量' },
  { to: '/workspace/brand', icon: '🎭', name: '品牌声音', desc: '统一品牌调性' },
  { to: '/workspace/calendar', icon: '📅', name: '营销日历', desc: '内容排期计划' },
  { to: '/workspace/scripts', icon: '💬', name: '话术库', desc: '多场景话术' },
] as const;

function countWords(text: string): { chars: number; words: number } {
  if (!text) return { chars: 0, words: 0 };
  const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
  const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
  return { chars: chineseChars, words: englishWords };
}

export default function Workspace() {
  useSeo(PAGE_SEO.workspace);
  const [activeTab, setActiveTab] = useState<TabKey>('text');
  const [editorContent, setEditorContent] = useState('');
  const [autoSaveVisible, setAutoSaveVisible] = useState(false);
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showWelcome, setShowWelcome] = useState(() => {
    return !localStorage.getItem('ai-workspace-welcomed');
  });
  const recentTools = useAppStore((s) => s.recentTools);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Load saved editor content on mount
  useEffect(() => {
    const saved = localStorage.getItem('ai-workspace-editor-content');
    if (saved) setEditorContent(saved);
  }, []);

  // Auto-save editor content with debounce
  useEffect(() => {
    if (!editorContent) return;
    const timer = setTimeout(() => {
      localStorage.setItem('ai-workspace-editor-content', editorContent);
    }, 1000);
    return () => clearTimeout(timer);
  }, [editorContent]);

  // Tab sliding indicator position
  const tabIndicatorStyle = useMemo(() => {
    const idx = TABS.findIndex((t) => t.key === activeTab);
    if (idx < 0) return {};
    const btn = tabRefs.current[idx];
    if (!btn) return {};
    return {
      width: btn.offsetWidth,
      transform: `translateX(${btn.offsetLeft}px)`,
    };
  }, [activeTab]);

  const handleExportMarkdown = useCallback(() => {
    if (!editorContent.trim()) return;
    exportAsMarkdown(editorContent, '富文本内容');
  }, [editorContent]);

  const handleExportHtml = useCallback(() => {
    if (!editorContent.trim()) return;
    exportAsHtml(editorContent, '富文本内容');
  }, [editorContent]);

  const handleExportPlainText = useCallback(() => {
    if (!editorContent.trim()) return;
    exportAsPlainText(editorContent, '富文本内容');
  }, [editorContent]);

  const [exportOpen, setExportOpen] = useState(false);

  // Auto-save indicator with debounce
  useEffect(() => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }

    if (editorContent.trim()) {
      autoSaveTimer.current = setTimeout(() => {
        setAutoSaveVisible(true);
        autoSaveTimer.current = setTimeout(() => {
          setAutoSaveVisible(false);
        }, 2000);
      }, 1000);
    }

    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, [editorContent]);

  const { chars, words } = countWords(editorContent);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Hero */}
      <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-violet-100/60 via-violet-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-violet-100/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Welcome Message (replaces breadcrumb) */}
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <span>欢迎回来，开始你的创作之旅 ✨</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-violet-600 via-violet-500 to-violet-600 bg-clip-text text-transparent">
              AI 工作台
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            集成文本处理、AI 对话和富文本编辑，一站式内容创作
          </p>
        </div>
      </section>

      {/* Welcome Guide Card */}
      {showWelcome && (
        <section className="pb-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-2xl bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white shadow-lg">
              <button
                onClick={() => {
                  setShowWelcome(false);
                  localStorage.setItem('ai-workspace-welcomed', 'true');
                }}
                className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                aria-label="关闭欢迎提示"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <h2 className="text-xl font-bold mb-3">欢迎使用 AI 工作台</h2>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-white/90">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  选择工具开始创作
                </li>
                <li className="flex items-center gap-2 text-sm text-white/90">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  使用 AI 对话获取灵感
                </li>
                <li className="flex items-center gap-2 text-sm text-white/90">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                  所有内容自动保存
                </li>
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* Quick Tool Grid */}
      <section className="pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            {[...QUICK_TOOLS]
              .sort((a, b) => {
                const aIdx = recentTools.findIndex((r) => a.name.includes(r) || r.includes(a.name) || a.to.includes(r));
                const bIdx = recentTools.findIndex((r) => b.name.includes(r) || r.includes(b.name) || b.to.includes(r));
                if (aIdx === -1 && bIdx === -1) return 0;
                if (aIdx === -1) return 1;
                if (bIdx === -1) return -1;
                return aIdx - bIdx;
              })
              .map((tool) => (
              <Link
                key={tool.to}
                to={tool.to}
                className="shrink-0 w-36 flex flex-col items-center gap-2 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md hover:shadow-violet-100/50 dark:hover:shadow-violet-900/20 transition-all group"
              >
                <span className="text-2xl group-hover:scale-110 transition-transform">
                  {tool.icon}
                </span>
                <div className="text-center">
                  <div className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    {tool.name}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {tool.desc}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Tab Bar */}
          <div className="relative flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 mb-6 w-fit">
            <div
              className="absolute bottom-1 left-1 h-[calc(100%-8px)] bg-white dark:bg-gray-700 rounded-lg shadow-sm transition-all duration-300"
              style={tabIndicatorStyle}
            />
            {TABS.map((tab, i) => (
              <button
                key={tab.key}
                ref={(el) => { tabRefs.current[i] = el; }}
                onClick={() => setActiveTab(tab.key)}
                className={`relative z-10 px-5 py-2.5 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.key
                    ? 'text-violet-600 dark:text-violet-400'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden"
            style={{ height: 'calc(100vh - 320px)', minHeight: '500px' }}
          >
            {activeTab === 'text' && <AiTextProcessor />}

            {activeTab === 'chat' && (
              <ChatInterface
                systemPrompt={CHAT_SYSTEM_PROMPT}
                title="AI 内容创作对话"
                placeholder="描述你的内容需求，AI 将帮你创作..."
              />
            )}

            {activeTab === 'editor' && (
              <div className="flex flex-col h-full">
                {/* Editor Toolbar */}
                <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    富文本编辑器
                  </h3>
                  <div className="flex items-center gap-3">
                    {/* Auto-save Indicator */}
                    <span
                      className={`flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 transition-opacity duration-300 ${
                        autoSaveVisible ? 'opacity-100' : 'opacity-0'
                      }`}
                    >
                      <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      自动保存
                    </span>

                    {/* Word Count */}
                    <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                      {chars > 0 && <span>{chars} 字</span>}
                      {chars > 0 && words > 0 && <span className="mx-1">·</span>}
                      {words > 0 && <span>{words} 词</span>}
                    </span>

                    {/* Export Dropdown */}
                    <div className="relative">
                      <button
                        onClick={() => setExportOpen(!exportOpen)}
                        disabled={!editorContent.trim()}
                        className="px-4 py-1.5 text-xs font-semibold text-white bg-violet-500 hover:bg-violet-600 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg transition-all flex items-center gap-1"
                      >
                        导出
                        <svg className={`w-3 h-3 transition-transform ${exportOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                      </button>
                      {exportOpen && (
                        <>
                          <div className="fixed inset-0 z-10" onClick={() => setExportOpen(false)} />
                          <div className="absolute right-0 top-full mt-1 z-20 w-40 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1">
                            <button onClick={() => { handleExportMarkdown(); setExportOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">📄 导出 Markdown</button>
                            <button onClick={() => { handleExportHtml(); setExportOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">🌐 导出 HTML</button>
                            <button onClick={() => { handleExportPlainText(); setExportOpen(false); }} className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">📝 导出纯文本</button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                {/* Editor Body */}
                <div className="flex-1 overflow-hidden p-4">
                  <RichTextEditor
                    content={editorContent}
                    onChange={setEditorContent}
                    placeholder="开始写作..."
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
