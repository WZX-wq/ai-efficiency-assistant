import { useState, useCallback, useRef, useEffect } from 'react';
import { useAppStore } from '../store/appStore';
import { useChatStore } from '../store/chatStore';
import { chatWithAiStream, chatWithAi } from '../services/aiChat';
import type { ChatMessage } from '../services/aiChat';
import MarkdownRenderer from './MarkdownRenderer';
import { useToast } from './ToastProvider';

/**
 * AI 写作助手侧边栏面板
 * 参考 LobeChat 和 Novel.sh 的 AI 侧边栏设计
 * - 可折叠面板
 * - 快捷指令
 * - 流式输出
 * - 上下文感知
 */

const QUICK_PROMPTS = [
  { label: '✨ 润色', prompt: '请润色以下文本，使其更加流畅、专业：\n\n' },
  { label: '📝 改写', prompt: '请用不同的方式改写以下文本：\n\n' },
  { label: '📏 扩写', prompt: '请扩写以下文本，增加更多细节和内容：\n\n' },
  { label: '✂️ 缩写', prompt: '请精简以下文本，保留核心信息：\n\n' },
  { label: '🌐 翻译', prompt: '请将以下文本翻译为英文：\n\n' },
  { label: '💡 续写', prompt: '请根据以下内容继续写作：\n\n' },
  { label: '🎯 总结', prompt: '请总结以下文本的核心要点：\n\n' },
  { label: '❓ 解释', prompt: '请简单解释以下内容：\n\n' },
];

