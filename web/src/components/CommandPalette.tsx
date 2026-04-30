import { useState, useEffect, useRef, useMemo, useCallback, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

interface CommandItem {
  id: string;
  title: string;
  description?: string;
  icon: string;
  path?: string;
  category: string;
  action?: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

const COMMANDS: CommandItem[] = [
  // 工具
  { id: 'workspace', title: 'AI工作台', icon: '⚡', path: '/workspace', category: '工具' },
  { id: 'rewrite', title: '智能改写/扩写/翻译/总结', icon: '🔄', path: '/workspace', category: '工具', description: 'AI文本智能处理' },
  { id: 'creative', title: '创意灵感', icon: '🎨', path: '/workspace/creative', category: '工具', description: '获取营销创意灵感' },
  { id: 'copywriting', title: '文案生成器', icon: '✍️', path: '/workspace/copywriting', category: '工具', description: '自动生成营销文案' },
  { id: 'scripts', title: '话术库', icon: '💬', path: '/workspace/scripts', category: '工具', description: '管理与生成销售话术' },
  { id: 'calendar', title: '营销日历', icon: '📅', path: '/workspace/calendar', category: '工具', description: '营销活动排期管理' },
  { id: 'seo', title: 'SEO优化', icon: '🔍', path: '/workspace/seo', category: '工具', description: '搜索引擎优化工具' },
  { id: 'humanize', title: '人性化改写', icon: '🧑', path: '/workspace/humanize', category: '工具', description: '让AI文本更自然' },
  { id: 'polish', title: '文章润色', icon: '✨', path: '/workspace/polish', category: '工具', description: '提升文章表达质量' },
  { id: 'summarizer', title: '文本摘要', icon: '📝', path: '/workspace/summarizer', category: '工具', description: '快速提取文本要点' },
  { id: 'templates', title: '模板库', icon: '📑', path: '/workspace/templates', category: '工具', description: '常用内容模板集合' },
  { id: 'brand', title: '品牌声音', icon: '🎨', path: '/workspace/brand', category: '工具', description: '定义品牌语言风格' },
  { id: 'history', title: '历史记录', icon: '📋', path: '/workspace/history', category: '工具', description: '查看历史操作记录' },
  { id: 'playground', title: 'AI游乐场', icon: '🎮', path: '/playground', category: '工具', description: '沉浸式AI角色扮演体验' },
  // 服务
  { id: 'video', title: '短视频制作', icon: '🎬', path: '/services/video', category: '服务' },
  { id: 'group-buy', title: '团购运营', icon: '🛒', path: '/services/group-buy', category: '服务' },
  { id: 'private-domain', title: '私域搭建', icon: '🔗', path: '/services/private-domain', category: '服务' },
  { id: 'ai-cs', title: 'AI客服', icon: '🤖', path: '/services/ai-cs', category: '服务' },
  { id: 'data-analysis', title: '数据分析', icon: '📊', path: '/services/data-analysis', category: '服务' },
  { id: 'live-stream', title: '直播操盘', icon: '📡', path: '/services/live-stream', category: '服务' },
  // 其他
  { id: 'home', title: '首页', icon: '🏠', path: '/', category: '其他' },
  { id: 'pricing', title: '定价方案', icon: '💰', path: '/pricing', category: '其他' },
  { id: 'services', title: '服务总览', icon: '🛠️', path: '/services', category: '其他' },
  { id: 'settings', title: '设置', icon: '⚙️', path: '/settings', category: '其他' },
  { id: 'privacy', title: '隐私政策', icon: '🛡️', path: '/privacy', category: '其他', description: '了解数据隐私保护政策' },
  { id: 'terms', title: '服务条款', icon: '📄', path: '/terms', category: '其他', description: '查看服务使用条款' },
  { id: 'new-writing', title: '新建写作', icon: '➕', path: '/workspace', category: '工具', description: '打开空白编辑器开始创作' },
];

/** 动态操作命令（主题切换、AI面板等） */
function useActionCommands(onClose: () => void): CommandItem[] {
  const { toggleAiPanel, setTheme, theme } = useAppStore();

  return [
    {
      id: 'toggle-ai-panel',
      title: '打开/关闭 AI 写作助手',
      icon: '🤖',
      category: '快捷操作',
      description: '侧边栏 AI 助手面板',
      action: () => { toggleAiPanel(); onClose(); },
    },
    {
      id: 'toggle-theme',
      title: `切换主题（当前：${theme === 'dark' ? '暗黑' : theme === 'light' ? '亮色' : '跟随系统'}）`,
      icon: '🎨',
      category: '快捷操作',
      description: '亮色 / 暗黑 / 跟随系统',
      action: () => {
        const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
        setTheme(next);
        onClose();
      },
    },
    {
      id: 'open-feedback',
      title: '提交反馈',
      icon: '💬',
      category: '快捷操作',
      description: '帮助我们改进产品',
      action: () => {
        // 触发 FeedbackWidget 打开（通过 DOM 事件）
        window.dispatchEvent(new CustomEvent('open-feedback'));
        onClose();
      },
    },
  ];
}

const CATEGORY_ORDER = ['最近使用', '快捷操作', '工具', '服务', '其他'];

function fuzzyMatch(text: string, query: string): boolean {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  if (lower.includes(q)) return true;
  let qi = 0;
  for (let i = 0; i < lower.length && qi < q.length; i++) {
    if (lower[i] === q[qi]) qi++;
  }
  return qi === q.length;
}

/** Highlight matching portion of text with a styled span */
function highlightMatch(text: string, query: string): ReactNode {
  if (!query.trim()) return text;
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="bg-yellow-200 dark:bg-yellow-800 text-inherit rounded px-0.5">
        {text.slice(idx, idx + q.length)}
      </span>
      {text.slice(idx + q.length)}
    </>
  );
}

export default function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const recentTools = useAppStore((s) => s.recentTools);
  const actionCommands = useActionCommands(onClose);

  const allCommands = useMemo(() => [...actionCommands, ...COMMANDS], [actionCommands]);

  const filtered = useMemo(() => {
    if (!query.trim()) return allCommands;
    return allCommands.filter((item) => fuzzyMatch(item.title, query) || (item.description && fuzzyMatch(item.description, query)));
  }, [query, allCommands]);

  // Build recent tools group when there's a search query
  const recentGroup = useMemo(() => {
    if (!query.trim() || recentTools.length === 0) return null;
    const recentFiltered = recentTools
      .map((id) => allCommands.find((cmd) => cmd.id === id))
      .filter((item): item is CommandItem => !!item && fuzzyMatch(item.title, query));
    if (recentFiltered.length === 0) return null;
    return { category: '最近使用', items: recentFiltered };
  }, [query, recentTools, allCommands]);

  const grouped = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {};
    for (const item of filtered) {
      // Skip items already shown in recent group
      if (recentGroup && recentGroup.items.some((r) => r.id === item.id)) continue;
      if (!groups[item.category]) groups[item.category] = [];
      groups[item.category].push(item);
    }
    return CATEGORY_ORDER.filter((c) => groups[c]).map((c) => ({ category: c, items: groups[c] }));
  }, [filtered, recentGroup]);

  // Combine recent group + normal groups for flat item indexing
  const allGroups = useMemo(() => {
    return recentGroup ? [recentGroup, ...grouped] : grouped;
  }, [recentGroup, grouped]);

  const flatItems = useMemo(() => allGroups.flatMap((g) => g.items), [allGroups]);

  const resetAndClose = useCallback(() => {
    setQuery('');
    setActiveIndex(0);
    onClose();
  }, [onClose]);

  const handleSelect = useCallback(
    (item: CommandItem) => {
      if (item.action) {
        item.action();
      } else if (item.path) {
        navigate(item.path);
      }
      resetAndClose();
    },
    [navigate, resetAndClose],
  );

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setActiveIndex((i) => (i + 1) % flatItems.length);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setActiveIndex((i) => (i - 1 + flatItems.length) % flatItems.length);
          break;
        case 'Enter':
          e.preventDefault();
          if (flatItems[activeIndex]) handleSelect(flatItems[activeIndex]);
          break;
        case 'Escape':
          e.preventDefault();
          resetAndClose();
          break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, flatItems, activeIndex, handleSelect, resetAndClose]);

  // 滚动激活项到可视区域
  useEffect(() => {
    const container = listRef.current;
    if (!container) return;
    const active = container.querySelector('[data-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (!open) return null;

  // Track global item index for stagger animation
  let globalIdx = 0;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/50 animate-fade-in"
      onClick={resetAndClose}
    >
      <div
        className="w-full max-w-lg mx-4 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="命令面板"
      >
        {/* 搜索输入 */}
        <div className="flex items-center gap-3 px-4 border-b border-gray-200 dark:border-gray-700">
          <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            placeholder="搜索页面或工具..."
            role="combobox"
            aria-expanded={filtered.length > 0}
            aria-controls="command-list"
            aria-autocomplete="list"
            className="flex-1 py-4 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none text-base"
          />
          <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
            ESC
          </kbd>
        </div>

        {/* 命令列表 */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2" role="listbox" id="command-list">
          {allGroups.length === 0 && (
            <div className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
              未找到匹配的结果
            </div>
          )}
          {allGroups.map((group) => (
            <div key={group.category}>
              <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                {group.category}
              </div>
              {group.items.map((item) => {
                const idx = flatItems.indexOf(item);
                const isActive = idx === activeIndex;
                const delay = globalIdx * 30;
                globalIdx++;
                return (
                  <button
                    key={item.id}
                    data-active={isActive}
                    onClick={() => handleSelect(item)}
                    onMouseEnter={() => setActiveIndex(idx)}
                    role="option"
                    aria-selected={isActive}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors animate-fade-in"
                    style={{ animationDelay: `${delay}ms`, animationFillMode: 'both' }}
                  >
                    <span className="text-lg shrink-0">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className={`font-medium truncate ${isActive
                        ? 'text-primary-700 dark:text-primary-300'
                        : 'text-gray-700 dark:text-gray-300'
                      }`}>
                        {highlightMatch(item.title, query)}
                      </div>
                      {item.description && (
                        <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{item.description}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* 底部提示 */}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400">
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-[10px]">↑↓</kbd>
            导航
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-[10px]">↵</kbd>
            选择
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 text-[10px]">esc</kbd>
            关闭
          </span>
        </div>
      </div>
    </div>
  );
}
