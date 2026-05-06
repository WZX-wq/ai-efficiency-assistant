import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../i18n';
import { chatWithAiStream } from '../../services/aiChat';
import useCustomerServiceStore, {
  Channel,
  ConversationStatus,
  Priority,
  CustomerConversation,
  QuickReply,
  Sentiment,
} from '../../store/useCustomerServiceStore';

// Icons
const Icons = {
  web: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  wechat: () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.047c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.27-.027-.407-.032zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.969-.982z"/>
    </svg>
  ),
  app: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  email: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  search: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  ),
  send: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
    </svg>
  ),
  more: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
    </svg>
  ),
  close: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  plus: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  settings: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  ai: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  tag: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  ),
  note: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
    </svg>
  ),
  robot: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  check: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  chevronDown: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  ),
  sparkles: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  emojiHappy: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  emojiNeutral: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14h8M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  emojiSad: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  translate: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
    </svg>
  ),
  clock: () => (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  users: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  message: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
    </svg>
  ),
  thumbUp: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
    </svg>
  ),
  checkCircle: () => (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

// Channel display config
const channelConfig: Record<Channel, { label: string; icon: React.FC; color: string }> = {
  web: { label: 'customerService.channels.web', icon: Icons.web, color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  wechat: { label: 'customerService.channels.wechat', icon: Icons.wechat, color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  app: { label: 'customerService.channels.app', icon: Icons.app, color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  email: { label: 'customerService.channels.email', icon: Icons.email, color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' },
};

// Priority display config
const priorityConfig: Record<Priority, { label: string; color: string; bgColor: string }> = {
  urgent: { label: 'customerService.priorities.urgent', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30' },
  high: { label: 'customerService.priorities.high', color: 'text-orange-700 dark:text-orange-400', bgColor: 'bg-orange-100 dark:bg-orange-900/30' },
  medium: { label: 'customerService.priorities.medium', color: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  low: { label: 'customerService.priorities.low', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
};

// Status display config
const statusConfig: Record<ConversationStatus, { color: string; label: string }> = {
  active: { color: 'bg-green-500', label: 'customerService.active' },
  waiting: { color: 'bg-yellow-500', label: 'customerService.waiting' },
  closed: { color: 'bg-gray-400', label: 'customerService.closed' },
};

// Sentiment display config
const sentimentConfig: Record<Sentiment, { icon: React.FC; label: string; color: string }> = {
  positive: { icon: Icons.emojiHappy, label: 'customerService.positive', color: 'text-green-600 dark:text-green-400' },
  neutral: { icon: Icons.emojiNeutral, label: 'customerService.neutral', color: 'text-yellow-600 dark:text-yellow-400' },
  negative: { icon: Icons.emojiSad, label: 'customerService.negative', color: 'text-red-600 dark:text-red-400' },
};

// Format time
const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return '刚刚';
  if (minutes < 60) return `${minutes}分钟前`;
  if (hours < 24) return `${hours}小时前`;
  if (days < 7) return `${days}天前`;
  return date.toLocaleDateString('zh-CN');
};

// Typing indicator component
const TypingIndicator = () => (
  <div className="flex items-center gap-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-tl-sm w-fit">
    <motion.div
      className="w-2 h-2 bg-gray-400 rounded-full"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
    />
    <motion.div
      className="w-2 h-2 bg-gray-400 rounded-full"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
    />
    <motion.div
      className="w-2 h-2 bg-gray-400 rounded-full"
      animate={{ scale: [1, 1.2, 1] }}
      transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
    />
  </div>
);

// Stats card component
const StatsCard = ({ icon: Icon, label, value, trend, trendUp }: { icon: React.FC; label: string; value: string | number; trend?: string; trendUp?: boolean }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700"
  >
    <div className="flex items-start justify-between">
      <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
        <Icon />
      </div>
      {trend && (
        <span className={`text-xs font-medium ${trendUp ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
          {trend}
        </span>
      )}
    </div>
    <div className="mt-3">
      <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
    </div>
  </motion.div>
);

export default function AiCustomerService() {
  const { t } = useTranslation();
  const {
    conversations,
    quickReplies,
    aiSettings,
    stats,
    activeConversationId,
    setActiveConversation,
    createConversation,
    closeConversation,
    reopenConversation,
    addMessage,
    sendAiReply,
    addTag,
    removeTag,
    updateNotes,
    updateAiSettings,
    addQuickReply,
    deleteQuickReply,
  } = useCustomerServiceStore();

  const [filter, setFilter] = useState<ConversationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [messageInput, setMessageInput] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [newTag, setNewTag] = useState('');
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [quickReplySearch, setQuickReplySearch] = useState('');
  const [showAddQuickReply, setShowAddQuickReply] = useState(false);
  const [newQuickReply, setNewQuickReply] = useState({ title: '', content: '', category: '常用' });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = conversations.find((c) => c.id === activeConversationId) || null;

  // Filter conversations
  const filteredConversations = conversations.filter((conv) => {
    if (filter !== 'all' && conv.status !== filter) return false;
    if (searchQuery) {
      const matchesSearch =
        conv.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        conv.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()));
      if (!matchesSearch) return false;
    }
    return true;
  });

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversation?.messages, isAiTyping]);

  // Send message
  const handleSendMessage = async () => {
    if (!messageInput.trim() || !activeConversation) return;

    const content = messageInput.trim();
    setMessageInput('');

    // Add user message
    addMessage(activeConversation.id, { role: 'agent', content });

    // If AI assist is enabled, generate AI response
    if (aiSettings.enabled) {
      setIsAiTyping(true);
      try {
        const messages: { role: 'user' | 'assistant'; content: string }[] = activeConversation.messages.slice(-10).map((m) => ({
          role: m.role === 'customer' ? 'user' : 'assistant',
          content: m.content,
        }));

        const response = await chatWithAiStream({
          messages: [...messages, { role: 'user', content }],
          systemPrompt: '你是AI客服助手，请提供专业、友好、简洁的回复。',
        });

        if (response.success && response.stream) {
          const reader = response.stream.getReader();
          let aiContent = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            aiContent += value;
          }

          if (aiContent) {
            sendAiReply(activeConversation.id, aiContent);
          }
        }
      } catch (error) {
        console.error('AI response error:', error);
      } finally {
        setIsAiTyping(false);
      }
    }
  };

  // Handle key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Insert quick reply
  const insertQuickReply = (reply: QuickReply) => {
    setMessageInput(reply.content);
    setShowQuickReplies(false);
    textareaRef.current?.focus();
  };

  // Handle add quick reply
  const handleAddQuickReply = () => {
    if (newQuickReply.title && newQuickReply.content) {
      addQuickReply(newQuickReply);
      setNewQuickReply({ title: '', content: '', category: '常用' });
      setShowAddQuickReply(false);
    }
  };

  // Handle add tag
  const handleAddTag = () => {
    if (newTag.trim() && activeConversation) {
      addTag(activeConversation.id, newTag.trim());
      setNewTag('');
    }
  };

  // Get AI suggested replies
  const getSuggestedReplies = (conv: CustomerConversation): string[] => {
    const lastMessage = conv.messages[conv.messages.length - 1];
    if (!lastMessage || lastMessage.role !== 'customer') return [];

    const suggestions: Record<string, string[]> = {
      '定价': ['我们的定价方案很灵活，免费版每月50次AI调用。', '专业版每月1000次，团队版无限次使用。'],
      '价格': ['我们有免费版、专业版和团队版三个方案。', '现在升级专业版还有优惠活动哦！'],
      '功能': ['AI效率助手提供28+核心功能，覆盖内容创作全流程。', '包括智能改写、文案生成、SEO优化等功能。'],
      '退款': ['我们提供7天无理由退款保障。', '请提供您的订单号，我来帮您处理退款申请。'],
      '登录': ['请尝试使用"忘记密码"功能重置密码。', '或者检查是否开启了大小写锁定。'],
      '谢谢': ['不客气！很高兴能帮到您。', '感谢您的认可，我们会继续努力！'],
    };

    for (const [key, replies] of Object.entries(suggestions)) {
      if (lastMessage.content.includes(key)) return replies;
    }

    return ['感谢您的咨询，我来为您解答。', '请问还有其他问题需要帮忙吗？'];
  };

  const suggestedReplies = activeConversation ? getSuggestedReplies(activeConversation) : [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 sticky top-0 z-20">
        <div className="px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                <span className="bg-gradient-to-r from-blue-500 to-indigo-600 bg-clip-text text-transparent">
                  {t('customerService.title')}
                </span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('customerService.dashboard')}</p>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowAiSettings(!showAiSettings)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  aiSettings.enabled
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Icons.ai />
                {t('customerService.aiAssist')}
                {aiSettings.enabled && <Icons.check />}
              </button>
              <button
                onClick={() => createConversation({ customerName: '新用户', channel: 'web' })}
                className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg text-sm font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors"
              >
                <Icons.plus />
                {t('customerService.newConversation')}
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
            <StatsCard icon={Icons.message} label={t('customerService.stats.total')} value={stats.totalConversations} trend="+12%" trendUp />
            <StatsCard icon={Icons.users} label={t('customerService.stats.active')} value={stats.activeCount} trend="+5%" trendUp />
            <StatsCard icon={Icons.clock} label={t('customerService.stats.avgResponse')} value={`${stats.avgResponseTime}s`} trend="-8%" trendUp />
            <StatsCard icon={Icons.thumbUp} label={t('customerService.stats.satisfaction')} value={`${stats.satisfactionRate}%`} trend="+3%" trendUp />
            <StatsCard icon={Icons.checkCircle} label={t('customerService.stats.resolved')} value={stats.resolvedToday} trend="+15%" trendUp />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-220px)]">
        {/* Left Sidebar - Conversation List */}
        <aside className="w-80 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col">
          {/* Search and Filter */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('customerService.search')}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 dark:text-white"
              />
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Icons.search />
              </div>
            </div>
            <div className="flex gap-2 mt-3">
              {(['all', 'active', 'waiting', 'closed'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    filter === f
                      ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {t(`customerService.${f}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Conversation List */}
          <div className="flex-1 overflow-y-auto">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Icons.message />
                <p className="mt-2 text-sm">{t('customerService.noConversations')}</p>
              </div>
            ) : (
              filteredConversations.map((conv) => {
                const ChannelIcon = channelConfig[conv.channel].icon;
                const lastMessage = conv.messages[conv.messages.length - 1];
                return (
                  <motion.button
                    key={conv.id}
                    onClick={() => setActiveConversation(conv.id)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={`w-full p-4 text-left border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                      activeConversationId === conv.id ? 'bg-blue-50 dark:bg-blue-900/20 border-l-4 border-l-blue-500' : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative">
                        <img
                          src={conv.customerAvatar}
                          alt={conv.customerName}
                          className="w-10 h-10 rounded-full bg-gray-200"
                        />
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 ${statusConfig[conv.status].color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium text-gray-900 dark:text-white truncate">{conv.customerName}</h3>
                          <span className="text-xs text-gray-400">{lastMessage ? formatTime(lastMessage.timestamp) : ''}</span>
                        </div>
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">
                          {lastMessage ? lastMessage.content : t('customerService.noConversations')}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${channelConfig[conv.channel].color}`}>
                            <ChannelIcon />
                          </span>
                          <span className={`px-2 py-0.5 rounded text-xs ${priorityConfig[conv.priority].bgColor} ${priorityConfig[conv.priority].color}`}>
                            {t(priorityConfig[conv.priority].label)}
                          </span>
                          {conv.unreadCount ? (
                            <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                              {conv.unreadCount}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </motion.button>
                );
              })
            )}
          </div>
        </aside>

        {/* Main Chat Area */}
        <main className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-950">
          {activeConversation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img
                      src={activeConversation.customerAvatar}
                      alt={activeConversation.customerName}
                      className="w-10 h-10 rounded-full bg-gray-200"
                    />
                    <div>
                      <h2 className="font-semibold text-gray-900 dark:text-white">{activeConversation.customerName}</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        {(() => {
                          const ChannelIcon = channelConfig[activeConversation.channel].icon;
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${channelConfig[activeConversation.channel].color}`}>
                              <ChannelIcon />
                              {t(channelConfig[activeConversation.channel].label)}
                            </span>
                          );
                        })()}
                        <span className={`w-2 h-2 rounded-full ${statusConfig[activeConversation.status].color}`} />
                        <span className="text-xs text-gray-500">{t(statusConfig[activeConversation.status].label)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Priority Selector */}
                    <select
                      value={activeConversation.priority}
                      onChange={(e) => useCustomerServiceStore.getState().updateConversation(activeConversation.id, { priority: e.target.value as Priority })}
                      className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-sm dark:text-white focus:ring-2 focus:ring-blue-500"
                    >
                      {(['urgent', 'high', 'medium', 'low'] as Priority[]).map((p) => (
                        <option key={p} value={p}>{t(priorityConfig[p].label)}</option>
                      ))}
                    </select>
                    {/* Status Toggle */}
                    {activeConversation.status === 'closed' ? (
                      <button
                        onClick={() => reopenConversation(activeConversation.id)}
                        className="px-3 py-1.5 bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-lg text-sm font-medium hover:bg-green-200 transition-colors"
                      >
                        {t('customerService.reopen')}
                      </button>
                    ) : (
                      <button
                        onClick={() => closeConversation(activeConversation.id)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                      >
                        {t('customerService.closeConversation')}
                      </button>
                    )}
                    {/* Toggle Right Panel */}
                    <button
                      onClick={() => setShowRightPanel(!showRightPanel)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                      <Icons.settings />
                    </button>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {activeConversation.messages.map((message, index) => {
                  const isCustomer = message.role === 'customer';
                  const showAvatar = index === 0 || activeConversation.messages[index - 1].role !== message.role;

                  return (
                    <motion.div
                      key={message.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex ${isCustomer ? 'justify-start' : 'justify-end'}`}
                    >
                      <div className={`flex items-end gap-2 max-w-[70%] ${isCustomer ? 'flex-row' : 'flex-row-reverse'}`}>
                        {showAvatar && (
                          <img
                            src={isCustomer ? activeConversation.customerAvatar : 'https://api.dicebear.com/7.x/avataaars/svg?seed=agent'}
                            alt={isCustomer ? activeConversation.customerName : 'Agent'}
                            className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0"
                          />
                        )}
                        {!showAvatar && <div className="w-8 flex-shrink-0" />}
                        <div
                          className={`px-4 py-2.5 rounded-2xl ${
                            isCustomer
                              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 rounded-tl-sm'
                              : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-tr-sm'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                          <div className={`flex items-center gap-1 mt-1 ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                            <span className={`text-xs ${isCustomer ? 'text-gray-400' : 'text-white/70'}`}>
                              {new Date(message.timestamp).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {message.aiGenerated && (
                              <span className="inline-flex items-center gap-0.5 text-xs text-white/70">
                                <Icons.robot />
                                AI
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                {isAiTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-end gap-2">
                      <img
                        src="https://api.dicebear.com/7.x/avataaars/svg?seed=agent"
                        alt="Agent"
                        className="w-8 h-8 rounded-full bg-gray-200"
                      />
                      <TypingIndicator />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* AI Suggested Replies */}
              {aiSettings.suggestedReplies && suggestedReplies.length > 0 && (
                <div className="px-6 py-2 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-100 dark:border-blue-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Icons.sparkles />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-400">{t('customerService.suggestedReply')}</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {suggestedReplies.map((reply, idx) => (
                      <button
                        key={idx}
                        onClick={() => setMessageInput(reply)}
                        className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded-lg text-sm text-blue-700 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/50 transition-colors"
                      >
                        {reply}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message Input */}
              <div className="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 p-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1 relative">
                    <textarea
                      ref={textareaRef}
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      onKeyDown={handleKeyPress}
                      placeholder={t('customerService.typeMessage')}
                      rows={1}
                      className="w-full px-4 py-3 pr-20 bg-gray-100 dark:bg-gray-800 border-0 rounded-xl resize-none focus:ring-2 focus:ring-blue-500 dark:text-white"
                      style={{ minHeight: '48px', maxHeight: '120px' }}
                    />
                    <div className="absolute right-2 bottom-2 flex items-center gap-1">
                      <button
                        onClick={() => setShowQuickReplies(!showQuickReplies)}
                        className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title={t('customerService.quickReplies')}
                      >
                        <Icons.tag />
                      </button>
                    </div>
                  </div>
                  <button
                    onClick={handleSendMessage}
                    disabled={!messageInput.trim()}
                    className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    <Icons.send />
                  </button>
                </div>

                {/* Quick Replies Panel */}
                <AnimatePresence>
                  {showQuickReplies && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-3 border-t border-gray-200 dark:border-gray-800 pt-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('customerService.quickReplies')}</span>
                        <button
                          onClick={() => setShowAddQuickReply(true)}
                          className="text-xs text-blue-600 hover:text-blue-700"
                        >
                          + {t('common.add')}
                        </button>
                      </div>
                      <input
                        type="text"
                        value={quickReplySearch}
                        onChange={(e) => setQuickReplySearch(e.target.value)}
                        placeholder="搜索快捷回复..."
                        className="w-full px-3 py-2 mb-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-sm dark:text-white"
                      />
                      <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                        {quickReplies
                          .filter((qr) => qr.title.includes(quickReplySearch) || qr.content.includes(quickReplySearch))
                          .map((qr) => (
                            <div key={qr.id} className="group relative">
                              <button
                                onClick={() => insertQuickReply(qr)}
                                className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:text-blue-700 dark:hover:text-blue-400 transition-colors"
                              >
                                {qr.title}
                              </button>
                              <button
                                onClick={() => deleteQuickReply(qr.id)}
                                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-xs"
                              >
                                ×
                              </button>
                            </div>
                          ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Icons.message />
                <p className="mt-4 text-lg">{t('customerService.noConversations')}</p>
                <p className="text-sm">{t('customerService.selectConversation')}</p>
              </div>
            </div>
          )}
        </main>

        {/* Right Panel */}
        <AnimatePresence>
          {showRightPanel && activeConversation && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              className="bg-white dark:bg-gray-900 border-l border-gray-200 dark:border-gray-800 overflow-hidden"
            >
              <div className="h-full overflow-y-auto p-6 space-y-6">
                {/* Customer Info */}
                <div className="text-center">
                  <img
                    src={activeConversation.customerAvatar}
                    alt={activeConversation.customerName}
                    className="w-20 h-20 rounded-full bg-gray-200 mx-auto"
                  />
                  <h3 className="mt-3 font-semibold text-gray-900 dark:text-white">{activeConversation.customerName}</h3>
                  <p className="text-sm text-gray-500">{t(channelConfig[activeConversation.channel].label)}</p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusConfig[activeConversation.status].color.replace('bg-', 'bg-opacity-20 bg-')} text-gray-700 dark:text-gray-300`}>
                      <span className={`w-2 h-2 rounded-full ${statusConfig[activeConversation.status].color}`} />
                      {t(statusConfig[activeConversation.status].label)}
                    </span>
                  </div>
                </div>

                {/* AI Insights */}
                {aiSettings.sentimentAnalysis && activeConversation.sentiment && (
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl">
                    <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                      <Icons.ai />
                      {t('customerService.aiInsights')}
                    </h4>
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">{t('customerService.sentiment')}</span>
                        <span className={`flex items-center gap-1 text-sm ${sentimentConfig[activeConversation.sentiment].color}`}>
                          {(() => {
                            const SentimentIcon = sentimentConfig[activeConversation.sentiment!].icon;
                            return <SentimentIcon />;
                          })()}
                          {t(sentimentConfig[activeConversation.sentiment].label)}
                        </span>
                      </div>
                      {activeConversation.topic && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600 dark:text-gray-400">{t('customerService.topic')}</span>
                          <span className="text-sm text-gray-900 dark:text-white">{activeConversation.topic}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Tags */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                    <Icons.tag />
                    {t('customerService.tags')}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {activeConversation.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg text-sm"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(activeConversation.id, tag)}
                          className="text-gray-400 hover:text-red-500"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                      placeholder={t('customerService.addTag')}
                      className="flex-1 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-sm dark:text-white"
                    />
                    <button
                      onClick={handleAddTag}
                      className="px-3 py-1.5 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-lg text-sm"
                    >
                      {t('common.add')}
                    </button>
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                    <Icons.note />
                    {t('customerService.notes')}
                  </h4>
                  <textarea
                    value={activeConversation.notes}
                    onChange={(e) => updateNotes(activeConversation.id, e.target.value)}
                    placeholder={t('customerService.notesPlaceholder')}
                    rows={4}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg text-sm dark:text-white resize-none"
                  />
                </div>

                {/* Conversation Info */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('customerService.createdAt')}</span>
                      <span className="text-gray-900 dark:text-white">{new Date(activeConversation.createdAt).toLocaleString('zh-CN')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('customerService.messageCount')}</span>
                      <span className="text-gray-900 dark:text-white">{activeConversation.messages.length}</span>
                    </div>
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* AI Settings Modal */}
      <AnimatePresence>
        {showAiSettings && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
            onClick={() => setShowAiSettings(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('customerService.aiSettings')}</h3>
                <button onClick={() => setShowAiSettings(false)} className="text-gray-400 hover:text-gray-600">
                  <Icons.close />
                </button>
              </div>
              <div className="space-y-4">
                {[
                  { key: 'enabled', label: t('customerService.aiAssist') },
                  { key: 'autoReply', label: t('customerService.autoReply') },
                  { key: 'suggestedReplies', label: t('customerService.suggestedReply') },
                  { key: 'sentimentAnalysis', label: t('customerService.sentiment') },
                  { key: 'languageDetection', label: t('customerService.languageDetect') },
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center justify-between cursor-pointer">
                    <span className="text-gray-700 dark:text-gray-300">{label}</span>
                    <button
                      onClick={() => updateAiSettings({ [key]: !aiSettings[key as keyof typeof aiSettings] })}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        aiSettings[key as keyof typeof aiSettings] ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-700'
                      }`}
                    >
                      <span
                        className={`block w-5 h-5 bg-white rounded-full shadow transition-transform ${
                          aiSettings[key as keyof typeof aiSettings] ? 'translate-x-6' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </label>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Quick Reply Modal */}
      <AnimatePresence>
        {showAddQuickReply && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center"
            onClick={() => setShowAddQuickReply(false)}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl p-6 w-full max-w-md mx-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('customerService.addQuickReply')}</h3>
                <button onClick={() => setShowAddQuickReply(false)} className="text-gray-400 hover:text-gray-600">
                  <Icons.close />
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('customerService.quickReplyTitle')}</label>
                  <input
                    type="text"
                    value={newQuickReply.title}
                    onChange={(e) => setNewQuickReply({ ...newQuickReply, title: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('customerService.quickReplyContent')}</label>
                  <textarea
                    value={newQuickReply.content}
                    onChange={(e) => setNewQuickReply({ ...newQuickReply, content: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg dark:text-white resize-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('customerService.quickReplyCategory')}</label>
                  <input
                    type="text"
                    value={newQuickReply.category}
                    onChange={(e) => setNewQuickReply({ ...newQuickReply, category: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-800 border-0 rounded-lg dark:text-white"
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddQuickReply(false)}
                    className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleAddQuickReply}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg"
                  >
                    {t('common.save')}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
