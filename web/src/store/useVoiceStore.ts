import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// 类型定义
// ============================================================

export type VoiceLanguage = 'zh' | 'en' | 'ja' | 'ko';
export type VoiceType = 'male' | 'female' | 'neutral';

export interface VoiceMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  audioUrl?: string;
  duration?: number;
}

export interface VoiceConversation {
  id: string;
  title: string;
  messages: VoiceMessage[];
  createdAt: number;
}

export interface VoiceSettings {
  language: VoiceLanguage;
  voiceType: VoiceType;
  speechRate: number;
  autoTranslate: boolean;
  showTranscript: boolean;
}

interface VoiceStore {
  conversations: VoiceConversation[];
  currentConversationId: string | null;
  isListening: boolean;
  isProcessing: boolean;
  currentLanguage: VoiceLanguage;
  voiceType: VoiceType;
  speechRate: number;
  autoTranslate: boolean;
  showTranscript: boolean;
  settings: VoiceSettings;

  // Actions
  startListening: () => void;
  stopListening: () => void;
  setProcessing: (processing: boolean) => void;
  addMessage: (message: Omit<VoiceMessage, 'id' | 'timestamp'>) => void;
  updateLastAssistantMessage: (content: string) => void;
  clearConversation: (conversationId: string) => void;
  deleteConversation: (conversationId: string) => void;
  createConversation: (title?: string) => string;
  switchConversation: (conversationId: string) => void;
  setCurrentLanguage: (lang: VoiceLanguage) => void;
  updateSettings: (settings: Partial<VoiceSettings>) => void;
  getCurrentConversation: () => VoiceConversation | undefined;
  getCurrentMessages: () => VoiceMessage[];
}

// ============================================================
// 工具函数
// ============================================================

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ============================================================
// Mock 数据
// ============================================================

function createMockConversations(): VoiceConversation[] {
  const now = Date.now();
  return [
    {
      id: 'mock_conv_1',
      title: '英语口语练习',
      messages: [
        {
          id: 'm1_1',
          role: 'user',
          content: 'Hello, can you help me practice English conversation?',
          timestamp: now - 3600000,
          duration: 3,
        },
        {
          id: 'm1_2',
          role: 'assistant',
          content: 'Of course! I\'d be happy to help you practice English. Let\'s start with a simple topic. What did you do today?',
          timestamp: now - 3590000,
          duration: 5,
        },
        {
          id: 'm1_3',
          role: 'user',
          content: 'I went to the office and had a meeting with my team. We discussed the new project plan.',
          timestamp: now - 3580000,
          duration: 6,
        },
        {
          id: 'm1_4',
          role: 'assistant',
          content: 'That sounds productive! Can you tell me more about the project? What was the main topic of discussion?',
          timestamp: now - 3570000,
          duration: 4,
        },
      ],
      createdAt: now - 3600000,
    },
    {
      id: 'mock_conv_2',
      title: '日语翻译助手',
      messages: [
        {
          id: 'm2_1',
          role: 'user',
          content: '请帮我把"今天天气真好"翻译成日语。',
          timestamp: now - 86400000,
          duration: 3,
        },
        {
          id: 'm2_2',
          role: 'assistant',
          content: '「今日は本当にいい天気ですね」(Kyou wa hontou ni ii tenki desu ne)。这是一句非常自然的日语表达方式。',
          timestamp: now - 86390000,
          duration: 5,
        },
        {
          id: 'm2_3',
          role: 'user',
          content: '那"我想去公园散步"怎么说？',
          timestamp: now - 86380000,
          duration: 3,
        },
        {
          id: 'm2_4',
          role: 'assistant',
          content: '可以说「公園を散歩したいです」(Kouen o sanpo shitai desu)。如果想更随意一点，可以说「公園を散歩に行きたい」。',
          timestamp: now - 86370000,
          duration: 6,
        },
      ],
      createdAt: now - 86400000,
    },
    {
      id: 'mock_conv_3',
      title: '会议内容总结',
      messages: [
        {
          id: 'm3_1',
          role: 'user',
          content: '帮我总结一下这段会议记录：今天下午产品团队召开了季度规划会议，主要讨论了Q3的产品路线图。张总强调了用户增长目标，要求DAU提升20%。技术团队反馈了当前系统架构的瓶颈问题，建议进行微服务改造。市场部提出了新的品牌推广方案。',
          timestamp: now - 172800000,
          duration: 15,
        },
        {
          id: 'm3_2',
          role: 'assistant',
          content: '好的，以下是会议总结：\n\n1. 核心目标：Q3 DAU提升20%\n2. 产品规划：制定Q3产品路线图\n3. 技术需求：系统架构微服务改造\n4. 市场动作：新品牌推广方案\n\n需要我进一步展开某个要点吗？',
          timestamp: now - 172790000,
          duration: 8,
        },
      ],
      createdAt: now - 172800000,
    },
    {
      id: 'mock_conv_4',
      title: '韩语学习入门',
      messages: [
        {
          id: 'm4_1',
          role: 'user',
          content: '我想学习韩语，应该从哪里开始？',
          timestamp: now - 259200000,
          duration: 4,
        },
        {
          id: 'm4_2',
          role: 'assistant',
          content: '学习韩语可以从以下几个方面入手：\n\n1. 首先学习韩文字母（한글），共40个字母，非常科学易学\n2. 掌握基础问候语：안녕하세요（你好）\n3. 学习基本语法结构，韩语是主宾谓结构\n4. 每天坚持听力练习\n\n建议每天学习30分钟，循序渐进。',
          timestamp: now - 259190000,
          duration: 10,
        },
      ],
      createdAt: now - 259200000,
    },
  ];
}

