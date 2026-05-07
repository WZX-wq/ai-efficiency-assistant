import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Palette,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Loader2,
  Download,
  Trash2,
  Maximize2,
  Copy,
  Check,
  AlertCircle,
  ImageIcon,
  Eye,
} from 'lucide-react';
import { paintingApi } from '../services/backendApi';

// ==================== Types ====================
interface GeneratedImage {
  id: string;
  prompt: string;
  style: string;
  size: string;
  negativePrompt?: string;
  svgContent: string;
  createdAt: Date;
}

// ==================== Style Configs ====================
const STYLES = [
  { id: 'realistic', label: '写实', icon: '🖼️', gradient: 'from-amber-600 to-orange-700', desc: '逼真的照片级效果' },
  { id: 'anime', label: '动漫', icon: '🎨', gradient: 'from-pink-500 to-purple-600', desc: '日系动漫风格' },
  { id: 'abstract', label: '抽象', icon: '🌀', gradient: 'from-violet-500 to-fuchsia-600', desc: '抽象艺术表达' },
  { id: 'minimalist', label: '极简', icon: '◻️', gradient: 'from-gray-400 to-gray-600', desc: '简约设计风格' },
  { id: 'watercolor', label: '水彩', icon: '💧', gradient: 'from-cyan-400 to-blue-500', desc: '水彩画质感' },
  { id: 'oil-painting', label: '油画', icon: '🎭', gradient: 'from-yellow-600 to-red-700', desc: '经典油画风格' },
  { id: 'pixel-art', label: '像素', icon: '👾', gradient: 'from-green-500 to-emerald-600', desc: '复古像素艺术' },
  { id: 'sketch', label: '素描', icon: '✏️', gradient: 'from-gray-500 to-gray-700', desc: '铅笔素描效果' },
];

const SIZES = [
  { value: '256x256', label: '256 x 256', desc: '小尺寸' },
  { value: '512x512', label: '512 x 512', desc: '中尺寸' },
  { value: '1024x1024', label: '1024 x 1024', desc: '大尺寸 (正方形)' },
  { value: '1024x1792', label: '1024 x 1792', desc: '大尺寸 (竖版)' },
  { value: '1792x1024', label: '1792 x 1024', desc: '大尺寸 (横版)' },
];

// ==================== Animation Variants ====================
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.3 } },
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

