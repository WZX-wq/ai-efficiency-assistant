import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '../../components/SeoHead';
import { chatWithAiStream, type ChatMessage } from '../../services/aiChat';
import { useAppStore } from '../../store/appStore';
import { useToast } from '../../components/ToastProvider';

// ============================================================
// Types
// ============================================================

type AnalysisMode = 'summary' | 'extraction' | 'qa' | 'compare';

interface FileInfo {
  name: string;
  size: number;
  type: string;
  content: string;
}

interface QaMessage {
  role: 'user' | 'assistant';
  content: string;
}

const ACCEPTED_TYPES = [
  'text/plain',
  'text/markdown',
  'text/csv',
  'application/json',
  'text/x-markdown',
];

const ACCEPTED_EXTENSIONS = ['.txt', '.md', '.json', '.csv'];
const MAX_FILE_SIZE = 500 * 1024; // 500KB

const MODES: { key: AnalysisMode; label: string }[] = [
  { key: 'summary', label: '智能摘要' },
  { key: 'extraction', label: '关键信息提取' },
  { key: 'qa', label: '文档问答' },
  { key: 'compare', label: '文档对比' },
];

const TIPS = [
  '支持 .txt、.md、.json、.csv 格式，最大 500KB',
  '也可以直接粘贴文本内容进行分析',
  '文档问答模式下，可以针对文档内容连续提问',
  '文档对比模式需要上传两个文件进行差异分析',
];

const RELATED = [
  { to: '/workspace/summarizer', label: '内容总结' },
  { to: '/workspace/polish', label: '文章润色' },
];

// ============================================================
// Helpers
// ============================================================

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx).toLowerCase() : '';
}

function isAcceptedFile(file: File): boolean {
  if (ACCEPTED_TYPES.includes(file.type)) return true;
  const ext = getFileExtension(file.name);
  return ACCEPTED_EXTENSIONS.includes(ext);
}

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

function getSystemPrompt(mode: AnalysisMode): string {
  switch (mode) {
    case 'summary':
      return `你是一个专业的文档分析专家。请对用户提供的文档内容生成结构化摘要。

请严格按照以下格式输出：

## 概述
（用2-3句话概括文档的整体内容和主题）

## 核心观点
（列出文档的3-5个核心观点，每个观点用一句话概括）

## 关键数据
（提取文档中所有重要的数据、数字、百分比、金额等信息，以列表形式呈现）

## 结论建议
（总结文档的结论，并给出相关的建议或行动项）

请确保摘要准确、简洁、结构清晰。如果文档中没有某些类别的信息，请标注"未提及"。`;

    case 'extraction':
      return `你是一个专业的信息提取专家。请从用户提供的文档中提取关键信息，并按类别整理。

请严格按照以下格式输出：

## 实体/组织
（提取文档中提到的公司、机构、组织名称）

## 人物
（提取文档中提到的人物姓名及其角色/身份）

## 时间/日期
（提取文档中所有时间节点、日期、期限）

## 数字/数据
（提取文档中的关键数字、统计数据、金额、百分比等）

## 专业术语
（提取文档中的专业术语、行业名词，并附简要解释）

## 关键短语
（提取文档中的关键短语和重要表述）

请确保提取的信息准确、完整，以列表形式呈现。如果某类别无相关信息，标注"未提及"。`;

    case 'qa':
      return `你是一个专业的文档问答助手。用户会提供一份文档内容，然后针对文档提出问题。请基于文档内容准确回答用户的问题。

回答要求：
1. 仅基于文档内容回答，不要编造信息
2. 如果文档中没有相关信息，请明确告知
3. 回答要简洁明了，引用文档中的具体内容时请标注
4. 如果用户的问题不明确，可以请求澄清`;

    case 'compare':
      return `你是一个专业的文档对比分析专家。用户会提供两份文档，请对比分析它们的差异。

请严格按照以下格式输出：

## 总体差异概述
（用2-3句话概括两份文档的主要差异）

## 内容差异
（逐项列出两份文档在内容上的具体差异）

## 结构差异
（对比两份文档在结构、组织方式上的差异）

## 数据差异
（对比两份文档中的数据、数字、统计信息的差异）

## 总结
（总结两份文档各自的优缺点或适用场景）

请确保对比客观、准确、全面。`;

    default:
      return '';
  }
}

