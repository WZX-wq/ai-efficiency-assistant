import { useState, useCallback, useRef, useEffect } from 'react';
import { exportAsMarkdown, exportAsText, exportFile } from '../utils/export';
import { useAppStore } from '../store/appStore';
import { getModelConfig } from '../services/api';
import MarkdownRenderer from './MarkdownRenderer';

const BACKEND_API_URL = import.meta.env.VITE_API_URL || 'https://ai-efficiency-assistant-1.onrender.com/api';

interface Field {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  placeholder?: string;
  options?: { label: string; value: string }[];
  required?: boolean;
}

interface HistoryItem {
  id: number;
  result: string;
  timestamp: Date;
  formSummary: string;
}

interface PlanGeneratorProps {
  title: string;
  description: string;
  accentColor?: string;
  systemPrompt: string;
  fields: Field[];
}

type OutputLength = 'short' | 'medium' | 'long';

const OUTPUT_LENGTH_OPTIONS: { value: OutputLength; label: string; tokens: number; desc: string }[] = [
  { value: 'short', label: '简短', tokens: 512, desc: '适合标题、口号等' },
  { value: 'medium', label: '标准', tokens: 2048, desc: '适合一般文案' },
  { value: 'long', label: '详细', tokens: 4096, desc: '适合长文、方案等' },
];

const MAX_HISTORY = 5;

