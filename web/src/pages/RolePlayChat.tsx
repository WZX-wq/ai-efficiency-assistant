import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { chatWithAiStream } from '../services/aiChat';
import { roleplayStore } from '../store/roleplayStore';
import { useAppStore } from '../store/appStore';
import {
  PRESET_CARDS,
  CATEGORY_THEME,
  type CharacterCard,
  type RolePlayMessage,
} from '../data/characterCards';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { useSeo } from '../components/SeoHead';
import { useToast } from '../components/ToastProvider';

// ============================================================
// 工具函数
// ============================================================

/** 从 AI 回复中解析状态更新指令 [状态:字段名:新值] */
function parseStatusUpdates(text: string): Record<string, string> {
  const updates: Record<string, string> = {};
  const regex = /\[状态:([^:]+):([^\]]+)\]/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    updates[match[1].trim()] = match[2].trim();
  }
  return updates;
}

/** 从文本中移除状态更新指令（用于显示） */
function stripStatusCommands(text: string): string {
  return text.replace(/\[状态:[^\]]+\]/g, '').trim();
}

/** 从 greeting 中解析初始状态 */
function parseInitialStatus(greeting: string): Record<string, string> {
  return parseStatusUpdates(greeting);
}

/** 格式化时间戳 */
function formatTime(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return '刚刚';
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay < 7) return `${diffDay} 天前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

// ============================================================
// 子组件
// ============================================================

/** 设置面板 */
function SettingsPanel({
  card,
  onClearChat,
  onExport,
  onClose,
}: {
  card: CharacterCard;
  onClearChat: () => void;
  onExport: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl
                 border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
    >
      <div className="p-4 space-y-3">
        <h4 className="text-sm font-semibold text-gray-900 dark:text-white">设置</h4>

        <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <p>角色：{card.name}</p>
          <p>分类：{card.category}</p>
        </div>

        <hr className="border-gray-200 dark:border-gray-700" />

        <button
          onClick={() => { onClearChat(); onClose(); }}
          className="w-full text-left px-3 py-2 text-sm rounded-lg text-red-600 dark:text-red-400
                     hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          清除对话记录
        </button>

        <button
          onClick={() => { onExport(); onClose(); }}
          className="w-full text-left px-3 py-2 text-sm rounded-lg text-gray-700 dark:text-gray-300
                     hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          导出存档
        </button>
      </div>
    </motion.div>
  );
}

/** 会话侧边栏 */
function SessionSidebar({
  cardId,
  cardName,
  cardAvatar,
  isOpen,
  onClose,
  onSwitchSession,
  onNewGame,
  onDeleteSession,
  currentSessionId,
  isDark,
}: {
  cardId: string;
  cardName: string;
  cardAvatar: string;
  isOpen: boolean;
  onClose: () => void;
  onSwitchSession: (session: { id: string; messages: RolePlayMessage[]; statusValues: Record<string, string> }) => void;
  onNewGame: () => void;
  onDeleteSession: (sessionId: string) => void;
  currentSessionId: string | null;
  isDark: boolean;
}) {
  const sessions = roleplayStore((s) => s.sessions);
  const cardSessions = useMemo(
    () => sessions.filter((s) => s.cardId === cardId).sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions, cardId],
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 遮罩层（移动端全屏覆盖 + 桌面端半透明遮罩） */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 bg-black/50 z-40 md:bg-black/30"
            onClick={onClose}
          />

          {/* 侧边栏 */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`fixed top-0 left-0 bottom-0 w-[280px] max-w-[85vw] backdrop-blur-xl
                       border-r z-50 flex flex-col shadow-2xl ${
                         isDark
                           ? 'bg-gray-900/95 border-white/10'
                           : 'bg-white/95 border-gray-200'
                       }`}
          >
            {/* 头部 */}
            <div className={`flex items-center justify-between px-4 py-4 border-b ${isDark ? 'border-white/10' : 'border-gray-200'}`}>
              <div className="flex items-center gap-2">
                <span className="text-xl">{cardAvatar}</span>
                <h2 className={`text-lg font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>游戏记录</h2>
              </div>
              <button
                onClick={onClose}
                className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-gray-400 hover:text-white' : 'hover:bg-gray-100 text-gray-500 hover:text-gray-900'}`}
                aria-label="关闭侧边栏"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* 新建游戏按钮 */}
            <div className="px-3 py-3">
              <button
                onClick={() => { onNewGame(); onClose(); }}
                className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                           border text-sm font-medium transition-all duration-200 ${
                             isDark
                               ? 'bg-white/10 hover:bg-white/15 border-white/15 text-white'
                               : 'bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700'
                           }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                新建游戏
              </button>
            </div>

            {/* 会话列表 */}
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1 scrollbar-thin">
              {cardSessions.length === 0 ? (
                <div className={`text-center py-8 text-sm ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  <p>暂无游戏记录</p>
                  <p className="mt-1 text-xs">点击上方按钮开始新游戏</p>
                </div>
              ) : (
                cardSessions.map((session) => {
                  const isActive = session.id === currentSessionId;
                  const messageCount = session.messages.length;
                  return (
                    <motion.div
                      key={session.id}
                      whileHover={{ x: 2 }}
                      className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-all duration-200 border ${
                        isActive
                          ? isDark
                            ? 'bg-white/15 border-white/20'
                            : 'bg-primary-50 border-primary-200'
                          : isDark
                            ? 'hover:bg-white/8 border-transparent'
                            : 'hover:bg-gray-50 border-transparent'
                      }`}
                      onClick={() => {
                        onSwitchSession({
                          id: session.id,
                          messages: session.messages,
                          statusValues: session.statusValues,
                        });
                        onClose();
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium truncate ${isDark ? 'text-white' : 'text-gray-900'}`}>{cardName}</span>
                          {isActive && (
                            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-green-400" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-gray-400">{formatTime(session.updatedAt)}</span>
                          <span className="text-xs text-gray-500">{messageCount} 条消息</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id);
                        }}
                        className={`flex-shrink-0 p-1.5 rounded-lg opacity-0 group-hover:opacity-100
                                   transition-all duration-200 ${
                                     isDark
                                       ? 'hover:bg-red-500/20 text-gray-500 hover:text-red-400'
                                       : 'hover:bg-red-50 text-gray-400 hover:text-red-500'
                                   }`}
                        aria-label="删除会话"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

/** 单条聊天消息 */
const ChatMessageItem = React.memo(function ChatMessageItem({
  message,
  emoji,
  themeColor,
  isStreaming,
  isDark,
}: {
  message: RolePlayMessage;
  emoji: string;
  themeColor: string;
  isStreaming?: boolean;
  isDark: boolean;
}) {
  const isUser = message.role === 'user';
  const displayContent = isUser ? message.content : stripStatusCommands(message.content);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* 头像 */}
      {!isUser && (
        <div
          className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-md"
          style={{ backgroundColor: `${themeColor}20` }}
        >
          {emoji}
        </div>
      )}

      {/* 消息气泡 */}
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
          isUser
            ? 'bg-blue-600 text-white rounded-tr-sm'
            : isDark
              ? 'bg-white/10 backdrop-blur-sm text-gray-100 rounded-tl-sm border border-white/10'
              : 'bg-white text-gray-800 rounded-tl-sm border border-gray-200 shadow-sm'
        }`}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayContent}</p>
        ) : (
          <div className={`text-sm leading-relaxed ${isDark ? '[&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:text-white' : '[&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:text-gray-900'}`}>
            <MarkdownRenderer content={displayContent} className={`prose-sm max-w-none ${isDark ? 'prose-invert [&_p]:text-gray-200 [&_strong]:text-white [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_li]:text-gray-200' : '[&_p]:text-gray-700 [&_strong]:text-gray-900 [&_h1]:text-gray-900 [&_h2]:text-gray-900 [&_h3]:text-gray-900 [&_li]:text-gray-700'}`} />
            {isStreaming && (
              <span className={`inline-block w-1.5 h-4 ml-1 animate-pulse rounded-sm ${isDark ? 'bg-white/60' : 'bg-gray-400'}`} />
            )}
          </div>
        )}
      </div>

      {/* 用户头像占位 */}
      {isUser && (
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600/20 flex items-center justify-center shadow-md">
          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
      )}
    </motion.div>
  );
});

