import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Video,
  Sparkles,
  Loader2,
  Copy,
  Check,
  AlertCircle,
  Clock,
  Users,
  Mic,
  Film,
  Clapperboard,
  ChevronRight,
} from 'lucide-react';
import { videoApi } from '../services/backendApi';

// ==================== Types ====================
interface Scene {
  sceneNumber: number;
  title: string;
  description: string;
  dialogue?: string;
  narration?: string;
  duration: string;
  visualDirection?: string;
  audioDirection?: string;
}

interface ScriptResult {
  title: string;
  totalDuration: string;
  scenes: Scene[];
}

// ==================== Configs ====================
const VIDEO_TYPES = [
  { id: 'short-video', label: '短视频', icon: '📱', desc: '竖屏短视频，适合抖音/快手' },
  { id: 'tutorial', label: '教程', icon: '📖', desc: '教学演示类视频' },
  { id: 'promotional', label: '宣传', icon: '📢', desc: '品牌/产品宣传视频' },
  { id: 'documentary', label: '纪录片', icon: '🎬', desc: '纪实风格叙事' },
  { id: 'vlog', label: 'Vlog', icon: '🎥', desc: '个人生活记录' },
];

const DURATIONS = [
  { value: '15s', label: '15 秒' },
  { value: '30s', label: '30 秒' },
  { value: '60s', label: '60 秒' },
  { value: '3min', label: '3 分钟' },
  { value: '5min', label: '5 分钟' },
  { value: '10min', label: '10 分钟' },
];

const TONES = [
  { id: 'professional', label: '专业', icon: '💼' },
  { id: 'casual', label: '轻松', icon: '😊' },
  { id: 'humorous', label: '幽默', icon: '😄' },
  { id: 'emotional', label: '情感', icon: '❤️' },
  { id: 'inspiring', label: '励志', icon: '🌟' },
];

// ==================== Animation Variants ====================
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const sceneVariant = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.3 } },
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

