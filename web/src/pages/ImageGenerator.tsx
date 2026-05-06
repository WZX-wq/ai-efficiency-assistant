import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wand2,
  Settings,
  Download,
  Copy,
  Heart,
  Trash2,
  RefreshCw,
  X,
  ImageIcon,
  Clock,
  Grid3X3,
  List,
  Check,
  AlertCircle,
  Sparkles,
  Star,
} from 'lucide-react';
import { useTranslation } from '../i18n';
import {
  useImageStore,
  ImageStyle,
  ImageSize,
  ImageGeneration,
  STYLE_CONFIGS,
  generatePlaceholderUrl,
  getSizeDimensions,
} from '../store/useImageStore';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};



const slideIn = {
  hidden: { x: '100%' },
  visible: { x: 0, transition: { type: 'spring' as const, damping: 25, stiffness: 200 } },
  exit: { x: '100%', transition: { duration: 0.2 } },
};

// Style options
const STYLE_OPTIONS: ImageStyle[] = [
  'realistic',
  'anime',
  'digital-art',
  'oil-painting',
  'watercolor',
  'sketch',
  '3d-render',
  'pixel-art',
  'cyberpunk',
  'fantasy',
];

// Size options
const SIZE_OPTIONS: ImageSize[] = [
  '256x256',
  '512x512',
  '768x768',
  '1024x1024',
  '1024x768',
  '768x1024',
];

// Toast notification component
interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

const ToastContainer: React.FC<{
  toasts: Toast[];
  onRemove: (id: string) => void;
}> = ({ toasts, onRemove }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className={`flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg ${
              toast.type === 'success'
                ? 'bg-green-500 text-white'
                : toast.type === 'error'
                ? 'bg-red-500 text-white'
                : 'bg-gray-800 text-white'
            }`}
          >
            {toast.type === 'success' && <Check className="w-4 h-4" />}
            {toast.type === 'error' && <AlertCircle className="w-4 h-4" />}
            <span className="text-sm">{toast.message}</span>
            <button
              onClick={() => onRemove(toast.id)}
              className="ml-2 hover:opacity-70"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Style thumbnail component
const StyleThumbnail: React.FC<{
  style: ImageStyle;
  isSelected: boolean;
  onClick: () => void;
  t: (key: string) => string;
}> = ({ style, isSelected, onClick, t }) => {
  const config = STYLE_CONFIGS[style];
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`flex-shrink-0 flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${
        isSelected
          ? 'ring-2 ring-pink-500 bg-pink-50 dark:bg-pink-900/20'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      <div
        className={`w-16 h-16 rounded-lg bg-gradient-to-br ${config.gradient} flex items-center justify-center shadow-md`}
      >
        <Sparkles className="w-6 h-6 text-white/80" />
      </div>
      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 whitespace-nowrap">
        {t(`imageGenerator.styles.${style}`)}
      </span>
    </motion.button>
  );
};

// Generation card component
const GenerationCard: React.FC<{
  generation: ImageGeneration;
  isInGallery: boolean;
  onDownload: (gen: ImageGeneration) => void;
  onCopyPrompt: (prompt: string) => void;
  onToggleGallery: (id: string) => void;
  onDelete: (id: string) => void;
  onRegenerate: (gen: ImageGeneration) => void;
  onViewDetail: (gen: ImageGeneration) => void;
  t: (key: string) => string;
}> = ({
  generation,
  isInGallery,
  onDownload,
  onCopyPrompt,
  onToggleGallery,
  onDelete,
  onRegenerate,
  onViewDetail,
  t,
}) => {
  const config = STYLE_CONFIGS[generation.style];
  const { width, height } = getSizeDimensions(generation.size);
  const aspectRatio = width / height;

  return (
    <motion.div
      layout
      variants={fadeIn}
      className="group relative bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-shadow"
    >
      {/* Image container */}
      <div
        className="relative overflow-hidden cursor-pointer"
        style={{ aspectRatio }}
        onClick={() => generation.status === 'completed' && onViewDetail(generation)}
      >
        {generation.status === 'generating' ? (
          <div className={`w-full h-full bg-gradient-to-br ${config.gradient} flex items-center justify-center`}>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            >
              <RefreshCw className="w-8 h-8 text-white" />
            </motion.div>
          </div>
        ) : generation.status === 'failed' ? (
          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex flex-col items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {t('imageGenerator.status.failed')}
            </span>
          </div>
        ) : (
          <>
            <img
              src={generation.resultUrl}
              alt={generation.prompt}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
          </>
        )}

        {/* Status badge */}
        <div className="absolute top-2 left-2">
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full ${
              generation.status === 'completed'
                ? 'bg-green-500 text-white'
                : generation.status === 'generating'
                ? 'bg-blue-500 text-white'
                : generation.status === 'failed'
                ? 'bg-red-500 text-white'
                : 'bg-gray-500 text-white'
            }`}
          >
            {t(`imageGenerator.status.${generation.status}`)}
          </span>
        </div>

        {/* Style badge */}
        <div className="absolute top-2 right-2">
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-black/50 text-white backdrop-blur-sm">
            {t(`imageGenerator.styles.${generation.style}`)}
          </span>
        </div>
      </div>

      {/* Info */}
      <div className="p-3">
        <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 mb-2">
          {generation.prompt}
        </p>
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>{generation.size}</span>
          {generation.generationTime > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {(generation.generationTime / 1000).toFixed(1)}s
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
        {generation.status === 'completed' && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(generation);
              }}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
              title={t('imageGenerator.download')}
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCopyPrompt(generation.prompt);
              }}
              className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
              title={t('imageGenerator.copyPrompt')}
            >
              <Copy className="w-4 h-4" />
            </button>
          </>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleGallery(generation.id);
          }}
          className={`p-2 rounded-full transition-colors ${
            isInGallery
              ? 'bg-pink-500 text-white'
              : 'bg-white/20 hover:bg-white/30 text-white'
          }`}
          title={
            isInGallery
              ? t('imageGenerator.removeFromGallery')
              : t('imageGenerator.addToGallery')
          }
        >
          <Heart className={`w-4 h-4 ${isInGallery ? 'fill-current' : ''}`} />
        </button>
        {generation.status === 'failed' ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRegenerate(generation);
            }}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            title={t('imageGenerator.retry')}
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(generation.id);
            }}
            className="p-2 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            title={t('imageGenerator.delete')}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

