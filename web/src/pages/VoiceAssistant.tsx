import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n';
import { chatWithAiStream } from '../services/aiChat';
import {
  useVoiceStore,
  type VoiceLanguage,
  type VoiceType,
  type VoiceMessage,
} from '../store/useVoiceStore';

// ============================================================
// Web Speech API 类型声明
// ============================================================

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionErrorEvent {
  error: string;
  message?: string;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

// ============================================================
// 语言映射
// ============================================================

const LANGUAGE_MAP: Record<VoiceLanguage, string> = {
  zh: 'zh-CN',
  en: 'en-US',
  ja: 'ja-JP',
  ko: 'ko-KR',
};

const LANGUAGE_LABELS: Record<VoiceLanguage, string> = {
  zh: '中文',
  en: 'English',
  ja: '日本語',
  ko: '한국어',
};

// ============================================================
// 子组件: 波形可视化
// ============================================================

function WaveformVisualizer({ isActive, barCount = 24 }: { isActive: boolean; barCount?: number }) {
  const bars = Array.from({ length: barCount }, (_, i) => i);

  return (
    <div className="flex items-center justify-center gap-[3px] h-12">
      {bars.map((i) => (
        <motion.div
          key={i}
          className="w-[3px] rounded-full bg-gradient-to-t from-teal-500 to-cyan-400"
          animate={
            isActive
              ? {
                  height: [8, Math.random() * 40 + 8, 8],
                }
              : { height: 8 }
          }
          transition={
            isActive
              ? {
                  duration: 0.5 + Math.random() * 0.5,
                  repeat: Infinity,
                  repeatType: 'reverse',
                  delay: i * 0.03,
                }
              : { duration: 0.3 }
          }
        />
      ))}
    </div>
  );
}

// ============================================================
// 子组件: 消息气泡中的小型波形
// ============================================================

function MessageWaveform({ role }: { role: 'user' | 'assistant' }) {
  const bars = Array.from({ length: 8 }, (_, i) => i);
  const color =
    role === 'user'
      ? 'bg-white/60'
      : 'bg-teal-400/60';

  return (
    <div className="flex items-end gap-[2px] h-4">
      {bars.map((i) => (
        <motion.div
          key={i}
          className={`w-[2px] rounded-full ${color}`}
          initial={{ height: 4 }}
          animate={{ height: [4, 8 + Math.random() * 8, 4] }}
          transition={{
            duration: 0.8 + Math.random() * 0.4,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: i * 0.05,
          }}
        />
      ))}
    </div>
  );
}

// ============================================================
// 子组件: 设置面板
// ============================================================

function SettingsPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { settings, updateSettings } = useVoiceStore();

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 z-50 p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('voice.settings')}
            </h3>
            <button
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Speech Rate */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('voice.speechRate')}: {settings.speechRate.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={settings.speechRate}
              onChange={(e) => updateSettings({ speechRate: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-teal-500"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0.5x</span>
              <span>1.0x</span>
              <span>2.0x</span>
            </div>
          </div>

          {/* Voice Type */}
          <div className="mb-5">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('voice.voiceType')}
            </label>
            <div className="flex gap-2">
              {(['male', 'female', 'neutral'] as VoiceType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => updateSettings({ voiceType: type })}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                    settings.voiceType === type
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t(`voice.${type}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Auto Translate */}
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('voice.autoTranslate')}
              </span>
              <button
                onClick={() => updateSettings({ autoTranslate: !settings.autoTranslate })}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  settings.autoTranslate ? 'bg-teal-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <motion.div
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow"
                  animate={{ left: settings.autoTranslate ? '22px' : '2px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </div>

          {/* Show Transcript */}
          <div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('voice.showTranscript')}
              </span>
              <button
                onClick={() => updateSettings({ showTranscript: !settings.showTranscript })}
                className={`relative w-11 h-6 rounded-full transition-colors ${
                  settings.showTranscript ? 'bg-teal-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <motion.div
                  className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow"
                  animate={{ left: settings.showTranscript ? '22px' : '2px' }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// 子组件: 对话历史侧边栏
// ============================================================

function HistorySidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const {
    conversations,
    currentConversationId,
    switchConversation,
    deleteConversation,
    createConversation,
  } = useVoiceStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = conversations.filter((conv) =>
    conv.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.messages.some((m) => m.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 z-40 lg:hidden"
            onClick={onClose}
          />

          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 bottom-0 w-80 bg-white dark:bg-gray-900 shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t('voice.history')}
                </h2>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Search */}
              <div className="relative">
                <svg
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('voice.searchPlaceholder')}
                  className="w-full pl-9 pr-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              {/* New Conversation */}
              <button
                onClick={() => {
                  createConversation();
                  onClose();
                }}
                className="mt-3 w-full py-2 px-4 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-lg text-sm font-medium hover:shadow-lg transition-shadow"
              >
                + {t('voice.newConversation')}
              </button>
            </div>

            {/* Conversation List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {filteredConversations.length === 0 ? (
                <p className="text-center text-gray-400 text-sm mt-8">
                  {t('voice.noConversations')}
                </p>
              ) : (
                filteredConversations.map((conv) => (
                  <motion.div
                    key={conv.id}
                    layout
                    className={`group p-3 rounded-lg cursor-pointer transition-all ${
                      conv.id === currentConversationId
                        ? 'bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/30 dark:to-cyan-900/30 border border-teal-200 dark:border-teal-700'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => {
                      switchConversation(conv.id);
                      onClose();
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {conv.title}
                        </h3>
                        <p className="text-xs text-gray-400 mt-1">
                          {conv.messages.length} {t('chat.messages')}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteConversation(conv.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-500 transition-all"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================================
// 主组件: VoiceAssistant
// ============================================================

export default function VoiceAssistant() {
  const { t } = useTranslation();
  const {
    isListening,
    isProcessing,
    currentLanguage,
    voiceType,
    settings,
    showTranscript,
    currentConversationId,
    startListening,
    stopListening,
    setProcessing,
    addMessage,
    updateLastAssistantMessage,
    createConversation,
    getCurrentMessages,
    setCurrentLanguage,
  } = useVoiceStore();

  const messages = getCurrentMessages();
  const [showSettings, setShowSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [interimText, setInterimText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // ---- 自动滚动到底部 ----
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, interimText]);

  // ---- 检测语音识别支持 ----
  useEffect(() => {
    const supported =
      'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    setVoiceSupported(supported);
  }, []);

  // ---- 初始化语音识别 ----
  const initRecognition = useCallback(() => {
    if (!voiceSupported) return null;

    const SpeechRecognitionAPI =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return null;

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = LANGUAGE_MAP[currentLanguage];
    return recognition;
  }, [currentLanguage, voiceSupported]);

  // ---- 开始聆听 ----
  const handleStartListening = useCallback(() => {
    const recognition = initRecognition();
    if (!recognition) return;

    recognition.onstart = () => {
      startListening();
      setInterimText('');
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }

      if (finalTranscript) {
        handleSendMessage(finalTranscript);
      }
      setInterimText(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      stopListening();
      setInterimText('');
    };

    recognition.onend = () => {
      stopListening();
      setInterimText('');
    };

    recognitionRef.current = recognition;
    recognition.start();
  }, [initRecognition, startListening, stopListening]);

  // ---- 停止聆听 ----
  const handleStopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    stopListening();
    setInterimText('');
  }, [stopListening]);

  // ---- 发送消息并获取 AI 回复 ----
  const handleSendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isProcessing) return;

      // 确保有当前对话
      if (!currentConversationId) {
        createConversation();
      }

      // 添加用户消息
      addMessage({
        role: 'user',
        content: text.trim(),
        duration: Math.max(1, Math.round(text.length / 5)),
      });

      setProcessing(true);
      setInterimText('');

      try {
        // 先添加一个空的助手消息
        addMessage({
          role: 'assistant',
          content: '',
        });

        const response = await chatWithAiStream(
          {
            messages: [
              {
                role: 'user',
                content: text.trim(),
              },
            ],
            systemPrompt:
              '你是一个智能语音助手，请用简洁自然的口语风格回答。如果用户使用的语言不是中文，请用相同的语言回复。',
          },
          abortControllerRef.current?.signal
        );

        if (response.success && response.stream) {
          const reader = response.stream.getReader();
          let accumulated = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            accumulated += value;
            updateLastAssistantMessage(accumulated);
          }

          // 使用 TTS 朗读最终回复
          if (accumulated) {
            speakText(accumulated);
          }
        } else {
          updateLastAssistantMessage(
            response.error || t('common.error')
          );
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          updateLastAssistantMessage(t('common.error'));
        }
      } finally {
        setProcessing(false);
      }
    },
    [
      isProcessing,
      currentConversationId,
      createConversation,
      addMessage,
      setProcessing,
      updateLastAssistantMessage,
      t,
    ]
  );

  // ---- TTS 朗读 ----
  const speakText = useCallback(
    (text: string) => {
      if (!('speechSynthesis' in window)) return;

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = LANGUAGE_MAP[currentLanguage];
      utterance.rate = settings.speechRate;

      // 尝试根据 voiceType 选择声音
      const voices = window.speechSynthesis.getVoices();
      const langPrefix = LANGUAGE_MAP[currentLanguage].split('-')[0];
      const matchingVoices = voices.filter((v) => v.lang.startsWith(langPrefix));

      if (matchingVoices.length > 0) {
        if (voiceType === 'female') {
          const femaleVoice = matchingVoices.find(
            (v) =>
              v.name.toLowerCase().includes('female') ||
              v.name.toLowerCase().includes('woman') ||
              v.name.includes('Xiaoxiao') ||
              v.name.includes('Samantha')
          );
          utterance.voice = femaleVoice || matchingVoices[0];
        } else if (voiceType === 'male') {
          const maleVoice = matchingVoices.find(
            (v) =>
              v.name.toLowerCase().includes('male') ||
              v.name.toLowerCase().includes('man') ||
              v.name.includes('Yunxi') ||
              v.name.includes('Daniel')
          );
          utterance.voice = maleVoice || matchingVoices[0];
        } else {
          utterance.voice = matchingVoices[0];
        }
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      window.speechSynthesis.speak(utterance);
    },
    [currentLanguage, settings.speechRate, voiceType]
  );

  // ---- 停止朗读 ----
  const stopSpeaking = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, []);

  // ---- 快捷指令 ----
  const quickCommands = [
    { key: 'translate', icon: '🌐' },
    { key: 'summarize', icon: '📋' },
    { key: 'continue', icon: '➡️' },
    { key: 'rephrase', icon: '🔄' },
    { key: 'readAloud', icon: '🔊' },
  ];

  const handleQuickCommand = (commandKey: string) => {
    const commandTexts: Record<string, string> = {
      translate: t('voice.quickCommands.translate'),
      summarize: t('voice.quickCommands.summarize'),
      continue: t('voice.quickCommands.continue'),
      rephrase: t('voice.quickCommands.rephrase'),
      readAloud: t('voice.quickCommands.readAloud'),
    };
    handleSendMessage(commandTexts[commandKey] || commandKey);
  };

  // ---- 文字发送 ----
  const handleTextSubmit = () => {
    if (textInput.trim()) {
      handleSendMessage(textInput.trim());
      setTextInput('');
    }
  };

  // ---- 获取状态文本 ----
  const getStatusText = () => {
    if (isProcessing) return t('voice.processing');
    if (isListening) return t('voice.listening');
    if (isSpeaking) return t('voice.voiceOutput');
    return t('voice.tapToStart');
  };

  // ---- 格式化时间 ----
  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ---- 清理 ----
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      abortControllerRef.current?.abort();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Left: History toggle + Title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowHistory(true)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                aria-label={t('voice.history')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                  {t('voice.title')}
                </h1>
              </div>
            </div>

            {/* Center: Language selector */}
            <div className="hidden sm:flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
              {(Object.keys(LANGUAGE_MAP) as VoiceLanguage[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setCurrentLanguage(lang)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    currentLanguage === lang
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  {LANGUAGE_LABELS[lang]}
                </button>
              ))}
            </div>

            {/* Right: Settings */}
            <div className="relative">
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 transition-colors"
                aria-label={t('voice.settings')}
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </button>
              <SettingsPanel isOpen={showSettings} onClose={() => setShowSettings(false)} />
            </div>
          </div>

          {/* Mobile language selector */}
          <div className="flex sm:hidden items-center gap-1 mt-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
            {(Object.keys(LANGUAGE_MAP) as VoiceLanguage[]).map((lang) => (
              <button
                key={lang}
                onClick={() => setCurrentLanguage(lang)}
                className={`flex-1 px-2 py-1.5 rounded-md text-xs font-medium transition-all ${
                  currentLanguage === lang
                    ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400'
                }`}
              >
                {LANGUAGE_LABELS[lang]}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 flex flex-col" style={{ minHeight: 'calc(100vh - 120px)' }}>
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto space-y-4 mb-6 pr-1">
          {messages.length === 0 && !isListening && !isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center mb-4 shadow-lg">
                <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('voice.title')}
              </h2>
              <p className="text-gray-500 dark:text-gray-400 max-w-md">
                {voiceSupported
                  ? t('voice.tapToStart')
                  : t('voice.voiceNotSupported')}
              </p>
            </motion.div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((message: VoiceMessage) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] sm:max-w-[70%] ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-2xl rounded-br-md'
                      : 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-2xl rounded-bl-md shadow-sm border border-gray-100 dark:border-gray-700'
                  } px-4 py-3`}
                >
                  {/* Message header */}
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-xs font-medium ${
                        message.role === 'user' ? 'text-teal-100' : 'text-gray-400'
                      }`}
                    >
                      {message.role === 'user' ? 'You' : 'AI'}
                    </span>
                    <span
                      className={`text-xs ${
                        message.role === 'user' ? 'text-teal-200/60' : 'text-gray-300 dark:text-gray-600'
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </span>
                    {message.duration && (
                      <span
                        className={`text-xs ${
                          message.role === 'user' ? 'text-teal-200/60' : 'text-gray-300 dark:text-gray-600'
                        }`}
                      >
                        {message.duration}s
                      </span>
                    )}
                  </div>

                  {/* Waveform */}
                  {message.content && (
                    <div className="mb-2">
                      <MessageWaveform role={message.role} />
                    </div>
                  )}

                  {/* Content */}
                  {showTranscript && message.content && (
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {message.content}
                    </p>
                  )}

                  {/* Speak button for assistant messages */}
                  {message.role === 'assistant' && message.content && (
                    <button
                      onClick={() => {
                        if (isSpeaking) {
                          stopSpeaking();
                        } else {
                          speakText(message.content);
                        }
                      }}
                      className={`mt-2 flex items-center gap-1 text-xs px-2 py-1 rounded-md transition-colors ${
                        isSpeaking
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                      }`}
                    >
                      {isSpeaking ? (
                        <>
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                            <rect x="6" y="4" width="4" height="16" rx="1" />
                            <rect x="14" y="4" width="4" height="16" rx="1" />
                          </svg>
                          {t('voice.stopSpeak')}
                        </>
                      ) : (
                        <>
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                            />
                          </svg>
                          {t('voice.speakText')}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Interim text (while listening) */}
          {interimText && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex justify-end"
            >
              <div className="max-w-[80%] bg-gradient-to-r from-teal-500/30 to-cyan-600/30 text-gray-900 dark:text-white rounded-2xl rounded-br-md px-4 py-3 border border-teal-300 dark:border-teal-700">
                <p className="text-sm italic">{interimText}</p>
              </div>
            </motion.div>
          )}

          <div ref={chatEndRef} />
        </div>

        {/* Voice Input Section */}
        <div className="flex flex-col items-center gap-4">
          {/* Waveform Visualizer */}
          <AnimatePresence mode="wait">
            {(isListening || isProcessing) && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
              >
                <WaveformVisualizer isActive={isListening} />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Status Text */}
          <motion.p
            key={getStatusText()}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className={`text-sm font-medium ${
              isListening
                ? 'text-teal-600 dark:text-teal-400'
                : isProcessing
                ? 'text-amber-600 dark:text-amber-400'
                : isSpeaking
                ? 'text-cyan-600 dark:text-cyan-400'
                : 'text-gray-400 dark:text-gray-500'
            }`}
          >
            {getStatusText()}
          </motion.p>

          {/* Microphone Button */}
          <div className="relative">
            {/* Pulse rings when listening */}
            {isListening && (
              <>
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-500 to-cyan-600"
                  animate={{ scale: [1, 1.5], opacity: [0.4, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
                <motion.div
                  className="absolute inset-0 rounded-full bg-gradient-to-r from-teal-500 to-cyan-600"
                  animate={{ scale: [1, 1.3], opacity: [0.3, 0] }}
                  transition={{ duration: 1.5, repeat: Infinity, delay: 0.3 }}
                />
              </>
            )}

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (isListening) {
                  handleStopListening();
                } else if (!isProcessing) {
                  handleStartListening();
                }
              }}
              disabled={isProcessing}
              className={`relative w-20 h-20 rounded-full flex items-center justify-center shadow-xl transition-colors ${
                isListening
                  ? 'bg-gradient-to-r from-red-500 to-rose-600'
                  : isProcessing
                  ? 'bg-gradient-to-r from-amber-500 to-orange-600'
                  : 'bg-gradient-to-r from-teal-500 to-cyan-600 hover:shadow-2xl'
              }`}
            >
              {isListening ? (
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : isProcessing ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </motion.div>
              ) : (
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                  />
                </svg>
              )}
            </motion.button>
          </div>

          {/* Text fallback input */}
          <div className="w-full max-w-lg">
            <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 px-4 py-2">
              <input
                type="text"
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleTextSubmit();
                  }
                }}
                placeholder={t('voice.textPlaceholder')}
                className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
              />
              <button
                onClick={handleTextSubmit}
                disabled={!textInput.trim()}
                className="p-2 rounded-lg bg-gradient-to-r from-teal-500 to-cyan-600 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-md transition-shadow"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              </button>
            </div>
          </div>

          {/* Quick Commands */}
          <div className="flex flex-wrap justify-center gap-2">
            {quickCommands.map((cmd) => (
              <motion.button
                key={cmd.key}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleQuickCommand(cmd.key)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-full text-xs font-medium text-gray-600 dark:text-gray-300 shadow-sm border border-gray-200 dark:border-gray-700 hover:border-teal-300 dark:hover:border-teal-600 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
              >
                <span>{cmd.icon}</span>
                <span>{t(`voice.quickCommands.${cmd.key}`)}</span>
              </motion.button>
            ))}
          </div>
        </div>
      </div>

      {/* History Sidebar */}
      <HistorySidebar isOpen={showHistory} onClose={() => setShowHistory(false)} />
    </div>
  );
}
