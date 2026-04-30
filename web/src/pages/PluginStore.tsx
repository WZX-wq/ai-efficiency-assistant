import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeo } from '../components/SeoHead';

// ============================================================
// Types
// ============================================================

interface Plugin {
  id: string;
  name: string;
  icon: string;
  author: string;
  category: CategoryKey;
  version: string;
  installs: number;
  rating: number;
  desc: string;
  status: 'installed' | 'available';
  features?: string[];
  changelog?: string[];
  custom?: boolean;
}

type CategoryKey = 'efficiency' | 'writing' | 'data' | 'ai' | 'dev' | 'life';

interface Review {
  id: string;
  avatar: string;
  name: string;
  rating: number;
  date: string;
  text: string;
}

interface PluginSettings {
  [pluginId: string]: { enabled: boolean; [key: string]: unknown };
}

// ============================================================
// Constants
// ============================================================

const CATEGORIES: { key: CategoryKey | 'all'; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'efficiency', label: '效率工具' },
  { key: 'writing', label: '写作增强' },
  { key: 'data', label: '数据处理' },
  { key: 'ai', label: 'AI模型' },
  { key: 'dev', label: '开发工具' },
  { key: 'life', label: '生活助手' },
];

const CATEGORY_COLORS: Record<CategoryKey, string> = {
  efficiency: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  writing: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  data: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  ai: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
  dev: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
  life: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
};

const CATEGORY_LABELS: Record<CategoryKey, string> = {
  efficiency: '效率工具',
  writing: '写作增强',
  data: '数据处理',
  ai: 'AI模型',
  dev: '开发工具',
  life: '生活助手',
};

const ICON_COLORS: Record<string, string> = {
  '✅': 'bg-green-500',
  '📊': 'bg-blue-500',
  '💾': 'bg-sky-500',
  '🎯': 'bg-red-500',
  '🎭': 'bg-purple-500',
  '😊': 'bg-yellow-500',
  '📚': 'bg-amber-700',
  '📋': 'bg-teal-500',
  '📈': 'bg-emerald-500',
  '🔧': 'bg-gray-500',
  '🧠': 'bg-violet-500',
  '💡': 'bg-orange-500',
  '👁️': 'bg-cyan-500',
  '💻': 'bg-slate-600',
  '🌤️': 'bg-sky-400',
  '🍳': 'bg-orange-600',
};

const EMOJI_GRID = [
  '✅', '📊', '💾', '🎯', '🎭', '😊', '📚', '📋',
  '📈', '🔧', '🧠', '💡', '👁️', '💻', '🌤️', '🍳',
  '🚀', '⚡', '🎨', '📝', '🔍', '🌐', '🔒', '🎵',
  '📷', '🎮', '📱', '🖥️', '🔑', '📦', '🤖', '⚙️',
];

