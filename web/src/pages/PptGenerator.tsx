import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Presentation,
  Sparkles,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  AlertCircle,
  Check,
  Copy,
  FileText,
  Layout,
} from 'lucide-react';
import { pptApi } from '../services/backendApi';

// ==================== Types ====================
interface Slide {
  slideNumber: number;
  title: string;
  content: string[];
  speakerNotes?: string;
}

interface PptResult {
  title: string;
  slides: Slide[];
}

// ==================== Configs ====================
const SLIDE_COUNTS = [5, 8, 10, 15, 20];

const THEMES = [
  { id: 'business', label: '商务', color: 'from-blue-600 to-blue-800', preview: '#1e40af' },
  { id: 'education', label: '教育', color: 'from-green-500 to-teal-600', preview: '#059669' },
  { id: 'creative', label: '创意', color: 'from-purple-500 to-pink-600', preview: '#9333ea' },
  { id: 'minimal', label: '极简', color: 'from-gray-400 to-gray-600', preview: '#6b7280' },
  { id: 'dark', label: '暗黑', color: 'from-gray-800 to-gray-950', preview: '#1f2937' },
  { id: 'gradient', label: '渐变', color: 'from-cyan-400 via-blue-500 to-purple-600', preview: 'linear-gradient(135deg, #22d3ee, #3b82f6, #9333ea)' },
];

const LANGUAGES = [
  { id: 'zh', label: '中文' },
  { id: 'en', label: 'English' },
];

