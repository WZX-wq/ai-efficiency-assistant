import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { recommendationEngine, type Recommendation } from '../utils/recommendations';
import { useTranslation } from '../i18n';

/** 推荐卡片组件 */
function RecommendationCard({
  rec,
  onDismiss,
  onAction,
}: {
  rec: Recommendation;
  onDismiss: (id: string) => void;
  onAction: (rec: Recommendation) => void;
}) {
  const { t } = useTranslation();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="shrink-0 w-64 sm:w-72 p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-lg hover:shadow-violet-100/50 dark:hover:shadow-violet-900/20 transition-all group relative"
    >
      {/* 关闭按钮 */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onDismiss(rec.id);
        }}
        className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
        aria-label={t('recommendation.dismiss')}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* 图标和类型标签 */}
      <div className="flex items-start gap-3 mb-3">
        <span className="text-2xl flex-shrink-0">{rec.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
              {rec.title}
            </h3>
            {rec.type === 'feature' && (
              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">
                NEW
              </span>
            )}
            {rec.type === 'tip' && (
              <span className="shrink-0 px-1.5 py-0.5 text-[10px] font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                TIP
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
            {rec.description}
          </p>
        </div>
      </div>

      {/* 推荐理由 */}
      <p className="text-[11px] text-violet-500 dark:text-violet-400 mb-3 flex items-center gap-1">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
        </svg>
        {rec.reason}
      </p>

      {/* 操作按钮 */}
      <button
        onClick={() => onAction(rec)}
        className="w-full py-2 px-3 text-xs font-semibold text-white bg-gradient-to-r from-violet-500 to-indigo-500 hover:from-violet-600 hover:to-indigo-600 rounded-lg transition-all shadow-sm hover:shadow-md active:scale-[0.98]"
      >
        {rec.actionLabel}
      </button>
    </motion.div>
  );
}

/** 快速操作组件 — 在工作台顶部显示智能推荐 */
export default function QuickActions() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [recommendations, setRecommendations] = useState<Recommendation[]>(() =>
    recommendationEngine.getQuickActions()
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const handleDismiss = useCallback((id: string) => {
    recommendationEngine.dismiss(id);
    setRecommendations((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const handleAction = useCallback(
    (rec: Recommendation) => {
      if (rec.action === 'command-palette') {
        // 触发命令面板
        const event = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true });
        window.dispatchEvent(event);
      } else {
        navigate(rec.action);
      }
    },
    [navigate]
  );

  const handleRefresh = useCallback(() => {
    const allRecs = [
      ...recommendationEngine.getQuickActions(),
      ...recommendationEngine.getRecommendations(),
      ...recommendationEngine.getTips(),
    ];
    // 随机选取 4 个
    const shuffled = allRecs.sort(() => Math.random() - 0.5);
    setRecommendations(shuffled.slice(0, 4));
    setRefreshKey((k) => k + 1);
  }, []);

  const visibleRecommendations = useMemo(() => {
    return recommendations.slice(0, 4);
  }, [recommendations]);

  if (visibleRecommendations.length === 0) return null;

  return (
    <section className="pb-4">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 标题栏 */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">
              {t('recommendation.smartRecommend')}
            </h2>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {t('recommendation.forYou')}
            </span>
          </div>
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1 text-xs text-violet-500 dark:text-violet-400 hover:text-violet-600 dark:hover:text-violet-300 transition-colors"
          >
            <motion.svg
              key={refreshKey}
              initial={{ rotate: 0 }}
              animate={{ rotate: 360 }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
              className="w-3.5 h-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
            </motion.svg>
            {t('recommendation.refresh')}
          </button>
        </div>

        {/* 推荐卡片横向滚动 */}
        <div className="relative">
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-gray-50 dark:from-gray-950 to-transparent pointer-events-none z-10" />
          <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
            <AnimatePresence mode="popLayout">
              {visibleRecommendations.map((rec) => (
                <RecommendationCard
                  key={rec.id}
                  rec={rec}
                  onDismiss={handleDismiss}
                  onAction={handleAction}
                />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
