import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useSeo } from '../components/SeoHead';
import { roleplayStore } from '../store/roleplayStore';
import {
  PRESET_CARDS,
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  type CharacterCategory,
  type CharacterCard,
} from '../data/characterCards';

// ============================================================
// 常量
// ============================================================

/** 所有分类 */
const ALL_CATEGORIES: (CharacterCategory | 'all')[] = [
  'all', 'fantasy', 'historical', 'survival', 'mystery',
  'scifi', 'romance', 'adventure', 'daily',
];

/** 排行榜 Tab 类型 */
type RankingTab = 'hot' | 'new' | 'favorites';

// ============================================================
// 动画变体
// ============================================================

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut' as const },
  },
};

// ============================================================
// 子组件
// ============================================================

/** 分类标签 */
function CategoryTag({ category }: { category: CharacterCategory }) {
  const colors = CATEGORY_COLORS[category];
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${colors.bg} ${colors.text} ${colors.border}`}
    >
      {CATEGORY_LABELS[category]}
    </span>
  );
}

/** 角色卡网格项 */
function CharacterCardItem({
  card,
  isFav,
  onToggleFav,
}: {
  card: CharacterCard;
  isFav: boolean;
  onToggleFav: () => void;
}) {
  const navigate = useNavigate();

  return (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -6, transition: { duration: 0.2 } }}
      className="group relative bg-white dark:bg-gray-800/80 rounded-2xl border border-gray-200 dark:border-gray-700
                 shadow-sm hover:shadow-xl dark:hover:shadow-gray-900/50 transition-shadow duration-300
                 overflow-hidden flex flex-col"
    >
      {/* 顶部 emoji 区域 */}
      <div className="relative pt-6 pb-3 flex items-center justify-center bg-gradient-to-b from-gray-50 to-transparent dark:from-gray-700/30 dark:to-transparent">
        <span className="text-6xl group-hover:scale-110 transition-transform duration-300">
          {card.avatar}
        </span>
        {/* 收藏按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggleFav();
          }}
          className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          aria-label={isFav ? '取消收藏' : '收藏'}
        >
          <svg
            className={`w-5 h-5 transition-colors ${
              isFav ? 'text-red-500 fill-red-500' : 'text-gray-400 dark:text-gray-500'
            }`}
            viewBox="0 0 24 24"
            fill={isFav ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
            />
          </svg>
        </button>
      </div>

      {/* 信息区域 */}
      <div className="flex-1 px-5 pb-4 flex flex-col">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1 truncate">
          {card.name}
        </h3>
        <div className="mb-2">
          <CategoryTag category={card.category} />
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2 mb-3 flex-1">
          {card.description}
        </p>

        {/* 统计信息 */}
        <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            {card.playCount.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <svg className="w-3.5 h-3.5 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
            {card.rating.toFixed(1)}
          </span>
        </div>

        {/* 开始冒险按钮 */}
        <button
          onClick={() => navigate(`/playground/chat/${card.id}`)}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white
                     bg-gradient-to-r from-primary-600 to-primary-500
                     hover:from-primary-700 hover:to-primary-600
                     dark:from-primary-500 dark:to-primary-400
                     dark:hover:from-primary-600 dark:hover:to-primary-500
                     transition-all duration-200 shadow-sm hover:shadow-md
                     active:scale-[0.98]"
        >
          开始冒险
        </button>
      </div>
    </motion.div>
  );
}

/** 空状态 */
function EmptyState({ query }: { query: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center py-20 text-gray-400 dark:text-gray-500"
    >
      <svg className="w-20 h-20 mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-lg font-medium mb-1">
        {query ? '没有找到匹配的角色卡' : '暂无角色卡'}
      </p>
      <p className="text-sm">
        {query ? '试试其他关键词或切换分类' : '敬请期待更多精彩角色卡'}
      </p>
    </motion.div>
  );
}

// ============================================================
// 主组件
// ============================================================

export default function Playground() {
  useSeo({
    title: 'AI 游乐场 - 沉浸式 AI 角色扮演体验',
    description:
      '在 AI 游乐场中体验沉浸式角色扮演，探索奇幻修仙、三国争霸、荒岛求生等多种精彩剧情，与 AI 实时互动。',
    keywords: 'AI角色扮演,沉浸式体验,文字冒险,互动小说,AI游乐场',
    canonicalUrl: '/playground',
  });

  const navigate = useNavigate();
  const favorites = roleplayStore((s) => s.favorites);
  const toggleFavorite = roleplayStore((s) => s.toggleFavorite);
  const customCards = roleplayStore((s) => s.customCards);

  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<CharacterCategory | 'all'>('all');
  const [activeTab, setActiveTab] = useState<RankingTab>('hot');

  /** 合并所有角色卡 */
  const allCards = useMemo(
    () => [...PRESET_CARDS, ...customCards],
    [customCards],
  );

  /** 按分类过滤 */
  const filteredByCategory = useMemo(
    () =>
      activeCategory === 'all'
        ? allCards
        : allCards.filter((c) => c.category === activeCategory),
    [allCards, activeCategory],
  );

  /** 按搜索过滤 */
  const filteredCards = useMemo(() => {
    if (!searchQuery.trim()) return filteredByCategory;
    const q = searchQuery.toLowerCase().trim();
    return filteredByCategory.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }, [filteredByCategory, searchQuery]);

  /** 按 Tab 排序 */
  const sortedCards = useMemo(() => {
    const cards = [...filteredCards];
    switch (activeTab) {
      case 'hot':
        return cards.sort((a, b) => b.playCount - a.playCount);
      case 'new':
        return cards.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'favorites':
        return cards.filter((c) => favorites.includes(c.id));
      default:
        return cards;
    }
  }, [filteredCards, activeTab, favorites]);

  /** 各分类数量 */
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allCards.length };
    for (const card of allCards) {
      counts[card.category] = (counts[card.category] || 0) + 1;
    }
    return counts;
  }, [allCards]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* ====== 顶部 Hero 区域 ====== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary-600 via-primary-700 to-indigo-800 dark:from-gray-800 dark:via-gray-900 dark:to-indigo-950">
        {/* 装饰背景 */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-white/5 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-primary-400/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 text-center">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-4 tracking-tight"
          >
            AI 游乐场
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-lg sm:text-xl text-primary-100 dark:text-gray-300 mb-8"
          >
            沉浸式 AI 角色扮演体验
          </motion.p>

          {/* 搜索框 + 创建按钮 */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center gap-3 max-w-2xl mx-auto"
          >
            <div className="relative flex-1 w-full">
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索角色卡名称、描述、标签..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm
                           text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500
                           border border-white/20 dark:border-gray-600
                           focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-transparent
                           shadow-lg text-base transition-all"
              />
            </div>
            <button
              onClick={() => navigate('/playground/create')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-2xl font-semibold text-primary-700 dark:text-primary-300
                         bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700
                         shadow-lg hover:shadow-xl transition-all duration-200
                         flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              创建角色卡
            </button>
          </motion.div>
        </div>
      </section>

      {/* ====== 分类标签栏 ====== */}
      <div className="sticky top-16 z-20 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 overflow-x-auto py-3 scrollbar-hide">
            {ALL_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat;
              const label = cat === 'all' ? '全部' : CATEGORY_LABELS[cat];
              const count = categoryCounts[cat] || 0;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap
                    transition-all duration-200 ${
                      isActive
                        ? 'bg-primary-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                >
                  {label}
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ====== 排行榜切换 + 角色卡网格 ====== */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Tab 切换 */}
        <div className="flex items-center gap-1 mb-8 bg-gray-100 dark:bg-gray-800 rounded-xl p-1 w-fit">
          {([
            { key: 'hot' as RankingTab, label: '热门' },
            { key: 'new' as RankingTab, label: '最新' },
            { key: 'favorites' as RankingTab, label: '我的收藏' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                activeTab === key
                  ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 角色卡网格 */}
        <AnimatePresence mode="wait">
          {sortedCards.length > 0 ? (
            <motion.div
              key={`${activeCategory}-${activeTab}-${searchQuery}`}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {sortedCards.map((card) => (
                <CharacterCardItem
                  key={card.id}
                  card={card}
                  isFav={favorites.includes(card.id)}
                  onToggleFav={() => toggleFavorite(card.id)}
                />
              ))}
            </motion.div>
          ) : (
            <EmptyState query={searchQuery} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
