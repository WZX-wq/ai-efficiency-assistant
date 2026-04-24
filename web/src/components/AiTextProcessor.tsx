import { useState, useCallback } from 'react';
import { useAi } from '../hooks/useAi';
import type { AiActionType } from '../types';
import { ACTION_LABELS } from '../types';
import { exportAsMarkdown } from '../utils/export';
import { useAppStore } from '../store/appStore';
import RichTextEditor from './RichTextEditor';

const ACTIONS: { type: AiActionType; icon: JSX.Element; color: string; bgColor: string }[] = [
  {
    type: 'rewrite',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 hover:bg-blue-100 border-blue-200',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    type: 'expand',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
      </svg>
    ),
  },
  {
    type: 'translate',
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 hover:bg-purple-100 border-purple-200',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
      </svg>
    ),
  },
  {
    type: 'summarize',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 hover:bg-amber-100 border-amber-200',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

export default function AiTextProcessor() {
  const [inputText, setInputText] = useState('');
  const [copied, setCopied] = useState(false);
  const [activeAction, setActiveAction] = useState<AiActionType | null>(null);
  const [wordCount, setWordCount] = useState(0);
  const { toggleAiPanel } = useAppStore();

  const { processText, result, error, loading, clearResult, cancelRequest } = useAi();

  const handleProcess = useCallback(
    async (action: AiActionType) => {
      if (!inputText.trim()) return;
      setActiveAction(action);
      await processText({
        text: inputText.trim(),
        action,
      });
      setActiveAction(null);
    },
    [inputText, processText]
  );

  const handleCopy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = result;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  const handleClear = useCallback(() => {
    setInputText('');
    clearResult();
  }, [clearResult]);

  const handleExport = useCallback(() => {
    if (!result) return;
    exportAsMarkdown(result, `AI处理_${new Date().toISOString().slice(0, 10)}`);
  }, [result]);

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 rounded-t-2xl">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse-slow" />
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">AI 就绪</span>
        </div>
        <button
          onClick={toggleAiPanel}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 hover:bg-primary-100 dark:bg-primary-900/20 dark:hover:bg-primary-900/30 rounded-lg transition-colors"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
          </svg>
          AI 助手
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 p-4 min-h-0">
        {/* Input Area - Rich Text Editor */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">输入文本</label>
            <span className="text-xs text-gray-400 dark:text-gray-500">{wordCount} 字</span>
          </div>
          <div className="flex-1 min-h-0">
            <RichTextEditor
              content={inputText}
              onChange={setInputText}
              onWordCount={setWordCount}
              placeholder="在此输入你想要处理的文本内容...&#10;&#10;支持富文本编辑，可使用工具栏设置标题、加粗、列表等格式。&#10;支持智能改写、一键扩写、多语言翻译和内容总结。"
              className="h-full [&_.tiptap]:min-h-full"
            />
          </div>
        </div>

        {/* Action Buttons (Middle) */}
        <div className="flex lg:flex-col items-center justify-center gap-2 lg:gap-3">
          {ACTIONS.map((action) => (
            <button
              key={action.type}
              onClick={() => handleProcess(action.type)}
              disabled={!inputText.trim() || loading}
              className={`flex items-center gap-2 px-4 py-2.5 lg:flex-col lg:px-4 lg:py-3 rounded-xl border text-sm font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed ${action.bgColor} ${action.color} ${
                activeAction === action.type && loading ? 'ring-2 ring-offset-2 ring-primary-400 scale-95' : 'hover:scale-105'
              }`}
              title={ACTION_LABELS[action.type]}
            >
              {loading && activeAction === action.type ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              ) : (
                action.icon
              )}
              <span className="hidden lg:block text-xs">{ACTION_LABELS[action.type]}</span>
            </button>
          ))}
        </div>

        {/* Output Area */}
        <div className="flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">处理结果</label>
            <div className="flex items-center gap-2">
              {result && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  {copied ? (
                    <>
                      <svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      已复制
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      复制
                    </>
                  )}
                </button>
              )}
              {result && (
                <button
                  onClick={handleExport}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-md transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                  </svg>
                  导出
                </button>
              )}
              {(result || error) && (
                <button
                  onClick={handleClear}
                  className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-red-600 bg-gray-50 dark:bg-gray-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-md transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  清空
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-200 leading-relaxed bg-gray-50 dark:bg-gray-700 overflow-auto flex flex-col">
            {loading && !result && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <svg className="w-8 h-8 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span className="text-sm">AI 正在处理中...</span>
                <button
                  onClick={cancelRequest}
                  className="mt-1 px-4 py-1.5 text-xs font-medium text-red-500 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                >
                  取消生成
                </button>
              </div>
            )}
            {error && !loading && (
              <div className="flex flex-col items-center justify-center h-full gap-3">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-red-500 text-center">{error}</p>
              </div>
            )}
            {result && !loading && (
              <>
                <div className="whitespace-pre-wrap animate-fade-in flex-1">{result}</div>
                <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span className="text-xs text-gray-400 dark:text-gray-500">
                    共 {result.length} 字 | 约 {Math.round(result.length / 1.5)} Tokens
                  </span>
                </div>
              </>
            )}
            {result && loading && (
              <div className="whitespace-pre-wrap">{result}<span className="inline-block w-1.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle" /></div>
            )}
            {!result && !error && !loading && (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
                <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <p className="text-sm text-center">处理结果将显示在这里</p>
                <p className="text-xs text-center">输入文本并选择操作按钮开始</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