const DEFAULT_PLUGINS: Plugin[] = [
  // 效率工具
  { id: 'grammar-check', name: '语法检查器', icon: '✅', author: 'AI Lab', category: 'efficiency', version: '2.1.0', installs: 15200, rating: 4.8, desc: '实时语法检查与纠错建议', status: 'installed', features: ['实时语法检查', '智能纠错建议', '多语言支持', '上下文理解'], changelog: ['v2.1.0 - 新增中文语法支持', 'v2.0.0 - 全面重构引擎', 'v1.5.0 - 新增上下文理解'] },
  { id: 'word-count', name: '字数统计', icon: '📊', author: '效率团队', category: 'efficiency', version: '1.3.0', installs: 8900, rating: 4.5, desc: '详细字数/词数/段落数统计', status: 'available', features: ['字数统计', '词数统计', '段落数统计', '阅读时间估算'], changelog: ['v1.3.0 - 新增阅读时间估算', 'v1.2.0 - 优化统计精度'] },
  { id: 'auto-save', name: '自动保存', icon: '💾', author: '基础工具', category: 'efficiency', version: '3.0.1', installs: 22100, rating: 4.9, desc: '智能自动保存，防止内容丢失', status: 'installed', features: ['智能保存策略', '版本历史', '冲突检测', '云端同步'], changelog: ['v3.0.1 - 修复同步问题', 'v3.0.0 - 新增云端同步', 'v2.5.0 - 版本历史'] },
  { id: 'focus-mode', name: '专注模式', icon: '🎯', author: '效率团队', category: 'efficiency', version: '1.0.0', installs: 5600, rating: 4.3, desc: '全屏无干扰写作环境', status: 'available', features: ['全屏模式', '番茄钟计时', '白噪音', '打字机模式'], changelog: ['v1.0.0 - 初始发布'] },

  // 写作增强
  { id: 'tone-adjust', name: '语气调节器', icon: '🎭', author: '写作实验室', category: 'writing', version: '1.5.0', installs: 11800, rating: 4.7, desc: '一键调整文本语气(正式/轻松/专业)', status: 'available', features: ['正式语气', '轻松语气', '专业语气', '自定义语气'], changelog: ['v1.5.0 - 新增自定义语气', 'v1.4.0 - 优化语气识别'] },
  { id: 'emoji-suggest', name: '表情推荐', icon: '😊', author: '创意工坊', category: 'writing', version: '1.2.0', installs: 7300, rating: 4.4, desc: '智能推荐合适的表情符号', status: 'available', features: ['上下文表情推荐', '表情搜索', '收藏常用表情', '批量替换'], changelog: ['v1.2.0 - 新增收藏功能', 'v1.1.0 - 优化推荐算法'] },
  { id: 'citation-gen', name: '引用生成器', icon: '📚', author: '学术工具', category: 'writing', version: '2.0.0', installs: 9400, rating: 4.6, desc: '自动生成APA/MLA/Chicago引用格式', status: 'available', features: ['APA格式', 'MLA格式', 'Chicago格式', '一键插入'], changelog: ['v2.0.0 - 新增Chicago格式', 'v1.5.0 - 支持批量引用'] },

  // 数据处理
  { id: 'csv-parser', name: 'CSV解析器', icon: '📋', author: '数据团队', category: 'data', version: '1.8.0', installs: 13500, rating: 4.8, desc: '智能解析CSV/Excel数据', status: 'installed', features: ['CSV解析', 'Excel支持', '数据预览', '格式转换'], changelog: ['v1.8.0 - 新增Excel支持', 'v1.7.0 - 优化大文件解析'] },
  { id: 'chart-maker', name: '图表生成器', icon: '📈', author: '可视化Lab', category: 'data', version: '2.2.0', installs: 10200, rating: 4.7, desc: '一键生成专业数据图表', status: 'available', features: ['柱状图', '折线图', '饼图', '散点图'], changelog: ['v2.2.0 - 新增散点图', 'v2.1.0 - 优化渲染性能'] },
  { id: 'json-formatter', name: 'JSON格式化', icon: '🔧', author: '开发工具', category: 'data', version: '1.1.0', installs: 16800, rating: 4.9, desc: 'JSON格式化/压缩/验证', status: 'available', features: ['格式化', '压缩', '语法验证', 'JSONPath查询'], changelog: ['v1.1.0 - 新增JSONPath', 'v1.0.0 - 初始发布'] },

  // AI模型
  { id: 'deepseek-plus', name: 'DeepSeek增强', icon: '🧠', author: 'AI Lab', category: 'ai', version: '1.0.0', installs: 8200, rating: 4.5, desc: 'DeepSeek模型增强插件', status: 'available', features: ['模型加速', '缓存优化', '批量处理', '自定义参数'], changelog: ['v1.0.0 - 初始发布'] },
  { id: 'prompt-templates', name: 'Prompt模板库', icon: '💡', author: 'AI Lab', category: 'ai', version: '3.1.0', installs: 19500, rating: 4.8, desc: '100+精选Prompt模板', status: 'installed', features: ['100+模板', '分类浏览', '自定义模板', '一键使用'], changelog: ['v3.1.0 - 新增20个模板', 'v3.0.0 - 全面升级'] },

  // 开发工具
  { id: 'markdown-preview', name: 'Markdown预览', icon: '👁️', author: '开发工具', category: 'dev', version: '2.0.0', installs: 14200, rating: 4.7, desc: '实时Markdown渲染预览', status: 'installed', features: ['实时预览', '主题切换', '代码高亮', '导出PDF'], changelog: ['v2.0.0 - 新增导出PDF', 'v1.5.0 - 代码高亮'] },
  { id: 'code-block', name: '代码块增强', icon: '💻', author: '开发工具', category: 'dev', version: '1.4.0', installs: 9800, rating: 4.6, desc: '代码块语法高亮与复制', status: 'available', features: ['语法高亮', '一键复制', '行号显示', '多语言支持'], changelog: ['v1.4.0 - 新增多语言', 'v1.3.0 - 优化复制功能'] },

  // 生活助手
  { id: 'weather', name: '天气助手', icon: '🌤️', author: '生活工具', category: 'life', version: '1.0.0', installs: 6700, rating: 4.2, desc: '天气查询与穿衣建议', status: 'available', features: ['实时天气', '7天预报', '穿衣建议', '空气质量'], changelog: ['v1.0.0 - 初始发布'] },
  { id: 'recipe', name: '菜谱推荐', icon: '🍳', author: '生活工具', category: 'life', version: '1.2.0', installs: 5100, rating: 4.1, desc: '根据食材推荐菜谱', status: 'available', features: ['食材识别', '菜谱推荐', '步骤指导', '营养分析'], changelog: ['v1.2.0 - 新增营养分析', 'v1.1.0 - 优化推荐算法'] },
];

