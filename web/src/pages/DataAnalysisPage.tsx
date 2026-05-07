import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BarChart3,
  Upload,
  FileText,
  Search,
  PieChart,
  TrendingUp,
  Loader2,
  AlertCircle,
  Check,
  Copy,
  Lightbulb,
  Table,
  LineChart,
  ClipboardList,
  Sparkles,
} from 'lucide-react';
import { dataAnalysisApi } from '../services/backendApi';

// ==================== Types ====================
type AnalysisTab = 'analyze' | 'report' | 'query' | 'charts';
type DataFormat = 'csv' | 'json';

interface AnalysisResult {
  summary?: string;
  statistics?: Record<string, any>;
  insights?: string[];
  recommendations?: string[];
}

interface ReportResult {
  report?: string;
}

interface QueryResult {
  answer?: string;
}

interface ChartsResult {
  charts?: Array<{
    type: string;
    description: string;
    suggestedColumns?: string[];
  }>;
}

// ==================== Sample Data ====================
const SAMPLE_CSV = `姓名,年龄,城市,销售额,评分
张三,28,北京,15000,4.5
李四,35,上海,22000,4.8
王五,42,广州,18000,4.2
赵六,31,深圳,25000,4.9
钱七,26,杭州,12000,4.1
孙八,38,成都,20000,4.6
周九,29,武汉,16000,4.3
吴十,45,南京,28000,4.7
郑十一,33,重庆,19000,4.4
王十二,27,西安,14000,4.0`;

