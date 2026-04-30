import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { recommendationEngine, type Recommendation } from '../utils/recommendations';
import { useAppStore } from '../store/appStore';
import { useTranslation } from '../i18n';

/** 获取时间段问候语 */
function getGreetingKey(): string {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'recommendation.greeting.morning';
  if (hour >= 12 && hour < 18) return 'recommendation.greeting.afternoon';
  return 'recommendation.greeting.evening';
}

/** 获取今天的日期字符串 YYYY-MM-DD */
function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const STORAGE_KEY_LAST_SHOWN = 'ai-assistant-welcomeback-last-shown';
const STORAGE_KEY_DISABLED = 'ai-assistant-welcomeback-disabled';

/** 判断今天是否已经显示过 */
function shouldShowToday(): boolean {
  if (localStorage.getItem(STORAGE_KEY_DISABLED) === 'true') return false;
  const lastShown = localStorage.getItem(STORAGE_KEY_LAST_SHOWN);
  return lastShown !== getTodayStr();
}

/** 标记今天已显示 */
function markShownToday(): void {
  localStorage.setItem(STORAGE_KEY_LAST_SHOWN, getTodayStr());
}

/** 标记不再显示 */
function markDisabled(): void {
  localStorage.setItem(STORAGE_KEY_DISABLED, 'true');
}

/** 工具 ID 到名称的映射 */
const TOOL_DISPLAY_NAMES: Record<string, { zh: string; en: string; route: string }> = {
  '/workspace/rewrite': { zh: '智能改写', en: 'Smart Rewrite', route: '/workspace/rewrite' },
  '/workspace/summarizer': { zh: '内容总结', en: 'Summarizer', route: '/workspace/summarizer' },
  '/workspace/continue': { zh: '续写扩写', en: 'Continue Writing', route: '/workspace/continue' },
  '/workspace/translation': { zh: '智能翻译', en: 'Translation', route: '/workspace/translation' },
  '/workspace/humanize': { zh: '人性化改写', en: 'Humanize', route: '/workspace/humanize' },
  '/workspace/polish': { zh: '文章润色', en: 'Polish', route: '/workspace/polish' },
  '/workspace/creative': { zh: '创意灵感', en: 'Creative Ideas', route: '/workspace/creative' },
  '/workspace/copywriting': { zh: '文案生成', en: 'Copywriting', route: '/workspace/copywriting' },
  '/workspace/seo': { zh: 'SEO 优化', en: 'SEO Optimization', route: '/workspace/seo' },
  '/workspace/mindmap': { zh: '思维导图', en: 'Mind Map', route: '/workspace/mindmap' },
  '/workspace/doc-analysis': { zh: '文档分析', en: 'Doc Analysis', route: '/workspace/doc-analysis' },
  '/workspace/data-analysis': { zh: '数据分析', en: 'Data Analysis', route: '/workspace/data-analysis' },
  '/workspace/ppt-generator': { zh: 'PPT 生成器', en: 'PPT Generator', route: '/workspace/ppt-generator' },
  '/workspace/marketing': { zh: '营销文案', en: 'Marketing Copy', route: '/workspace/marketing' },
  '/workspace/fiction': { zh: '互动小说', en: 'Interactive Fiction', route: '/workspace/fiction' },
  '/workspace/life-assistant': { zh: '生活助手', en: 'Life Assistant', route: '/workspace/life-assistant' },
  '/workspace/longform': { zh: '长文写作', en: 'Long-Form Writing', route: '/workspace/longform' },
  '/workspace/brand': { zh: '品牌声音', en: 'Brand Voice', route: '/workspace/brand' },
  '/workspace/calendar': { zh: '营销日历', en: 'Marketing Calendar', route: '/workspace/calendar' },
  '/workspace/scripts': { zh: '话术库', en: 'Script Library', route: '/workspace/scripts' },
  '/workspace/templates': { zh: '模板库', en: 'Templates', route: '/workspace/templates' },
  '/workspace/history': { zh: '历史记录', en: 'History', route: '/workspace/history' },
  '/workspace/code-assistant': { zh: '代码助手', en: 'Code Assistant', route: '/workspace/code-assistant' },
  '/workspace/learning': { zh: '学习助手', en: 'Learning Assistant', route: '/workspace/learning' },
  '/templates': { zh: '模板市场', en: 'Template Market', route: '/templates' },
  '/dashboard': { zh: '数据面板', en: 'Dashboard', route: '/dashboard' },
  '/workspace': { zh: 'AI 工作台', en: 'AI Workspace', route: '/workspace' },
};