const MOCK_REVIEWS: Review[] = [
  { id: '1', avatar: '👩‍💻', name: '张小明', rating: 5, date: '2024-12-15', text: '非常好用的插件，大大提升了我的工作效率！语法检查功能特别准确，推荐给所有写作的朋友。' },
  { id: '2', avatar: '👨‍🎨', name: '李设计师', rating: 4, date: '2024-12-10', text: '图表生成器很实用，一键就能出专业的数据可视化图表，节省了很多时间。希望能增加更多图表类型。' },
  { id: '3', avatar: '👩‍🎓', name: '王同学', rating: 5, date: '2024-12-08', text: '引用生成器简直是论文写作的救星！APA和MLA格式一键生成，再也不用手动排版了。' },
  { id: '4', avatar: '👨‍💼', name: '陈经理', rating: 4, date: '2024-12-05', text: 'Prompt模板库内容很丰富，100多个模板覆盖了各种场景，对AI新手特别友好。' },
];

// ============================================================
// Helpers
// ============================================================

function formatInstalls(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, '') + '万';
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
  return String(n);
}

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4';
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          className={`${sizeClass} ${star <= Math.round(rating) ? 'text-amber-400' : 'text-gray-200 dark:text-gray-600'}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className={`ml-1 ${size === 'sm' ? 'text-xs' : 'text-sm'} text-gray-500 dark:text-gray-400`}>
        {rating.toFixed(1)}
      </span>
    </div>
  );
}

// ============================================================
// Sub-Components
// ============================================================

function PluginCard({
  plugin,
  isInstalled,
  onInstall,
  onUninstall,
  onDetail,
}: {
  plugin: Plugin;
  isInstalled: boolean;
  onInstall: (id: string) => void;
  onUninstall: (id: string) => void;
  onDetail: (plugin: Plugin) => void;
}) {
  const bgColor = ICON_COLORS[plugin.icon] || 'bg-violet-500';

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4, boxShadow: '0 12px 40px rgba(0,0,0,0.1)' }}
      transition={{ duration: 0.2 }}
      className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col"
    >
      <div className="p-5 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className={`w-12 h-12 ${bgColor} rounded-xl flex items-center justify-center text-xl shadow-sm shrink-0`}>
            {plugin.icon}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                {plugin.name}
              </h3>
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                v{plugin.version}
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{plugin.author}</p>
          </div>
        </div>

        {/* Category badge */}
        <span className={`inline-flex self-start px-2 py-0.5 text-[11px] font-medium rounded-full mb-3 ${CATEGORY_COLORS[plugin.category]}`}>
          {CATEGORY_LABELS[plugin.category]}
        </span>

        {/* Description */}
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 flex-1 line-clamp-2">
          {plugin.desc}
        </p>

        {/* Stats */}
        <div className="flex items-center justify-between mb-4">
          <StarRating rating={plugin.rating} />
          <span className="text-xs text-gray-400 dark:text-gray-500">
            {formatInstalls(plugin.installs)} 安装
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {isInstalled ? (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onUninstall(plugin.id)}
              className="flex-1 px-4 py-2 text-sm font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
            >
              已安装
            </motion.button>
          ) : (
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => onInstall(plugin.id)}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md"
            >
              安装
            </motion.button>
          )}
          <button
            onClick={() => onDetail(plugin)}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            详情
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function PluginDetailModal({
  plugin,
  isInstalled,
  onClose,
  onInstall,
  onUninstall,
}: {
  plugin: Plugin;
  isInstalled: boolean;
  onClose: () => void;
  onInstall: (id: string) => void;
  onUninstall: (id: string) => void;
}) {
  const bgColor = ICON_COLORS[plugin.icon] || 'bg-violet-500';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header with gradient */}
        <div className="relative bg-gradient-to-br from-violet-600 to-purple-700 p-6 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 ${bgColor} rounded-2xl flex items-center justify-center text-3xl shadow-lg`}>
              {plugin.icon}
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{plugin.name}</h2>
              <p className="text-violet-200 text-sm mt-0.5">{plugin.author} · v{plugin.version}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="px-2 py-0.5 text-xs font-medium bg-white/20 text-white rounded-full">
                  {CATEGORY_LABELS[plugin.category]}
                </span>
                <span className="text-xs text-violet-200">{formatInstalls(plugin.installs)} 安装</span>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Description */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">简介</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">{plugin.desc}</p>
          </div>

          {/* Screenshot placeholder */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">预览</h3>
            <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl h-40 flex items-center justify-center border border-violet-100 dark:border-violet-800">
              <div className="text-center">
                <span className="text-4xl mb-2 block">{plugin.icon}</span>
                <p className="text-sm text-violet-400 dark:text-violet-500">{plugin.name} 预览</p>
              </div>
            </div>
          </div>

          {/* Features */}
          {plugin.features && plugin.features.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">功能特性</h3>
              <ul className="space-y-1.5">
                {plugin.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                    <svg className="w-4 h-4 text-violet-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Changelog */}
          {plugin.changelog && plugin.changelog.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">更新日志</h3>
              <ul className="space-y-1">
                {plugin.changelog.map((c, i) => (
                  <li key={i} className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 bg-violet-400 rounded-full shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Rating */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">评分</h3>
            <div className="flex items-center gap-3">
              <StarRating rating={plugin.rating} size="md" />
              <span className="text-sm text-gray-500 dark:text-gray-400">{plugin.rating.toFixed(1)} / 5.0</span>
            </div>
          </div>

          {/* Reviews */}
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">用户评价</h3>
            <div className="space-y-3">
              {MOCK_REVIEWS.slice(0, 3).map((review) => (
                <div key={review.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-lg">{review.avatar}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{review.name}</p>
                      <p className="text-[10px] text-gray-400">{review.date}</p>
                    </div>
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed">{review.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Action button */}
          <div className="pt-2">
            {isInstalled ? (
              <button
                onClick={() => onUninstall(plugin.id)}
                className="w-full px-4 py-3 text-sm font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 rounded-xl hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
              >
                卸载插件
              </button>
            ) : (
              <button
                onClick={() => onInstall(plugin.id)}
                className="w-full px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md"
              >
                安装插件
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function CreatePluginModal({
  onClose,
  onCreate,
}: {
  onClose: () => void;
  onCreate: (plugin: Omit<Plugin, 'installs' | 'rating' | 'status'>) => void;
}) {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('🚀');
  const [category, setCategory] = useState<CategoryKey>('efficiency');
  const [desc, setDesc] = useState('');
  const [version, setVersion] = useState('1.0.0');
  const [author, setAuthor] = useState('');

  const handleSubmit = () => {
    if (!name.trim() || !desc.trim()) return;
    onCreate({
      id: `custom-${Date.now()}`,
      name: name.trim(),
      icon,
      author: author.trim() || '自定义',
      category,
      version,
      desc: desc.trim(),
      custom: true,
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-6 rounded-t-2xl">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-xl font-bold text-white">创建插件</h2>
          <p className="text-violet-200 text-sm mt-1">创建你的专属AI插件</p>
        </div>

        <div className="p-6 space-y-4">
          {/* Plugin Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">插件名称</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="输入插件名称"
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Author */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">开发者</label>
            <input
              type="text"
              value={author}
              onChange={(e) => setAuthor(e.target.value)}
              placeholder="输入开发者名称"
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Icon Picker */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">图标</label>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-10 h-10 ${ICON_COLORS[icon] || 'bg-violet-500'} rounded-xl flex items-center justify-center text-xl`}>
                {icon}
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">选择一个图标</span>
            </div>
            <div className="grid grid-cols-8 gap-1.5">
              {EMOJI_GRID.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setIcon(emoji)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition-all ${
                    icon === emoji
                      ? 'bg-violet-100 dark:bg-violet-900/30 ring-2 ring-violet-500 scale-110'
                      : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">分类</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryKey)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
            >
              {CATEGORIES.filter((c) => c.key !== 'all').map((c) => (
                <option key={c.key} value={c.key}>{c.label}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">描述</label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              placeholder="输入插件描述"
              rows={3}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none resize-none"
            />
          </div>

          {/* Version */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">版本号</label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent outline-none"
            />
          </div>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={!name.trim() || !desc.trim()}
            className="w-full px-4 py-3 text-sm font-medium text-white bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl hover:from-violet-700 hover:to-purple-700 transition-all shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            发布插件
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function SettingsModal({
  plugin,
  onClose,
}: {
  plugin: Plugin;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-sm w-full"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-violet-600 to-purple-700 p-5 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{plugin.icon}</span>
              <div>
                <h2 className="text-lg font-bold text-white">{plugin.name}</h2>
                <p className="text-violet-200 text-xs">插件设置</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-white/20 text-white hover:bg-white/30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">自动更新</span>
            <ToggleSwitch defaultChecked />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">通知提醒</span>
            <ToggleSwitch />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-700 dark:text-gray-300">数据收集</span>
            <ToggleSwitch />
          </div>
          <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
            <p className="text-xs text-gray-400 dark:text-gray-500">版本 {plugin.version} · {plugin.author}</p>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ToggleSwitch({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [checked, setChecked] = useState(defaultChecked);
  return (
    <button
      onClick={() => setChecked(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-violet-600' : 'bg-gray-200 dark:bg-gray-600'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function PluginStore() {
  useSeo('plugins');

  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<CategoryKey | 'all'>('all');
  const [activeTab, setActiveTab] = useState<'market' | 'my'>('market');
  const [installedIds, setInstalledIds] = useState<Set<string>>(new Set());
  const [pluginSettings, setPluginSettings] = useState<PluginSettings>({});
  const [customPlugins, setCustomPlugins] = useState<Plugin[]>([]);
  const [detailPlugin, setDetailPlugin] = useState<Plugin | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [settingsPlugin, setSettingsPlugin] = useState<Plugin | null>(null);

  // Load state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('plugin-installed');
      if (saved) setInstalledIds(new Set(JSON.parse(saved)));

      const savedSettings = localStorage.getItem('plugin-settings');
      if (savedSettings) setPluginSettings(JSON.parse(savedSettings));

      const savedCustom = localStorage.getItem('plugin-custom');
      if (savedCustom) setCustomPlugins(JSON.parse(savedCustom));
    } catch {
      // ignore
    }
  }, []);

  // Save installed state
  useEffect(() => {
    localStorage.setItem('plugin-installed', JSON.stringify([...installedIds]));
  }, [installedIds]);

  // Save settings
  useEffect(() => {
    localStorage.setItem('plugin-settings', JSON.stringify(pluginSettings));
  }, [pluginSettings]);

  // Save custom plugins
  useEffect(() => {
    localStorage.setItem('plugin-custom', JSON.stringify(customPlugins));
  }, [customPlugins]);

  // Initialize installed plugins from defaults
  useEffect(() => {
    const defaultInstalled = DEFAULT_PLUGINS.filter((p) => p.status === 'installed').map((p) => p.id);
    setInstalledIds((prev) => {
      if (prev.size === 0) return new Set(defaultInstalled);
      return prev;
    });
  }, []);

  const allPlugins = useMemo(() => [...DEFAULT_PLUGINS, ...customPlugins], [customPlugins]);

  const filteredPlugins = useMemo(() => {
    return allPlugins.filter((p) => {
      const matchCategory = activeCategory === 'all' || p.category === activeCategory;
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.desc.toLowerCase().includes(search.toLowerCase()) ||
        p.author.toLowerCase().includes(search.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [allPlugins, activeCategory, search]);

  const installedPlugins = useMemo(
    () => allPlugins.filter((p) => installedIds.has(p.id)),
    [allPlugins, installedIds],
  );

  const handleInstall = useCallback((id: string) => {
    setInstalledIds((prev) => new Set([...prev, id]));
    setPluginSettings((prev) => ({ ...prev, [id]: { enabled: true } }));
  }, []);

  const handleUninstall = useCallback((id: string) => {
    setInstalledIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setPluginSettings((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const handleTogglePlugin = useCallback((id: string, enabled: boolean) => {
    setPluginSettings((prev) => ({
      ...prev,
      [id]: { ...prev[id], enabled },
    }));
  }, []);

  const handleCreatePlugin = useCallback(
    (pluginData: Omit<Plugin, 'installs' | 'rating' | 'status'>) => {
      const newPlugin: Plugin = {
        ...pluginData,
        installs: 0,
        rating: 0,
        status: 'available',
      };
      setCustomPlugins((prev) => [...prev, newPlugin]);
      handleInstall(newPlugin.id);
    },
    [handleInstall],
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-purple-600 to-indigo-700" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-300 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
                AI 插件市场
              </h1>
              <p className="text-lg sm:text-xl text-violet-100 max-w-2xl mx-auto mb-8">
                扩展AI能力，安装社区插件或创建你的专属插件
              </p>
            </motion.div>

            {/* Search Bar */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="max-w-xl mx-auto mb-8"
            >
              <div className="relative">
                <svg
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="搜索插件..."
                  className="w-full pl-12 pr-4 py-3.5 text-sm bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl text-white placeholder-violet-200 focus:ring-2 focus:ring-white/30 focus:border-transparent outline-none"
                />
              </div>
            </motion.div>

            {/* Stats */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex items-center justify-center gap-8 text-white/80"
            >
              <div className="text-center">
                <p className="text-2xl font-bold text-white">{allPlugins.length}+</p>
                <p className="text-xs text-violet-200">插件</p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">10万+</p>
                <p className="text-xs text-violet-200">安装</p>
              </div>
              <div className="w-px h-8 bg-white/20" />
              <div className="text-center">
                <p className="text-2xl font-bold text-white">社区驱动</p>
                <p className="text-xs text-violet-200">开源生态</p>
              </div>
            </motion.div>

            {/* Create Plugin Button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="mt-8"
            >
              <button
                onClick={() => setShowCreate(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-violet-700 bg-white rounded-xl hover:bg-violet-50 transition-colors shadow-lg"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                创建插件
              </button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        {/* Tab Switcher */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="flex border-b border-gray-100 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('market')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors relative ${
                activeTab === 'market'
                  ? 'text-violet-600 dark:text-violet-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              插件市场
              {activeTab === 'market' && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 dark:bg-violet-400"
                />
              )}
            </button>
            <button
              onClick={() => setActiveTab('my')}
              className={`flex-1 px-6 py-4 text-sm font-medium transition-colors relative ${
                activeTab === 'my'
                  ? 'text-violet-600 dark:text-violet-400'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              我的插件
              {installedPlugins.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-[10px] font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-full">
                  {installedPlugins.length}
                </span>
              )}
              {activeTab === 'my' && (
                <motion.div
                  layoutId="tab-indicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600 dark:bg-violet-400"
                />
              )}
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'market' ? (
              <motion.div
                key="market"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.2 }}
              >
                {/* Category Tabs */}
                <div className="px-6 pt-5 pb-3">
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.key}
                        onClick={() => setActiveCategory(cat.key)}
                        className={`px-4 py-2 text-sm font-medium rounded-xl whitespace-nowrap transition-all ${
                          activeCategory === cat.key
                            ? 'bg-violet-600 text-white shadow-sm'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Plugin Grid */}
                <div className="px-6 pb-6">
                  {filteredPlugins.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      <AnimatePresence>
                        {filteredPlugins.map((plugin) => (
                          <PluginCard
                            key={plugin.id}
                            plugin={plugin}
                            isInstalled={installedIds.has(plugin.id)}
                            onInstall={handleInstall}
                            onUninstall={handleUninstall}
                            onDetail={setDetailPlugin}
                          />
                        ))}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="text-4xl mb-3">🔍</div>
                      <p className="text-gray-500 dark:text-gray-400">未找到匹配的插件</p>
                      <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">试试其他搜索词或分类</p>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="my"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="px-6 py-6">
                  {installedPlugins.length > 0 ? (
                    <div className="space-y-3">
                      {installedPlugins.map((plugin) => {
                        const settings = pluginSettings[plugin.id];
                        const isEnabled = settings?.enabled !== false;
                        const bgColor = ICON_COLORS[plugin.icon] || 'bg-violet-500';

                        return (
                          <motion.div
                            key={plugin.id}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                          >
                            <div className={`w-10 h-10 ${bgColor} rounded-xl flex items-center justify-center text-lg shrink-0`}>
                              {plugin.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                  {plugin.name}
                                </h4>
                                <span className="px-1.5 py-0.5 text-[10px] font-medium bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded">
                                  v{plugin.version}
                                </span>
                                {plugin.custom && (
                                  <span className="px-1.5 py-0.5 text-[10px] font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded">
                                    自定义
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{plugin.desc}</p>
                            </div>

                            {/* Toggle */}
                            <button
                              onClick={() => handleTogglePlugin(plugin.id, !isEnabled)}
                              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0 ${
                                isEnabled ? 'bg-violet-600' : 'bg-gray-300 dark:bg-gray-600'
                              }`}
                            >
                              <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${
                                  isEnabled ? 'translate-x-6' : 'translate-x-1'
                                }`}
                              />
                            </button>

                            {/* Settings */}
                            <button
                              onClick={() => setSettingsPlugin(plugin)}
                              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors shrink-0"
                              title="设置"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>

                            {/* Uninstall */}
                            <button
                              onClick={() => handleUninstall(plugin.id)}
                              className="p-2 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors shrink-0"
                              title="卸载"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-16">
                      <div className="text-4xl mb-3">📦</div>
                      <p className="text-gray-500 dark:text-gray-400">还没有安装任何插件</p>
                      <button
                        onClick={() => setActiveTab('market')}
                        className="mt-3 text-sm text-violet-600 dark:text-violet-400 hover:underline"
                      >
                        去插件市场看看
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      {/* Modals */}
      <AnimatePresence>
        {detailPlugin && (
          <PluginDetailModal
            plugin={detailPlugin}
            isInstalled={installedIds.has(detailPlugin.id)}
            onClose={() => setDetailPlugin(null)}
            onInstall={handleInstall}
            onUninstall={handleUninstall}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showCreate && (
          <CreatePluginModal
            onClose={() => setShowCreate(false)}
            onCreate={handleCreatePlugin}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {settingsPlugin && (
          <SettingsModal
            plugin={settingsPlugin}
            onClose={() => setSettingsPlugin(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