// ==================== Scene Card ====================
const SceneCard: React.FC<{ scene: Scene; index: number }> = ({ scene, index }) => (
  <motion.div
    variants={sceneVariant}
    className="relative bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 overflow-hidden shadow-lg shadow-blue-500/5"
  >
    {/* Timeline connector */}
    <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-500/50 to-purple-500/50" />

    {/* Scene number badge */}
    <div className="relative flex items-start p-5">
      <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20 z-10">
        {scene.sceneNumber}
      </div>

      <div className="ml-5 flex-1 min-w-0">
        {/* Title row */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-white">{scene.title}</h3>
          <span className="flex items-center gap-1 px-2 py-1 bg-blue-500/10 text-blue-400 rounded-lg text-xs font-medium">
            <Clock className="w-3 h-3" />
            {scene.duration}
          </span>
        </div>

        {/* Description */}
        <p className="text-sm text-gray-300 mb-3 leading-relaxed">{scene.description}</p>

        {/* Details grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {scene.dialogue && (
            <div className="bg-gray-900/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Mic className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs font-medium text-green-400">台词</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{scene.dialogue}</p>
            </div>
          )}
          {scene.narration && (
            <div className="bg-gray-900/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Film className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-medium text-purple-400">旁白</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{scene.narration}</p>
            </div>
          )}
          {scene.visualDirection && (
            <div className="bg-gray-900/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Clapperboard className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-medium text-amber-400">视觉方向</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{scene.visualDirection}</p>
            </div>
          )}
          {scene.audioDirection && (
            <div className="bg-gray-900/60 rounded-xl p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Mic className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-xs font-medium text-cyan-400">音频方向</span>
              </div>
              <p className="text-sm text-gray-300 leading-relaxed">{scene.audioDirection}</p>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Chevron between scenes */}
    {index < 100 && (
      <div className="flex justify-center pb-2">
        <ChevronRight className="w-5 h-5 text-gray-600 rotate-90" />
      </div>
    )}
  </motion.div>
);

// ==================== Main Component ====================
const VideoGenerator: React.FC = () => {

  // Form state
  const [topic, setTopic] = useState('');
  const [videoType, setVideoType] = useState('short-video');
  const [duration, setDuration] = useState('60s');
  const [targetAudience, setTargetAudience] = useState('');
  const [tone, setTone] = useState('professional');

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scriptResult, setScriptResult] = useState<ScriptResult | null>(null);
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
      addToast('请输入视频主题', 'error');
      return;
    }

    setIsGenerating(true);
    setError(null);
    setScriptResult(null);

    try {
      const result: any = await videoApi.generateScript({
        topic: topic.trim(),
        type: videoType,
        duration,
        targetAudience: targetAudience.trim() || undefined,
        tone,
      });

      setScriptResult({
        title: result.title || topic,
        totalDuration: result.totalDuration || duration,
        scenes: result.scenes || result.script?.scenes || [],
      });
      addToast('脚本生成成功', 'success');
    } catch (err: any) {
      setError(err.message || '生成失败，请重试');
      addToast(err.message || '生成失败', 'error');
    } finally {
      setIsGenerating(false);
    }
  }, [topic, videoType, duration, targetAudience, tone, addToast]);

  // Copy script to clipboard
  const handleCopyScript = useCallback(async () => {
    if (!scriptResult) return;
    const text = scriptResult.scenes
      .map(
        (s) =>
          `【场景 ${s.sceneNumber}】${s.title}\n时长: ${s.duration}\n描述: ${s.description}${
            s.dialogue ? `\n台词: ${s.dialogue}` : ''
          }${s.narration ? `\n旁白: ${s.narration}` : ''}${
            s.visualDirection ? `\n视觉: ${s.visualDirection}` : ''
          }${s.audioDirection ? `\n音频: ${s.audioDirection}` : ''}`
      )
      .join('\n\n');

    try {
      await navigator.clipboard.writeText(`《${scriptResult.title}》\n总时长: ${scriptResult.totalDuration}\n\n${text}`);
      addToast('脚本已复制到剪贴板', 'success');
    } catch {
      addToast('复制失败', 'error');
    }
  }, [scriptResult, addToast]);

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
            <div className="p-2 bg-gradient-to-r from-red-500 to-orange-500 rounded-xl shadow-lg shadow-red-500/20">
              <Video className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">视频脚本生成器</h1>
              <p className="text-sm text-gray-400">AI 智能生成专业视频脚本，支持多种视频类型</p>
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
              <label className="block text-sm font-medium text-gray-300 mb-2">视频主题</label>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="输入视频主题，例如：如何高效学习编程..."
                rows={3}
                className="w-full px-4 py-3 bg-gray-900/80 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 resize-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Video Type */}
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-lg shadow-blue-500/5">
              <label className="block text-sm font-medium text-gray-300 mb-3">视频类型</label>
              <div className="space-y-2">
                {VIDEO_TYPES.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setVideoType(type.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                      videoType === type.id
                        ? 'border-red-500 bg-red-500/10'
                        : 'border-gray-700/50 bg-gray-900/40 hover:bg-gray-700/50'
                    }`}
                  >
                    <span className="text-xl">{type.icon}</span>
                    <div className="text-left">
                      <span className="text-sm font-medium text-white">{type.label}</span>
                      <p className="text-xs text-gray-400">{type.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-lg shadow-blue-500/5">
              <label className="block text-sm font-medium text-gray-300 mb-3">视频时长</label>
              <div className="grid grid-cols-3 gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d.value}
                    onClick={() => setDuration(d.value)}
                    className={`px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      duration === d.value
                        ? 'border-red-500 bg-red-500/10 text-white'
                        : 'border-gray-700/50 bg-gray-900/40 text-gray-300 hover:bg-gray-700/50'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Audience */}
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-lg shadow-blue-500/5">
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                <Users className="w-4 h-4" />
                目标受众
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="例如：大学生、职场新人..."
                className="w-full px-4 py-3 bg-gray-900/80 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
              />
            </div>

            {/* Tone */}
            <div className="bg-gray-800/60 backdrop-blur-xl rounded-2xl border border-gray-700/50 p-6 shadow-lg shadow-blue-500/5">
              <label className="block text-sm font-medium text-gray-300 mb-3">语气风格</label>
              <div className="flex flex-wrap gap-2">
                {TONES.map((toneOption) => (
                  <button
                    key={toneOption.id}
                    onClick={() => setTone(toneOption.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-sm transition-all ${
                      tone === toneOption.id
                        ? 'border-red-500 bg-red-500/10 text-white'
                        : 'border-gray-700/50 bg-gray-900/40 text-gray-300 hover:bg-gray-700/50'
                    }`}
                  >
                    <span>{toneOption.icon}</span>
                    {toneOption.label}
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
              className="w-full flex items-center justify-center gap-3 px-6 py-4 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-2xl font-medium text-lg shadow-lg shadow-red-500/20 hover:shadow-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  生成脚本
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
                  <Clapperboard className="w-5 h-5 text-red-400" />
                  脚本预览
                </h2>
                {scriptResult && (
                  <button
                    onClick={handleCopyScript}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 text-gray-300 rounded-lg hover:bg-gray-600/50 transition-colors text-sm"
                  >
                    <Copy className="w-4 h-4" />
                    复制脚本
                  </button>
                )}
              </div>

              {isGenerating && (
                <div className="flex flex-col items-center justify-center py-20">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                  >
                    <Loader2 className="w-12 h-12 text-red-500" />
                  </motion.div>
                  <p className="mt-4 text-gray-400">正在生成脚本，请稍候...</p>
                </div>
              )}

              {!isGenerating && !scriptResult && (
                <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                  <Video className="w-16 h-16 mb-4 opacity-20" />
                  <p className="text-lg font-medium text-gray-400">还没有生成脚本</p>
                  <p className="text-sm mt-2 text-gray-500">在左侧填写参数，AI 将为你创作专业脚本</p>
                </div>
              )}

              {scriptResult && !isGenerating && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  {/* Script header */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-red-500/10 to-orange-500/10 rounded-xl border border-red-500/20">
                    <h3 className="text-xl font-bold text-white mb-1">{scriptResult.title}</h3>
                    <div className="flex items-center gap-4 text-sm text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        总时长: {scriptResult.totalDuration}
                      </span>
                      <span className="flex items-center gap-1">
                        <Film className="w-3.5 h-3.5" />
                        {scriptResult.scenes.length} 个场景
                      </span>
                    </div>
                  </div>

                  {/* Scenes */}
                  <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="space-y-4"
                  >
                    {scriptResult.scenes.map((scene, index) => (
                      <SceneCard key={scene.sceneNumber} scene={scene} index={index} />
                    ))}
                  </motion.div>
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

export default VideoGenerator;