// ==================== Main Component ====================
const AiPainter: React.FC = () => {

  // Form state
  const [prompt, setPrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState('realistic');
  const [selectedSize, setSelectedSize] = useState('1024x1024');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [showNegative, setShowNegative] = useState(false);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gallery, setGallery] = useState<GeneratedImage[]>([]);
  const [previewImage, setPreviewImage] = useState<GeneratedImage | null>(null);
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
    if (!prompt.trim()) {
      addToast('请输入绘画描述', 'error');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const result: any = await paintingApi.generate({
        prompt: prompt.trim(),
        style: selectedStyle,
        size: selectedSize,
        negativePrompt: negativePrompt.trim() || undefined,
      });

      const newImage: GeneratedImage = {
        id: Math.random().toString(36).substr(2, 9),
        prompt: prompt.trim(),
        style: selectedStyle,
        size: selectedSize,
        negativePrompt: negativePrompt.trim() || undefined,
        svgContent: result.svg || result.imageUrl || result.content || '',
        createdAt: new Date(),
      };

      setGallery((prev) => [newImage, ...prev]);
      addToast('绘画生成成功', 'success');
    } catch (err: any) {
      setError(err.message || '生成失败，请重试');
      addToast(err.message || '生成失败', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [prompt, selectedStyle, selectedSize, negativePrompt, addToast]);

  // Copy to clipboard
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast('已复制到剪贴板', 'success');
    } catch {
      addToast('复制失败', 'error');
    }
  }, [addToast]);

  // Delete from gallery
  const handleDelete = useCallback((id: string) => {
    setGallery((prev) => prev.filter((img) => img.id !== id));
    if (previewImage?.id === id) setPreviewImage(null);
    addToast('已删除', 'info');
  }, [previewImage, addToast]);

  // Download SVG
  const handleDownload = useCallback((image: GeneratedImage) => {
    const blob = new Blob([image.svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-painting-${image.id}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    addToast('下载成功', 'success');
  }, [addToast]);

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
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg shadow-blue-500/20">
              <Palette className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">AI 绘画</h1>
              <p className="text-sm text-gray-400">输入描述，AI 为你创作独特画作</p>
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
            {/* Prompt Input */}
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-lg shadow-blue-500/5">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                绘画描述
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="描述你想要的画面，例如：一只在月光下奔跑的银色独角兽，周围是梦幻的星空..."
                rows={4}
                className="w-full px-4 py-3 bg-gray-900/80 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
              <div className="flex justify-end mt-1">
                <span className="text-xs text-gray-500">{prompt.length}/500</span>
              </div>

              {/* Negative Prompt (collapsible) */}
              <div className="mt-3">
                <button
                  onClick={() => setShowNegative(!showNegative)}
                  className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300 transition-colors"
                >
                  {showNegative ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  反向提示词
                </button>
                <AnimatePresence>
                  {showNegative && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 overflow-hidden"
                    >
                      <textarea
                        value={negativePrompt}
                        onChange={(e) => setNegativePrompt(e.target.value)}
                        placeholder="描述你不想出现的元素，例如：模糊、低质量、变形..."
                        rows={2}
                        className="w-full px-4 py-3 bg-gray-900/80 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Style Selector */}
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-lg shadow-blue-500/5">
              <label className="block text-sm font-medium text-gray-300 mb-3">绘画风格</label>
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="visible"
                className="grid grid-cols-2 gap-3"
              >
                {STYLES.map((style) => (
                  <motion.button
                    key={style.id}
                    variants={scaleIn}
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`relative flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                      selectedStyle === style.id
                        ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                        : 'border-gray-700/50 bg-gray-900/40 hover:bg-gray-700/50 hover:border-gray-600'
                    }`}
                  >
                    <span className="text-2xl">{style.icon}</span>
                    <span className="text-xs font-medium text-white">{style.label}</span>
                    <span className="text-[10px] text-gray-400">{style.desc}</span>
                    {selectedStyle === style.id && (
                      <motion.div
                        layoutId="style-indicator"
                        className="absolute -top-px -right-px w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
                      >
                        <Check className="w-3 h-3 text-white" />
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </motion.div>
            </div>

            {/* Size Selector */}
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-lg shadow-blue-500/5">
              <label className="block text-sm font-medium text-gray-300 mb-3">画面尺寸</label>
              <div className="space-y-2">
                {SIZES.map((size) => (
                  <button
                    key={size.value}
                    onClick={() => setSelectedSize(size.value)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl border transition-all ${
                      selectedSize === size.value
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700/50 bg-gray-900/40 hover:bg-gray-700/50'
                    }`}
                  >
                    <span className="text-sm font-medium text-white">{size.label}</span>
                    <span className="text-xs text-gray-400">{size.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGenerate}
              disabled={isGenerating || !prompt.trim()}
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-2xl font-medium text-lg shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  开始创作
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
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <ImageIcon className="w-5 h-5 text-blue-400" />
                  生成结果
                </h2>
                {gallery.length > 0 && (
                  <span className="text-sm text-gray-400">{gallery.length} 张画作</span>
                )}
              </div>

              {gallery.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <Palette className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium text-gray-400">还没有生成画作</p>
                  <p className="text-sm mt-2 text-gray-500">在左侧输入描述，开始你的创作之旅</p>
                </div>
              ) : (
                <motion.div
                  variants={staggerContainer}
                  initial="hidden"
                  animate="visible"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-6"
                >
                  {gallery.map((image) => (
                    <motion.div
                      key={image.id}
                      variants={scaleIn}
                      layout
                      className="group relative bg-gray-900/60 rounded-xl overflow-hidden border border-gray-700/50 hover:border-gray-600 transition-all"
                    >
                      {/* SVG Preview */}
                      <div
                        className="aspect-square flex items-center justify-center p-4 cursor-pointer overflow-hidden"
                        onClick={() => setPreviewImage(image)}
                        dangerouslySetInnerHTML={{ __html: image.svgContent }}
                      />

                      {/* Overlay on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPreviewImage(image)}
                            className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 text-white transition-colors"
                            title="预览"
                          >
                            <Maximize2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(image)}
                            className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 text-white transition-colors"
                            title="下载"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleCopy(image.prompt)}
                            className="p-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 text-white transition-colors"
                            title="复制描述"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(image.id)}
                            className="p-2 bg-red-500/30 backdrop-blur-sm rounded-lg hover:bg-red-500/50 text-white transition-colors"
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Info bar */}
                      <div className="px-4 py-3 border-t border-gray-700/50">
                        <p className="text-sm text-gray-300 line-clamp-1">{image.prompt}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-500">
                            {STYLES.find((s) => s.id === image.style)?.icon}{' '}
                            {STYLES.find((s) => s.id === image.style)?.label}
                          </span>
                          <span className="text-xs text-gray-600">|</span>
                          <span className="text-xs text-gray-500">{image.size}</span>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      {/* Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewImage(null)}
              className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="fixed inset-4 md:inset-10 bg-gray-900 rounded-2xl z-50 overflow-hidden flex flex-col"
            >
              {/* Modal header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-700/50">
                <div className="flex items-center gap-2">
                  <Eye className="w-5 h-5 text-blue-400" />
                  <span className="text-white font-medium">画作预览</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleDownload(previewImage)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                  >
                    <Download className="w-4 h-4" />
                    下载
                  </button>
                  <button
                    onClick={() => setPreviewImage(null)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Modal body */}
              <div className="flex-1 flex items-center justify-center p-8 overflow-auto">
                <div
                  className="max-w-full max-h-full"
                  dangerouslySetInnerHTML={{ __html: previewImage.svgContent }}
                />
              </div>

              {/* Modal footer */}
              <div className="p-4 border-t border-gray-700/50">
                <p className="text-sm text-gray-300">{previewImage.prompt}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                  <span>{STYLES.find((s) => s.id === previewImage.style)?.label}</span>
                  <span>|</span>
                  <span>{previewImage.size}</span>
                  <span>|</span>
                  <span>{previewImage.createdAt.toLocaleString()}</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default AiPainter;