// ==================== Animation Variants ====================
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariant = {
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

// ==================== Tab Config ====================
const TABS: { id: AnalysisTab; label: string; icon: React.ReactNode }[] = [
  { id: 'analyze', label: '数据分析', icon: <BarChart3 className="w-4 h-4" /> },
  { id: 'report', label: '生成报告', icon: <FileText className="w-4 h-4" /> },
  { id: 'query', label: '数据查询', icon: <Search className="w-4 h-4" /> },
  { id: 'charts', label: '图表建议', icon: <PieChart className="w-4 h-4" /> },
];

// ==================== Main Component ====================
const DataAnalysisPage: React.FC = () => {

  // Data state
  const [dataInput, setDataInput] = useState('');
  const [dataFormat, setDataFormat] = useState<DataFormat>('csv');

  // UI state
  const [activeTab, setActiveTab] = useState<AnalysisTab>('analyze');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Query state
  const [queryQuestion, setQueryQuestion] = useState('');
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'executive'>('summary');

  // Results state
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [reportResult, setReportResult] = useState<ReportResult | null>(null);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);
  const [chartsResult, setChartsResult] = useState<ChartsResult | null>(null);

  // Toast helpers
  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Load sample data
  const handleLoadSample = useCallback(() => {
    setDataInput(SAMPLE_CSV);
    setDataFormat('csv');
    addToast('已加载示例数据', 'success');
  }, [addToast]);

  // Copy to clipboard
  const handleCopy = useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
        addToast('已复制到剪贴板', 'success');
      } catch {
        addToast('复制失败', 'error');
      }
    },
    [addToast]
  );

  // Analyze
  const handleAnalyze = useCallback(async () => {
    if (!dataInput.trim()) {
      addToast('请输入数据', 'error');
      return;
    }

    setIsLoading(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const result: any = await dataAnalysisApi.analyze({
        data: dataInput,
        format: dataFormat,
      });

      setAnalysisResult({
        summary: result.summary || result.overview,
        statistics: result.statistics || result.stats,
        insights: result.insights || [],
        recommendations: result.recommendations || [],
      });
      addToast('分析完成', 'success');
    } catch (err: any) {
      setError(err.message || '分析失败');
      addToast(err.message || '分析失败', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [dataInput, dataFormat, addToast]);

  // Generate report
  const handleReport = useCallback(async () => {
    if (!dataInput.trim()) {
      addToast('请输入数据', 'error');
      return;
    }

    setIsLoading(true);
    setError(null);
    setReportResult(null);

    try {
      const result: any = await dataAnalysisApi.report({
        data: dataInput,
        format: dataFormat,
        reportType,
      });

      setReportResult({ report: result.report || result.content || result.text });
      addToast('报告生成完成', 'success');
    } catch (err: any) {
      setError(err.message || '报告生成失败');
      addToast(err.message || '报告生成失败', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [dataInput, dataFormat, reportType, addToast]);

  // Query
  const handleQuery = useCallback(async () => {
    if (!dataInput.trim()) {
      addToast('请输入数据', 'error');
      return;
    }
    if (!queryQuestion.trim()) {
      addToast('请输入查询问题', 'error');
      return;
    }

    setIsLoading(true);
    setError(null);
    setQueryResult(null);

    try {
      const result: any = await dataAnalysisApi.query({
        data: dataInput,
        format: dataFormat,
        question: queryQuestion,
      });

      setQueryResult({ answer: result.answer || result.response || result.content });
      addToast('查询完成', 'success');
    } catch (err: any) {
      setError(err.message || '查询失败');
      addToast(err.message || '查询失败', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [dataInput, dataFormat, queryQuestion, addToast]);

  // Charts
  const handleCharts = useCallback(async () => {
    if (!dataInput.trim()) {
      addToast('请输入数据', 'error');
      return;
    }

    setIsLoading(true);
    setError(null);
    setChartsResult(null);

    try {
      const result: any = await dataAnalysisApi.charts({
        data: dataInput,
        format: dataFormat,
      });

      setChartsResult({
        charts: result.charts || result.suggestions || [],
      });
      addToast('图表建议生成完成', 'success');
    } catch (err: any) {
      setError(err.message || '获取图表建议失败');
      addToast(err.message || '获取图表建议失败', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [dataInput, dataFormat, addToast]);

  // Execute based on active tab
  const handleExecute = useCallback(() => {
    switch (activeTab) {
      case 'analyze':
        handleAnalyze();
        break;
      case 'report':
        handleReport();
        break;
      case 'query':
        handleQuery();
        break;
      case 'charts':
        handleCharts();
        break;
    }
  }, [activeTab, handleAnalyze, handleReport, handleQuery, handleCharts]);

  // Chart icon helper
  const getChartIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'bar':
      case '柱状图':
        return <BarChart3 className="w-5 h-5" />;
      case 'line':
      case '折线图':
        return <LineChart className="w-5 h-5" />;
      case 'pie':
      case '饼图':
        return <PieChart className="w-5 h-5" />;
      case 'trend':
      case '趋势图':
        return <TrendingUp className="w-5 h-5" />;
      default:
        return <BarChart3 className="w-5 h-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900/95">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-xl border-b border-gray-700/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl shadow-lg shadow-cyan-500/20">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">数据分析</h1>
              <p className="text-sm text-gray-400">AI 驱动的智能数据分析与可视化</p>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Data Input */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="lg:col-span-1 space-y-6"
          >
            {/* Data Input */}
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-lg shadow-blue-500/5">
              <div className="flex items-center justify-between mb-3">
                <label className="text-sm font-medium text-gray-300">数据输入</label>
                <button
                  onClick={handleLoadSample}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg text-xs hover:bg-cyan-500/20 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  加载示例
                </button>
              </div>

              {/* Format selector */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setDataFormat('csv')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-all ${
                    dataFormat === 'csv'
                      ? 'border-cyan-500 bg-cyan-500/10 text-white'
                      : 'border-gray-700/50 bg-gray-900/40 text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  CSV
                </button>
                <button
                  onClick={() => setDataFormat('json')}
                  className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border text-sm transition-all ${
                    dataFormat === 'json'
                      ? 'border-cyan-500 bg-cyan-500/10 text-white'
                      : 'border-gray-700/50 bg-gray-900/40 text-gray-300 hover:bg-gray-700/50'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  JSON
                </button>
              </div>

              <textarea
                value={dataInput}
                onChange={(e) => setDataInput(e.target.value)}
                placeholder={dataFormat === 'csv' ? '粘贴 CSV 数据...\n例如:\n姓名,年龄,城市\n张三,28,北京' : '粘贴 JSON 数据...\n例如:\n[{"name": "张三", "age": 28}]'}
                rows={12}
                className="w-full px-4 py-3 bg-gray-900/80 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 resize-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all font-mono text-xs"
              />
              <div className="flex justify-end mt-1">
                <span className="text-xs text-gray-500">{dataInput.length} 字符</span>
              </div>
            </div>

            {/* Tab-specific controls */}
            {activeTab === 'report' && (
              <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-lg shadow-blue-500/5">
                <label className="block text-sm font-medium text-gray-300 mb-3">报告类型</label>
                <div className="space-y-2">
                  {[
                    { id: 'summary' as const, label: '摘要报告', desc: '简短的数据概览' },
                    { id: 'detailed' as const, label: '详细报告', desc: '完整的分析报告' },
                    { id: 'executive' as const, label: '高管报告', desc: '面向决策者的报告' },
                  ].map((type) => (
                    <button
                      key={type.id}
                      onClick={() => setReportType(type.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                        reportType === type.id
                          ? 'border-cyan-500 bg-cyan-500/10'
                          : 'border-gray-700/50 bg-gray-900/40 hover:bg-gray-700/50'
                      }`}
                    >
                      <div className="text-left">
                        <span className="text-sm font-medium text-white">{type.label}</span>
                        <p className="text-xs text-gray-400">{type.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'query' && (
              <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-lg shadow-blue-500/5">
                <label className="block text-sm font-medium text-gray-300 mb-2">查询问题</label>
                <textarea
                  value={queryQuestion}
                  onChange={(e) => setQueryQuestion(e.target.value)}
                  placeholder="例如：哪个城市的销售额最高？"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-900/80 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 resize-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all"
                />
              </div>
            )}

            {/* Execute Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleExecute}
              disabled={isLoading || !dataInput.trim()}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-cyan-500 to-blue-600 text-white rounded-2xl font-medium text-lg shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  分析中...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  {activeTab === 'analyze' && '开始分析'}
                  {activeTab === 'report' && '生成报告'}
                  {activeTab === 'query' && '查询'}
                  {activeTab === 'charts' && '获取建议'}
                </>
              )}
            </motion.button>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 px-4 py-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}
          </motion.div>

          {/* Right Panel - Results */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-lg shadow-blue-500/5 min-h-[600px]">
              {/* Tabs */}
              <div className="flex items-center gap-1 mb-6 bg-gray-900/60 rounded-xl p-1">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? 'bg-cyan-500/20 text-cyan-400 shadow-sm'
                        : 'text-gray-400 hover:text-gray-300 hover:bg-gray-700/30'
                    }`}
                  >
                    {tab.icon}
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* Loading */}
              {isLoading && (
                <div className="flex flex-col items-center justify-center py-20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 className="w-12 h-12 text-cyan-500" />
                  </motion.div>
                  <p className="mt-4 text-gray-400">正在处理数据，请稍候...</p>
                </div>
              )}

              {/* Empty state */}
              {!isLoading && !analysisResult && !reportResult && !queryResult && !chartsResult && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium text-gray-400">等待数据分析</p>
                  <p className="text-sm mt-2 text-gray-500">在左侧输入数据，选择分析类型后开始</p>
                </div>
              )}

              {/* Analyze Results */}
              {activeTab === 'analyze' && analysisResult && !isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                  {/* Summary */}
                  {analysisResult.summary && (
                    <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20">
                      <h3 className="text-sm font-medium text-cyan-400 mb-2 flex items-center gap-1.5">
                        <ClipboardList className="w-4 h-4" />
                        数据概览
                      </h3>
                      <p className="text-sm text-gray-300 leading-relaxed">{analysisResult.summary}</p>
                    </div>
                  )}

                  {/* Statistics Table */}
                  {analysisResult.statistics && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-1.5">
                        <Table className="w-4 h-4 text-blue-400" />
                        统计数据
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-700/50">
                              <th className="text-left py-2 px-3 text-xs font-medium text-gray-400">指标</th>
                              <th className="text-right py-2 px-3 text-xs font-medium text-gray-400">值</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(analysisResult.statistics).map(([key, value], idx) => (
                              <tr
                                key={key}
                                className={idx % 2 === 0 ? 'bg-gray-900/30' : ''}
                              >
                                <td className="py-2 px-3 text-sm text-gray-300">{key}</td>
                                <td className="py-2 px-3 text-sm text-white text-right font-mono">
                                  {typeof value === 'number' ? value.toLocaleString() : String(value)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Insights */}
                  {analysisResult.insights && analysisResult.insights.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-1.5">
                        <Lightbulb className="w-4 h-4 text-amber-400" />
                        数据洞察
                      </h3>
                      <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="space-y-2"
                      >
                        {analysisResult.insights.map((insight, idx) => (
                          <motion.div
                            key={idx}
                            variants={itemVariant}
                            className="flex items-start gap-2 p-3 bg-gray-900/40 rounded-xl"
                          >
                            <span className="flex-shrink-0 w-5 h-5 bg-cyan-500/20 text-cyan-400 rounded-md flex items-center justify-center text-xs font-medium">
                              {idx + 1}
                            </span>
                            <p className="text-sm text-gray-300">{insight}</p>
                          </motion.div>
                        ))}
                      </motion.div>
                    </div>
                  )}

                  {/* Recommendations */}
                  {analysisResult.recommendations && analysisResult.recommendations.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-gray-300 mb-3 flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        建议
                      </h3>
                      <motion.div
                        variants={staggerContainer}
                        initial="hidden"
                        animate="visible"
                        className="space-y-2"
                      >
                        {analysisResult.recommendations.map((rec, idx) => (
                          <motion.div
                            key={idx}
                            variants={itemVariant}
                            className="flex items-start gap-2 p-3 bg-green-500/5 border border-green-500/10 rounded-xl"
                          >
                            <Check className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-gray-300">{rec}</p>
                          </motion.div>
                        ))}
                      </motion.div>
                    </div>
                  )}
                </motion.div>
              )}

              {/* Report Results */}
              {activeTab === 'report' && reportResult && !isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-cyan-400" />
                      分析报告
                    </h3>
                    <button
                      onClick={() => handleCopy(reportResult.report || '')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-600/50 transition-colors text-sm"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      复制
                    </button>
                  </div>
                  <div className="p-4 bg-gray-900/40 rounded-xl border border-gray-700/50">
                    <div className="prose prose-invert prose-sm max-w-none">
                      {reportResult.report?.split('\n').map((paragraph, idx) => (
                        <p key={idx} className="text-gray-300 leading-relaxed mb-3">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}

              {/* Query Results */}
              {activeTab === 'query' && queryResult && !isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-300 flex items-center gap-1.5">
                      <Search className="w-4 h-4 text-cyan-400" />
                      查询结果
                    </h3>
                    <button
                      onClick={() => handleCopy(queryResult.answer || '')}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-600/50 transition-colors text-sm"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      复制
                    </button>
                  </div>
                  <div className="p-4 bg-gradient-to-r from-cyan-500/10 to-blue-500/10 rounded-xl border border-cyan-500/20">
                    <p className="text-sm text-gray-300 leading-relaxed">{queryResult.answer}</p>
                  </div>
                </motion.div>
              )}

              {/* Charts Results */}
              {activeTab === 'charts' && chartsResult && !isLoading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  <h3 className="text-sm font-medium text-gray-300 mb-4 flex items-center gap-1.5">
                    <PieChart className="w-4 h-4 text-cyan-400" />
                    推荐图表类型
                  </h3>
                  {chartsResult.charts && chartsResult.charts.length > 0 ? (
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                    >
                      {chartsResult.charts.map((chart, idx) => (
                        <motion.div
                          key={idx}
                          variants={itemVariant}
                          className="p-4 bg-gray-900/40 rounded-xl border border-gray-700/50 hover:border-gray-600 transition-colors"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-lg">
                              {getChartIcon(chart.type)}
                            </div>
                            <div>
                              <h4 className="text-sm font-medium text-white">{chart.type}</h4>
                            </div>
                          </div>
                          <p className="text-sm text-gray-400 leading-relaxed">{chart.description}</p>
                          {chart.suggestedColumns && chart.suggestedColumns.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {chart.suggestedColumns.map((col, colIdx) => (
                                <span
                                  key={colIdx}
                                  className="px-2 py-0.5 bg-gray-700/50 text-gray-300 rounded text-xs"
                                >
                                  {col}
                                </span>
                              ))}
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </motion.div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                      <PieChart className="w-10 h-10 mb-3 opacity-20" />
                      <p className="text-sm">暂无图表建议</p>
                    </div>
                  )}
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default DataAnalysisPage;
