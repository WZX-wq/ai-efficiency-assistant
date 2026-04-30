import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { chatWithAiStream } from '../services/aiChat';
import { roleplayStore } from '../store/roleplayStore';
import {
  PRESET_CARDS,
  CATEGORY_THEME,
  type CharacterCard,
  type RolePlayMessage,
} from '../data/characterCards';
import MarkdownRenderer from '../components/MarkdownRenderer';
import { useSeo } from '../components/SeoHead';

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

/** 单条聊天消息 */
function ChatMessageItem({
  message,
  emoji,
  themeColor,
  isStreaming,
}: {
  message: RolePlayMessage;
  emoji: string;
  themeColor: string;
  isStreaming?: boolean;
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
            : 'bg-white/10 dark:bg-gray-700/50 backdrop-blur-sm text-gray-100 dark:text-gray-100 rounded-tl-sm border border-white/10'
        }`}
      >
        {isUser ? (
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{displayContent}</p>
        ) : (
          <div className="text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_strong]:text-white">
            <MarkdownRenderer content={displayContent} className="prose-invert prose-sm max-w-none [&_p]:text-gray-200 [&_strong]:text-white [&_h1]:text-white [&_h2]:text-white [&_h3]:text-white [&_li]:text-gray-200" />
            {isStreaming && (
              <span className="inline-block w-1.5 h-4 ml-1 bg-white/60 animate-pulse rounded-sm" />
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
}

// ============================================================
// 主组件
// ============================================================

export default function RolePlayChat() {
  const { cardId } = useParams<{ cardId: string }>();
  const navigate = useNavigate();

  // ---- Store ----
  const customCards = roleplayStore((s) => s.customCards);
  const createSession = roleplayStore((s) => s.createSession);
  const saveSession = roleplayStore((s) => s.saveSession);
  const exportSession = roleplayStore((s) => s.exportSession);
  const activeSessionId = roleplayStore((s) => s.activeSessionId);

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

  // ---- 自动滚动到底部 ----
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ---- 发送消息 ----
  const sendMessage = useCallback(
    async (content: string) => {
      if (!card || !content.trim() || isGenerating) return;

      const userMessage: RolePlayMessage = {
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

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullContent += value;
          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: fullContent,
            };
            return updated;
          });
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
  }, [sessionId, exportSession, card]);

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
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-gray-400">
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
      className={`h-screen flex flex-col bg-gradient-to-b ${theme.gradient} text-white overflow-hidden`}
    >
      {/* ====== 顶部栏 ====== */}
      <header className="flex-shrink-0 flex items-center justify-between px-4 py-3 bg-black/20 backdrop-blur-md border-b border-white/10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/playground')}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
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
          {/* 存档按钮 */}
          <button
            onClick={() => {
              if (sessionId && messages.length > 0) {
                saveSession(sessionId, messages, statusValues);
              }
            }}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
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
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
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
      <div className="flex-shrink-0 px-4 py-2 bg-black/10 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-3 overflow-x-auto scrollbar-hide">
          {card.statusFields?.map((field) => (
            <div
              key={field.name}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 whitespace-nowrap"
            >
              <span className="text-sm">{field.icon}</span>
              <span className="text-xs text-gray-300">{field.name}:</span>
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
            key={idx}
            message={msg}
            emoji={card.avatar}
            themeColor={theme.primary}
            isStreaming={isGenerating && idx === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}
        <div ref={chatEndRef} />
      </div>

      {/* ====== 快捷指令栏 ====== */}
      {(card.quickCommands?.length ?? 0) > 0 && (
        <div className="flex-shrink-0 px-4 py-2 bg-black/10 backdrop-blur-md border-t border-white/5">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {card.quickCommands?.map((cmd) => (
              <button
                key={cmd.label}
                onClick={() => sendMessage(cmd.prompt)}
                disabled={isGenerating}
                className="flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium
                           bg-white/10 border border-white/15 text-gray-200
                           hover:bg-white/20 hover:border-white/25
                           disabled:opacity-50 disabled:cursor-not-allowed
                           transition-all duration-200"
              >
                {cmd.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ====== 输入区域 ====== */}
      <div className="flex-shrink-0 px-4 py-3 bg-black/20 backdrop-blur-md border-t border-white/10">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <textarea
            ref={textareaRef}
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="输入你的行动..."
            rows={1}
            disabled={isGenerating}
            className="flex-1 px-4 py-3 rounded-2xl bg-white/10 border border-white/15 text-white
                       placeholder-gray-400 resize-none focus:outline-none focus:ring-2
                       disabled:opacity-50 disabled:cursor-not-allowed transition-all"
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
