import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../i18n';
import { useCodeAssistantStore, Language, CodeSnippet } from '../store/useCodeAssistantStore';
import { chatWithAiStream } from '../services/aiChat';
import {
  Code2,
  Search,
  Plus,
  Star,
  Settings,
  Copy,
  Download,
  Maximize2,
  Minimize2,
  Play,
  MessageSquare,
  X,
  Terminal,
  Sparkles,
  Wand2,
  Bug,
  Zap,
  FileCode,
  AlignLeft,
  Loader2,
  Send,
  LayoutTemplate,
  FolderOpen,
} from 'lucide-react';

// Language icon mapping
const languageIcons: Record<Language, string> = {
  javascript: 'JS',
  typescript: 'TS',
  python: 'Py',
  java: 'Ja',
  go: 'Go',
  rust: 'Rs',
  cpp: 'C++',
  c: 'C',
  sql: 'SQL',
  html: 'HTML',
  css: 'CSS',
  json: 'JSON',
  yaml: 'YAML',
  markdown: 'MD',
  bash: 'Sh',
  powershell: 'PS',
};

// Language colors
const languageColors: Record<Language, string> = {
  javascript: 'text-yellow-400',
  typescript: 'text-blue-400',
  python: 'text-green-400',
  java: 'text-orange-400',
  go: 'text-cyan-400',
  rust: 'text-orange-500',
  cpp: 'text-blue-500',
  c: 'text-blue-600',
  sql: 'text-purple-400',
  html: 'text-orange-500',
  css: 'text-blue-400',
  json: 'text-gray-400',
  yaml: 'text-red-400',
  markdown: 'text-white',
  bash: 'text-green-500',
  powershell: 'text-blue-300',
};

// Syntax highlighting simulation
const highlightCode = (code: string, _language: Language): JSX.Element => {
  const lines = code.split('\n');
  
  const getLineClass = (line: string): string => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('--')) {
      return 'text-gray-500';
    }
    if (trimmed.startsWith('import') || trimmed.startsWith('from') || trimmed.startsWith('using')) {
      return 'text-pink-400';
    }
    if (trimmed.startsWith('function') || trimmed.startsWith('const') || trimmed.startsWith('let') || trimmed.startsWith('var') || trimmed.startsWith('def') || trimmed.startsWith('class')) {
      return 'text-blue-400';
    }
    if (trimmed.startsWith('return') || trimmed.startsWith('if') || trimmed.startsWith('for') || trimmed.startsWith('while') || trimmed.startsWith('try') || trimmed.startsWith('catch')) {
      return 'text-purple-400';
    }
    if (trimmed.includes('"') || trimmed.includes("'") || trimmed.includes('`')) {
      return 'text-green-400';
    }
    if (/\b\d+\b/.test(trimmed)) {
      return 'text-orange-400';
    }
    return 'text-gray-300';
  };

  return (
    <>
      {lines.map((line, index) => (
        <div key={index} className="flex">
          <span className={`${getLineClass(line)} whitespace-pre`}>{line || ' '}</span>
        </div>
      ))}
    </>
  );
};

// Simple syntax highlighter component
const SyntaxHighlighter: React.FC<{ code: string; language: Language }> = ({ code, language }) => {
  return (
    <pre className="font-mono text-sm leading-relaxed">
      {highlightCode(code, language)}
    </pre>
  );
};