/** 扩展 ChatMessage，增加唯一 id */
interface ExtendedChatMessage extends ChatMessage {
  id: string;
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export default function AiAssistantPanel() {
  const { aiPanelOpen, setAiPanelOpen } = useAppStore();
  const { toast } = useToast();
  const { sessions, createSession, clearMessages } = useChatStore();

  const [panelSessionId, setPanelSessionId] = useState<string>(() => {
    return localStorage.getItem('ai-panel-session-id') || '';
  });
  const [messages, setMessages] = useState<ExtendedChatMessage[]>(() => {
    const savedId = localStorage.getItem('ai-panel-session-id');
    if (savedId) {
      const session = sessions.find(s => s.id === savedId);
      if (session) {
        return session.messages.map((m, i) => ({ ...m, id: `msg_${i}_${Date.now()}` }));
      }
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [contextText, setContextText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // 确保有活跃的 panel session
  useEffect(() => {
    if (!panelSessionId || !sessions.find(s => s.id === panelSessionId)) {
      const newId = createSession('你是一个专业的AI写作助手，擅长内容创作、编辑和优化。请用中文回答。', 'AI助手对话');
      setPanelSessionId(newId);
      localStorage.setItem('ai-panel-session-id', newId);
      setMessages([]);
    }
    // 仅在首次挂载时执行
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 持久化消息到 chatStore
  useEffect(() => {
    if (messages.length > 0 && panelSessionId && !loading) {
      const store = useChatStore.getState();
      const session = store.sessions.find(s => s.id === panelSessionId);
      if (session) {
        // 检查是否需要更新（避免不必要的写入）
        const storeMsgCount = session.messages.length;
        if (storeMsgCount !== messages.length) {
          // 重建消息：先清除再逐条添加
          clearMessages(panelSessionId);
          messages.forEach(msg => {
            useChatStore.getState().addMessage(panelSessionId, msg.role as 'user' | 'assistant', msg.content);
          });
        }
      }
    }
  }, [messages, panelSessionId, loading, clearMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 100)}px`;
    }
  }, [input]);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || loading) return;
      const userMsg: ExtendedChatMessage = { role: 'user', content: content.trim(), id: generateId() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput('');
      setLoading(true);

      // 创建 AbortController
      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      // 构建系统提示
      const systemPrompt = contextText
        ? `你是一个专业的AI写作助手。用户正在编辑以下内容，请基于上下文提供帮助：\n\n---\n${contextText}\n---\n\n请用中文回答。`
        : '你是一个专业的AI写作助手，擅长内容创作、编辑和优化。请用中文回答。';

      try {
        const streamResp = await chatWithAiStream({
          messages: newMessages,
          systemPrompt,
        }, abortController.signal);

        if (streamResp.success && streamResp.stream) {
          const reader = streamResp.stream.getReader();
          let accumulated = '';
          const assistantId = generateId();
          setMessages([...newMessages, { role: 'assistant', content: '', id: assistantId }]);

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              accumulated += value;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: accumulated, id: assistantId };
                return updated;
              });
            }
          } catch (err) {
            if (abortController.signal.aborted) {
              // 用户主动取消，保留已生成的内容
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last && last.role === 'assistant' && !last.content) {
                  updated.pop();
                }
                return updated;
              });
            } else {
              // 其他错误，回退到非流式
              const fallback = await chatWithAi({ messages: newMessages, systemPrompt }, abortController.signal);
              if (fallback.success && fallback.result) {
                setMessages([...newMessages, { role: 'assistant', content: fallback.result, id: generateId() }]);
              }
            }
          }
        } else {
          const fallback = await chatWithAi({ messages: newMessages, systemPrompt }, abortController.signal);
          if (fallback.success && fallback.result) {
            setMessages([...newMessages, { role: 'assistant', content: fallback.result, id: generateId() }]);
          }
        }
      } catch {
        if (!abortController.signal.aborted) {
          setMessages((prev) => [
            ...prev,
            { role: 'assistant', content: '抱歉，发生了错误，请稍后重试。', id: generateId() },
          ]);
        }
      } finally {
        setLoading(false);
        abortControllerRef.current = null;
      }
    },
    [messages, loading, contextText]
  );

  const handleQuickPrompt = useCallback(
    (prompt: string) => {
      const fullContent = contextText ? `${prompt}${contextText}` : prompt;
      sendMessage(fullContent);
    },
    [sendMessage, contextText]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage(input);
      }
    },
    [input, sendMessage]
  );

  const handleSetContext = useCallback(() => {
    const selectedText = window.getSelection()?.toString() || '';
    if (!selectedText) {
      toast('请先选中页面上的文本', 'warning');
      return;
    }
    setContextText(selectedText);
    toast(`已获取选中文本（${selectedText.length} 字）`, 'success');
  }, [toast]);

  const handleCopy = useCallback((msgId: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleStopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
  }, []);

  const handleClearChat = useCallback(() => {
    if (window.confirm('确定要清空所有对话记录吗？')) {
      setMessages([]);
      // 创建新 session
      const newId = createSession('你是一个专业的AI写作助手，擅长内容创作、编辑和优化。请用中文回答。', 'AI助手对话');
      setPanelSessionId(newId);
      localStorage.setItem('ai-panel-session-id', newId);
    }
  }, [createSession]);

  if (!aiPanelOpen) return null;

  return (
    <div className="fixed right-0 top-16 bottom-0 w-96 bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700 shadow-xl z-40 flex flex-col animate-fade-in">
      {/* 头部 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-purple-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">AI 写作助手</h3>
            <span className="text-xs text-gray-400">随时为你提供写作帮助</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleClearChat}
            className="p-1.5 text-gray-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="清除对话"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
            </svg>
          </button>
          <button
            onClick={handleSetContext}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            title="使用选中文本作为上下文"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
            </svg>
          </button>
          <button
            onClick={() => setAiPanelOpen(false)}
            className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* 上下文提示 */}
      {contextText && (
        <div className="px-4 py-2 bg-primary-50 dark:bg-primary-900/20 border-b border-primary-100 dark:border-primary-800">
          <div className="flex items-center justify-between">
            <span className="text-xs text-primary-700 dark:text-primary-300 font-medium">
              📎 已附加上下文 ({contextText.length}字)
            </span>
            <button
              onClick={() => setContextText('')}
              className="text-xs text-primary-500 hover:text-primary-700 dark:hover:text-primary-200"
            >
              清除
            </button>
          </div>
          <p className="text-xs text-primary-600 dark:text-primary-400 mt-1 line-clamp-2">
            {contextText}
          </p>
        </div>
      )}

      {/* 快捷指令 */}
      {messages.length === 0 && !loading && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-400 mb-2 font-medium">快捷指令</p>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPTS.map((item) => (
              <button
                key={item.label}
                onClick={() => handleQuickPrompt(item.prompt)}
                className="px-2.5 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
        {messages.length === 0 && !loading && (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
            <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center">
              <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
            </div>
            <p className="text-sm text-center">我是你的AI写作助手</p>
            <p className="text-xs text-center text-gray-300 dark:text-gray-600">
              可以问我任何写作相关的问题，或使用快捷指令
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in group`}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-primary-600 text-white rounded-br-md'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-md'
              }`}
            >
              {msg.role === 'assistant' ? (
                <MarkdownRenderer content={msg.content} className="prose-sm" />
              ) : (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              )}
              {msg.role === 'assistant' && msg.content && (
                <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1.5 py-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                  >
                    {copiedId === msg.id ? '已复制' : '复制'}
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && messages[messages.length - 1]?.role !== 'assistant' && (
          <div className="flex flex-col gap-2 animate-fade-in">
            <div className="flex justify-start">
              <div className="bg-gray-100 dark:bg-gray-700 rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
            <button
              onClick={handleStopGeneration}
              className="self-center px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              停止生成
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区域 */}
      <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 shrink-0">
        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入你的问题..."
            rows={1}
            className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-200 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-gray-400 bg-gray-50 dark:bg-gray-700"
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="shrink-0 w-9 h-9 bg-primary-600 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-40 hover:bg-primary-700 hover:shadow-md"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
            </svg>
          </button>
        </div>
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="mt-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            清空对话
          </button>
        )}
      </div>
    </div>
  );
}
