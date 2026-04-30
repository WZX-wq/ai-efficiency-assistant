import { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '../../components/SeoHead';
import { chatWithAiStream } from '../../services/aiChat';
import { useAppStore } from '../../store/appStore';
import { useToast } from '../../components/ToastProvider';

// ============================================================
// Types
// ============================================================

type AnalysisMode = 'overview' | 'trend' | 'compare' | 'correlation' | 'insight';

interface ParsedData {
  headers: string[];
  rows: string[][];
  totalRows: number;
}

// ============================================================
// Constants
// ============================================================

const ANALYSIS_MODES: { key: AnalysisMode; label: string; icon: string; desc: string }[] = [
  { key: 'overview', label: '数据概览', icon: '\uD83D\uDCCA', desc: '统计摘要、列类型、数据质量' },
  { key: 'trend', label: '趋势分析', icon: '\uD83D\uDCC8', desc: '时间趋势、增长率、模式' },
  { key: 'compare', label: '对比分析', icon: '\uD83D\uDD0D', desc: '分组对比、差异发现' },
  { key: 'correlation', label: '相关性分析', icon: '\uD83D\uDD00', desc: '列间关系、相关性矩阵' },
  { key: 'insight', label: '智能洞察', icon: '\uD83D\uDE80', desc: 'AI 发现规律和异常' },
];

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_PREVIEW_ROWS = 10;
const MAX_ANALYSIS_ROWS = 100;

const TIPS = [
  '支持 CSV、TSV、JSON 格式的数据文件',
  '也可以直接粘贴数据到输入框',
  '数据量较大时，AI 会自动采样分析',
  '选择合适的分析模式能获得更有针对性的结果',
];

const RELATED = [
  { to: '/workspace/doc-analysis', label: '文档分析' },
  { to: '/workspace/mindmap', label: '思维导图' },
  { to: '/workspace/summarizer', label: '内容总结' },
];

// ============================================================
// Helpers
// ============================================================

function parseCsv(text: string, delimiter = ','): ParsedData | null {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return null;

  const parseRow = (line: string): string[] => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (inQuotes) {
        if (ch === '"') {
          if (i + 1 < line.length && line[i + 1] === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = false;
          }
        } else {
          current += ch;
        }
      } else {
        if (ch === '"') {
          inQuotes = true;
        } else if (ch === delimiter) {
          result.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
    }
    result.push(current.trim());
    return result;
  };

  // Auto-detect delimiter
  const firstLine = lines[0];
  if (firstLine.includes('\t')) delimiter = '\t';
  else if (firstLine.split(',').length > firstLine.split(';').length) delimiter = ',';
  else if (firstLine.split(';').length > 1) delimiter = ';';

  const headers = parseRow(lines[0]);
  if (headers.length === 0) return null;

  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = parseRow(lines[i]);
    if (row.length === headers.length && row.some((c) => c !== '')) {
      rows.push(row);
    }
  }

  return { headers, rows, totalRows: rows.length };
}

function parseJson(text: string): ParsedData | null {
  try {
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : data.data || data.records || data.items;
    if (!Array.isArray(arr) || arr.length === 0) return null;

    const headers = Object.keys(arr[0]);
    const rows = arr.map((item: Record<string, unknown>) =>
      headers.map((h) => String(item[h] ?? '')),
    );

    return { headers, rows, totalRows: rows.length };
  } catch {
    return null;
  }
}

function parseData(text: string): ParsedData | null {
  // Try JSON first
  const jsonResult = parseJson(text);
  if (jsonResult) return jsonResult;

  // Try CSV/TSV
  const csvResult = parseCsv(text);
  if (csvResult) return csvResult;

  return null;
}