export default function PlanGenerator({
  title,
  description,
  accentColor = 'primary',
  systemPrompt,
  fields,
}: PlanGeneratorProps) {
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [result, setResult] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [toast, setToast] = useState('');
  const [outputLength, setOutputLength] = useState<OutputLength>('medium');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<number | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const historyIdCounterRef = useRef(0);
  const { addWordsGenerated, incrementActions, addRecentTool } = useAppStore();

  useEffect(() => {
    addRecentTool(title);
  }, [title, addRecentTool]);

  // 停止生成
  const handleStopGeneration = useCallback(() => {
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    setLoading(false);
    setToast('已停止生成');
    setTimeout(() => setToast(''), 2000);
  }, []);

  // 导出下拉菜单点击外部关闭
  useEffect(() => {
    if (!showExport) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (exportDropdownRef.current && !exportDropdownRef.current.contains(e.target as Node)) {
        setShowExport(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showExport]);

  // 错误自动消失
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const updateField = useCallback((name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleGenerate = useCallback(async () => {
    // 验证必填字段
    const missingFields = fields.filter(f => f.required && !formData[f.name]?.trim());
    if (missingFields.length > 0) {
      setError(`请填写：${missingFields.map(f => f.label).join('、')}`);
      return;
    }

    // 如果有上一次的请求，先取消
    abortControllerRef.current?.abort();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError('');
    setResult('');
    setActiveHistoryId(null);
    incrementActions();

    // 记录表单摘要用于历史记录
    const formSummary = fields
      .map(f => `${f.label}: ${formData[f.name]?.slice(0, 20) || '未提供'}${(formData[f.name]?.length || 0) > 20 ? '...' : ''}`)
      .join(' | ');

    try {
      // 构建用户输入
      const userContent = fields
        .map(f => `${f.label}：${formData[f.name] || '未提供'}`)
        .join('\n');

      // 构建消息：使用模板的 systemPrompt 作为 system role，用户数据作为 user role
      const systemMessage = systemPrompt || '你是一个专业的AI内容创作助手。请用中文回答，输出格式清晰，使用Markdown格式。';

      const maxTokens = OUTPUT_LENGTH_OPTIONS.find(o => o.value === outputLength)?.tokens ?? 2048;

      const { baseUrl, apiKey, model } = getModelConfig();

      const requestBody = {
        model,
        messages: [
          { role: 'system', content: systemMessage },
          { role: 'user', content: userContent },
        ],
        stream: true,
        max_tokens: maxTokens,
      };

      let resp: Response | null = null;

      // 优先通过后端代理调用（流式）
      try {
        const backendResp = await fetch(`${BACKEND_API_URL}/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
        if (backendResp.ok) {
          resp = backendResp;
        }
      } catch {
        // 后端不可用，继续回退到直连
      }

      // 直连回退（流式）
      if (!resp) {
        resp = await fetch(baseUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });
      }

      if (!resp.ok) throw new Error(`API 请求失败 (${resp.status})`);

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      let accumulated = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') continue;
            try {
              const json = JSON.parse(data);
              const delta = json.choices?.[0]?.delta?.content || '';
              accumulated += delta;
              setResult(accumulated);
            } catch { /* skip */ }
          }
        }
      }

      if (!accumulated) {
        // 非流式回退：优先通过后端代理
        const fallbackBody = {
          model,
          messages: [
            { role: 'system', content: systemMessage },
            { role: 'user', content: userContent },
          ],
          max_tokens: maxTokens,
        };

        let fallbackOk = false;
        try {
          const fallbackResp = await fetch(`${BACKEND_API_URL}/ai/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(fallbackBody),
            signal: controller.signal,
          });
          if (fallbackResp.ok) {
            const fallbackJson = await fallbackResp.json();
            accumulated = fallbackJson.choices?.[0]?.message?.content || '';
            if (accumulated) {
              setResult(accumulated);
              fallbackOk = true;
            }
          }
        } catch {
          // 后端不可用，继续回退到直连
        }

        // 直连回退（非流式）
        if (!fallbackOk) {
          const fallbackResp = await fetch(baseUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify(fallbackBody),
            signal: controller.signal,
          });
          const fallbackJson = await fallbackResp.json();
          accumulated = fallbackJson.choices?.[0]?.message?.content || '未生成有效内容';
          setResult(accumulated);
        }
      }

      addWordsGenerated(accumulated.length);

      // 生成成功后添加到历史记录
      if (accumulated) {
        historyIdCounterRef.current += 1;
        const newId = historyIdCounterRef.current;
        const newItem: HistoryItem = {
          id: newId,
          result: accumulated,
          timestamp: new Date(),
          formSummary,
        };
        setHistory(prev => {
          const updated = [...prev, newItem];
          return updated.length > MAX_HISTORY ? updated.slice(updated.length - MAX_HISTORY) : updated;
        });
        setActiveHistoryId(newId);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // 用户主动取消，不设置错误
      } else {
        setError(err instanceof Error ? err.message : '生成失败，请稍后重试');
      }
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  }, [formData, fields, systemPrompt, outputLength, addWordsGenerated, incrementActions]);

  // 切换历史版本
  const handleSwitchHistory = useCallback((item: HistoryItem) => {
    setActiveHistoryId(item.id);
    setResult(item.result);
  }, []);

  // Ctrl+Enter / Cmd+Enter 快捷键
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !loading) {
        e.preventDefault();
        handleGenerate();
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [loading, handleGenerate]);

  const handleCopy = useCallback(async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = result;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [result]);

  const handleExportMarkdown = useCallback(() => {
    if (!result) return;
    exportAsMarkdown(result, `${title}_${new Date().toISOString().slice(0, 10)}`);
    setShowExport(false);
  }, [result, title]);

  const handleExportText = useCallback(() => {
    if (!result) return;
    exportAsText(result, `${title}_${new Date().toISOString().slice(0, 10)}`);
    setShowExport(false);
  }, [result, title]);

  const handleExportHtml = useCallback(() => {
    if (!result) return;
    const html = `<!DOCTYPE html><html lang="zh-CN"><head><meta charset="UTF-8"><title>${title}</title><style>body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.8;color:#333}h1{color:#1a1a1a}pre{background:#f5f5f5;padding:16px;border-radius:8px;overflow-x:auto}code{background:#f0f0f0;padding:2px 6px;border-radius:4px;font-size:0.9em}</style></head><body><h1>${title}</h1><div>${result.replace(/\n/g, '<br>')}</div></body></html>`;
    exportFile(html, `${title}_${new Date().toISOString().slice(0, 10)}`, '.html', 'text/html;charset=utf-8');
    setShowExport(false);
  }, [result, title]);

  const colorMap: Record<string, { bg: string; text: string; border: string; gradient: string }> = {
    primary: { bg: 'bg-primary-50 dark:bg-primary-900/20', text: 'text-primary-600 dark:text-primary-400', border: 'border-primary-200 dark:border-primary-800', gradient: 'from-primary-500 to-primary-600' },
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', gradient: 'from-blue-500 to-blue-600' },
    violet: { bg: 'bg-violet-50 dark:bg-violet-900/20', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-200 dark:border-violet-800', gradient: 'from-violet-500 to-violet-600' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', gradient: 'from-emerald-500 to-emerald-600' },
    amber: { bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', gradient: 'from-amber-500 to-amber-600' },
    rose: { bg: 'bg-rose-50 dark:bg-rose-900/20', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-200 dark:border-rose-800', gradient: 'from-rose-500 to-rose-600' },
  };

  const colors = colorMap[accentColor] || colorMap.primary;

  return (
    <div ref={containerRef} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
      {/* Header */}
      <div className={`px-6 py-5 border-b ${colors.border} bg-gradient-to-r ${colors.bg} to-transparent`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br ${colors.gradient} text-white shadow-sm`}>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="px-6 py-5 space-y-4">
        {fields.map((field) => (
          <div key={field.name}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {field.label}
              {field.required && <span className="text-red-400 ml-0.5">*</span>}
            </label>
            {field.type === 'textarea' ? (
              <div>
                <textarea
                  value={formData[field.name] || ''}
                  onChange={(e) => updateField(field.name, e.target.value)}
                  placeholder={field.placeholder}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-200 leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-gray-400 bg-gray-50 dark:bg-gray-700"
                />
                <div className="mt-1 text-right text-xs text-gray-400 dark:text-gray-500">
                  已输入 {(formData[field.name] || '').length} 字
                </div>
              </div>
            ) : field.type === 'select' ? (
              <select
                value={formData[field.name] || ''}
                onChange={(e) => updateField(field.name, e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all bg-gray-50 dark:bg-gray-700"
              >
                <option value="">{field.placeholder || '请选择'}</option>
                {field.options?.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={formData[field.name] || ''}
                onChange={(e) => updateField(field.name, e.target.value)}
                placeholder={field.placeholder}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all placeholder:text-gray-400 bg-gray-50 dark:bg-gray-700"
              />
            )}
          </div>
        ))}

        {/* 输出长度选择器 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            输出长度
          </label>
          <div className="flex gap-2">
            {OUTPUT_LENGTH_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => setOutputLength(option.value)}
                className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium border transition-all ${
                  outputLength === option.value
                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/20'
                    : 'border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
                title={option.desc}
              >
                <div className="font-semibold">{option.label}</div>
                <div className="mt-0.5 opacity-70">{option.tokens} tokens</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-3 bg-gradient-to-r from-primary-600 to-primary-700 text-white text-sm font-semibold rounded-xl hover:from-primary-700 hover:to-primary-800 transition-all shadow-md shadow-primary-500/20 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              AI 生成中...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z" />
              </svg>
              AI 智能生成
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mx-6 mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-sm text-red-600 dark:text-red-400 animate-fade-in">
          {error}
        </div>
      )}

      {/* Result */}
      {(result || loading) && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          {/* 历史记录标签栏 */}
          {history.length > 0 && (
            <div className="flex items-center gap-1 px-6 pt-3 overflow-x-auto">
              {history.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => handleSwitchHistory(item)}
                  className={`flex-shrink-0 px-3 py-1.5 text-xs rounded-lg border transition-all whitespace-nowrap ${
                    activeHistoryId === item.id
                      ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 font-medium'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                  title={item.formSummary}
                >
                  版本 {index + 1} &middot; {item.timestamp.getHours().toString().padStart(2, '0')}:{item.timestamp.getMinutes().toString().padStart(2, '0')}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between px-6 py-3 bg-gray-50 dark:bg-gray-750">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              生成结果
              {result && (
                <span className="ml-2 text-xs text-gray-400">
                  {result.length} 字 &middot; 约 {Math.round(result.length / 1.5)} Tokens
                </span>
              )}
            </span>
            {result && !loading && (
              <div className="flex items-center gap-1 relative">
                <button onClick={handleGenerate} className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors" title="重新生成">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                  重新生成
                </button>
                <button onClick={handleCopy} className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors">
                  {copied ? (
                    <><svg className="w-3.5 h-3.5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>已复制</>
                  ) : (
                    <><svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.666 5.26l2.488 2.488m0 0a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" /></svg>复制</>
                  )}
                </button>
                <div ref={exportDropdownRef} className="relative">
                  <button onClick={() => setShowExport(!showExport)} className="flex items-center gap-1 px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg transition-colors">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" /></svg>
                    导出
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
                  </button>
                  {showExport && (
                    <div className="absolute right-0 top-full mt-1 w-36 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-lg py-1 z-10 animate-fade-in">
                      <button onClick={handleExportMarkdown} className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">导出 Markdown (.md)</button>
                      <button onClick={handleExportText} className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">导出纯文本 (.txt)</button>
                      <button onClick={handleExportHtml} className="w-full text-left px-3 py-2 text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600">导出网页 (.html)</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div ref={resultRef} className="px-6 py-4 max-h-[500px] overflow-y-auto">
            {result ? (
              <div className="animate-fade-in">
                <MarkdownRenderer content={result} />
                {loading && <span className="inline-block w-1.5 h-4 bg-gray-400 animate-pulse ml-0.5 align-middle" />}
              </div>
            ) : loading ? (
              <div className="flex items-center justify-between py-8">
                <div className="flex items-center gap-3 text-gray-400">
                  <svg className="w-5 h-5 animate-spin text-primary-500" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="text-sm">AI 正在生成中...</span>
                </div>
                <button
                  onClick={handleStopGeneration}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />
                  </svg>
                  停止生成
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-800 text-sm rounded-lg shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}
    </div>
  );
}