export default function CodeAssistant() {
  const { t } = useTranslation();
  const store = useCodeAssistantStore();
  const {
    snippets,
    conversations,
    templates,
    settings,
    activeSnippetId,
    openTabs,
    createSnippet,
    updateSnippet,
    toggleFavorite,
    setActiveSnippet,
    closeTab,
    createConversation,
    addMessage,
    updateSettings,
  } = store;
  
  const activeConversationId = store.activeConversationId;

  // Local state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState<Language | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'snippets' | 'templates' | 'favorites'>('snippets');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState<string[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [editingSnippet, setEditingSnippet] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [showNewSnippetModal, setShowNewSnippetModal] = useState(false);
  const [newSnippetData, setNewSnippetData] = useState({
    title: '',
    language: 'typescript' as Language,
    code: '',
    description: '',
    tags: '',
  });

  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Get active snippet
  const activeSnippet = useMemo(() => {
    return snippets.find((s) => s.id === activeSnippetId) || null;
  }, [snippets, activeSnippetId]);

  // Get active conversation
  const activeConversation = useMemo(() => {
    return conversations.find((c) => c.id === activeConversationId) || null;
  }, [conversations, activeConversationId]);

  // Filter snippets
  const filteredSnippets = useMemo(() => {
    let filtered = snippets;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(query) ||
          s.description.toLowerCase().includes(query) ||
          s.tags.some((tag) => tag.toLowerCase().includes(query))
      );
    }
    
    if (selectedLanguage !== 'all') {
      filtered = filtered.filter((s) => s.language === selectedLanguage);
    }

    if (activeTab === 'favorites') {
      filtered = filtered.filter((s) => s.isFavorite);
    }

    return filtered;
  }, [snippets, searchQuery, selectedLanguage, activeTab]);

  // Scroll chat to bottom
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [activeConversation?.messages]);

  // Handle snippet selection
  const handleSnippetClick = (snippet: CodeSnippet) => {
    setActiveSnippet(snippet.id);
  };

  // Handle code edit
  const handleCodeChange = (newCode: string) => {
    if (activeSnippet) {
      updateSnippet(activeSnippet.id, { code: newCode });
    }
  };

  // Handle copy code
  const handleCopyCode = async () => {
    if (activeSnippet) {
      await navigator.clipboard.writeText(activeSnippet.code);
    }
  };

  // Handle download code
  const handleDownloadCode = () => {
    if (activeSnippet) {
      const extensions: Record<Language, string> = {
        javascript: 'js',
        typescript: 'ts',
        python: 'py',
        java: 'java',
        go: 'go',
        rust: 'rs',
        cpp: 'cpp',
        c: 'c',
        sql: 'sql',
        html: 'html',
        css: 'css',
        json: 'json',
        yaml: 'yaml',
        markdown: 'md',
        bash: 'sh',
        powershell: 'ps1',
      };
      const blob = new Blob([activeSnippet.code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeSnippet.title}.${extensions[activeSnippet.language]}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  // Handle run code (simulated)
  const handleRunCode = () => {
    setIsConsoleOpen(true);
    setConsoleOutput((prev) => [
      ...prev,
      `> Running ${activeSnippet?.language || 'code'}...`,
      `[${new Date().toLocaleTimeString()}] Code execution started`,
      'Output:',
      'Hello, World!',
      'Execution completed successfully.',
      '---',
    ]);
  };

  // Handle AI action
  const handleAiAction = async (action: string) => {
    if (!activeSnippet) return;

    const conversationId = activeConversationId || createConversation(`${action} - ${activeSnippet.title}`);
    
    const prompts: Record<string, string> = {
      explain: `请详细解释以下 ${activeSnippet.language} 代码的功能和工作原理：\n\n${activeSnippet.code}`,
      refactor: `请重构以下 ${activeSnippet.language} 代码，使其更清晰、更高效，并遵循最佳实践：\n\n${activeSnippet.code}`,
      debug: `请分析以下 ${activeSnippet.language} 代码，找出潜在的错误、bug 或改进建议：\n\n${activeSnippet.code}`,
      optimize: `请优化以下 ${activeSnippet.language} 代码的性能：\n\n${activeSnippet.code}`,
      generateTests: `请为以下 ${activeSnippet.language} 代码生成单元测试：\n\n${activeSnippet.code}`,
      addComments: `请为以下 ${activeSnippet.language} 代码添加详细的注释，解释每个部分的功能：\n\n${activeSnippet.code}`,
    };

    const userMessage = {
      role: 'user' as const,
      content: prompts[action] || action,
      codeContext: activeSnippet.code,
    };

    addMessage(conversationId, userMessage);
    setIsGenerating(true);

    try {
      const response = await chatWithAiStream({
        messages: [{ role: 'user', content: userMessage.content }],
        systemPrompt: '你是一个专业的代码助手，擅长代码分析、重构、调试和优化。请提供详细、准确的回答。',
      });

      if (response.success && response.stream) {
        const reader = response.stream.getReader();
        let fullContent = '';

        addMessage(conversationId, {
          role: 'assistant',
          content: '',
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullContent += value;
          
          // Update the last message
          const conversation = useCodeAssistantStore.getState().conversations.find((c) => c.id === conversationId);
          if (conversation) {
            const lastMessage = conversation.messages[conversation.messages.length - 1];
            if (lastMessage && lastMessage.role === 'assistant') {
              useCodeAssistantStore.getState().conversations = useCodeAssistantStore.getState().conversations.map((c) =>
                c.id === conversationId
                  ? {
                      ...c,
                      messages: c.messages.map((m, idx) =>
                        idx === c.messages.length - 1 ? { ...m, content: fullContent } : m
                      ),
                    }
                  : c
              );
            }
          }
        }
      }
    } catch (error) {
      addMessage(conversationId, {
        role: 'assistant',
        content: '抱歉，处理请求时出错。请稍后重试。',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle chat submit
  const handleChatSubmit = async () => {
    if (!chatInput.trim() || !activeSnippet) return;

    const conversationId = activeConversationId || createConversation('代码对话');
    
    addMessage(conversationId, {
      role: 'user',
      content: chatInput,
      codeContext: activeSnippet.code,
    });

    setChatInput('');
    setIsGenerating(true);

    try {
      const response = await chatWithAiStream({
        messages: [
          {
            role: 'user',
            content: `当前代码上下文 (${activeSnippet.language}):\n\n${activeSnippet.code}\n\n用户问题: ${chatInput}`,
          },
        ],
        systemPrompt: '你是一个专业的代码助手。请基于提供的代码上下文回答用户的问题。',
      });

      if (response.success && response.stream) {
        const reader = response.stream.getReader();
        let fullContent = '';

        addMessage(conversationId, {
          role: 'assistant',
          content: '',
        });

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          fullContent += value;
          
          const state = useCodeAssistantStore.getState();
          state.conversations = state.conversations.map((c) =>
            c.id === conversationId
              ? {
                  ...c,
                  messages: c.messages.map((m, idx) =>
                    idx === c.messages.length - 1 && m.role === 'assistant'
                      ? { ...m, content: fullContent }
                      : m
                  ),
                }
              : c
          );
        }
      }
    } catch (error) {
      addMessage(conversationId, {
        role: 'assistant',
        content: '抱歉，处理请求时出错。请稍后重试。',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template: typeof templates[0]) => {
    createSnippet({
      title: template.name,
      language: template.language,
      code: template.code,
      description: template.description,
      tags: template.tags,
      isFavorite: false,
      aiGenerated: false,
    });
    setActiveTab('snippets');
  };

  // Handle new snippet creation
  const handleCreateSnippet = () => {
    if (!newSnippetData.title || !newSnippetData.code) return;
    
    createSnippet({
      title: newSnippetData.title,
      language: newSnippetData.language,
      code: newSnippetData.code,
      description: newSnippetData.description,
      tags: newSnippetData.tags.split(',').map((t) => t.trim()).filter(Boolean),
      isFavorite: false,
      aiGenerated: false,
    });
    
    setShowNewSnippetModal(false);
    setNewSnippetData({
      title: '',
      language: 'typescript',
      code: '',
      description: '',
      tags: '',
    });
  };

  // Handle snippet title edit
  const handleSaveTitle = (id: string) => {
    if (editTitle.trim()) {
      updateSnippet(id, { title: editTitle });
    }
    setEditingSnippet(null);
    setEditTitle('');
  };

  const languages: Language[] = [
    'javascript', 'typescript', 'python', 'java', 'go', 'rust', 'cpp', 'c',
    'sql', 'html', 'css', 'json', 'yaml', 'markdown', 'bash', 'powershell',
  ];

  return (
    <div className={`flex flex-col h-screen bg-slate-950 text-gray-100 ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      {/* Header */}
      <header className="h-14 bg-gradient-to-r from-slate-800 to-slate-900 border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-600 to-gray-700 flex items-center justify-center">
            <Code2 className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold text-white">{t('codeAssistant.title')}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Selector */}
          <select
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value as Language | 'all')}
            className="px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-sm text-gray-200 focus:outline-none focus:border-slate-500"
          >
            <option value="all">{t('codeAssistant.filterByLanguage')}</option>
            {languages.map((lang) => (
              <option key={lang} value={lang}>
                {t(`codeAssistant.languages.${lang}`)}
              </option>
            ))}
          </select>

          {/* Settings Button */}
          <button
            onClick={() => setIsSettingsOpen(!isSettingsOpen)}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <Settings className="w-5 h-5 text-gray-400" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 text-gray-400" />
            ) : (
              <Maximize2 className="w-5 h-5 text-gray-400" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-slate-700">
            {(['snippets', 'templates', 'favorites'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm font-medium transition-colors ${
                  activeTab === tab
                    ? 'text-white border-b-2 border-slate-500 bg-slate-800'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-slate-800/50'
                }`}
              >
                {tab === 'snippets' && t('codeAssistant.snippets')}
                {tab === 'templates' && t('codeAssistant.templates')}
                {tab === 'favorites' && t('codeAssistant.favorites')}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="p-3 border-b border-slate-700">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('codeAssistant.searchSnippets')}
                className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-slate-500"
              />
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'templates' ? (
              // Templates List
              <div className="p-2 space-y-1">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
                    className="w-full text-left p-3 rounded-lg hover:bg-slate-800 transition-colors group"
                  >
                    <div className="flex items-center gap-2">
                      <LayoutTemplate className="w-4 h-4 text-slate-400 group-hover:text-slate-300" />
                      <span className="text-sm font-medium text-gray-300 group-hover:text-white">
                        {template.name}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 truncate">{template.description}</p>
                    <div className="flex items-center gap-1 mt-2">
                      <span className={`text-xs ${languageColors[template.language]}`}>
                        {languageIcons[template.language]}
                      </span>
                      <span className="text-xs text-gray-500">
                        {t(`codeAssistant.languages.${template.language}`)}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              // Snippets List
              <div className="p-2 space-y-1">
                {filteredSnippets.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FolderOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm">{t('codeAssistant.noSnippets')}</p>
                    <button
                      onClick={() => setShowNewSnippetModal(true)}
                      className="mt-3 text-sm text-slate-400 hover:text-white"
                    >
                      {t('codeAssistant.createFirst')}
                    </button>
                  </div>
                ) : (
                  filteredSnippets.map((snippet) => (
                    <div
                      key={snippet.id}
                      onClick={() => handleSnippetClick(snippet)}
                      className={`p-3 rounded-lg cursor-pointer transition-colors group ${
                        activeSnippetId === snippet.id
                          ? 'bg-slate-700 border border-slate-600'
                          : 'hover:bg-slate-800 border border-transparent'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          {editingSnippet === snippet.id ? (
                            <input
                              type="text"
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              onBlur={() => handleSaveTitle(snippet.id)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleSaveTitle(snippet.id);
                                if (e.key === 'Escape') setEditingSnippet(null);
                              }}
                              autoFocus
                              className="w-full px-2 py-1 bg-slate-600 rounded text-sm text-white focus:outline-none"
                              onClick={(e) => e.stopPropagation()}
                            />
                          ) : (
                            <h3 className="text-sm font-medium text-gray-200 truncate group-hover:text-white">
                              {snippet.title}
                            </h3>
                          )}
                          <p className="text-xs text-gray-500 mt-1 truncate">{snippet.description}</p>
                        </div>
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(snippet.id);
                            }}
                            className="p-1 hover:bg-slate-600 rounded"
                          >
                            <Star
                              className={`w-4 h-4 ${
                                snippet.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-500'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs ${languageColors[snippet.language]}`}>
                          {languageIcons[snippet.language]}
                        </span>
                        <div className="flex gap-1">
                          {snippet.tags.slice(0, 2).map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 bg-slate-700 rounded text-xs text-gray-400"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* New Snippet Button */}
          <div className="p-3 border-t border-slate-700">
            <button
              onClick={() => setShowNewSnippetModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-500 hover:to-gray-600 rounded-lg text-sm font-medium text-white transition-all"
            >
              <Plus className="w-4 h-4" />
              {t('codeAssistant.newSnippet')}
            </button>
          </div>
        </aside>

        {/* Center Editor */}
        <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
          {activeSnippet ? (
            <>
              {/* Tabs */}
              <div className="flex items-center bg-slate-900 border-b border-slate-700 overflow-x-auto">
                {openTabs.map((tabId) => {
                  const snippet = snippets.find((s) => s.id === tabId);
                  if (!snippet) return null;
                  return (
                    <div
                      key={tabId}
                      onClick={() => setActiveSnippet(tabId)}
                      className={`flex items-center gap-2 px-4 py-2 border-r border-slate-700 cursor-pointer transition-colors min-w-fit ${
                        activeSnippetId === tabId
                          ? 'bg-slate-800 text-white'
                          : 'text-gray-400 hover:bg-slate-800/50 hover:text-gray-200'
                      }`}
                    >
                      <span className={`text-xs ${languageColors[snippet.language]}`}>
                        {languageIcons[snippet.language]}
                      </span>
                      <span className="text-sm truncate max-w-[120px]">{snippet.title}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          closeTab(tabId);
                        }}
                        className="p-0.5 hover:bg-slate-700 rounded"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Toolbar */}
              <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-700">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${languageColors[activeSnippet.language]}`}>
                    {languageIcons[activeSnippet.language]}
                  </span>
                  <span className="text-sm text-gray-400">
                    {t(`codeAssistant.languages.${activeSnippet.language}`)}
                  </span>
                  {activeSnippet.aiGenerated && (
                    <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-xs">
                      AI
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleCopyCode}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    title={t('codeAssistant.copy')}
                  >
                    <Copy className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={handleDownloadCode}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    title={t('codeAssistant.download')}
                  >
                    <Download className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={handleRunCode}
                    className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
                    title={t('codeAssistant.run')}
                  >
                    <Play className="w-4 h-4 text-green-400" />
                  </button>
                </div>
              </div>

              {/* Editor Area */}
              <div className="flex-1 flex overflow-hidden">
                {/* Line Numbers */}
                {settings.lineNumbers && (
                  <div className="w-12 bg-slate-900 border-r border-slate-800 py-4 text-right pr-3 select-none shrink-0">
                    {activeSnippet.code.split('\n').map((_, i) => (
                      <div
                        key={i}
                        className="text-xs text-gray-600 leading-relaxed"
                      >
                        {i + 1}
                      </div>
                    ))}
                  </div>
                )}

                {/* Code Editor */}
                <div className="flex-1 relative">
                  <textarea
                    ref={textareaRef}
                    value={activeSnippet.code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    className="absolute inset-0 w-full h-full p-4 bg-transparent text-transparent caret-white resize-none focus:outline-none font-mono text-sm leading-relaxed z-10"
                    spellCheck={false}
                    style={{ fontSize: settings.fontSize }}
                  />
                  <div className="absolute inset-0 p-4 pointer-events-none overflow-auto">
                    <SyntaxHighlighter code={activeSnippet.code} language={activeSnippet.language} />
                  </div>
                </div>
              </div>

              {/* AI Action Bar */}
              <div className="px-4 py-2 bg-slate-900 border-t border-slate-700">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-gray-500 mr-2">AI:</span>
                  {[
                    { key: 'explain', icon: AlignLeft, label: t('codeAssistant.explain') },
                    { key: 'refactor', icon: Wand2, label: t('codeAssistant.refactor') },
                    { key: 'debug', icon: Bug, label: t('codeAssistant.debug') },
                    { key: 'optimize', icon: Zap, label: t('codeAssistant.optimize') },
                    { key: 'generateTests', icon: FileCode, label: t('codeAssistant.generateTests') },
                    { key: 'addComments', icon: MessageSquare, label: t('codeAssistant.addComments') },
                  ].map((action) => (
                    <button
                      key={action.key}
                      onClick={() => handleAiAction(action.key)}
                      disabled={isGenerating}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 rounded-lg text-xs text-gray-300 transition-colors"
                    >
                      <action.icon className="w-3.5 h-3.5" />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Code2 className="w-16 h-16 mx-auto mb-4 text-slate-700" />
                <p className="text-gray-500">{t('codeAssistant.noSnippets')}</p>
                <button
                  onClick={() => setShowNewSnippetModal(true)}
                  className="mt-4 px-4 py-2 bg-gradient-to-r from-slate-600 to-gray-700 rounded-lg text-sm text-white hover:from-slate-500 hover:to-gray-600 transition-all"
                >
                  {t('codeAssistant.createFirst')}
                </button>
              </div>
            </div>
          )}

          {/* Bottom Console Panel */}
          <AnimatePresence>
            {isConsoleOpen && (
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 200 }}
                exit={{ height: 0 }}
                className="border-t border-slate-700 bg-slate-900 overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-2 bg-slate-800 border-b border-slate-700">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-300">{t('codeAssistant.console')}</span>
                  </div>
                  <button
                    onClick={() => setIsConsoleOpen(false)}
                    className="p-1 hover:bg-slate-700 rounded"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                </div>
                <div className="p-4 h-[calc(100%-40px)] overflow-y-auto font-mono text-sm">
                  {consoleOutput.length === 0 ? (
                    <p className="text-gray-500">{t('codeAssistant.console')} ready...</p>
                  ) : (
                    consoleOutput.map((line, i) => (
                      <div
                        key={i}
                        className={`${
                          line.startsWith('>') ? 'text-green-400' : 'text-gray-300'
                        }`}
                      >
                        {line}
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Right AI Chat Panel */}
        <aside className="w-80 bg-slate-900 border-l border-slate-700 flex flex-col shrink-0">
          <div className="p-3 border-b border-slate-700">
            <h2 className="text-sm font-medium text-gray-200">{t('codeAssistant.aiChat')}</h2>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {!activeConversation || activeConversation.messages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Sparkles className="w-10 h-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">{t('codeAssistant.codeContext')}</p>
                <p className="text-xs mt-2">{t('codeAssistant.placeholder')}</p>
              </div>
            ) : (
              activeConversation.messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[90%] p-3 rounded-lg text-sm ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-slate-600 to-gray-700 text-white'
                        : 'bg-slate-800 text-gray-200'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{message.content}</div>
                    {message.codeContext && (
                      <div className="mt-2 p-2 bg-slate-900/50 rounded text-xs text-gray-400 truncate">
                        {t('codeAssistant.codeContext')}: {message.codeContext.slice(0, 50)}...
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            {isGenerating && (
              <div className="flex justify-start">
                <div className="p-3 bg-slate-800 rounded-lg">
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input */}
          <div className="p-3 border-t border-slate-700">
            <div className="flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleChatSubmit()}
                placeholder={t('codeAssistant.placeholder')}
                disabled={!activeSnippet || isGenerating}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-slate-500 disabled:opacity-50"
              />
              <button
                onClick={handleChatSubmit}
                disabled={!chatInput.trim() || !activeSnippet || isGenerating}
                className="p-2 bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-500 hover:to-gray-600 disabled:opacity-50 rounded-lg transition-all"
              >
                <Send className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setIsSettingsOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-xl border border-slate-700 p-6 w-96"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">{t('codeAssistant.settings')}</h2>
                <button
                  onClick={() => setIsSettingsOpen(false)}
                  className="p-1 hover:bg-slate-800 rounded"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('codeAssistant.theme')}</label>
                  <select
                    value={settings.theme}
                    onChange={(e) => updateSettings({ theme: e.target.value as typeof settings.theme })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-gray-200"
                  >
                    <option value="vs-dark">VS Dark</option>
                    <option value="vs-light">VS Light</option>
                    <option value="hc-black">High Contrast</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('codeAssistant.fontSize')}</label>
                  <input
                    type="range"
                    min={10}
                    max={20}
                    value={settings.fontSize}
                    onChange={(e) => updateSettings({ fontSize: parseInt(e.target.value) })}
                    className="w-full"
                  />
                  <span className="text-sm text-gray-500">{settings.fontSize}px</span>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('codeAssistant.tabSize')}</label>
                  <select
                    value={settings.tabSize}
                    onChange={(e) => updateSettings({ tabSize: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-gray-200"
                  >
                    <option value={2}>2 spaces</option>
                    <option value={4}>4 spaces</option>
                    <option value={8}>8 spaces</option>
                  </select>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{t('codeAssistant.wordWrap')}</span>
                  <button
                    onClick={() => updateSettings({ wordWrap: !settings.wordWrap })}
                    className={`w-10 h-5 rounded-full transition-colors ${
                      settings.wordWrap ? 'bg-slate-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.wordWrap ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">{t('codeAssistant.lineNumbers')}</span>
                  <button
                    onClick={() => updateSettings({ lineNumbers: !settings.lineNumbers })}
                    className={`w-10 h-5 rounded-full transition-colors ${
                      settings.lineNumbers ? 'bg-slate-600' : 'bg-slate-700'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.lineNumbers ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Snippet Modal */}
      <AnimatePresence>
        {showNewSnippetModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={() => setShowNewSnippetModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 rounded-xl border border-slate-700 p-6 w-[600px] max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">{t('codeAssistant.newSnippet')}</h2>
                <button
                  onClick={() => setShowNewSnippetModal(false)}
                  className="p-1 hover:bg-slate-800 rounded"
                >
                  <X className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('codeAssistant.snippets')} {t('common.search')}</label>
                  <input
                    type="text"
                    value={newSnippetData.title}
                    onChange={(e) => setNewSnippetData({ ...newSnippetData, title: e.target.value })}
                    placeholder="Snippet name"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('codeAssistant.filterByLanguage')}</label>
                  <select
                    value={newSnippetData.language}
                    onChange={(e) => setNewSnippetData({ ...newSnippetData, language: e.target.value as Language })}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-gray-200"
                  >
                    {languages.map((lang) => (
                      <option key={lang} value={lang}>
                        {t(`codeAssistant.languages.${lang}`)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('common.search')} Tags (comma separated)</label>
                  <input
                    type="text"
                    value={newSnippetData.tags}
                    onChange={(e) => setNewSnippetData({ ...newSnippetData, tags: e.target.value })}
                    placeholder="react, hooks, typescript"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('common.search')} Description</label>
                  <input
                    type="text"
                    value={newSnippetData.description}
                    onChange={(e) => setNewSnippetData({ ...newSnippetData, description: e.target.value })}
                    placeholder="Brief description of the snippet"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">{t('codeAssistant.editor')}</label>
                  <textarea
                    value={newSnippetData.code}
                    onChange={(e) => setNewSnippetData({ ...newSnippetData, code: e.target.value })}
                    placeholder="Paste your code here..."
                    rows={10}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-slate-500 font-mono"
                  />
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowNewSnippetModal(false)}
                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    onClick={handleCreateSnippet}
                    disabled={!newSnippetData.title || !newSnippetData.code}
                    className="px-4 py-2 bg-gradient-to-r from-slate-600 to-gray-700 hover:from-slate-500 hover:to-gray-600 disabled:opacity-50 rounded-lg text-sm text-white transition-all"
                  >
                    {t('codeAssistant.save')}
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