function getAnalysisSystemPrompt(mode: AnalysisMode): string {
  const prompts: Record<AnalysisMode, string> = {
    overview: `你是一个数据分析专家。请对以下数据集进行概览分析。

要求：
1. 数据基本信息：总行数、列数、数据类型分布
2. 关键统计量：数值列的均值、中位数、最大值、最小值
3. 数据质量评估：缺失值情况、异常值检测
4. 列分析：每列的含义和分布特征
5. 数据质量评分（0-100分）

请用结构化的 Markdown 格式输出，包含表格和要点列表。`,

    trend: `你是一个数据分析专家。请对以下数据集进行趋势分析。

要求：
1. 识别数据中的时间维度（如有）
2. 分析主要指标的变化趋势
3. 计算增长率、环比/同比变化
4. 发现周期性模式和转折点
5. 基于趋势给出未来预测建议
6. 建议适合的可视化图表类型

请用结构化的 Markdown 格式输出。`,

    compare: `你是一个数据分析专家。请对以下数据集进行对比分析。

要求：
1. 识别可对比的分组维度
2. 对比各组的关键指标差异
3. 计算差异的统计显著性
4. 发现组间的显著差异点
5. 生成对比汇总表格
6. 给出业务建议

请用结构化的 Markdown 格式输出，包含对比表格。`,

    correlation: `你是一个数据分析专家。请对以下数据集进行相关性分析。

要求：
1. 分析数值列之间的相关关系
2. 识别强相关和弱相关的变量对
3. 描述相关性的方向（正/负）和强度
4. 发现潜在因果关系
5. 建议进一步分析方向
6. 用表格展示关键相关性结果

请用结构化的 Markdown 格式输出。`,

    insight: `你是一个数据分析专家。请对以下数据集进行深度智能洞察分析。

要求：
1. 发现数据中的有趣模式和规律
2. 识别异常值和离群点
3. 发现隐藏的趋势和关联
4. 提供至少5条有价值的业务洞察
5. 每条洞察标注置信度（高/中/低）
6. 给出可执行的行动建议

请用编号列表格式输出，每条洞察包含：发现、依据、置信度、建议。`,
  };

  return prompts[mode];
}

function formatDataForAi(data: ParsedData): string {
  const headers = data.headers.join('\t');
  const rows = data.rows.slice(0, MAX_ANALYSIS_ROWS).map((r) => r.join('\t')).join('\n');
  const note = data.totalRows > MAX_ANALYSIS_ROWS
    ? `\n\n注意：数据共 ${data.totalRows} 行，以下展示前 ${MAX_ANALYSIS_ROWS} 行用于分析。`
    : '';
  return `列名:\n${headers}\n\n数据:\n${rows}${note}`;
}

// ============================================================
// Main Component
// ============================================================