// ============================================================
// Store
// ============================================================

export const useVoiceStore = create<VoiceStore>()(
  persist(
    (set, get) => ({
      conversations: createMockConversations(),
      currentConversationId: 'mock_conv_1',
      isListening: false,
      isProcessing: false,
      currentLanguage: 'zh',
      voiceType: 'female',
      speechRate: 1.0,
      autoTranslate: false,
      showTranscript: true,
      settings: {
        language: 'zh',
        voiceType: 'female',
        speechRate: 1.0,
        autoTranslate: false,
        showTranscript: true,
      },

      // ---- Listening ----

      startListening: () => set({ isListening: true, isProcessing: false }),

      stopListening: () => set({ isListening: false }),

      setProcessing: (processing) => set({ isProcessing: processing, isListening: false }),

      // ---- Messages ----

      addMessage: (message) => {
        const { currentConversationId } = get();
        if (!currentConversationId) return;

        const fullMessage: VoiceMessage = {
          ...message,
          id: generateId(),
          timestamp: Date.now(),
        };

        set((s) => ({
          conversations: s.conversations.map((conv) => {
            if (conv.id !== currentConversationId) return conv;
            const updatedMessages = [...conv.messages, fullMessage];
            const autoTitle =
              conv.messages.length === 0 && message.role === 'user'
                ? message.content.slice(0, 20) + (message.content.length > 20 ? '...' : '')
                : conv.title;
            return {
              ...conv,
              messages: updatedMessages,
              title: autoTitle,
            };
          }),
        }));
      },

      updateLastAssistantMessage: (content) => {
        const { currentConversationId } = get();
        if (!currentConversationId) return;

        set((s) => ({
          conversations: s.conversations.map((conv) => {
            if (conv.id !== currentConversationId || conv.messages.length === 0) return conv;
            const messages = [...conv.messages];
            const lastIdx = messages.length - 1;
            if (messages[lastIdx].role === 'assistant') {
              messages[lastIdx] = { ...messages[lastIdx], content };
            }
            return { ...conv, messages };
          }),
        }));
      },

      // ---- Conversations ----

      clearConversation: (conversationId) =>
        set((s) => ({
          conversations: s.conversations.map((conv) =>
            conv.id === conversationId ? { ...conv, messages: [] } : conv
          ),
        })),

      deleteConversation: (conversationId) =>
        set((s) => {
          const conversations = s.conversations.filter((c) => c.id !== conversationId);
          const currentConversationId =
            s.currentConversationId === conversationId
              ? conversations[0]?.id || null
              : s.currentConversationId;
          return { conversations, currentConversationId };
        }),

      createConversation: (title?: string) => {
        const id = generateId();
        const conversation: VoiceConversation = {
          id,
          title: title || `新对话 ${get().conversations.length + 1}`,
          messages: [],
          createdAt: Date.now(),
        };
        set((s) => ({
          conversations: [conversation, ...s.conversations],
          currentConversationId: id,
        }));
        return id;
      },

      switchConversation: (conversationId) => set({ currentConversationId: conversationId }),

      // ---- Language & Settings ----

      setCurrentLanguage: (lang) =>
        set({
          currentLanguage: lang,
          settings: { ...get().settings, language: lang },
        }),

      updateSettings: (newSettings) =>
        set((s) => {
          const settings = { ...s.settings, ...newSettings };
          return {
            settings,
            currentLanguage: settings.language,
            voiceType: settings.voiceType,
            speechRate: settings.speechRate,
            autoTranslate: settings.autoTranslate,
            showTranscript: settings.showTranscript,
          };
        }),

      // ---- Getters ----

      getCurrentConversation: () => {
        const { conversations, currentConversationId } = get();
        return conversations.find((c) => c.id === currentConversationId);
      },

      getCurrentMessages: () => {
        const conversation = get().getCurrentConversation();
        return conversation?.messages || [];
      },
    }),
    {
      name: 'ai-assistant-voice-store',
      partialize: (state) => ({
        conversations: state.conversations.slice(-30).map((c) => ({
          ...c,
          messages: c.messages.slice(-50),
        })),
        currentConversationId: state.currentConversationId,
        settings: state.settings,
        currentLanguage: state.currentLanguage,
        voiceType: state.voiceType,
        speechRate: state.speechRate,
        autoTranslate: state.autoTranslate,
        showTranscript: state.showTranscript,
      }),
    }
  )
);