/** 欢迎回来模态框 — 每天首次访问显示 */
export default function WelcomeBack() {
  const { t, locale } = useTranslation();
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const recentTools = useAppStore((s) => s.recentTools);

  // 获取个性化推荐
  const recommendations = useMemo(() => {
    return recommendationEngine.getRecommendations().slice(0, 3);
  }, []);

  // 获取上次使用的工具信息
  const lastToolInfo = useMemo(() => {
    if (recentTools.length === 0) return null;
    const lastTool = recentTools[0];
    // 先尝试直接匹配路由
    if (TOOL_DISPLAY_NAMES[lastTool]) {
      return TOOL_DISPLAY_NAMES[lastTool];
    }
    // 尝试模糊匹配
    for (const [route, info] of Object.entries(TOOL_DISPLAY_NAMES)) {
      if (route.includes(lastTool) || lastTool.includes(route.replace('/workspace/', ''))) {
        return info;
      }
    }
    return null;
  }, [recentTools]);

  // 延迟 1 秒后检查是否需要显示
  useEffect(() => {
    const timer = setTimeout(() => {
      if (shouldShowToday()) {
        setVisible(true);
        markShownToday();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = useCallback(() => {
    setVisible(false);
    if (dontShowAgain) {
      markDisabled();
    }
  }, [dontShowAgain]);

  const handleContinue = useCallback(() => {
    setVisible(false);
    if (dontShowAgain) {
      markDisabled();
    }
    if (lastToolInfo) {
      navigate(lastToolInfo.route);
    } else {
      navigate('/workspace');
    }
  }, [dontShowAgain, lastToolInfo, navigate]);

  const handleExplore = useCallback(() => {
    setVisible(false);
    if (dontShowAgain) {
      markDisabled();
    }
    navigate('/templates');
  }, [dontShowAgain, navigate]);

  const handleRecClick = useCallback(
    (rec: Recommendation) => {
      setVisible(false);
      if (dontShowAgain) {
        markDisabled();
      }
      navigate(rec.action);
    },
    [dontShowAgain, navigate]
  );

  const greetingKey = getGreetingKey();

  return (
    <AnimatePresence>
      {visible && (
        <>
          {/* 背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* 模态框 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 渐变背景 */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-600 via-indigo-600 to-purple-700" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

              {/* 装饰元素 */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl" />

              {/* 内容 */}
              <div className="relative z-10 p-6 sm:p-8">
                {/* 关闭按钮 */}
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
                  aria-label={t('common.close')}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* 问候语 */}
                <div className="mb-6">
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                  >
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-2">
                      {t(greetingKey)}
                    </h2>
                  </motion.div>

                  {/* 上次使用 */}
                  {lastToolInfo && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-white/80 text-sm"
                    >
                      {t('recommendation.lastUsed', {
                        tool: locale === 'zh' ? lastToolInfo.zh : lastToolInfo.en,
                      })}
                    </motion.p>
                  )}
                </div>

                {/* 个性化推荐 */}
                {recommendations.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mb-6"
                  >
                    <p className="text-white/60 text-xs font-medium uppercase tracking-wider mb-3">
                      {t('recommendation.forYou')}
                    </p>
                    <div className="space-y-2">
                      {recommendations.map((rec) => (
                        <button
                          key={rec.id}
                          onClick={() => handleRecClick(rec)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-left group"
                        >
                          <span className="text-xl flex-shrink-0">{rec.icon}</span>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-semibold text-white truncate">
                              {rec.title}
                            </div>
                            <div className="text-xs text-white/60 truncate">
                              {rec.description}
                            </div>
                          </div>
                          <svg
                            className="w-4 h-4 text-white/40 group-hover:text-white/80 transition-colors flex-shrink-0"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                          </svg>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* 操作按钮 */}
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                  className="flex gap-3"
                >
                  <button
                    onClick={handleContinue}
                    className="flex-1 py-3 px-4 bg-white text-violet-700 font-semibold rounded-xl hover:bg-white/90 transition-colors shadow-lg text-sm"
                  >
                    {t('recommendation.quickContinue')}
                  </button>
                  <button
                    onClick={handleExplore}
                    className="flex-1 py-3 px-4 bg-white/15 text-white font-semibold rounded-xl hover:bg-white/25 transition-colors border border-white/20 text-sm"
                  >
                    {t('recommendation.exploreNew')}
                  </button>
                </motion.div>

                {/* 不再显示 */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.5 }}
                  className="mt-4 flex items-center justify-center gap-2"
                >
                  <button
                    onClick={() => setDontShowAgain((prev) => !prev)}
                    className="flex items-center gap-2 text-white/50 hover:text-white/70 transition-colors text-xs"
                  >
                    <span
                      className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                        dontShowAgain
                          ? 'bg-white border-white text-violet-700'
                          : 'border-white/30'
                      }`}
                    >
                      {dontShowAgain && (
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      )}
                    </span>
                    {t('recommendation.dontShowAgain')}
                  </button>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
