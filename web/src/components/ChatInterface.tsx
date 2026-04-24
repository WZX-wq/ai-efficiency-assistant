import { useState, useRef, useEffect, useCallback } from 'react';
import { useChatStore } from '../store/chatStore';
import { chatWithAiStream, chatWithAi } from '../services/aiChat';
import { useAppStore } from '../store/appStore';
import MarkdownRenderer from './MarkdownRenderer';

/**
 * 增强版 ChatInterface
 * - 集成 chatStore 会话管理（创建/切换/删除/重命名会话）
 * - SSE 流式输出 + 自动降级
 * - 消息编辑/重新提交（参考 LibreChat）
 * - 会话列表侧边栏
 */

const AI_PERSONAS = [
  { id: 'default', name: '通用助手', emoji: '🤖', systemPrompt: '你是一个专业的AI助手，擅长内容创作和运营。请用中文回答。' },
  { id: 'copywriter', name: '文案专家', emoji: '✍️', systemPrompt: '你是一位资深文案专家，擅长撰写各类营销文案、广告语和品牌故事。语言精炼有力，富有感染力。请用中文回答。' },
  { id: 'marketer', name: '营销顾问', emoji: '📊', systemPrompt: '你是一位经验丰富的营销顾问，精通数字营销策略、用户增长和数据分析。回答专业且具有实操性。请用中文回答。' },
  { id: 'translator', name: '翻译专家', emoji: '🌍', systemPrompt: '你是一位专业翻译专家，精通中英日韩等多语言互译。翻译准确流畅，符合目标语言的表达习惯。请用中文回答。' },
  { id: 'tutor', name: '学习导师', emoji: '📚', systemPrompt: '你是一位耐心的学习导师，擅长用通俗易懂的方式解释复杂概念，善于举例说明。请用中文回答。' },
  { id: 'coder', name: '编程助手', emoji: '💻', systemPrompt: '你是一位全栈编程助手，精通 JavaScript/TypeScript/Python/Go 等主流语言，擅长代码审查和架构设计。请用中文回答。' },
];

const PRESET_PROMPTS = [
  { icon: '✍️', text: '帮我写一篇产品介绍' },
  { icon: '🔍', text: '优化这段文案的SEO' },
  { icon: '🌐', text: '将内容翻译成英文' },
  { icon: '📱', text: '生成小红书种草文案' },
  { icon: '📧', text: '写一封商务邮件' },
  { icon: '💡', text: '帮我头脑风暴创意' },
];

interface ChatInterfaceProps {
  systemPrompt?: string;
  title?: string;
  placeholder?: string;
  /** 外部传入的初始消息，变化时自动发送 */
  externalMessage?: string;
}