// ============================================================
// 主组件
// ============================================================

export default function RolePlayChat() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  // ---- Store ----
  const customCards = roleplayStore((s) => s.customCards);
  const createSession = roleplayStore((s) => s.createSession);
  const saveSession = roleplayStore((s) => s.saveSession);
  const exportSession = roleplayStore((s) => s.exportSession);
  const deleteSession = roleplayStore((s) => s.deleteSession);
  const setActiveSession = roleplayStore((s) => s.setActiveSession);
  const activeSessionId = roleplayStore((s) => s.activeSessionId);

  // ---- 主题检测 ----
  const appTheme = useAppStore((s) => s.theme);
  const [isDark, setIsDark] = useState(() => {
    if (appTheme === 'system') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return appTheme === 'dark';
  });

  useEffect(() => {
    if (appTheme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
      mq.addEventListener('change', handler);
      setIsDark(mq.matches);
      return () => mq.removeEventListener('change', handler);
    } else {
      setIsDark(appTheme === 'dark');
    }
  }, [appTheme]);

  // ---- 查找角色卡 ----
  const card = useMemo<CharacterCard | null>(() => {
    if (!cardId) return null;
    return (
      PRESET_CARDS.find((c) => c.id === cardId) ||
      customCards.find((c) => c.id === cardId) ||
      null
    );
  }, [cardId, customCards]);

  // ---- 主题色 ----
  const theme = useMemo(
    () => (card ? CATEGORY_THEME[card.category] : CATEGORY_THEME.fantasy),
    [card],
  );

  // ---- SEO ----
  useSeo({
    title: card ? `${card.name} - AI 角色扮演` : 'AI 角色扮演',
    description: card?.description ?? '沉浸式 AI 角色扮演体验',
    canonicalUrl: `/playground/chat/${cardId}`,
  });

  // ---- 状态 ----
  const [messages, setMessages] = useState<RolePlayMessage[]>([]);
  const [statusValues, setStatusValues] = useState<Record<string, string>>({});
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(activeSessionId);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const settingsRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ---- 初始化 ----
  useEffect(() => {
    if (!card) return;

    // 解析初始状态
    const initialStatus = parseInitialStatus(card.greeting);
    setStatusValues(initialStatus);

    // 创建会话
    const sid = createSession(card.id, initialStatus);
    setSessionId(sid);

    // 发送 greeting 作为第一条 AI 消息
    setMessages([
      {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        role: 'assistant',
        content: card.greeting,
        timestamp: Date.now(),
      },
    ]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cardId]);

  // ---- 点击外部关闭设置面板 ----
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (showSettings && settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showSettings]);

  // ---- ESC 键关闭侧边栏 ----
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && sidebarOpen) {
        setSidebarOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [sidebarOpen]);

  // ---- 自动滚动到底部 ----
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ---- 切换会话 ----
  const handleSwitchSession = useCallback(
    (sessionData: { id: string; messages: RolePlayMessage[]; statusValues: Record<string, string> }) => {
      setSessionId(sessionData.id);
      setActiveSession(sessionData.id);
      setMessages(sessionData.messages);
      setStatusValues(sessionData.statusValues);
    },
    [setActiveSession],
  );

  // ---- 新建游戏 ----
  const handleNewGame = useCallback(() => {
    if (!card) return;
    const initialStatus = parseInitialStatus(card.greeting);
    setStatusValues(initialStatus);
    const sid = createSession(card.id, initialStatus);
    setSessionId(sid);
    setMessages([
      {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        role: 'assistant',
        content: card.greeting,
        timestamp: Date.now(),
      },
    ]);
  }, [card, createSession]);

  // ---- 删除会话 ----
  const handleDeleteSession = useCallback(
    (targetSessionId: string) => {
      deleteSession(targetSessionId);
      // 如果删除的是当前会话，新建一个
      if (targetSessionId === sessionId && card) {
        handleNewGame();
      }
    },
    [deleteSession, sessionId, card, handleNewGame],
  );

  // ---- 发送消息 ----
  const sendMessage = useCallback(
    async (content: string) => {
      if (!card || !content.trim() || isGenerating) return;

      const userMessage: RolePlayMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      setIsGenerating(true);

      // 调整 textarea 高度
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }

      // 构建 system prompt
      const systemPrompt = `${card.worldSetting}\n\n${card.characterPrompt}\n\n当前玩家状态：\n${Object.entries(statusValues)
        .map(([k, v]) => `- ${k}: ${v}`)
        .join('\n')}`;

      // 构建消息历史（最近 20 条）
      const history = [...messages, userMessage]
        .slice(-20)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

      // 创建 AbortController
      const controller = new AbortController();
      abortRef.current = controller;

      // 添加空的 AI 消息占位
      const aiMessage: RolePlayMessage = {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      try {
        const response = await chatWithAiStream(
          { messages: history, systemPrompt, temperature: 0.8, maxTokens: 2048 },
          controller.signal,
        );

        if (!response.success || !response.stream) {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: response.error || 'AI 回复失败，请重试。',
            };
            return updated;
          });
          setIsGenerating(false);
          return;
        }

        const reader = response.stream.getReader();
        let fullContent = '';
        let rafId: number | null = null;
        let pendingContent = '';

        const flushMessages = () => {
          rafId = null;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: pendingContent,
            };
            return updated;
          });
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullContent += value;
          pendingContent = fullContent;
          if (rafId === null) {
            rafId = requestAnimationFrame(flushMessages);
          }
        }

        // 确保最后一次更新被刷新
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          flushMessages();
        }

        // 解析状态更新
        const updates = parseStatusUpdates(fullContent);
        if (Object.keys(updates).length > 0) {
          setStatusValues((prev) => ({ ...prev, ...updates }));
        }

        // 保存会话
        const finalMessages = [...messages, userMessage, { ...aiMessage, content: fullContent }];
        if (sessionId) {
          saveSession(sessionId, finalMessages, { ...statusValues, ...updates });
        }
      } catch {
        if (controller.signal.aborted) {
          // 用户主动停止
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last.role === 'assistant' && !last.content) {
              updated.pop();
            }
            return updated;
          });
        } else {
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: '网络错误，请检查网络连接后重试。',
            };
            return updated;
          });
        }
      } finally {
        setIsGenerating(false);
        abortRef.current = null;
      }
    },
    [card, isGenerating, messages, statusValues, sessionId, saveSession],
  );

  // ---- 停止生成 ----
  const stopGenerating = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  // ---- 清除对话 ----
  const clearChat = useCallback(() => {
    if (!card) return;
    const initialStatus: Record<string, string> = {};
    card.statusFields?.forEach((f) => {
      initialStatus[f.name] = f.defaultValue;
    });
    setStatusValues(initialStatus);
    setMessages([
      {
        id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        role: 'assistant',
        content: card.greeting,
        timestamp: Date.now(),
      },
    ]);
  }, [card]);

  // ---- 导出存档 ----
  const handleExport = useCallback(() => {
    if (!sessionId) return;
    const json = exportSession(sessionId);
    if (!json) return;
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `roleplay_${card?.name || 'session'}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast('导出成功', 'success');
  }, [sessionId, exportSession, card, toast]);

  // ---- 键盘事件 ----
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(inputValue);
      }
    },
    [sendMessage, inputValue],
  );

  // ---- 自动调整 textarea 高度 ----
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
    const el = e.target;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, []);

  // ---- 角色卡不存在 ----
  if (!card) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className={`text-center ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          <p className="text-xl mb-4">角色卡不存在</p>
          <button
            onClick={() => navigate('/playground')}
            className="px-6 py-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
          >
            返回游乐场
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`h-screen flex flex-col overflow-hidden ${
        isDark
          ? `bg-gradient-to-b ${theme.gradient} text-white`
          : 'bg-gray-50 text-gray-900'
      }`}
    >
      {/* ====== 会话侧边栏 ====== */}
      <SessionSidebar
        cardId={card.id}
        cardName={card.name}
        cardAvatar={card.avatar}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSwitchSession={handleSwitchSession}
        onNewGame={handleNewGame}
        onDeleteSession={handleDeleteSession}
        currentSessionId={sessionId}
        isDark={isDark}
      />

      {/* ====== 顶部栏 ====== */}
      <header className={`flex-shrink-0 flex items-center justify-between px-4 py-3 backdrop-blur-md border-b ${
        isDark
          ? 'bg-black/20 border-white/10'
          : 'bg-white/80 border-gray-200'
      }`}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/playground')}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
            aria-label="返回"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="flex items-center gap-2">
            <span className="text-2xl">{card.avatar}</span>
            <h1 className="text-lg font-bold truncate max-w-[200px]">{card.name}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 历史记录按钮 */}
          <button
            onClick={() => setSidebarOpen((prev) => !prev)}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
            aria-label="游戏记录"
            title="游戏记录"
          >
            <span className="text-lg" role="img" aria-label="历史记录">
              📋
            </span>
          </button>

          {/* 存档按钮 */}
          <button
            onClick={() => {
              if (sessionId && messages.length > 0) {
                saveSession(sessionId, messages, statusValues);
              }
            }}
            className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
            aria-label="存档"
            title="保存存档"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
          </button>

          {/* 设置按钮 */}
          <div ref={settingsRef} className="relative">
            <button
              onClick={() => setShowSettings((prev) => !prev)}
              className={`p-2 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10' : 'hover:bg-gray-100'}`}
              aria-label="设置"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {showSettings && (
              <SettingsPanel
                card={card}
                onClearChat={clearChat}
                onExport={handleExport}
                onClose={() => setShowSettings(false)}
              />
            )}
          </div>
        </div>
      </header>

      {/* ====== 状态栏 ====== */}
      <div className={`flex-shrink-0 px-4 py-2 backdrop-blur-md border-b ${
        isDark
          ? 'bg-black/10 border-white/5'
          : 'bg-white/60 border-gray-100'
      }`}>
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
          {card.statusFields?.map((field) => (
            <div
              key={field.name}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border whitespace-nowrap ${
                isDark
                  ? 'bg-white/5 border-white/10'
                  : 'bg-gray-100 border-gray-200'
              }`}
            >
              <span className="text-sm">{field.icon}</span>
              <span className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{field.name}:</span>
              <span className="text-xs font-semibold" style={{ color: theme.primary }}>
                {statusValues[field.name] || field.defaultValue}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ====== 聊天消息区域 ====== */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-thin">
        {messages.map((msg, idx) => (
          <ChatMessageItem
            key={msg.id || idx}
            message={msg}
            emoji={card.avatar}
            themeColor={theme.primary}
            isStreaming={isGenerating && idx === messages.length - 1 && msg.role === 'assistant'}
            isDark={isDark}
          />
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* ====== 快捷指令栏 ====== */}
      {(card.quickCommands?.length ?? 0) > 0 && (
        <div className={`flex-shrink-0 px-4 py-2 backdrop-blur-md border-t ${
          isDark
            ? 'bg-black/10 border-white/5'
            : 'bg-white/60 border-gray-100'
        }`}>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {card.quickCommands?.map((cmd) => (
              <button
                key={cmd.label}
                onClick={() => sendMessage(cmd.prompt)}
                disabled={isGenerating}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium border
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200 ${
                             isDark
                               ? 'bg-white/10 border-white/15 text-gray-200 hover:bg-white/20 hover:border-white/25'
                               : 'bg-gray-100 border-gray-200 text-gray-700 hover:bg-gray-200 hover:border-gray-300'
                           }`}
              >
                {cmd.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ====== 输入区域 ====== */}
      <div className={`flex-shrink-0 px-4 py-3 backdrop-blur-md border-t ${
        isDark
          ? 'bg-black/20 border-white/10'
          : 'bg-white/80 border-gray-200'
      }`}>
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="输入你的行动..."
            rows={1}
            disabled={isGenerating}
            className={`flex-1 px-4 py-3 rounded-2xl border resize-none focus:outline-none focus:ring-2
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
                         isDark
                           ? 'bg-white/10 border-white/15 text-white placeholder-gray-400'
                           : 'bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-500'
                       }`}
            style={{ '--tw-ring-color': theme.primary } as React.CSSProperties}
          />
          {isGenerating ? (
            <button
              onClick={stopGenerating}
              className="flex-shrink-0 p-3 rounded-2xl bg-red-600/80 hover:bg-red-600 transition-colors"
              aria-label="停止生成"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
            </button>
          ) : (
            <button
              onClick={() => sendMessage(inputValue)}
              disabled={!inputValue.trim()}
              className="flex-shrink-0 p-3 rounded-2xl transition-all duration-200
                         disabled:opacity-30 disabled:cursor-not-allowed"
              style={{ backgroundColor: theme.primary }}
              aria-label="发送"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