// Detail modal component
const ImageDetailModal: React.FC<{
  generation: ImageGeneration | null;
  isOpen: boolean;
  onClose: () => void;
  isInGallery: boolean;
  onToggleGallery: (id: string) => void;
  onDownload: (gen: ImageGeneration) => void;
  onCopyPrompt: (prompt: string) => void;
  t: (key: string) => string;
}> = ({
  generation,
  isOpen,
  onClose,
  isInGallery,
  onToggleGallery,
  onDownload,
  onCopyPrompt,
  t,
}) => {
  if (!generation) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed inset-4 md:inset-10 bg-white dark:bg-gray-900 rounded-2xl z-50 overflow-hidden flex flex-col md:flex-row"
          >
            {/* Image */}
            <div className="flex-1 bg-gray-100 dark:bg-gray-800 flex items-center justify-center p-4 overflow-auto">
              <img
                src={generation.resultUrl}
                alt={generation.prompt}
                className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
              />
            </div>

            {/* Info panel */}
            <div className="w-full md:w-80 p-6 border-t md:border-t-0 md:border-l border-gray-200 dark:border-gray-700 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {t('imageGenerator.parameters')}
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('imageGenerator.prompt')}
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {generation.prompt}
                  </p>
                </div>

                {generation.negativePrompt && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t('imageGenerator.negativePrompt')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {generation.negativePrompt}
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t('imageGenerator.style')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {t(`imageGenerator.styles.${generation.style}`)}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t('imageGenerator.size')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {generation.size}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t('imageGenerator.seed')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {generation.seed}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {t('imageGenerator.generationTime')}
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                      {(generation.generationTime / 1000).toFixed(1)}s
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    {t('imageGenerator.createdAt')}
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-gray-100">
                    {new Date(generation.createdAt).toLocaleString()}
                  </p>
                </div>

                <div className="pt-4 space-y-2">
                  <button
                    onClick={() => onDownload(generation)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-lg hover:opacity-90 transition-opacity"
                  >
                    <Download className="w-4 h-4" />
                    {t('imageGenerator.download')}
                  </button>
                  <button
                    onClick={() => onCopyPrompt(generation.prompt)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                  >
                    <Copy className="w-4 h-4" />
                    {t('imageGenerator.copyPrompt')}
                  </button>
                  <button
                    onClick={() => onToggleGallery(generation.id)}
                    className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                      isInGallery
                        ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Heart className={`w-4 h-4 ${isInGallery ? 'fill-current' : ''}`} />
                    {isInGallery
                      ? t('imageGenerator.removeFromGallery')
                      : t('imageGenerator.addToGallery')}
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Settings modal component
const SettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  t: (key: string) => string;
}> = ({ isOpen, onClose, t }) => {
  const { settings, updateSettings, clearHistory } = useImageStore();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearHistory = () => {
    clearHistory();
    setShowClearConfirm(false);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-white dark:bg-gray-900 rounded-2xl z-50 overflow-hidden shadow-2xl"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {t('imageGenerator.settings')}
                </h3>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Default Style */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('imageGenerator.defaultStyle')}
                  </label>
                  <select
                    value={settings.defaultStyle}
                    onChange={(e) =>
                      updateSettings({ defaultStyle: e.target.value as ImageStyle })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    {STYLE_OPTIONS.map((style) => (
                      <option key={style} value={style}>
                        {t(`imageGenerator.styles.${style}`)}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Default Size */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('imageGenerator.defaultSize')}
                  </label>
                  <select
                    value={settings.defaultSize}
                    onChange={(e) =>
                      updateSettings({ defaultSize: e.target.value as ImageSize })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  >
                    {SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Auto Save */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('imageGenerator.autoSave')}
                  </label>
                  <button
                    onClick={() => updateSettings({ autoSave: !settings.autoSave })}
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      settings.autoSave ? 'bg-pink-500' : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.autoSave ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Show Negative Prompt */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('imageGenerator.showNegativePrompt')}
                  </label>
                  <button
                    onClick={() =>
                      updateSettings({ showNegativePrompt: !settings.showNegativePrompt })
                    }
                    className={`relative w-11 h-6 rounded-full transition-colors ${
                      settings.showNegativePrompt
                        ? 'bg-pink-500'
                        : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                        settings.showNegativePrompt ? 'translate-x-5' : ''
                      }`}
                    />
                  </button>
                </div>

                {/* Clear History */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                  {!showClearConfirm ? (
                    <button
                      onClick={() => setShowClearConfirm(true)}
                      className="w-full px-4 py-2 text-red-600 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      {t('imageGenerator.clearHistory')}
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('imageGenerator.clearHistoryConfirm')}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={handleClearHistory}
                          className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                          {t('common.confirm')}
                        </button>
                        <button
                          onClick={() => setShowClearConfirm(false)}
                          className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                        >
                          {t('common.cancel')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Gallery sidebar component
const GallerySidebar: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  galleryGenerations: ImageGeneration[];
  onViewDetail: (gen: ImageGeneration) => void;
  t: (key: string) => string;
}> = ({ isOpen, onClose, galleryGenerations, onViewDetail, t }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/30 z-40 backdrop-blur-sm"
          />
          <motion.div
            variants={slideIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed top-0 right-0 bottom-0 w-80 bg-white dark:bg-gray-900 z-50 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <Star className="w-5 h-5 text-pink-500" />
                {t('imageGenerator.gallery')}
              </h3>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {galleryGenerations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                  <Star className="w-12 h-12 mb-4 opacity-30" />
                  <p>{t('imageGenerator.noGallery')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {galleryGenerations.map((gen) => (
                    <motion.div
                      key={gen.id}
                      layoutId={gen.id}
                      onClick={() => onViewDetail(gen)}
                      className="cursor-pointer group"
                    >
                      <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                        <img
                          src={gen.resultUrl}
                          alt={gen.prompt}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                      </div>
                      <p className="mt-2 text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                        {gen.prompt}
                      </p>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Main component
const ImageGenerator: React.FC = () => {
  const { t } = useTranslation();
  const {
    generations,
    settings,
    gallery,
    createGeneration,
    updateGenerationStatus,
    deleteGeneration,
    addToGallery,
    removeFromGallery,
    isInGallery,
  } = useImageStore();

  // State
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [selectedStyle, setSelectedStyle] = useState<ImageStyle>(settings.defaultStyle);
  const [selectedSize, setSelectedSize] = useState<ImageSize>(settings.defaultSize);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [estimatedTime, setEstimatedTime] = useState(5);
  const [currentGenerationId, setCurrentGenerationId] = useState<string | null>(null);
  const [showNegativePrompt, setShowNegativePrompt] = useState(settings.showNegativePrompt);
  const [showSettings, setShowSettings] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [detailGeneration, setDetailGeneration] = useState<ImageGeneration | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [filterStyle, setFilterStyle] = useState<ImageStyle | 'all'>('all');
  const [filterDate, setFilterDate] = useState<'all' | 'today' | 'week' | 'month'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeTab, setActiveTab] = useState<'all' | 'gallery'>('all');

  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Add toast
  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  // Remove toast
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Handle generate
  const handleGenerate = useCallback(() => {
    if (!prompt.trim()) {
      addToast(t('imageGenerator.promptRequired'), 'error');
      return;
    }
    if (prompt.length > 500) {
      addToast(t('imageGenerator.promptTooLong'), 'error');
      return;
    }

    const id = createGeneration({
      prompt: prompt.trim(),
      negativePrompt: negativePrompt.trim() || undefined,
      style: selectedStyle,
      size: selectedSize,
      seed: Math.floor(Math.random() * 1000000),
    });

    setCurrentGenerationId(id);
    setIsGenerating(true);
    setProgress(0);
    setEstimatedTime(5);

    // Simulate progress
    const totalTime = 3000 + Math.random() * 2000; // 3-5 seconds
    const interval = 100;
    const steps = totalTime / interval;
    let currentStep = 0;

    progressIntervalRef.current = setInterval(() => {
      currentStep++;
      const newProgress = Math.min((currentStep / steps) * 100, 95);
      setProgress(newProgress);
      setEstimatedTime(Math.ceil((totalTime - currentStep * interval) / 1000));

      if (currentStep >= steps) {
        if (progressIntervalRef.current) {
          clearInterval(progressIntervalRef.current);
        }
      }
    }, interval);

    // Complete generation
    setTimeout(() => {
      const success = Math.random() > 0.1; // 90% success rate
      if (success) {
        const resultUrl = generatePlaceholderUrl(selectedSize, selectedStyle, prompt);
        updateGenerationStatus(id, 'completed', resultUrl, Math.floor(totalTime));
        addToast(t('imageGenerator.generationSuccess'), 'success');
      } else {
        updateGenerationStatus(id, 'failed');
        addToast(t('imageGenerator.generationFailed'), 'error');
      }
      setIsGenerating(false);
      setProgress(100);
      setCurrentGenerationId(null);
    }, totalTime);
  }, [
    prompt,
    negativePrompt,
    selectedStyle,
    selectedSize,
    createGeneration,
    updateGenerationStatus,
    addToast,
    t,
  ]);

  // Cancel generation
  const handleCancel = useCallback(() => {
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
    }
    if (currentGenerationId) {
      updateGenerationStatus(currentGenerationId, 'failed');
    }
    setIsGenerating(false);
    setProgress(0);
    setCurrentGenerationId(null);
  }, [currentGenerationId, updateGenerationStatus]);

  // Handle download
  const handleDownload = useCallback((gen: ImageGeneration) => {
    const link = document.createElement('a');
    link.href = gen.resultUrl;
    link.download = `ai-generated-${gen.id}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast(t('imageGenerator.downloadSuccess'), 'success');
  }, [addToast, t]);

  // Handle copy prompt
  const handleCopyPrompt = useCallback(async (promptText: string) => {
    try {
      await navigator.clipboard.writeText(promptText);
      addToast(t('imageGenerator.copied'), 'success');
    } catch {
      addToast(t('common.error'), 'error');
    }
  }, [addToast, t]);

  // Handle toggle gallery
  const handleToggleGallery = useCallback((id: string) => {
    if (isInGallery(id)) {
      removeFromGallery(id);
      addToast(t('imageGenerator.removedFromGallery'), 'info');
    } else {
      addToGallery(id);
      addToast(t('imageGenerator.addedToGallery'), 'success');
    }
  }, [isInGallery, addToGallery, removeFromGallery, addToast, t]);

  // Handle delete
  const handleDelete = useCallback((id: string) => {
    if (window.confirm(t('imageGenerator.confirmDelete'))) {
      deleteGeneration(id);
    }
  }, [deleteGeneration, t]);

  // Handle regenerate
  const handleRegenerate = useCallback((gen: ImageGeneration) => {
    setPrompt(gen.prompt);
    setNegativePrompt(gen.negativePrompt || '');
    setSelectedStyle(gen.style);
    setSelectedSize(gen.size);
    deleteGeneration(gen.id);
    // Trigger generate after a short delay
    setTimeout(() => {
      handleGenerate();
    }, 100);
  }, [deleteGeneration, handleGenerate]);

  // Filter generations
  const filteredGenerations = generations.filter((gen) => {
    if (activeTab === 'gallery') {
      return gallery.includes(gen.id);
    }
    if (filterStyle !== 'all' && gen.style !== filterStyle) return false;
    if (filterDate !== 'all') {
      const now = Date.now();
      const dayMs = 86400000;
      if (filterDate === 'today' && now - gen.createdAt > dayMs) return false;
      if (filterDate === 'week' && now - gen.createdAt > dayMs * 7) return false;
      if (filterDate === 'month' && now - gen.createdAt > dayMs * 30) return false;
    }
    return true;
  });

  // Gallery generations
  const galleryGenerations = generations.filter((gen) => gallery.includes(gen.id));

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
      }
    };
  }, []);

  // Update showNegativePrompt when settings change
  useEffect(() => {
    setShowNegativePrompt(settings.showNegativePrompt);
  }, [settings.showNegativePrompt]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-pink-500 to-rose-600 rounded-lg">
                <Wand2 className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('imageGenerator.title')}
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowGallery(true)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  gallery.length > 0
                    ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Star className="w-4 h-4" />
                <span className="hidden sm:inline">{t('imageGenerator.gallery')}</span>
                {gallery.length > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-pink-500 text-white rounded-full">
                    {gallery.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setShowSettings(true)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Input Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-8"
        >
          {/* Prompt */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('imageGenerator.prompt')}
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t('imageGenerator.promptPlaceholder')}
              rows={3}
              maxLength={500}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
            />
            <div className="flex justify-between mt-1 text-xs text-gray-500 dark:text-gray-400">
              <span>
                {t('imageGenerator.characterCount')}: {prompt.length}/500
              </span>
            </div>
          </div>

          {/* Negative Prompt */}
          <AnimatePresence>
            {showNegativePrompt && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-4 overflow-hidden"
              >
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('imageGenerator.negativePrompt')}
                </label>
                <textarea
                  value={negativePrompt}
                  onChange={(e) => setNegativePrompt(e.target.value)}
                  placeholder={t('imageGenerator.negativePlaceholder')}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 resize-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all"
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Controls */}
          <div className="flex flex-wrap items-center gap-4 mb-4">
            {/* Style Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('imageGenerator.style')}:
              </label>
              <select
                value={selectedStyle}
                onChange={(e) => setSelectedStyle(e.target.value as ImageStyle)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                {STYLE_OPTIONS.map((style) => (
                  <option key={style} value={style}>
                    {t(`imageGenerator.styles.${style}`)}
                  </option>
                ))}
              </select>
            </div>

            {/* Size Selector */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('imageGenerator.size')}:
              </label>
              <select
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value as ImageSize)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                {SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            {/* Toggle Negative Prompt */}
            <button
              onClick={() => setShowNegativePrompt(!showNegativePrompt)}
              className="text-sm text-pink-600 dark:text-pink-400 hover:underline"
            >
              {showNegativePrompt
                ? t('imageGenerator.collapse')
                : t('imageGenerator.expand')}{' '}
              {t('imageGenerator.negativePrompt')}
            </button>
          </div>

          {/* Generate Button */}
          <div className="flex items-center gap-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={isGenerating ? handleCancel : handleGenerate}
              disabled={!prompt.trim() && !isGenerating}
              className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium text-white transition-all ${
                isGenerating
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-gradient-to-r from-pink-500 to-rose-600 hover:opacity-90'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {isGenerating ? (
                <>
                  <X className="w-5 h-5" />
                  {t('imageGenerator.cancel')}
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5" />
                  {t('imageGenerator.generate')}
                </>
              )}
            </motion.button>
          </div>

          {/* Progress Bar */}
          <AnimatePresence>
            {isGenerating && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 overflow-hidden"
              >
                <div className="flex items-center justify-between mb-2 text-sm text-gray-600 dark:text-gray-400">
                  <span>
                    {t('imageGenerator.progress')}: {Math.round(progress)}%
                  </span>
                  <span>
                    {t('imageGenerator.estimatedTime')}: {estimatedTime}{' '}
                    {t('imageGenerator.seconds')}
                  </span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-pink-500 to-rose-600"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.section>

        {/* Style Gallery */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            {t('imageGenerator.style')}
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
            {STYLE_OPTIONS.map((style) => (
              <StyleThumbnail
                key={style}
                style={style}
                isSelected={selectedStyle === style}
                onClick={() => setSelectedStyle(style)}
                t={t}
              />
            ))}
          </div>
        </motion.section>

        {/* Results Section */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          {/* Tabs and Filters */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'all'
                    ? 'bg-pink-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {t('imageGenerator.history')}
              </button>
              <button
                onClick={() => setActiveTab('gallery')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeTab === 'gallery'
                    ? 'bg-pink-500 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {t('imageGenerator.gallery')}
                {gallery.length > 0 && (
                  <span className="px-2 py-0.5 text-xs bg-white/20 rounded-full">
                    {gallery.length}
                  </span>
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Style Filter */}
              <select
                value={filterStyle}
                onChange={(e) => setFilterStyle(e.target.value as ImageStyle | 'all')}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="all">{t('imageGenerator.filterAll')}</option>
                {STYLE_OPTIONS.map((style) => (
                  <option key={style} value={style}>
                    {t(`imageGenerator.styles.${style}`)}
                  </option>
                ))}
              </select>

              {/* Date Filter */}
              <select
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value as typeof filterDate)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-pink-500 focus:border-transparent"
              >
                <option value="all">{t('imageGenerator.filterAll')}</option>
                <option value="today">{t('imageGenerator.today')}</option>
                <option value="week">{t('imageGenerator.thisWeek')}</option>
                <option value="month">{t('imageGenerator.thisMonth')}</option>
              </select>

              {/* View Mode */}
              <div className="flex items-center bg-white dark:bg-gray-800 rounded-lg border border-gray-300 dark:border-gray-700">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-l-lg transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-pink-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-r-lg transition-colors ${
                    viewMode === 'list'
                      ? 'bg-pink-500 text-white'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Results Grid */}
          {filteredGenerations.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-16 text-gray-500 dark:text-gray-400"
            >
              <ImageIcon className="w-16 h-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">
                {activeTab === 'gallery'
                  ? t('imageGenerator.noGallery')
                  : t('imageGenerator.noGenerations')}
              </p>
              <p className="text-sm mt-2">
                {activeTab === 'gallery'
                  ? t('imageGenerator.addToGallery')
                  : t('imageGenerator.promptPlaceholder')}
              </p>
            </motion.div>
          ) : (
            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className={`grid gap-4 ${
                viewMode === 'grid'
                  ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5'
                  : 'grid-cols-1'
              }`}
            >
              {filteredGenerations.map((gen) => (
                <GenerationCard
                  key={gen.id}
                  generation={gen}
                  isInGallery={isInGallery(gen.id)}
                  onDownload={handleDownload}
                  onCopyPrompt={handleCopyPrompt}
                  onToggleGallery={handleToggleGallery}
                  onDelete={handleDelete}
                  onRegenerate={handleRegenerate}
                  onViewDetail={setDetailGeneration}
                  t={t}
                />
              ))}
            </motion.div>
          )}
        </motion.section>
      </main>

      {/* Modals */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} t={t} />
      
      <GallerySidebar
        isOpen={showGallery}
        onClose={() => setShowGallery(false)}
        galleryGenerations={galleryGenerations}
        onViewDetail={setDetailGeneration}
        t={t}
      />
      
      <ImageDetailModal
        generation={detailGeneration}
        isOpen={!!detailGeneration}
        onClose={() => setDetailGeneration(null)}
        isInGallery={detailGeneration ? isInGallery(detailGeneration.id) : false}
        onToggleGallery={handleToggleGallery}
        onDownload={handleDownload}
        onCopyPrompt={handleCopyPrompt}
        t={t}
      />

      {/* Toasts */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

export default ImageGenerator;
