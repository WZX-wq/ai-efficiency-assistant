import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Send,
  Loader2,
  Bot,
  User,
  BookOpen,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Check,
  Tag,
  Lightbulb,
  Settings,
  X,
} from 'lucide-react';
import { customerServiceApi } from '../services/backendApi';

// ==================== Types ====================
interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  timestamp: Date;
  intent?: string;
}

interface KnowledgeItem {
  id: string;
  question: string;
  answer: string;
}

// ==================== Animation Variants ====================
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const messageVariant = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

// ==================== Toast ====================
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ToastContainer: React.FC<{ toasts: Toast[]; onRemove?: (id: string) => void }> = ({ toasts }) => (
  <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
    <AnimatePresence>
      {toasts.map((toast) => (
        <motion.div
          key={toast.id}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg backdrop-blur-xl ${
            toast.type === 'success'
              ? 'bg-green-500/90 text-white'
              : toast.type === 'error'
              ? 'bg-red-500/90 text-white'
              : 'bg-gray-800/90 text-white'
          }`}
        >
          {toast.type === 'success' && <Check className="w-4 h-4" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4" />}
          <span className="text-sm">{toast.message}</span>
        </motion.div>
      ))}
    </AnimatePresence>
  </div>
);

// ==================== Quick Replies ====================
const QUICK_REPLIES = [
  '你好，请问有什么可以帮助您的？',
  '我想了解产品价格',
  '如何申请退款？',
  '配送需要多长时间？',
  '如何联系人工客服？',
];

// ==================== Main Component ====================
const CustomerServiceBot: React.FC = () => {

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showKnowledgeBase, setShowKnowledgeBase] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Knowledge base state
  const [knowledgeItems, setKnowledgeItems] = useState<KnowledgeItem[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Toast helpers
  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Create session on mount
  useEffect(() => {
    const createSession = async () => {
      try {
        const result: any = await customerServiceApi.createSession();
        setSessionId(result.sessionId || result.id);
        setMessages([
          {
            id: 'welcome',
            role: 'bot',
            content: result.welcomeMessage || '您好！我是 AI 智能客服，请问有什么可以帮助您的？',
            timestamp: new Date(),
            intent: 'greeting',
          },
        ]);
      } catch (err: any) {
        setError('无法连接到客服服务');
        addToast('连接客服服务失败', 'error');
      }
    };
    createSession();
  }, [addToast]);

  // Load knowledge base
  useEffect(() => {
    const loadKB = async () => {
      try {
        const result: any = await customerServiceApi.getKnowledgeBase();
        setKnowledgeItems(
          (result.items || result.knowledgeBase || []).map((item: any, idx: number) => ({
            id: item.id || `kb-${idx}`,
            question: item.question,
            answer: item.answer,
          }))
        );
      } catch {
        // Knowledge base might be empty
      }
    };
    loadKB();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Send message
  const handleSend = useCallback(
    async (text?: string) => {
      const messageText = text || inputValue.trim();
      if (!messageText || !sessionId) return;

      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        content: messageText,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputValue('');
      setIsLoading(true);
      setIsTyping(true);
      setError(null);

      try {
        const result: any = await customerServiceApi.chat({
          sessionId,
          message: messageText,
        });

        const botMessage: Message = {
          id: `msg-${Date.now() + 1}`,
          role: 'bot',
          content: result.reply || result.message || result.content || '抱歉，我暂时无法回答您的问题。',
          timestamp: new Date(),
          intent: result.intent || result.intentTag,
        };

        setMessages((prev) => [...prev, botMessage]);
      } catch (err: any) {
        setError(err.message || '发送失败');
        addToast(err.message || '发送失败', 'error');
      } finally {
        setIsLoading(false);
        setIsTyping(false);
        inputRef.current?.focus();
      }
    },
    [inputValue, sessionId, addToast]
  );

  // Handle keyboard
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  // Add knowledge base item
  const handleAddKB = useCallback(async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) {
      addToast('请填写问题和答案', 'error');
      return;
    }

    try {
      await customerServiceApi.setKnowledgeBase([
        ...knowledgeItems.map((item) => ({ question: item.question, answer: item.answer })),
        { question: newQuestion.trim(), answer: newAnswer.trim() },
      ]);

      setKnowledgeItems((prev) => [
        ...prev,
        {
          id: `kb-${Date.now()}`,
          question: newQuestion.trim(),
          answer: newAnswer.trim(),
        },
      ]);
      setNewQuestion('');
      setNewAnswer('');
      addToast('知识库已更新', 'success');
    } catch (err: any) {
      addToast(err.message || '更新失败', 'error');
    }
  }, [newQuestion, newAnswer, knowledgeItems, addToast]);

  // Delete knowledge base item
  const handleDeleteKB = useCallback(
    (id: string) => {
      setKnowledgeItems((prev) => prev.filter((item) => item.id !== id));
      addToast('已删除', 'info');
    },
    [addToast]
  );

  return (
    <div className="min-h-screen bg-gray-900/95">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-xl border-b border-gray-700/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl shadow-lg shadow-green-500/20">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">智能客服</h1>
                <p className="text-sm text-gray-400">
                  {sessionId ? '会话已连接' : '正在连接...'}
                  {sessionId && (
                    <span className="ml-2 inline-flex items-center gap-1">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                      在线
                    </span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowKnowledgeBase(!showKnowledgeBase)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors ${
                showKnowledgeBase
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-gray-800/60 text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              <BookOpen className="w-4 h-4" />
              <span className="hidden sm:inline">知识库</span>
              {showKnowledgeBase ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <ChevronLeft className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-6 h-[calc(100vh-180px)]">
          {/* Chat Area */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className={`flex-1 flex flex-col bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-lg shadow-blue-500/5 overflow-hidden ${
              showKnowledgeBase ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  variants={messageVariant}
                  initial="hidden"
                  animate="visible"
                  className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center ${
                      msg.role === 'bot'
                        ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                        : 'bg-gradient-to-br from-blue-500 to-purple-600'
                    }`}
                  >
                    {msg.role === 'bot' ? (
                      <Bot className="w-4 h-4 text-white" />
                    ) : (
                      <User className="w-4 h-4 text-white" />
                    )}
                  </div>

                  {/* Message bubble */}
                  <div
                    className={`max-w-[70%] px-4 py-3 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-blue-500/20 text-white rounded-tr-md'
                        : 'bg-gray-700/60 text-gray-200 rounded-tl-md'
                    }`}
                  >
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>

                    {/* Intent tag */}
                    {msg.intent && msg.role === 'bot' && (
                      <div className="mt-2 flex items-center gap-1">
                        <Tag className="w-3 h-3 text-green-400" />
                        <span className="text-xs text-green-400">{msg.intent}</span>
                      </div>
                    )}

                    {/* Timestamp */}
                    <p className="mt-1 text-[10px] text-gray-500">
                      {msg.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex gap-3"
                >
                  <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="bg-gray-700/60 px-4 py-3 rounded-2xl rounded-tl-md">
                    <div className="flex gap-1.5">
                      <motion.span
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                      <motion.span
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                      <motion.span
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
                        className="w-2 h-2 bg-gray-400 rounded-full"
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick replies */}
            {messages.length <= 1 && (
              <div className="px-6 pb-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-xs text-gray-400">快捷回复</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_REPLIES.map((reply) => (
                    <button
                      key={reply}
                      onClick={() => handleSend(reply)}
                      className="px-3 py-1.5 bg-gray-700/50 text-gray-300 rounded-lg text-xs hover:bg-gray-600/50 transition-colors"
                    >
                      {reply}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="px-6 pb-2"
              >
                <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {error}
                </div>
              </motion.div>
            )}

            {/* Input area */}
            <div className="p-4 border-t border-gray-700/50">
              <div className="flex items-end gap-3">
                <textarea
                  ref={inputRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="输入您的问题..."
                  rows={1}
                  className="flex-1 px-4 py-3 bg-gray-900/80 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                />
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleSend()}
                  disabled={isLoading || !inputValue.trim()}
                  className="flex-shrink-0 p-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl shadow-lg shadow-green-500/20 hover:shadow-green-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>

          {/* Knowledge Base Sidebar */}
          <AnimatePresence>
            {showKnowledgeBase && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="w-full lg:w-96 flex flex-col bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-lg shadow-blue-500/5 overflow-hidden"
              >
                {/* KB Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-green-400" />
                    <h3 className="font-semibold text-white">知识库管理</h3>
                  </div>
                  <button
                    onClick={() => setShowKnowledgeBase(false)}
                    className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors lg:hidden"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Add new item */}
                <div className="p-4 border-b border-gray-700/50 space-y-3">
                  <input
                    type="text"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    placeholder="问题"
                    className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                  <textarea
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    placeholder="答案"
                    rows={2}
                    className="w-full px-3 py-2 bg-gray-900/80 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 text-sm resize-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                  />
                  <button
                    onClick={handleAddKB}
                    disabled={!newQuestion.trim() || !newAnswer.trim()}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-green-500/20 text-green-400 rounded-xl text-sm hover:bg-green-500/30 transition-colors disabled:opacity-50"
                  >
                    <Plus className="w-4 h-4" />
                    添加条目
                  </button>
                </div>

                {/* KB Items list */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {knowledgeItems.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                      <BookOpen className="w-10 h-10 mb-3 opacity-20" />
                      <p className="text-sm">知识库为空</p>
                      <p className="text-xs mt-1">添加问答对以增强客服能力</p>
                    </div>
                  ) : (
                    knowledgeItems.map((item) => (
                      <motion.div
                        key={item.id}
                        layout
                        className="bg-gray-900/60 rounded-xl border border-gray-700/50 overflow-hidden"
                      >
                        <div className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-white">{item.question}</p>
                            <button
                              onClick={() => handleDeleteKB(item.id)}
                              className="flex-shrink-0 p-1 text-gray-500 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="mt-1 text-xs text-gray-400 line-clamp-2">{item.answer}</p>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>

                {/* KB Stats */}
                <div className="p-4 border-t border-gray-700/50">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span>共 {knowledgeItems.length} 条知识</span>
                    <span className="flex items-center gap-1">
                      <Settings className="w-3 h-3" />
                      知识库配置
                    </span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default CustomerServiceBot;