export default function ChatInterface({
  systemPrompt: _systemPrompt,
  title = 'AI 对话',
  placeholder = '输入你的问题，按 Enter 发送...',
  externalMessage,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editingMsgIdx, setEditingMsgIdx] = useState<number | null>(null);
  const [editContent, setEditContent] = useState('');
  const [activePersona, setActivePersona] = useState(AI_PERSONAS[0]);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [feedback, setFeedback] = useState<Record<number, 'up' | 'down'>>({});
  const [images, setImages] = useState<string[]>([]);
  const [customRoles, setCustomRoles] = useState<Array<{ id: string; name: string; systemPrompt: string }>>([]);
  const [showCustomRoleForm, setShowCustomRoleForm] = useState(false);
  const [customRoleName, setCustomRoleName] = useState('');
  const [customRolePrompt, setCustomRolePrompt] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const personaRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { addWordsGenerated, incrementActions } = useAppStore();

  const {
    sessions,
    activeSessionId,
    createSession,
    deleteSession,
    setActiveSession,
    renameSession,
    clearAllSessions,
    addMessage,
    updateLastMessage,
    getActiveSession,
  } = useChatStore();

  const activeSession = getActiveSession();
  const messages = activeSession?.messages || [];

  // 自动滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 监听外部消息，自动发送
  useEffect(() => {
    if (externalMessage && externalMessage.trim() && !loading) {
      sendMessage(externalMessage.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalMessage]);

  // 自动调整 textarea 高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 150)}px`;
    }
  }, [input]);

  // 点击外部关闭 persona 下拉
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (personaRef.current && !personaRef.current.contains(e.target as Node)) {
        setPersonaOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // 确保有活跃会话
  useEffect(() => {
    if (!activeSessionId) {
      createSession(activePersona.systemPrompt);
    }
  }, [activeSessionId, activePersona.systemPrompt, createSession]);

  const sendMessage = useCallback(
    async (content: string) => {
      if ((!content.trim() && images.length === 0) || loading) return;
      // 拼接图片信息
      let finalContent = content.trim();
      if (images.length > 0) {
        const imagePrefix = `[图片 x${images.length}]\n`;
        finalContent = imagePrefix + finalContent;
      }
      const sessionId = activeSessionId || createSession(activePersona.systemPrompt);
      addMessage(sessionId, 'user', finalContent);
      setInput('');
      setImages([]);
      setLoading(true);
      incrementActions();

      const currentMessages = useChatStore.getState().sessions.find(s => s.id === sessionId)?.messages || [];

      try {
        const streamResp = await chatWithAiStream({
          messages: currentMessages,
          systemPrompt: activePersona.systemPrompt,
        });

        if (streamResp.success && streamResp.stream) {
          const reader = streamResp.stream.getReader();
          let accumulated = '';
          addMessage(sessionId, 'assistant', '');
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              accumulated += value;
              updateLastMessage(sessionId, accumulated);
            }
            addWordsGenerated(accumulated.length);
          } catch {
            const fallback = await chatWithAi({ messages: currentMessages, systemPrompt: activePersona.systemPrompt });
            if (fallback.success && fallback.result) {
              updateLastMessage(sessionId, fallback.result);
              addWordsGenerated(fallback.result.length);
            }
          }
        } else {
          const fallback = await chatWithAi({ messages: currentMessages, systemPrompt: activePersona.systemPrompt });
          if (fallback.success && fallback.result) {
            addMessage(sessionId, 'assistant', fallback.result);
            addWordsGenerated(fallback.result.length);
          }
        }
      } catch {
        addMessage(sessionId, 'assistant', '抱歉，发生了错误，请稍后重试。');
      } finally {
        setLoading(false);
      }
    },
    [loading, activeSessionId, activePersona.systemPrompt, createSession, addMessage, updateLastMessage, addWordsGenerated, incrementActions]
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

  const handleNewChat = useCallback(() => {
    createSession(activePersona.systemPrompt);
    setInput('');
  }, [createSession, activePersona.systemPrompt]);

  const handleResend = useCallback(
    async (msgIdx: number) => {
      if (loading || !activeSessionId) return;
      // 删除从 msgIdx 开始的所有消息
      const store = useChatStore.getState();
      const session = store.sessions.find(s => s.id === activeSessionId);
      if (!session) return;
      const msgs = session.messages.slice(0, msgIdx);
      useChatStore.setState({
        sessions: store.sessions.map(s =>
          s.id === activeSessionId ? { ...s, messages: msgs } : s
        ),
      });
      // 重新发送
      const lastUserMsg = msgs.filter(m => m.role === 'user').pop();
      if (lastUserMsg) {
        setLoading(true);
        incrementActions();
        try {
          const streamResp = await chatWithAiStream({ messages: msgs, systemPrompt: activePersona.systemPrompt });
          if (streamResp.success && streamResp.stream) {
            const reader = streamResp.stream.getReader();
            let accumulated = '';
            addMessage(activeSessionId, 'assistant', '');
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                accumulated += value;
                updateLastMessage(activeSessionId, accumulated);
              }
              addWordsGenerated(accumulated.length);
            } catch { /* fallback */ }
          }
        } catch { /* error */ }
        finally { setLoading(false); }
      }
    },
    [loading, activeSessionId, activePersona.systemPrompt, addMessage, updateLastMessage, addWordsGenerated, incrementActions]
  );

  const handleEditMessage = useCallback(
    (msgIdx: number) => {
      const msg = messages[msgIdx];
      if (msg?.role === 'user') {
        setEditingMsgIdx(msgIdx);
        setEditContent(msg.content);
      }
    },
    [messages]
  );

  const handleSaveEdit = useCallback(
    (msgIdx: number) => {
      if (!editContent.trim() || !activeSessionId) return;
      const store = useChatStore.getState();
      const session = store.sessions.find(s => s.id === activeSessionId);
      if (!session) return;
      // 截断到编辑位置，更新用户消息
      const msgs = session.messages.slice(0, msgIdx);
      msgs.push({ role: 'user', content: editContent.trim() });
      useChatStore.setState({
        sessions: store.sessions.map(s =>
          s.id === activeSessionId ? { ...s, messages: msgs } : s
        ),
      });
      setEditingMsgIdx(null);
      setEditContent('');
      // 重新生成
      handleResend(msgIdx);
    },
    [editContent, activeSessionId, handleResend]
  );

  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const startRename = (id: string, currentTitle: string) => {
    setRenamingId(id);
    setRenameValue(currentTitle);
  };

  const saveRename = () => {
    if (renamingId && renameValue.trim()) {
      renameSession(renamingId, renameValue.trim());
    }
    setRenamingId(null);
  };

  const handleRegenerate = useCallback(
    async (msgIdx: number) => {
      if (loading || !activeSessionId) return;
      const store = useChatStore.getState();
      const session = store.sessions.find(s => s.id === activeSessionId);
      if (!session) return;
      // Remove the last assistant message
      const msgs = session.messages.slice(0, msgIdx);
      useChatStore.setState({
        sessions: store.sessions.map(s =>
          s.id === activeSessionId ? { ...s, messages: msgs } : s
        ),
      });
      // Re-send the last user message
      const lastUserMsg = msgs.filter(m => m.role === 'user').pop();
      if (lastUserMsg) {
        setLoading(true);
        incrementActions();
        try {
          const streamResp = await chatWithAiStream({ messages: msgs, systemPrompt: activePersona.systemPrompt });
          if (streamResp.success && streamResp.stream) {
            const reader = streamResp.stream.getReader();
            let accumulated = '';
            addMessage(activeSessionId, 'assistant', '');
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                accumulated += value;
                updateLastMessage(activeSessionId, accumulated);
              }
              addWordsGenerated(accumulated.length);
            } catch { /* fallback */ }
          } else {
            const fallback = await chatWithAi({ messages: msgs, systemPrompt: activePersona.systemPrompt });
            if (fallback.success && fallback.result) {
              addMessage(activeSessionId, 'assistant', fallback.result);
              addWordsGenerated(fallback.result.length);
            }
          }
        } catch {
          addMessage(activeSessionId, 'assistant', '抱歉，发生了错误，请稍后重试。');
        } finally {
          setLoading(false);
        }
      }
    },
    [loading, activeSessionId, activePersona.systemPrompt, addMessage, updateLastMessage, addWordsGenerated, incrementActions]
  );

  const handleToggleFeedback = useCallback((msgIdx: number, type: 'up' | 'down') => {
    setFeedback(prev => {
      if (prev[msgIdx] === type) {
        const next = { ...prev };
        delete next[msgIdx];
        return next;
      }
      return { ...prev, [msgIdx]: type };
    });
  }, []);

  // 图片上传处理
  const handleImageUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setImages(prev => [...prev, reader.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
    // 重置 input 以便重复选择同一文件
    e.target.value = '';
  }, []);

  const removeImage = useCallback((idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  }, []);

  // 自定义角色 - 从 localStorage 加载
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ai-chat-custom-roles');
      if (saved) {
        setCustomRoles(JSON.parse(saved));
      }
    } catch { /* ignore */ }
  }, []);

  const saveCustomRoles = useCallback((roles: Array<{ id: string; name: string; systemPrompt: string }>) => {
    setCustomRoles(roles);
    localStorage.setItem('ai-chat-custom-roles', JSON.stringify(roles));
  }, []);

  const handleCreateCustomRole = useCallback(() => {
    if (!customRoleName.trim() || !customRolePrompt.trim()) return;
    const newRole = {
      id: `custom-${Date.now()}`,
      name: customRoleName.trim(),
      systemPrompt: customRolePrompt.trim(),
    };
    saveCustomRoles([...customRoles, newRole]);
    setCustomRoleName('');
    setCustomRolePrompt('');
    setShowCustomRoleForm(false);
  }, [customRoleName, customRolePrompt, customRoles, saveCustomRoles]);

  const handleDeleteCustomRole = useCallback((roleId: string) => {
    saveCustomRoles(customRoles.filter(r => r.id !== roleId));
    if (activePersona.id === roleId) {
      setActivePersona(AI_PERSONAS[0]);
    }
  }, [customRoles, saveCustomRoles, activePersona.id]);

  const handleExportConversation = useCallback(() => {
    if (!activeSession || messages.length === 0) return;
    const md = messages.map(msg => {
      const role = msg.role === 'user' ? '用户' : 'AI助手';
      return `## ${role}\n${msg.content}`;
    }).join('\n\n');
    const content = `# ${activeSession.title}\n\n${md}\n`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeSession.title}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [activeSession, messages]);

  return (
    <div className="flex h-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
      {/* 会话列表侧边栏 */}
      {sidebarOpen && (
        <div className="w-64 border-r border-gray-100 dark:border-gray-700 flex flex-col bg-gray-50 dark:bg-gray-850 shrink-0 animate-slide-in-right">
          <div className="p-3 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <button
              onClick={handleNewChat}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              新建对话
            </button>
            <button
              onClick={handleExportConversation}
              className="shrink-0 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="导出对话"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer transition-colors ${
                  session.id === activeSessionId
                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
                onClick={() => setActiveSession(session.id)}
              >
                {renamingId === session.id ? (
                  <input
                    type="text"
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onBlur={saveRename}
                    onKeyDown={(e) => e.key === 'Enter' && saveRename()}
                    className="flex-1 px-1 py-0.5 text-sm bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded"
                    autoFocus
                  />
                ) : (
                  <>
                    <span className="flex-1 truncate">{session.title}</span>
                    <div className="hidden group-hover:flex items-center gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); startRename(session.id, session.title); }}
                        className="p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        title="重命名"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSession(session.id); }}
                        className="p-0.5 text-gray-400 hover:text-red-500"
                        title="删除"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          {sessions.length > 0 && (
            <div className="p-3 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={clearAllSessions}
                className="w-full text-xs text-gray-400 hover:text-red-500 transition-colors text-center"
              >
                清空所有对话
              </button>
            </div>
          )}
        </div>
      )}

      {/* 主聊天区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="会话列表"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
              </svg>
            </button>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h3>
            {activeSession && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                {messages.length} 条消息
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {/* AI 角色选择器 */}
            <div className="relative" ref={personaRef}>
              <button
                onClick={() => setPersonaOpen(!personaOpen)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <span>{activePersona.emoji}</span>
                <span className="max-w-[80px] truncate">{activePersona.name}</span>
                <svg
                  className={`w-3.5 h-3.5 text-gray-400 transition-transform ${personaOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                </svg>
              </button>
              {personaOpen && (
                <div className="absolute right-0 top-full mt-1 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-lg animate-slide-down z-50 overflow-hidden">
                  <div className="p-2 border-b border-gray-100 dark:border-gray-700">
                    <p className="text-xs font-medium text-gray-400 dark:text-gray-500 px-2">选择 AI 角色</p>
                  </div>
                  <div className="p-1 max-h-80 overflow-y-auto">
                    {AI_PERSONAS.map((persona) => (
                      <button
                        key={persona.id}
                        onClick={() => {
                          setActivePersona(persona);
                          setPersonaOpen(false);
                          setShowCustomRoleForm(false);
                          createSession(persona.systemPrompt);
                          setInput('');
                        }}
                        className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                          activePersona.id === persona.id
                            ? 'bg-primary-50 dark:bg-primary-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <span className="text-lg mt-0.5 shrink-0">{persona.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">{persona.name}</span>
                            {activePersona.id === persona.id && (
                              <svg className="w-4 h-4 text-primary-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{persona.systemPrompt}</p>
                        </div>
                      </button>
                    ))}

                    {/* 自定义角色 */}
                    {customRoles.length > 0 && (
                      <div className="border-t border-gray-100 dark:border-gray-700 my-1 mx-2" />
                    )}
                    {customRoles.map((role) => (
                      <div
                        key={role.id}
                        className={`group flex items-start gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          activePersona.id === role.id
                            ? 'bg-primary-50 dark:bg-primary-900/20'
                            : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'
                        }`}
                      >
                        <button
                          onClick={() => {
                            const personaObj = { id: role.id, name: role.name, emoji: '✨', systemPrompt: role.systemPrompt };
                            setActivePersona(personaObj);
                            setPersonaOpen(false);
                            setShowCustomRoleForm(false);
                            createSession(role.systemPrompt);
                            setInput('');
                          }}
                          className="flex-1 flex items-start gap-3 text-left"
                        >
                          <span className="text-lg mt-0.5 shrink-0">✨</span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 dark:text-white">{role.name}</span>
                              {activePersona.id === role.id && (
                                <svg className="w-4 h-4 text-primary-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                                </svg>
                              )}
                            </div>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{role.systemPrompt}</p>
                          </div>
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteCustomRole(role.id); }}
                          className="shrink-0 p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                          title="删除角色"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}

                    {/* 自定义角色按钮 */}
                    <div className="border-t border-gray-100 dark:border-gray-700 my-1 mx-2" />
                    <button
                      onClick={() => setShowCustomRoleForm(!showCustomRoleForm)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-sm text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/20 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      自定义角色
                    </button>
                    {showCustomRoleForm && (
                      <div className="px-3 py-2 space-y-2">
                        <input
                          type="text"
                          value={customRoleName}
                          onChange={(e) => setCustomRoleName(e.target.value)}
                          placeholder="角色名称"
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <textarea
                          value={customRolePrompt}
                          onChange={(e) => setCustomRolePrompt(e.target.value)}
                          placeholder="系统提示词（描述角色的行为和能力）"
                          rows={3}
                          className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 resize-none focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={handleCreateCustomRole}
                            disabled={!customRoleName.trim() || !customRolePrompt.trim()}
                            className="flex-1 px-3 py-1.5 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-40 transition-colors"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => { setShowCustomRoleForm(false); setCustomRoleName(''); setCustomRolePrompt(''); }}
                            className="px-3 py-1.5 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                          >
                            取消
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={handleNewChat}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="新建对话"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
        </div>

        {/* 消息列表 */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
              <div className="w-16 h-16 bg-gradient-to-br from-primary-100 to-purple-100 dark:from-primary-900/30 dark:to-purple-900/30 rounded-2xl flex items-center justify-center">
                <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 01-.825-.242m9.345-8.334a2.126 2.126 0 00-.476-.095 48.64 48.64 0 00-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0011.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155" />
                </svg>
              </div>
              <p className="text-sm">开始一段新对话</p>
              <p className="text-xs text-gray-300 dark:text-gray-600">输入你的问题，AI 将为你提供专业回答</p>
              <div className="flex gap-2 overflow-x-auto pb-2 max-w-md">
                {PRESET_PROMPTS.map((prompt) => (
                  <button
                    key={prompt.text}
                    onClick={() => setInput(prompt.text)}
                    className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-full transition-colors"
                  >
                    <span>{prompt.icon}</span>
                    <span>{prompt.text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 animate-fade-in ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                  </svg>
                </div>
              )}
              <div className={`max-w-[80%] ${msg.role === 'user' ? 'order-first' : ''}`}>
                {editingMsgIdx === i ? (
                  <div className="space-y-2">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 resize-none"
                      rows={2}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(i)} className="px-3 py-1 text-xs bg-primary-600 text-white rounded-lg hover:bg-primary-700">保存并重新发送</button>
                      <button onClick={() => setEditingMsgIdx(null)} className="px-3 py-1 text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">取消</button>
                    </div>
                  </div>
                ) : (
                  <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white rounded-tr-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-md'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <MarkdownRenderer content={msg.content} className="prose-sm" />
                    ) : (
                      <span className="whitespace-pre-wrap">{msg.content}</span>
                    )}
                  </div>
                )}
                {/* 操作按钮 */}
                {msg.role === 'user' && editingMsgIdx !== i && (
                  <div className="flex items-center gap-1 mt-1 opacity-0 hover:opacity-100 transition-opacity">
                    <button onClick={() => handleEditMessage(i)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                      编辑
                    </button>
                    {msg.role === 'user' && i === messages.length - 1 && !loading && (
                      <button onClick={() => handleResend(i)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                        重新发送
                      </button>
                    )}
                  </div>
                )}
                {msg.role === 'assistant' && (
                  <div className="flex items-center gap-1 mt-1 opacity-0 hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { navigator.clipboard.writeText(msg.content); }}
                      className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                      复制
                    </button>
                    {i === messages.length - 1 && !loading && (
                      <button
                        onClick={() => handleRegenerate(i)}
                        className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 px-1.5 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-0.5"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                        </svg>
                        重新生成
                      </button>
                    )}
                    <button
                      onClick={() => handleToggleFeedback(i, 'up')}
                      className={`p-0.5 rounded transition-colors ${feedback[i] === 'up' ? 'text-green-500' : 'text-gray-400 hover:text-green-500'}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.25c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 0 1 2.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 0 0 .322-1.672V3a.75.75 0 0 1 .75-.75 2.25 2.25 0 0 1 2.25 2.25c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282m0 0h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 0 1-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 0 0-1.423-.23H5.904m7.598-4.022A8.25 8.25 0 0 0 8.464 4.92" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleToggleFeedback(i, 'down')}
                      className={`p-0.5 rounded transition-colors ${feedback[i] === 'down' ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.367 13.75c-.806 0-1.533.446-2.031 1.08a9.041 9.041 0 0 1-2.861 2.4c-.723.384-1.35.956-1.653 1.715a4.498 4.498 0 0 0-.322 1.672V21a.75.75 0 0 1-.75.75 2.25 2.25 0 0 1-2.25-2.25c0-1.152.26-2.243.723-3.218.266-.558-.107-1.282-.725-1.282m0 0H5.904m7.598 4.022A8.25 8.25 0 0 1 15.536 19.08" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && messages[messages.length - 1]?.role !== 'assistant' && (
            <div className="flex gap-3 animate-fade-in">
              <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center">
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
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* 输入区域 */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 shrink-0">
          {/* 图片缩略图预览 */}
          {images.length > 0 && (
            <div className="flex gap-2 mb-2 flex-wrap">
              {images.map((img, idx) => (
                <div key={idx} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                  <img src={img} alt={`上传图片 ${idx + 1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => removeImage(idx)}
                    className="absolute top-0 right-0 w-5 h-5 bg-black/50 text-white rounded-bl-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-xs leading-none"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            {/* 图片上传按钮 */}
            <input
              type="file"
              ref={imageInputRef}
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
            <button
              onClick={() => imageInputRef.current?.click()}
              className="shrink-0 w-10 h-10 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl flex items-center justify-center transition-colors"
              title="上传图片"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13" />
              </svg>
            </button>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-200 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all placeholder:text-gray-400 bg-gray-50 dark:bg-gray-700"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={(!input.trim() && images.length === 0) || loading}
              className="shrink-0 w-10 h-10 bg-primary-600 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-40 hover:bg-primary-700 hover:shadow-md"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
              </svg>
            </button>
          </div>
          <p className="mt-1.5 text-xs text-gray-400 dark:text-gray-500 text-center">
            按 Enter 发送，Shift + Enter 换行
          </p>
        </div>
      </div>
    </div>
  );
}
