import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore, groupSessionsByDate, type ChatMessage, type ChatSession } from '../store/useChatStore';
import { chatWithAiStream, chatWithAi } from '../services/aiChat';
import MarkdownRenderer from './MarkdownRenderer';
import { useToast } from './ToastProvider';
import { useSeo } from './SeoHead';

// ============================================================
// Slash Commands
// ============================================================

interface SlashCommand {
  key: string;
  label: string;
  description: string;
  icon: string;
  action: (input: string, ctx: CommandContext) => string | void;
}

interface CommandContext {
  setInput: (v: string) => void;
  clearMessages: () => void;
  messages: ChatMessage[];
  toast: (msg: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  createSession: (title?: string) => string;
  switchSession: (id: string) => void;
}

const SLASH_COMMANDS: SlashCommand[] = [
  {
    key: 'help',
    label: '显示帮助',
    description: '查看所有可用指令',
    icon: '?',
    action: () => undefined,
  },
  {
    key: 'clear',
    label: '清空对话',
    description: '清空当前对话消息',
    icon: 'X',
    action: (_input, ctx) => { ctx.clearMessages(); ctx.toast('对话已清空', 'success'); },
  },
  {
    key: 'summarize',
    label: '总结当前对话',
    description: '让 AI 总结当前对话内容',
    icon: 'S',
    action: (_input, ctx) => {
      if (ctx.messages.length === 0) { ctx.toast('当前没有对话内容', 'warning'); return; }
      return '请总结以下对话的核心要点：\n\n' + ctx.messages.map(m => `[${m.role}]: ${m.content}`).join('\n');
    },
  },
  {
    key: 'export',
    label: '导出对话',
    description: '导出当前对话为文本',
    icon: 'E',
    action: (_input, ctx) => {
      if (ctx.messages.length === 0) { ctx.toast('当前没有对话内容', 'warning'); return; }
      const text = ctx.messages.map(m => `[${m.role}] ${m.content}`).join('\n\n---\n\n');
      const blob = new Blob([text], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `chat-export-${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      ctx.toast('对话已导出', 'success');
    },
  },
  {
    key: 'template',
    label: '插入对话模板',
    description: '选择预设模板开始对话',
    icon: 'T',
    action: () => undefined,
  },
  {
    key: 'translate',
    label: '翻译模式',
    description: '切换到翻译对话模式',
    icon: 'G',
    action: () => '你是一位专业翻译，请帮我将以下内容翻译为英文：\n\n',
  },
  {
    key: 'code',
    label: '代码模式',
    description: '切换到代码助手模式',
    icon: '<>',
    action: () => '你是一位资深开发者，请帮我处理以下代码问题：\n\n',
  },
  {
    key: 'creative',
    label: '创意模式',
    description: '切换到创意写作模式',
    icon: '*',
    action: () => '你是一位创意作家，请帮我进行以下创意写作：\n\n',
  },
];

// ============================================================
// Chat Templates
// ============================================================

interface ChatTemplate {
  key: string;
  label: string;
  icon: string;
  prompt: string;
}

const CHAT_TEMPLATES: ChatTemplate[] = [
  {
    key: 'academic',
    label: '学术问答',
    icon: '🎓',
    prompt: '你是一位学术专家，请帮我分析和解答以下学术问题：\n\n',
  },
  {
    key: 'code',
    label: '代码助手',
    icon: '💻',
    prompt: '你是一位资深开发者，请帮我处理以下代码问题：\n\n',
  },
  {
    key: 'creative',
    label: '创意写作',
    icon: '✍️',
    prompt: '你是一位创意作家，请帮我进行以下创意写作：\n\n',
  },
  {
    key: 'data',
    label: '数据分析',
    icon: '📊',
    prompt: '你是一位数据分析师，请帮我分析以下数据问题：\n\n',
  },
  {
    key: 'business',
    label: '商务沟通',
    icon: '💼',
    prompt: '你是一位商务顾问，请帮我处理以下商务沟通问题：\n\n',
  },
  {
    key: 'learning',
    label: '学习辅导',
    icon: '📚',
    prompt: '你是一位老师，请帮我解答以下学习问题：\n\n',
  },
];

// ============================================================
// Helper
// ============================================================

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

// ============================================================
// Sidebar Session Item
// ============================================================

function SessionItem({
  session,
  isActive,
  onSelect,
  onDelete,
  onPin,
}: {
  session: ChatSession;
  isActive: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onPin: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`group flex items-center gap-2 px-3 py-2.5 rounded-lg cursor-pointer transition-colors ${
        isActive
          ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
          : 'hover:bg-gray-100 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
      }`}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{session.title}</p>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          {session.messages.length} 条消息
        </p>
      </div>
      {hovered && (
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onPin(); }}
            className="p-1 text-gray-400 hover:text-amber-500 dark:hover:text-amber-400 rounded transition-colors"
            title={session.pinned ? '取消置顶' : '置顶'}
          >
            <svg className="w-3.5 h-3.5" fill={session.pinned ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
            title="删除"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Typing Indicator
// ============================================================

function TypingIndicator() {
  return (
    <div className="flex items-start gap-3 animate-fade-in">
      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shrink-0">
        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
        </svg>
      </div>
      <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-tl-md px-4 py-3">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function EnhancedChat() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const {
    currentSessionId,
    isStreaming,
    createSession,
    deleteSession,
    renameSession,
    switchSession,
    pinSession,
    addMessage,
    updateLastMessage,
    clearMessages,
    setStreaming,
    getCurrentSession,
    getCurrentMessages,
    getSortedSessions,
    searchSessions,
  } = useChatStore();

  const [input, setInput] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const [slashFilter, setSlashFilter] = useState('');
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const currentSession = getCurrentSession();
  const messages = getCurrentMessages();
  const sortedSessions = getSortedSessions();

  // Filter sessions by search
  const filteredSessions = useMemo(() => {
    if (!sidebarSearch.trim()) return sortedSessions;
    return searchSessions(sidebarSearch);
  }, [sortedSessions, sidebarSearch, searchSessions]);

  const groupedSessions = useMemo(
    () => groupSessionsByDate(filteredSessions),
    [filteredSessions]
  );

  // Filter slash commands
  const filteredCommands = useMemo(() => {
    if (!slashFilter) return SLASH_COMMANDS;
    return SLASH_COMMANDS.filter(
      (c) =>
        c.key.includes(slashFilter) ||
        c.label.includes(slashFilter) ||
        c.description.includes(slashFilter)
    );
  }, [slashFilter]);

  // Filter templates
  const filteredTemplates = useMemo(() => {
    if (!templateSearch) return CHAT_TEMPLATES;
    return CHAT_TEMPLATES.filter(
      (t) => t.label.includes(templateSearch) || t.key.includes(templateSearch)
    );
  }, [templateSearch]);

  // SEO
  useSeo({
    title: 'AI 对话 - AI效率助手',
    description: '与 AI 进行深度对话，支持多轮对话、斜杠指令、对话模板等功能，提升你的工作和学习效率。',
    keywords: 'AI对话,智能聊天,AI助手,对话模板,斜杠指令,AI效率助手',
    canonicalUrl: '/chat',
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 144)}px`;
    }
  }, [input]);

  // Ensure there is a current session
  useEffect(() => {
    if (!currentSessionId) {
      createSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close menus on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.slash-menu-container')) setShowSlashMenu(false);
      if (!target.closest('.template-menu-container')) setShowTemplateMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ---- Command context ----
  const commandContext: CommandContext = useMemo(
    () => ({
      setInput,
      clearMessages,
      messages,
      toast,
      createSession,
      switchSession,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [messages]
  );

  // ---- Send message ----
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isStreaming) return;

      // Ensure session exists
      let sid = currentSessionId;
      if (!sid) {
        sid = createSession();
      }

      addMessage({ role: 'user', content: content.trim() });
      setInput('');
      setStreaming(true);

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      const currentMessages = useChatStore.getState().getCurrentMessages();
      const systemPrompt = '你是一个专业的AI助手，擅长回答各种问题。请用中文回答。';

      const startTime = Date.now();

      try {
        const streamResp = await chatWithAiStream(
          {
            messages: currentMessages.map((m) => ({
              role: m.role as 'user' | 'assistant',
              content: m.content,
            })),
            systemPrompt,
          },
          abortController.signal
        );

        if (streamResp.success && streamResp.stream) {
          const reader = streamResp.stream.getReader();
          let accumulated = '';

          addMessage({ role: 'assistant', content: '' });

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              accumulated += value;
              updateLastMessage(accumulated);
            }
          } catch (err) {
            if (abortController.signal.aborted) {
              // User cancelled, keep what we have
              if (!accumulated) {
                // Remove the empty assistant message
                const msgs = useChatStore.getState().getCurrentMessages();
                if (msgs.length > 0 && msgs[msgs.length - 1].content === '') {
                  // We need to remove last message - do it via store manipulation
                  // For simplicity, update with a cancellation note
                  updateLastMessage('（已停止生成）');
                }
              }
            } else {
              // Fallback to non-streaming
              const fallback = await chatWithAi(
                {
                  messages: currentMessages.map((m) => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.content,
                  })),
                  systemPrompt,
                },
                abortController.signal
              );
              if (fallback.success && fallback.result) {
                updateLastMessage(fallback.result, {
                  duration: Date.now() - startTime,
                });
              }
            }
          }

          // Set metadata
          const duration = Date.now() - startTime;
          updateLastMessage(accumulated || useChatStore.getState().getCurrentMessages().slice(-1)[0]?.content || '', {
            duration,
            tokens: accumulated.length,
          });
        } else {
          // Non-streaming fallback
          const fallback = await chatWithAi(
            {
              messages: currentMessages.map((m) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content,
              })),
              systemPrompt,
            },
            abortController.signal
          );
          if (fallback.success && fallback.result) {
            addMessage({
              role: 'assistant',
              content: fallback.result,
              metadata: { duration: Date.now() - startTime },
            });
          } else {
            addMessage({
              role: 'assistant',
              content: fallback.error || '抱歉，发生了错误，请稍后重试。',
            });
          }
        }
      } catch {
        if (!abortController.signal.aborted) {
          addMessage({
            role: 'assistant',
            content: '抱歉，发生了错误，请稍后重试。',
          });
        }
      } finally {
        setStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [isStreaming, currentSessionId, addMessage, updateLastMessage, setStreaming, createSession]
  );

  // ---- Handle slash command ----
  const handleSlashCommand = useCallback(
    (cmd: SlashCommand) => {
      if (cmd.key === 'help') {
        const helpText = SLASH_COMMANDS.map((c) => `/${c.key} - ${c.description}`).join('\n');
        toast(helpText, 'info');
        setInput('');
        setShowSlashMenu(false);
        return;
      }
      if (cmd.key === 'template') {
        setShowTemplateMenu(true);
        setShowSlashMenu(false);
        setInput('');
        return;
      }

      const result = cmd.action(input, commandContext);
      if (typeof result === 'string') {
        setInput(result);
      } else {
        setInput('');
      }
      setShowSlashMenu(false);
    },
    [input, commandContext, toast]
  );

  // ---- Handle template select ----
  const handleTemplateSelect = useCallback(
    (template: ChatTemplate) => {
      setInput(template.prompt);
      setShowTemplateMenu(false);
      textareaRef.current?.focus();
    },
    []
  );

  // ---- Handle input change ----
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setInput(value);

      // Slash command detection
      if (value.startsWith('/')) {
        const afterSlash = value.slice(1);
        if (afterSlash.includes(' ')) {
          setShowSlashMenu(false);
        } else {
          setShowSlashMenu(true);
          setSlashFilter(afterSlash);
        }
      } else {
        setShowSlashMenu(false);
      }
    },
    []
  );

  // ---- Handle key down ----
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        if (showSlashMenu && filteredCommands.length > 0) {
          handleSlashCommand(filteredCommands[0]);
          return;
        }
        sendMessage(input);
      }
      if (e.key === 'Escape') {
        setShowSlashMenu(false);
        setShowTemplateMenu(false);
      }
    },
    [input, sendMessage, showSlashMenu, filteredCommands, handleSlashCommand]
  );

  // ---- Handle copy ----
  const handleCopy = useCallback((msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  // ---- Handle stop ----
  const handleStop = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setStreaming(false);
  }, [setStreaming]);

  // ---- Handle title edit ----
  const handleTitleSave = useCallback(() => {
    if (currentSessionId && titleDraft.trim()) {
      renameSession(currentSessionId, titleDraft.trim());
    }
    setEditingTitle(false);
  }, [currentSessionId, titleDraft, renameSession]);

  // ---- Handle new session ----
  const handleNewSession = useCallback(() => {
    createSession();
    setInput('');
  }, [createSession]);

  // ---- Handle delete session ----
  const handleDeleteSession = useCallback(
    (id: string) => {
      if (window.confirm('确定要删除此对话吗？')) {
        deleteSession(id);
      }
    },
    [deleteSession]
  );

  // ---- Handle clear all ----
  const handleClearAll = useCallback(() => {
    if (window.confirm('确定要清除所有对话吗？此操作不可撤销。')) {
      useChatStore.setState({ sessions: [], currentSessionId: null });
      createSession();
    }
  }, [createSession]);

  // ---- Placeholder buttons ----
  const handleAttachment = useCallback(() => {
    toast('附件功能即将推出', 'info');
  }, [toast]);

  const handleVoice = useCallback(() => {
    toast('语音输入即将推出', 'info');
  }, [toast]);

  // ---- Render ----
  const groupLabels: Record<string, string> = {
    pinned: '📌 置顶',
    today: '今天',
    yesterday: '昨天',
    earlier: '更早',
  };

  return (
    <div className="fixed inset-0 top-16 bg-white dark:bg-gray-900 flex" style={{ zIndex: 40 }}>
      {/* ===== Sidebar ===== */}
      <div
        className={`${
          sidebarOpen ? 'w-[280px]' : 'w-0'
        } transition-all duration-300 overflow-hidden border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex flex-col shrink-0`}
      >
        <div className="w-[280px] h-full flex flex-col">
          {/* New session button */}
          <div className="p-3 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={handleNewSession}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              新建对话
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-2">
            <input
              type="text"
              value={sidebarSearch}
              onChange={(e) => setSidebarSearch(e.target.value)}
              placeholder="搜索对话..."
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Session list */}
          <div className="flex-1 overflow-y-auto px-2 pb-2">
            {(['pinned', 'today', 'yesterday', 'earlier'] as const).map((group) => {
              const items = groupedSessions[group];
              if (items.length === 0) return null;
              return (
                <div key={group} className="mb-2">
                  <p className="px-2 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                    {groupLabels[group]}
                  </p>
                  {items.map((session) => (
                    <SessionItem
                      key={session.id}
                      session={session}
                      isActive={session.id === currentSessionId}
                      onSelect={() => switchSession(session.id)}
                      onDelete={() => handleDeleteSession(session.id)}
                      onPin={() => pinSession(session.id)}
                    />
                  ))}
                </div>
              );
            })}
            {filteredSessions.length === 0 && (
              <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                {sidebarSearch ? '未找到匹配的对话' : '暂无对话'}
              </div>
            )}
          </div>

          {/* Bottom actions */}
          <div className="p-3 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleClearAll}
              className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              清除所有
            </button>
          </div>
        </div>
      </div>

      {/* ===== Main Chat Area ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
          <div className="flex items-center gap-3">
            {/* Toggle sidebar */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={sidebarOpen ? '收起侧边栏' : '展开侧边栏'}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>

            {/* Title */}
            {editingTitle ? (
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onBlur={handleTitleSave}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave();
                  if (e.key === 'Escape') setEditingTitle(false);
                }}
                className="text-sm font-semibold bg-gray-100 dark:bg-gray-700 border border-primary-300 dark:border-primary-600 rounded px-2 py-1 text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            ) : (
              <button
                onClick={() => {
                  setTitleDraft(currentSession?.title || '');
                  setEditingTitle(true);
                }}
                className="text-sm font-semibold text-gray-900 dark:text-white hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                title="点击编辑标题"
              >
                {currentSession?.title || '新对话'}
              </button>
            )}

            {/* Model indicator */}
            <span className="hidden sm:inline-flex px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-md">
              AI Model
            </span>
          </div>

          <div className="flex items-center gap-1">
            {/* Chat history */}
            <button
              onClick={() => navigate('/chat-history')}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="对话历史"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>

            {/* Settings */}
            <button
              onClick={() => navigate('/settings')}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="设置"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          {messages.length === 0 && !isStreaming ? (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center">
                <svg className="w-10 h-10 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">
                开始新的对话
              </h2>
              <p className="text-sm text-gray-400 dark:text-gray-500 max-w-md text-center">
                输入你的问题，或使用斜杠指令 (/) 快速操作
              </p>

              {/* Template quick access */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-4 max-w-lg w-full">
                {CHAT_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.key}
                    onClick={() => handleTemplateSelect(tpl)}
                    className="flex items-center gap-2 px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-700 dark:text-gray-300"
                  >
                    <span>{tpl.icon}</span>
                    <span>{tpl.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-3xl mx-auto space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : msg.role === 'system' ? 'justify-center' : 'justify-start'} animate-fade-in group`}
                >
                  {msg.role === 'system' ? (
                    <div className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 rounded-full">
                      {msg.content}
                    </div>
                  ) : msg.role === 'user' ? (
                    <div className="max-w-[80%]">
                      <div className="bg-primary-600 text-white rounded-2xl rounded-br-md px-4 py-3 text-sm leading-relaxed">
                        <span className="whitespace-pre-wrap">{msg.content}</span>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="text-xs text-gray-400">{formatTime(msg.timestamp)}</span>
                        <button
                          onClick={() => handleCopy(msg.id, msg.content)}
                          className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          {copiedId === msg.id ? '已复制' : '复制'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 max-w-[80%]">
                      {/* AI Avatar */}
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-2xl rounded-tl-md px-4 py-3 text-sm leading-relaxed">
                          {msg.content ? (
                            <MarkdownRenderer content={msg.content} className="prose-sm" />
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <span className="text-xs text-gray-400">{formatTime(msg.timestamp)}</span>
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                          >
                            {copiedId === msg.id ? '已复制' : '复制'}
                          </button>
                          {msg.metadata?.duration && (
                            <span className="text-xs text-gray-400">
                              {msg.metadata.duration}ms
                            </span>
                          )}
                          {msg.metadata?.tokens && (
                            <span className="text-xs text-gray-400">
                              {msg.metadata.tokens} tokens
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Typing indicator */}
              {isStreaming && messages.length > 0 && messages[messages.length - 1]?.role !== 'assistant' && (
                <TypingIndicator />
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 shrink-0">
          <div className="max-w-3xl mx-auto">
            {/* Slash command menu */}
            {showSlashMenu && filteredCommands.length > 0 && (
              <div className="slash-menu-container mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg py-1 max-h-64 overflow-y-auto">
                {filteredCommands.map((cmd) => (
                  <button
                    key={cmd.key}
                    onClick={() => handleSlashCommand(cmd)}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="w-6 h-6 flex items-center justify-center bg-gray-100 dark:bg-gray-600 rounded text-xs font-mono font-bold text-primary-600 dark:text-primary-400">
                      {cmd.icon}
                    </span>
                    <div className="text-left">
                      <p className="font-medium">/{cmd.key}</p>
                      <p className="text-xs text-gray-400">{cmd.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Template menu */}
            {showTemplateMenu && (
              <div className="template-menu-container mb-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg p-3">
                <input
                  type="text"
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  placeholder="搜索模板..."
                  className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-800 dark:text-gray-200 placeholder-gray-400 focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none mb-2"
                  autoFocus
                />
                <div className="grid grid-cols-2 gap-2">
                  {filteredTemplates.map((tpl) => (
                    <button
                      key={tpl.key}
                      onClick={() => handleTemplateSelect(tpl)}
                      className="flex items-center gap-2 px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-gray-700 dark:text-gray-300"
                    >
                      <span>{tpl.icon}</span>
                      <span className="font-medium">{tpl.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input row */}
            <div className="flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                placeholder="输入你的问题... (输入 / 查看快捷指令)"
                rows={1}
                className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-200 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-gray-400 bg-gray-50 dark:bg-gray-700"
              />
              <div className="flex items-center gap-1 shrink-0">
                {/* Attachment */}
                <button
                  onClick={handleAttachment}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="附件 (即将推出)"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
                  </svg>
                </button>

                {/* Voice */}
                <button
                  onClick={handleVoice}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="语音输入 (即将推出)"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                  </svg>
                </button>

                {/* Send / Stop */}
                {isStreaming ? (
                  <button
                    onClick={handleStop}
                    className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    title="停止生成"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <rect x="6" y="6" width="12" height="12" rx="2" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim()}
                    className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    title="发送"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Character count */}
            {input.length > 0 && (
              <div className="flex justify-end mt-1">
                <span className="text-xs text-gray-400">{input.length} 字</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