export default function DataAnalysisTool() {
  useSeo('tool-data-analysis');
  const { addRecentTool, incrementActions } = useAppStore();
  const { toast } = useToast();

  const [rawText, setRawText] = useState('');
  const [fileName, setFileName] = useState('');
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [analysisMode, setAnalysisMode] = useState<AnalysisMode>('overview');
  const [analysisResult, setAnalysisResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Track tool usage
  useEffect(() => {
    addRecentTool('data-analysis');
  }, [addRecentTool]);

  // ---- File Handling ----
  const handleFile = useCallback(
    (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        toast('文件大小不能超过 2MB', 'warning');
        return;
      }
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (!['csv', 'tsv', 'json', 'txt'].includes(ext || '')) {
        toast('仅支持 CSV、TSV、JSON 格式', 'warning');
        return;
      }
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        if (text) {
          setRawText(text);
          const parsed = parseData(text);
          if (parsed) {
            setParsedData(parsed);
            toast(`成功解析 ${parsed.totalRows} 行 x ${parsed.headers.length} 列数据`, 'success');
          } else {
            toast('无法解析文件内容，请检查格式', 'error');
          }
        }
      };
      reader.readAsText(file);
    },
    [toast],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handlePasteData = useCallback(() => {
    if (!rawText.trim()) {
      toast('请先粘贴或输入数据', 'warning');
      return;
    }
    const parsed = parseData(rawText);
    if (parsed) {
      setParsedData(parsed);
      setFileName('粘贴数据');
      toast(`成功解析 ${parsed.totalRows} 行 x ${parsed.headers.length} 列数据`, 'success');
    } else {
      toast('无法解析数据，请检查格式（需要表头行）', 'error');
    }
  }, [rawText, toast]);

  const handleClearData = useCallback(() => {
    setRawText('');
    setFileName('');
    setParsedData(null);
    setAnalysisResult('');
    setStreamingText('');
  }, []);

  // ---- Analysis ----
  const handleAnalyze = useCallback(async () => {
    if (!parsedData) {
      toast('请先上传或粘贴数据', 'warning');
      return;
    }
    setLoading(true);
    setAnalysisResult('');
    setStreamingText('');

    try {
      const controller = new AbortController();
      abortRef.current = controller;

      const sysPrompt = getAnalysisSystemPrompt(analysisMode);
      const dataText = formatDataForAi(parsedData);
      const modeLabel = ANALYSIS_MODES.find((m) => m.key === analysisMode)?.label || analysisMode;

      const res = await chatWithAiStream(
        {
          messages: [{ role: 'user', content: `请对以下数据进行【${modeLabel}】分析：\n\n${dataText}` }],
          systemPrompt: sysPrompt,
          temperature: 0.3,
          maxTokens: 4096,
        },
        controller.signal,
      );

      if (!res.success || !res.stream) {
        toast(res.error || '分析失败', 'error');
        return;
      }

      let fullText = '';
      const reader = res.stream.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += value;
        setStreamingText(fullText);
      }

      setAnalysisResult(fullText);
      incrementActions();
      toast('分析完成', 'success');
    } catch {
      // aborted
    } finally {
      setLoading(false);
      setStreamingText('');
    }
  }, [parsedData, analysisMode, toast, incrementActions]);

  const handleStop = useCallback(() => {
    abortRef.current?.abort();
    setLoading(false);
  }, []);

  // ---- Render Markdown (simple) ----
  const renderAnalysisText = (text: string) => {
    // Simple markdown rendering: headers, bold, lists, tables, code blocks
    const lines = text.split('\n');
    const elements: JSX.Element[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let tableKey = 0;

    const flushTable = () => {
      if (tableRows.length === 0) return;
      const headerRow = tableRows[0];
      elements.push(
        <div key={`table-${tableKey++}`} className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-cyan-50 dark:bg-cyan-900/20">
                {headerRow.map((cell, ci) => (
                  <th key={ci} className="px-3 py-2 text-left font-semibold text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.slice(1).map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-800/50'}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      tableRows = [];
      inTable = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Table detection
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        const cells = trimmed.split('|').slice(1, -1).map((c) => c.trim());
        if (cells.every((c) => /^[-:]+$/.test(c))) continue; // separator row
        inTable = true;
        tableRows.push(cells);
        continue;
      } else if (inTable) {
        flushTable();
      }

      // Headers
      if (trimmed.startsWith('### ')) {
        elements.push(<h3 key={i} className="text-lg font-bold text-gray-900 dark:text-white mt-5 mb-2">{trimmed.slice(4)}</h3>);
      } else if (trimmed.startsWith('## ')) {
        elements.push(<h2 key={i} className="text-xl font-bold text-gray-900 dark:text-white mt-6 mb-3">{trimmed.slice(3)}</h2>);
      } else if (trimmed.startsWith('# ')) {
        elements.push(<h1 key={i} className="text-2xl font-bold text-gray-900 dark:text-white mt-6 mb-3">{trimmed.slice(2)}</h1>);
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        elements.push(
          <div key={i} className="flex items-start gap-2 ml-2 my-1">
            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2" />
            <span className="text-sm text-gray-700 dark:text-gray-300">{trimmed.slice(2)}</span>
          </div>,
        );
      } else if (/^\d+\.\s/.test(trimmed)) {
        elements.push(
          <div key={i} className="flex items-start gap-2 ml-2 my-1">
            <span className="shrink-0 text-cyan-500 font-bold text-sm mt-0.5">{trimmed.match(/^(\d+)\./)?.[1]}.</span>
            <span className="text-sm text-gray-700 dark:text-gray-300">{trimmed.replace(/^\d+\.\s/, '')}</span>
          </div>,
        );
      } else if (trimmed.startsWith('```')) {
        // Skip code block markers
        continue;
      } else if (trimmed === '') {
        elements.push(<div key={i} className="h-2" />);
      } else {
        // Bold text
        const parts = trimmed.split(/\*\*(.*?)\*\*/g);
        elements.push(
          <p key={i} className="text-sm text-gray-700 dark:text-gray-300 my-1">
            {parts.map((part, pi) =>
              pi % 2 === 1 ? <strong key={pi} className="font-semibold text-gray-900 dark:text-white">{part}</strong> : part,
            )}
          </p>,
        );
      }
    }

    if (inTable) flushTable();
    return elements;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Compact Hero */}
      <section className="relative overflow-hidden pt-28 pb-8 sm:pt-32 sm:pb-10">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-br from-cyan-100/60 via-teal-50/40 to-transparent rounded-full blur-3xl" />
          <div className="absolute top-10 right-0 w-[300px] h-[200px] bg-gradient-to-bl from-cyan-100/40 to-transparent rounded-full blur-3xl" />
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-4 animate-fade-in">
            <Link to="/workspace" className="hover:text-cyan-600 transition-colors">工具</Link>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
            <span className="text-gray-900 dark:text-white font-medium">数据分析</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white tracking-tight animate-slide-up">
            <span className="bg-gradient-to-r from-cyan-600 via-teal-500 to-cyan-600 bg-clip-text text-transparent">AI 数据分析</span>
          </h1>
          <p className="mt-2 text-base text-gray-600 dark:text-gray-300 animate-slide-up">
            上传数据文件或粘贴数据，AI 自动进行多维度分析，发现数据中的规律和洞察
          </p>
        </div>
      </section>

      {/* Main Content */}
      <section className="pb-20 sm:pb-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Panel - Upload & Settings */}
            <div className="lg:col-span-5 space-y-4">
              {/* Upload Area */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">数据上传</h3>

                {/* Drop Zone */}
                <div
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
                    isDragging
                      ? 'border-cyan-400 bg-cyan-50 dark:bg-cyan-900/10'
                      : parsedData
                        ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10'
                        : 'border-gray-200 dark:border-gray-700 hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.tsv,.json,.txt"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFile(file);
                    }}
                    className="hidden"
                  />
                  {parsedData ? (
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">{fileName}</p>
                      <p className="text-xs text-gray-500">{parsedData.totalRows} 行 x {parsedData.headers.length} 列</p>
                      <p className="text-xs text-gray-400 mt-1">点击重新上传</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-10 h-10 text-gray-300 dark:text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        拖放文件到此处，或<span className="text-cyan-500 font-medium">点击上传</span>
                      </p>
                      <p className="text-xs text-gray-400">支持 CSV、TSV、JSON，最大 2MB</p>
                    </div>
                  )}
                </div>

                {/* Paste Area */}
                {!parsedData && (
                  <>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                      <span className="text-xs text-gray-400">或粘贴数据</span>
                      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    </div>
                    <textarea
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="在此粘贴 CSV 或 JSON 数据..."
                      rows={4}
                      className="mt-3 w-full px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-cyan-500 focus:border-transparent outline-none resize-none font-mono"
                    />
                    <button
                      onClick={handlePasteData}
                      disabled={!rawText.trim()}
                      className="mt-2 w-full px-4 py-2 bg-cyan-500 text-white text-sm font-medium rounded-lg hover:bg-cyan-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      解析数据
                    </button>
                  </>
                )}

                {parsedData && (
                  <button
                    onClick={handleClearData}
                    className="mt-3 w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-sm font-medium rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    清除数据
                  </button>
                )}
              </div>

              {/* Analysis Mode Selection */}
              <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">分析模式</h3>
                <div className="space-y-2">
                  {ANALYSIS_MODES.map((mode) => (
                    <button
                      key={mode.key}
                      onClick={() => setAnalysisMode(mode.key)}
                      disabled={!parsedData || loading}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left text-sm transition-all ${
                        analysisMode === mode.key
                          ? 'bg-cyan-50 dark:bg-cyan-900/20 border border-cyan-200 dark:border-cyan-800'
                          : 'hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent'
                      } disabled:opacity-50`}
                    >
                      <span className="text-lg shrink-0">{mode.icon}</span>
                      <div className="min-w-0">
                        <div className={`font-medium ${analysisMode === mode.key ? 'text-cyan-700 dark:text-cyan-400' : 'text-gray-700 dark:text-gray-300'}`}>
                          {mode.label}
                        </div>
                        <div className="text-xs text-gray-400 truncate">{mode.desc}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={loading ? handleStop : handleAnalyze}
                  disabled={!parsedData || loading}
                  className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-semibold transition-all shadow-sm ${
                    loading
                      ? 'bg-red-500 hover:bg-red-600 text-white'
                      : 'bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 text-white shadow-cyan-200 dark:shadow-cyan-900/30 disabled:opacity-50 disabled:cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      停止分析
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
              </div>
            </div>

            {/* Right Panel - Data Preview & Results */}
            <div className="lg:col-span-7 space-y-4">
              {/* Data Preview */}
              {parsedData && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">数据预览</h3>
                    <span className="text-xs text-gray-400">
                      显示前 {Math.min(MAX_PREVIEW_ROWS, parsedData.totalRows)} 行 / 共 {parsedData.totalRows} 行
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/80">
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 border-b border-gray-100 dark:border-gray-800 w-12">#</th>
                          {parsedData.headers.map((header, hi) => (
                            <th key={hi} className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-100 dark:border-gray-800 whitespace-nowrap">
                              {header}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedData.rows.slice(0, MAX_PREVIEW_ROWS).map((row, ri) => (
                          <tr key={ri} className={ri % 2 === 0 ? 'bg-white dark:bg-gray-900' : 'bg-gray-50/50 dark:bg-gray-800/30'}>
                            <td className="px-3 py-2 text-xs text-gray-400 border-b border-gray-50 dark:border-gray-800/50">{ri + 1}</td>
                            {row.map((cell, ci) => (
                              <td key={ci} className="px-3 py-2 text-gray-700 dark:text-gray-300 border-b border-gray-50 dark:border-gray-800/50 whitespace-nowrap max-w-[200px] truncate">
                                {cell}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Analysis Results */}
              {(analysisResult || streamingText || loading) && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      {ANALYSIS_MODES.find((m) => m.key === analysisMode)?.icon}{' '}
                      {ANALYSIS_MODES.find((m) => m.key === analysisMode)?.label}结果
                    </h3>
                    {analysisResult && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(analysisResult).then(
                            () => toast('已复制分析结果', 'success'),
                            () => toast('复制失败', 'error'),
                          );
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
                        </svg>
                        复制
                      </button>
                    )}
                  </div>
                  <div className="p-5 min-h-[300px] max-h-[600px] overflow-y-auto">
                    {loading && !streamingText && (
                      <div className="flex flex-col items-center justify-center h-[300px]">
                        <div className="relative">
                          <div className="w-12 h-12 border-4 border-cyan-200 dark:border-cyan-900 border-t-cyan-500 rounded-full animate-spin" />
                        </div>
                        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">AI 正在分析数据...</p>
                      </div>
                    )}

                    {streamingText && (
                      <div className="prose-sm">
                        {renderAnalysisText(streamingText)}
                        {loading && (
                          <span className="inline-block w-2 h-4 bg-cyan-500 animate-pulse ml-1" />
                        )}
                      </div>
                    )}

                    {!loading && analysisResult && (
                      <div className="prose-sm">
                        {renderAnalysisText(analysisResult)}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!parsedData && !loading && (
                <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-12 shadow-sm text-center">
                  <svg className="w-16 h-16 mx-auto mb-4 text-gray-200 dark:text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
                  </svg>
                  <p className="text-gray-400 dark:text-gray-600 text-sm">上传数据文件或粘贴数据，开始 AI 分析</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Usage Tips */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">使用技巧</h3>
        <ul className="space-y-2">
          {TIPS.map((tip, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
              <span className="text-cyan-500 mt-0.5 shrink-0">-</span>
              {tip}
            </li>
          ))}
        </ul>
      </div>

      {/* Related Tools */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">相关工具</h3>
        <div className="flex flex-wrap gap-2">
          {RELATED.map((r) => (
            <Link key={r.to} to={r.to} className="px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 hover:border-cyan-300 dark:hover:border-cyan-700 hover:text-cyan-600 transition-colors">
              {r.label} &rarr;
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
