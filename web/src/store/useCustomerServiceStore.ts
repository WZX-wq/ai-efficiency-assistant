import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Channel = 'web' | 'wechat' | 'app' | 'email';
export type ConversationStatus = 'active' | 'waiting' | 'closed';
export type Priority = 'low' | 'medium' | 'high' | 'urgent';
export type MessageRole = 'customer' | 'agent' | 'ai';
export type Sentiment = 'positive' | 'neutral' | 'negative';

export interface CustomerMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: number;
  aiGenerated?: boolean;
}

export interface CustomerConversation {
  id: string;
  customerName: string;
  customerAvatar: string;
  channel: Channel;
  status: ConversationStatus;
  priority: Priority;
  messages: CustomerMessage[];
  tags: string[];
  notes: string;
  createdAt: number;
  updatedAt: number;
  unreadCount?: number;
  sentiment?: Sentiment;
  topic?: string;
}

export interface QuickReply {
  id: string;
  title: string;
  content: string;
  category: string;
}

export interface AiSettings {
  enabled: boolean;
  autoReply: boolean;
  suggestedReplies: boolean;
  sentimentAnalysis: boolean;
  languageDetection: boolean;
}

export interface CustomerServiceStats {
  totalConversations: number;
  activeCount: number;
  avgResponseTime: number;
  satisfactionRate: number;
  resolvedToday: number;
}

interface CustomerServiceStore {
  conversations: CustomerConversation[];
  quickReplies: QuickReply[];
  aiSettings: AiSettings;
  stats: CustomerServiceStats;
  activeConversationId: string | null;

  // Conversation actions
  createConversation: (data: Partial<CustomerConversation>) => string;
  updateConversation: (id: string, updates: Partial<CustomerConversation>) => void;
  closeConversation: (id: string) => void;
  reopenConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  deleteConversation: (id: string) => void;

  // Message actions
  addMessage: (conversationId: string, message: Omit<CustomerMessage, 'id' | 'timestamp'>) => void;
  sendAiReply: (conversationId: string, content: string) => void;
  markAsRead: (conversationId: string) => void;

  // Quick replies
  addQuickReply: (reply: Omit<QuickReply, 'id'>) => void;
  updateQuickReply: (id: string, updates: Partial<QuickReply>) => void;
  deleteQuickReply: (id: string) => void;

  // AI settings
  updateAiSettings: (settings: Partial<AiSettings>) => void;

  // Stats
  updateStats: (updates: Partial<CustomerServiceStats>) => void;
  recalculateStats: () => void;

  // Tags and notes
  addTag: (conversationId: string, tag: string) => void;
  removeTag: (conversationId: string, tag: string) => void;
  updateNotes: (conversationId: string, notes: string) => void;

  // Getters
  getActiveConversation: () => CustomerConversation | null;
  getConversationsByStatus: (status: ConversationStatus) => CustomerConversation[];
  getConversationsByChannel: (channel: Channel) => CustomerConversation[];
  searchConversations: (query: string) => CustomerConversation[];
}