// ============================================================
// Component
// ============================================================

export default function DocAnalysisTool() {
  useSeo('docAnalysis');

  const { addWordsGenerated, incrementActions, addRecentTool } = useAppStore();
  const { toast } = useToast();

  // State
  const [mode, setMode] = useState<AnalysisMode>('summary');
  const [file, setFile] = useState<FileInfo | null>(null);
  const [file2, setFile2] = useState<FileInfo | null>(null); // for compare mode
  const [pastedText, setPastedText] = useState('');
  const [result, setResult] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDragging2, setIsDragging2] = useState(false);
  const [qaQuestion, setQaQuestion] = useState('');
  const [qaHistory, setQaHistory] = useState<QaMessage[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const file2InputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Track tool usage
  useEffect(() => {
    addRecentTool('doc-analysis');
  }, [addRecentTool]);

  // Auto-scroll result
  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [result]);

  // Get document content
  const getDocContent = useCallback((): string => {
    if (file) return file.content;
    return pastedText.trim();
  }, [file, pastedText]);

  // Handle file selection
  const handleFile = useCallback(async (selectedFile: File, setFileFn: (f: FileInfo | null) => void) => {
    if (!isAcceptedFile(selectedFile)) {
      toast('不支持的文件格式，请上传 .txt、.md、.json、.csv 文件', 'error');
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      toast('文件大小超过 500KB 限制', 'error');
      return;
    }
    try {
      const content = await readFileAsText(selectedFile);
      setFileFn({
        name: selectedFile.name,
        size: selectedFile.size,
        type: getFileExtension(selectedFile.name),
        content,
      });
    } catch {
      toast('文件读取失败，请重试', 'error');
    }
  }, [toast]);

  // Drag & drop handlers
  const handleDragOver = useCallback((e: React.DragEvent, setDragging: (v: boolean) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent, setDragging: (v: boolean) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, setDragging: (v: boolean) => void, setFileFn: (f: FileInfo | null) => void) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFile(droppedFile, setFileFn);
  }, [handleFile]);

  // Stop streaming
  const stopStreaming = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  // Run analysis
  const runAnalysis = useCallback(async () => {
    const docContent = getDocContent();
    if (!docContent) {
      toast('请先上传文件或粘贴文本内容', 'warning');
      return;
    }

    if (mode === 'compare' && !file2 && !pastedText) {
      toast('文档对比模式需要上传两个文件', 'warning');
      return;
    }

    // For QA mode, need a question
    if (mode === 'qa' && !qaQuestion.trim()) {
      toast('请输入您的问题', 'warning');
      return;
    }

    setIsStreaming(true);
    setResult('');
    incrementActions();

    const abort = new AbortController();
    abortRef.current = abort;

    let userMessage = '';
    if (mode === 'qa') {
      userMessage = qaQuestion.trim();
    } else if (mode === 'compare') {
      const doc2 = file2 ? file2.content : pastedText.trim();
      userMessage = `文档A：\n${docContent}\n\n---\n\n文档B：\n${doc2}`;
    } else {
      userMessage = docContent;
    }

    const messages: ChatMessage[] = [];
    if (mode === 'qa') {
      // Include document as context in first message
      messages.push({ role: 'user', content: `文档内容：\n${docContent}\n\n---\n\n我的问题：${qaQuestion.trim()}` });
      messages.push(...qaHistory.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })));
    } else {
      messages.push({ role: 'user', content: userMessage });
    }

    const response = await chatWithAiStream(
      {
        messages,
        systemPrompt: getSystemPrompt(mode),
        temperature: 0.3,
        maxTokens: 4096,
      },
      abort.signal,
    );

    if (!response.success || !response.stream) {
      toast(response.error || '分析失败，请重试', 'error');
      setIsStreaming(false);
      return;
    }

    const reader = response.stream.getReader();
    let accumulated = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += value;
        setResult(accumulated);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // User cancelled
      } else {
        toast('分析过程中出现错误', 'error');
      }
    }

    addWordsGenerated(accumulated.length);
    setIsStreaming(false);
    abortRef.current = null;

    // For QA mode, save to history
    if (mode === 'qa') {
      setQaHistory(prev => [...prev, { role: 'user', content: qaQuestion.trim() }, { role: 'assistant', content: accumulated }]);
      setQaQuestion('');
    }
  }, [mode, getDocContent, file2, pastedText, qaQuestion, qaHistory, incrementActions, addWordsGenerated, toast]);

  // Copy result
  const copyResult = useCallback(() => {
    if (!result) return;
    navigator.clipboard.writeText(result).then(() => {
      toast('分析结果已复制到剪贴板', 'success');
    }).catch(() => {
      toast('复制失败', 'error');
    });
  }, [result, toast]);

  // Export report
  const exportReport = useCallback(() => {
    if (!result) return;
    const modeLabels: Record<AnalysisMode, string> = {
      summary: '智能摘要',
      extraction: '关键信息提取',
      qa: '文档问答',
      compare: '文档对比',
    };
    const report = `# AI文档分析报告\n\n分析模式：${modeLabels[mode]}\n分析时间：${new Date().toLocaleString('zh-CN')}\n${file ? `文件名：${file.name}\n` : ''}\n---\n\n${result}`;
    const blob = new Blob([report], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `doc-analysis-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast('报告已导出', 'success');
  }, [result, mode, file, toast]);

  // Re-analyze
  const reAnalyze = useCallback(() => {
    if (mode === 'qa') {
      setQaHistory([]);
    }
    setResult('');
  }, [mode]);

  // Remove file
  const removeFile = useCallback(() => {
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removeFile2 = useCallback(() => {
    setFile2(null);
    if (file2InputRef.current) file2InputRef.current.value = '';
  }, []);

  // File type icon
  const getFileIcon = (type: string) => {
    switch (type) {
      case '.json': return '{ }';
      case '.csv': return '📊';
      case '.md': return '📝';
      default: return '📄';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-28 pb-10 sm:pt-32 sm:pb-12">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-rose-100/60 via-rose-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-rose-100/40 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-rose-600 transition-colors">
              工具
            </Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">文档分析</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-rose-600 via-rose-500 to-rose-600 bg-clip-text text-transparent">
              AI 文档分析
            </span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            上传文档或粘贴文本，AI 智能分析内容，生成摘要、提取关键信息、支持问答与对比
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Mode Tabs */}
          <div className="flex flex-wrap gap-2 mb-6">
            {MODES.map((m) => (
              <button
                key={m.key}
                onClick={() => { setMode(m.key); setResult(''); setQaHistory([]); setQaQuestion(''); }}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  mode === m.key
                    ? 'bg-rose-500 text-white shadow-md shadow-rose-200 dark:shadow-rose-900/30'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 dark:hover:text-rose-400'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Two Panel Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Panel - Document Input */}
            <div className="space-y-4">
              {/* File Upload Area */}
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                  {mode === 'compare' ? '文档 A' : '上传文档'}
                </h3>

                {file ? (
                  <div className="flex items-center gap-3 p-3 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-200 dark:border-rose-800/30">
                    <span className="text-2xl">{getFileIcon(file.type)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file.size)} · {file.type}</p>
                    </div>
                    <button
                      onClick={removeFile}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                      title="移除文件"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <div
                    onDragOver={(e) => handleDragOver(e, setIsDragging)}
                    onDragLeave={(e) => handleDragLeave(e, setIsDragging)}
                    onDrop={(e) => handleDrop(e, setIsDragging, setFile)}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                      isDragging
                        ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/10'
                        : 'border-gray-300 dark:border-gray-700 hover:border-rose-300 dark:hover:border-rose-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.md,.json,.csv"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleFile(f, setFile);
                      }}
                      className="hidden"
                    />
                    <div className="flex flex-col items-center gap-2">
                      <svg className={`w-10 h-10 transition-colors ${isDragging ? 'text-rose-500' : 'text-gray-400 dark:text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {isDragging ? '松开以上传文件' : '拖拽文件到此处，或点击上传'}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        支持 .txt .md .json .csv，最大 500KB
                      </p>
                    </div>
                  </div>
                )}

                {/* Paste text area */}
                {!file && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                      或直接粘贴文本
                    </label>
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="在此粘贴文档内容..."
                      rows={4}
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none resize-none transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Second file upload for compare mode */}
              {mode === 'compare' && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">文档 B</h3>

                  {file2 ? (
                    <div className="flex items-center gap-3 p-3 bg-rose-50 dark:bg-rose-900/10 rounded-xl border border-rose-200 dark:border-rose-800/30">
                      <span className="text-2xl">{getFileIcon(file2.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file2.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatFileSize(file2.size)} · {file2.type}</p>
                      </div>
                      <button
                        onClick={removeFile2}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="移除文件"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => handleDragOver(e, setIsDragging2)}
                      onDragLeave={(e) => handleDragLeave(e, setIsDragging2)}
                      onDrop={(e) => handleDrop(e, setIsDragging2, setFile2)}
                      onClick={() => file2InputRef.current?.click()}
                      className={`relative cursor-pointer border-2 border-dashed rounded-xl p-8 text-center transition-all duration-200 ${
                        isDragging2
                          ? 'border-rose-400 bg-rose-50 dark:bg-rose-900/10'
                          : 'border-gray-300 dark:border-gray-700 hover:border-rose-300 dark:hover:border-rose-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                      }`}
                    >
                      <input
                        ref={file2InputRef}
                        type="file"
                        accept=".txt,.md,.json,.csv"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFile(f, setFile2);
                        }}
                        className="hidden"
                      />
                      <div className="flex flex-col items-center gap-2">
                        <svg className={`w-10 h-10 transition-colors ${isDragging2 ? 'text-rose-500' : 'text-gray-400 dark:text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                        </svg>
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {isDragging2 ? '松开以上传文件' : '拖拽第二个文件到此处'}
                        </p>
                      </div>
                    </div>
                  )}
                {!file2 && (
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">
                      或直接粘贴第二份文档
                    </label>
                    <textarea
                      value={pastedText}
                      onChange={(e) => setPastedText(e.target.value)}
                      placeholder="在此粘贴第二份文档内容..."
                      rows={4}
                      className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none resize-none transition-all"
                    />
                  </div>
                )}
                </div>
              )}

              {/* QA Question Input */}
              {mode === 'qa' && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">输入问题</h3>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={qaQuestion}
                      onChange={(e) => setQaQuestion(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          runAnalysis();
                        }
                      }}
                      placeholder="输入关于文档的问题..."
                      className="flex-1 px-3 py-2.5 text-sm bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none transition-all"
                    />
                    <button
                      onClick={runAnalysis}
                      disabled={isStreaming || !getDocContent() || !qaQuestion.trim()}
                      className="px-4 py-2.5 bg-rose-500 text-white text-sm font-medium rounded-xl hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                    >
                      {isStreaming ? '分析中...' : '提问'}
                    </button>
                  </div>
                </div>
              )}

              {/* Action Button (non-QA modes) */}
              {mode !== 'qa' && (
                <div className="flex gap-3">
                  <button
                    onClick={runAnalysis}
                    disabled={isStreaming || !getDocContent() || (mode === 'compare' && !file2 && !pastedText)}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-rose-500 text-white font-medium rounded-xl hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md shadow-rose-200 dark:shadow-rose-900/20"
                  >
                    {isStreaming ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        分析中...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
                        </svg>
                        开始分析
                      </>
                    )}
                  </button>
                  {isStreaming && (
                    <button
                      onClick={stopStreaming}
                      className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      停止
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Right Panel - Analysis Result */}
            <div className="space-y-4">
              <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col" style={{ minHeight: '400px' }}>
                {/* Result Header */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    {mode === 'summary' && '分析摘要'}
                    {mode === 'extraction' && '提取结果'}
                    {mode === 'qa' && '问答结果'}
                    {mode === 'compare' && '对比结果'}
                  </h3>
                  {result && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={copyResult}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                        title="复制结果"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9.75a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
                        </svg>
                      </button>
                      <button
                        onClick={exportReport}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                        title="导出报告"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                      </button>
                      <button
                        onClick={reAnalyze}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 transition-colors"
                        title="重新分析"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>

                {/* Result Content */}
                <div
                  ref={resultRef}
                  className="flex-1 px-5 py-4 overflow-y-auto"
                  style={{ maxHeight: '600px' }}
                >
                  {result ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-600 dark:prose-p:text-gray-300 prose-li:text-gray-600 dark:prose-li:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-white">
                      {/* Render markdown-like content */}
                      {result.split('\n').map((line, i) => {
                        if (line.startsWith('## ')) {
                          return <h2 key={i} className="text-base font-bold text-gray-900 dark:text-white mt-4 mb-2">{line.slice(3)}</h2>;
                        }
                        if (line.startsWith('### ')) {
                          return <h3 key={i} className="text-sm font-bold text-gray-900 dark:text-white mt-3 mb-1">{line.slice(4)}</h3>;
                        }
                        if (line.startsWith('- ')) {
                          return <li key={i} className="text-sm text-gray-600 dark:text-gray-300 ml-4 list-disc">{line.slice(2)}</li>;
                        }
                        if (line.startsWith('---')) {
                          return <hr key={i} className="my-3 border-gray-200 dark:border-gray-700" />;
                        }
                        if (line.trim() === '') {
                          return <div key={i} className="h-2" />;
                        }
                        return <p key={i} className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{line}</p>;
                      })}
                      {isStreaming && (
                        <span className="inline-block w-2 h-4 bg-rose-500 animate-pulse ml-0.5 align-middle" />
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full min-h-[300px] text-center">
                      <svg className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                      </svg>
                      <p className="text-sm text-gray-400 dark:text-gray-500">
                        {isStreaming ? '正在分析文档...' : '上传文档或粘贴文本，选择分析模式后开始分析'}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* QA History */}
              {mode === 'qa' && qaHistory.length > 0 && (
                <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-5">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">对话历史</h3>
                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {qaHistory.map((msg, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-xl text-sm ${
                          msg.role === 'user'
                            ? 'bg-rose-50 dark:bg-rose-900/10 text-gray-900 dark:text-white ml-8'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 mr-8'
                        }`}
                      >
                        <span className="text-xs font-medium text-gray-400 dark:text-gray-500 block mb-1">
                          {msg.role === 'user' ? '你' : 'AI'}
                        </span>
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Usage Tips */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">使用技巧</h3>
        <ul className="space-y-2">
          {TIPS.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="text-rose-500 mt-0.5 shrink-0">-</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Related Tools */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">相关工具</h3>
        <div className="flex flex-wrap gap-2">
          {RELATED.map((r) => (
            <Link key={r.to} to={r.to} className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-rose-300 dark:hover:border-rose-700 hover:text-rose-600 transition-colors">
              {r.label} &rarr;
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