// ==================== Animation Variants ====================
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const slideTransition = {
  initial: { opacity: 0, x: 50 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, x: -50, transition: { duration: 0.2 } },
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

// ==================== Slide Preview ====================
const SlidePreview: React.FC<{
  slide: Slide;
  theme: string;
  totalSlides: number;
}> = ({ slide, theme, totalSlides }) => {
  const themeConfig = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <div className="relative w-full aspect-[16/9] bg-white rounded-xl shadow-2xl overflow-hidden">
      {/* Slide background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${themeConfig.color} opacity-10`} />

      {/* Slide header bar */}
      <div className={`h-2 bg-gradient-to-r ${themeConfig.color}`} />

      {/* Slide content */}
      <div className="relative p-8 h-full flex flex-col">
        {/* Slide number */}
        <div className="flex items-center justify-between mb-4">
          <span className={`text-xs font-medium px-2 py-1 rounded-md bg-gradient-to-r ${themeConfig.color} text-white`}>
            {slide.slideNumber} / {totalSlides}
          </span>
        </div>

        {/* Title */}
        <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-6 leading-tight">
          {slide.title}
        </h2>

        {/* Content bullets */}
        <div className="flex-1 space-y-3">
          {slide.content.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="flex items-start gap-3"
            >
              <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${themeConfig.color} mt-2 flex-shrink-0`} />
              <p className="text-gray-700 text-base leading-relaxed">{item}</p>
            </motion.div>
          ))}
        </div>

        {/* Speaker notes indicator */}
        {slide.speakerNotes && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex items-start gap-2 text-xs text-gray-400">
              <FileText className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
              <span className="line-clamp-2">{slide.speakerNotes}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ==================== Main Component ====================
const PptGenerator: React.FC = () => {

  // Form state
  const [topic, setTopic] = useState('');
  const [slideCount, setSlideCount] = useState(10);
  const [theme, setTheme] = useState('business');
  const [language, setLanguage] = useState('zh');

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pptResult, setPptResult] = useState<PptResult | null>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Toast helpers
  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Generate handler
  const handleGenerate = useCallback(async () => {
    if (!topic.trim()) {
      addToast('请输入演示主题', 'error');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setPptResult(null);
    setCurrentSlide(0);

    try {
      const result: any = await pptApi.generate({
        topic: topic.trim(),
        slideCount,
        theme,
        language,
      });

      setPptResult({
        title: result.title || topic,
        slides: result.slides || [],
      });
      addToast('PPT 生成成功', 'success');
    } catch (err: any) {
      setError(err.message || '生成失败，请重试');
      addToast(err.message || '生成失败', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [topic, slideCount, theme, language, addToast]);

  // Export handler
  const handleExport = useCallback(async () => {
    if (!pptResult) return;

    setIsExporting(true);
    try {
      const result: any = await pptApi.export(pptResult);
      if (result.downloadUrl || result.url) {
        const a = document.createElement('a');
        a.href = result.downloadUrl || result.url;
        a.download = result.filename || `${pptResult.title}.pptx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      addToast('导出成功', 'success');
    } catch (err: any) {
      addToast(err.message || '导出失败', 'error');
    } finally {
      setIsExporting(false);
    }
  }, [pptResult, addToast]);

  // Copy slide content
  const handleCopySlide = useCallback(async () => {
    if (!pptResult) return;
    const slide = pptResult.slides[currentSlide];
    const text = `${slide.title}\n\n${slide.content.map((c) => `- ${c}`).join('\n')}${
      slide.speakerNotes ? `\n\n备注: ${slide.speakerNotes}` : ''
    }`;
    try {
      await navigator.clipboard.writeText(text);
      addToast('已复制到剪贴板', 'success');
    } catch {
      addToast('复制失败', 'error');
    }
  }, [pptResult, currentSlide, addToast]);

  // Navigation
  const goToPrev = useCallback(() => {
    setCurrentSlide((prev) => Math.max(0, prev - 1));
  }, []);

  const goToNext = useCallback(() => {
    if (pptResult) {
      setCurrentSlide((prev) => Math.min(pptResult.slides.length - 1, prev + 1));
    }
  }, [pptResult]);

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
            <div className="p-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl shadow-lg shadow-orange-500/20">
              <Presentation className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">PPT 生成器</h1>
              <p className="text-sm text-gray-400">AI 智能生成专业演示文稿</p>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Panel - Controls */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="lg:col-span-1 space-y-6"
          >
            {/* Topic */}
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-lg shadow-blue-500/5">
              <label className="block text-sm font-medium text-gray-300 mb-2">演示主题</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="输入演示主题，例如：2024年度营销策略报告..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-900/80 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 resize-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Slide Count */}
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-lg shadow-blue-500/5">
              <label className="block text-sm font-medium text-gray-300 mb-3">幻灯片数量</label>
              <div className="flex flex-wrap gap-2">
                {SLIDE_COUNTS.map((count) => (
                  <button
                    key={count}
                    onClick={() => setSlideCount(count)}
                    className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      slideCount === count
                        ? 'border-orange-500 bg-orange-500/10 text-white'
                        : 'border-gray-700/50 bg-gray-900/40 text-gray-300 hover:bg-gray-700/50'
                    }`}
                  >
                    {count} 页
                  </button>
                ))}
              </div>
            </div>

            {/* Theme */}
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-lg shadow-blue-500/5">
              <label className="block text-sm font-medium text-gray-300 mb-3">主题风格</label>
              <div className="grid grid-cols-2 gap-3">
                {THEMES.map((themeOption) => (
                  <button
                    key={themeOption.id}
                    onClick={() => setTheme(themeOption.id)}
                    className={`relative flex items-center gap-3 px-3 py-3 rounded-xl border transition-all overflow-hidden ${
                      theme === themeOption.id
                        ? 'border-orange-500 bg-orange-500/10'
                        : 'border-gray-700/50 bg-gray-900/40 hover:bg-gray-700/50'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg bg-gradient-to-br ${themeOption.color} flex-shrink-0`}
                    />
                    <span className="text-sm font-medium text-white">{themeOption.label}</span>
                    {theme === themeOption.id && (
                      <motion.div
                        layoutId="theme-indicator"
                        className="absolute top-1 right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center"
                      >
                        <Check className="w-2.5 h-2.5 text-white" />
                      </motion.div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-lg shadow-blue-500/5">
              <label className="block text-sm font-medium text-gray-300 mb-3">语言</label>
              <div className="flex gap-2">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.id}
                    onClick={() => setLanguage(lang.id)}
                    className={`flex-1 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      language === lang.id
                        ? 'border-orange-500 bg-orange-500/10 text-white'
                        : 'border-gray-700/50 bg-gray-900/40 text-gray-300 hover:bg-gray-700/50'
                    }`}
                  >
                    {lang.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerate}
              disabled={isGenerating || !topic.trim()}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl font-medium text-lg shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  生成 PPT
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

          {/* Right Panel - Preview */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.1 }}
            className="lg:col-span-2"
          >
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-lg shadow-blue-500/5 min-h-[600px]">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Layout className="w-5 h-5 text-orange-400" />
                  演示预览
                </h2>
                {pptResult && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopySlide}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-600/50 transition-colors text-sm"
                    >
                      <Copy className="w-4 h-4" />
                      复制
                    </button>
                    <button
                      onClick={handleExport}
                      disabled={isExporting}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors text-sm disabled:opacity-50"
                    >
                      {isExporting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      导出
                    </button>
                  </div>
                )}
              </div>

              {isGenerating && (
                <div className="flex flex-col items-center justify-center py-20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 className="w-12 h-12 text-orange-500" />
                  </motion.div>
                  <p className="mt-4 text-gray-400">正在生成演示文稿，请稍候...</p>
                </div>
              )}

              {!isGenerating && !pptResult && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <Presentation className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium text-gray-400">还没有生成演示文稿</p>
                  <p className="text-sm mt-2 text-gray-500">在左侧填写参数，AI 将为你创作专业 PPT</p>
                </div>
              )}

              {pptResult && !isGenerating && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                  {/* Title bar */}
                  <div className="mb-4 p-3 bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-xl border border-orange-500/20">
                    <h3 className="text-lg font-bold text-white">{pptResult.title}</h3>
                    <p className="text-sm text-gray-400">{pptResult.slides.length} 页幻灯片</p>
                  </div>

                  {/* Slide preview */}
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={currentSlide}
                      variants={slideTransition}
                      initial="initial"
                      animate="animate"
                      exit="exit"
                    >
                      <SlidePreview
                        slide={pptResult.slides[currentSlide]}
                        theme={theme}
                        totalSlides={pptResult.slides.length}
                      />
                    </motion.div>
                  </AnimatePresence>

                  {/* Navigation */}
                  <div className="flex items-center justify-between mt-4">
                    <button
                      onClick={goToPrev}
                      disabled={currentSlide === 0}
                      className="flex items-center gap-1 px-4 py-2 bg-gray-700/50 text-gray-300 rounded-xl hover:bg-gray-600/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      上一页
                    </button>

                    {/* Slide dots */}
                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-[300px] px-2">
                      {pptResult.slides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentSlide(idx)}
                          className={`w-2.5 h-2.5 rounded-full transition-all flex-shrink-0 ${
                            idx === currentSlide
                              ? 'bg-orange-500 w-6'
                              : 'bg-gray-600 hover:bg-gray-500'
                          }`}
                        />
                      ))}
                    </div>

                    <button
                      onClick={goToNext}
                      disabled={currentSlide === pptResult.slides.length - 1}
                      className="flex items-center gap-1 px-4 py-2 bg-gray-700/50 text-gray-300 rounded-xl hover:bg-gray-600/50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      下一页
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Speaker notes */}
                  {pptResult.slides[currentSlide]?.speakerNotes && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-4 p-4 bg-gray-900/60 rounded-xl border border-gray-700/50"
                    >
                      <div className="flex items-center gap-1.5 mb-2">
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-xs font-medium text-amber-400">演讲备注</span>
                      </div>
                      <p className="text-sm text-gray-300 leading-relaxed">
                        {pptResult.slides[currentSlide].speakerNotes}
                      </p>
                    </motion.div>
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

export default PptGenerator;