// Generate mock conversations
const generateMockConversations = (): CustomerConversation[] => {
  const now = Date.now();
  const customers = [
    { name: '张明', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangming' },
    { name: '李雪', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lixue' },
    { name: '王浩', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wanghao' },
    { name: '刘芳', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=liufang' },
    { name: '陈伟', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chenwei' },
    { name: '赵琳', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhaolin' },
    { name: '孙磊', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=sunlei' },
    { name: '周婷', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhouting' },
    { name: '吴强', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wuqiang' },
    { name: '郑敏', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhengmin' },
  ];

  const channels: Channel[] = ['web', 'wechat', 'app', 'email'];
  const statuses: ConversationStatus[] = ['active', 'waiting', 'closed'];
  const priorities: Priority[] = ['low', 'medium', 'high', 'urgent'];
  const sentiments: Sentiment[] = ['positive', 'neutral', 'negative'];
  const topics = ['产品咨询', '技术支持', '订单问题', '账户问题', '投诉建议', '合作洽谈', '退款申请', '功能建议'];

  const sampleMessages = [
    { content: '你好，我想了解一下你们的产品定价', role: 'customer' as MessageRole },
    { content: '您好！很高兴为您服务。我们的产品有多个定价方案，从免费版到企业版都有。请问您的使用场景是什么呢？', role: 'agent' as MessageRole, aiGenerated: true },
    { content: '我是个人用户，主要是写作需求', role: 'customer' as MessageRole },
    { content: '了解了！对于个人写作需求，我推荐专业版，每月1000次AI调用，包含所有核心功能。现在还有优惠活动哦！', role: 'agent' as MessageRole, aiGenerated: true },
    { content: '我的账户登录不上了，提示密码错误', role: 'customer' as MessageRole },
    { content: '抱歉给您带来不便。请尝试使用"忘记密码"功能重置密码，或者检查是否开启了大小写锁定。', role: 'agent' as MessageRole, aiGenerated: true },
    { content: '你们支持哪些AI模型？', role: 'customer' as MessageRole },
    { content: '我们支持DeepSeek、GPT-4、Claude、GLM-4、通义千问等主流模型，您可以在设置中自由切换。', role: 'agent' as MessageRole, aiGenerated: true },
    { content: '我想申请退款', role: 'customer' as MessageRole },
    { content: '好的，我来帮您处理退款申请。请问是什么原因需要退款呢？我们会尽力帮您解决问题。', role: 'agent' as MessageRole, aiGenerated: true },
    { content: '软件很好用，帮我节省了很多时间！', role: 'customer' as MessageRole },
    { content: '非常感谢您的认可！我们会继续努力提供更好的服务。如果您有任何建议，欢迎随时告诉我们。', role: 'agent' as MessageRole, aiGenerated: true },
  ];

  return customers.map((customer, index) => {
    const channel = channels[index % channels.length];
    const status = statuses[index % statuses.length];
    const priority = priorities[index % priorities.length];
    const sentiment = sentiments[index % sentiments.length];
    const topic = topics[index % topics.length];
    const messageCount = 2 + Math.floor(Math.random() * 4);
    const messages: CustomerMessage[] = [];

    for (let i = 0; i < messageCount; i++) {
      const sample = sampleMessages[(index * 2 + i) % sampleMessages.length];
      messages.push({
        id: `msg_${index}_${i}`,
        role: sample.role,
        content: sample.content,
        timestamp: now - (messageCount - i) * 60000 * (1 + Math.floor(Math.random() * 5)),
        aiGenerated: sample.aiGenerated,
      });
    }

    return {
      id: `conv_${index}_${Date.now()}`,
      customerName: customer.name,
      customerAvatar: customer.avatar,
      channel,
      status,
      priority,
      messages,
      tags: [topic, priority === 'urgent' ? '紧急' : ''],
      notes: '',
      createdAt: now - 86400000 * Math.floor(Math.random() * 7),
      updatedAt: messages[messages.length - 1]?.timestamp || now,
      unreadCount: status === 'active' ? Math.floor(Math.random() * 3) : 0,
      sentiment,
      topic,
    };
  }).filter(conv => conv.tags[0] !== '');
};

// Default quick replies
const defaultQuickReplies: QuickReply[] = [
  { id: 'qr_1', title: '欢迎语', content: '您好！我是AI智能客服，很高兴为您服务。请问有什么可以帮助您的？', category: '问候' },
  { id: 'qr_2', title: '感谢语', content: '感谢您的咨询！如果还有其他问题，欢迎随时联系。祝您使用愉快！', category: '结束' },
  { id: 'qr_3', title: '转人工', content: '好的，我为您转接人工客服，请稍等片刻...', category: '转接' },
  { id: 'qr_4', title: ' pricing', content: '我们的定价方案包括：免费版（50次/月）、专业版（1000次/月）、团队版（无限次）。详细信息请查看定价页面。', category: '产品' },
  { id: 'qr_5', title: '功能介绍', content: 'AI效率助手提供28+核心功能，包括智能改写、文案生成、SEO优化、多语言翻译等，覆盖内容创作全流程。', category: '产品' },
  { id: 'qr_6', title: '技术支持', content: '遇到技术问题了吗？请描述一下具体情况，我会尽力帮您解决。', category: '支持' },
  { id: 'qr_7', title: '退款政策', content: '我们提供7天无理由退款保障。如需申请退款，请提供订单号，我们会尽快处理。', category: '售后' },
  { id: 'qr_8', title: '账户安全', content: '您的API密钥仅存储在本地浏览器，不会上传到服务器。所有数据传输均采用加密传输。', category: '安全' },
];

export const useCustomerServiceStore = create<CustomerServiceStore>()(
  persist(
    (set, get) => ({
      conversations: generateMockConversations(),
      quickReplies: defaultQuickReplies,
      aiSettings: {
        enabled: true,
        autoReply: false,
        suggestedReplies: true,
        sentimentAnalysis: true,
        languageDetection: true,
      },
      stats: {
        totalConversations: 156,
        activeCount: 8,
        avgResponseTime: 45,
        satisfactionRate: 94,
        resolvedToday: 23,
      },
      activeConversationId: null,

      createConversation: (data) => {
        const id = `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        const conversation: CustomerConversation = {
          id,
          customerName: data.customerName || '匿名用户',
          customerAvatar: data.customerAvatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${id}`,
          channel: data.channel || 'web',
          status: data.status || 'active',
          priority: data.priority || 'medium',
          messages: data.messages || [],
          tags: data.tags || [],
          notes: data.notes || '',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          unreadCount: 0,
        };
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: id,
        }));
        get().recalculateStats();
        return id;
      },

      updateConversation: (id, updates) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, ...updates, updatedAt: Date.now() } : conv
          ),
        }));
        get().recalculateStats();
      },

      closeConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, status: 'closed', updatedAt: Date.now() } : conv
          ),
        }));
        get().recalculateStats();
      },

      reopenConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === id ? { ...conv, status: 'active', updatedAt: Date.now() } : conv
          ),
        }));
        get().recalculateStats();
      },

      setActiveConversation: (id) => {
        set({ activeConversationId: id });
        if (id) {
          get().markAsRead(id);
        }
      },

      deleteConversation: (id) => {
        set((state) => ({
          conversations: state.conversations.filter((conv) => conv.id !== id),
          activeConversationId: state.activeConversationId === id ? null : state.activeConversationId,
        }));
        get().recalculateStats();
      },

      addMessage: (conversationId, message) => {
        const newMessage: CustomerMessage = {
          ...message,
          id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          timestamp: Date.now(),
        };
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? {
                  ...conv,
                  messages: [...conv.messages, newMessage],
                  updatedAt: Date.now(),
                  unreadCount: message.role === 'customer' ? (conv.unreadCount || 0) + 1 : conv.unreadCount,
                }
              : conv
          ),
        }));
      },

      sendAiReply: (conversationId, content) => {
        get().addMessage(conversationId, {
          role: 'agent',
          content,
          aiGenerated: true,
        });
      },

      markAsRead: (conversationId) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId ? { ...conv, unreadCount: 0 } : conv
          ),
        }));
      },

      addQuickReply: (reply) => {
        const id = `qr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        set((state) => ({
          quickReplies: [...state.quickReplies, { ...reply, id }],
        }));
      },

      updateQuickReply: (id, updates) => {
        set((state) => ({
          quickReplies: state.quickReplies.map((qr) =>
            qr.id === id ? { ...qr, ...updates } : qr
          ),
        }));
      },

      deleteQuickReply: (id) => {
        set((state) => ({
          quickReplies: state.quickReplies.filter((qr) => qr.id !== id),
        }));
      },

      updateAiSettings: (settings) => {
        set((state) => ({
          aiSettings: { ...state.aiSettings, ...settings },
        }));
      },

      updateStats: (updates) => {
        set((state) => ({
          stats: { ...state.stats, ...updates },
        }));
      },

      recalculateStats: () => {
        const { conversations } = get();
        const activeCount = conversations.filter((c) => c.status === 'active').length;
        const resolvedToday = conversations.filter(
          (c) => c.status === 'closed' && c.updatedAt > Date.now() - 86400000
        ).length;
        set((state) => ({
          stats: {
            ...state.stats,
            totalConversations: conversations.length,
            activeCount,
            resolvedToday,
          },
        }));
      },

      addTag: (conversationId, tag) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId && !conv.tags.includes(tag)
              ? { ...conv, tags: [...conv.tags, tag] }
              : conv
          ),
        }));
      },

      removeTag: (conversationId, tag) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId
              ? { ...conv, tags: conv.tags.filter((t) => t !== tag) }
              : conv
          ),
        }));
      },

      updateNotes: (conversationId, notes) => {
        set((state) => ({
          conversations: state.conversations.map((conv) =>
            conv.id === conversationId ? { ...conv, notes } : conv
          ),
        }));
      },

      getActiveConversation: () => {
        const { conversations, activeConversationId } = get();
        return conversations.find((c) => c.id === activeConversationId) || null;
      },

      getConversationsByStatus: (status) => {
        return get().conversations.filter((c) => c.status === status);
      },

      getConversationsByChannel: (channel) => {
        return get().conversations.filter((c) => c.channel === channel);
      },

      searchConversations: (query) => {
        const lowerQuery = query.toLowerCase();
        return get().conversations.filter(
          (c) =>
            c.customerName.toLowerCase().includes(lowerQuery) ||
            c.messages.some((m) => m.content.toLowerCase().includes(lowerQuery)) ||
            c.tags.some((t) => t.toLowerCase().includes(lowerQuery))
        );
      },
    }),
    {
      name: 'ai-customer-service-store',
      partialize: (state) => ({
        conversations: state.conversations.slice(-50),
        quickReplies: state.quickReplies,
        aiSettings: state.aiSettings,
        stats: state.stats,
      }),
    }
  )
);

export default useCustomerServiceStore;
