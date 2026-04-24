import { useEffect, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAppStore } from '../store/appStore';
import { useChatStore } from '../store/chatStore';

interface UsageStatsProps {
  open: boolean;
  onClose: () => void;
}

/** 工具名称中文映射 */
const TOOL_LABELS: Record<string, string> = {
  rewrite: '智能改写',
  expand: '内容扩写',
  summarize: '摘要提取',
  translate: '多语翻译',
  tone: '语气调整',
  outline: '大纲生成',
  brainstorm: '创意发散',
  polish: '润色优化',
  continue: '续写补全',
  format: '格式转换',
};

const TOOL_COLORS = [
  'from-blue-500 to-cyan-400',
  'from-purple-500 to-pink-400',
  'from-amber-500 to-orange-400',
  'from-emerald-500 to-teal-400',
  'from-rose-500 to-red-400',
];

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六'];

/** 动画计数器 Hook */
function useAnimatedCount(target: number, duration = 800, enabled = true) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCount(target);
      return;
    }
    setCount(0);
    if (target === 0) return;

    const startTime = performance.now();
    let rafId: number;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
      setCount(Math.round(eased * target));
      if (progress < 1) {
        rafId = requestAnimationFrame(tick);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [target, duration, enabled]);

  return count;
}

/** 统计卡片 */
function StatCard({
  label,
  value,
  icon,
  gradient,
  suffix,
}: {
  label: string;
  value: number;
  icon: string;
  gradient: string;
  suffix?: string;
}) {
  const animated = useAnimatedCount(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      {/* 渐变装饰条 */}
      <div
        className={`absolute top-0 left-0 h-1 w-full bg-gradient-to-r ${gradient}`}
      />
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
            {label}
          </p>
          <p className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
            {animated.toLocaleString()}
            {suffix && (
              <span className="ml-1 text-base font-normal text-gray-400">
                {suffix}
              </span>
            )}
          </p>
        </div>
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 text-2xl dark:bg-gray-700/60">
          {icon}
        </span>
      </div>
    </motion.div>
  );
}

/** 活动热力图 */
function ActivityHeatmap({ sessions }: { sessions: { createdAt: number }[] }) {
  const heatmapData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { date: Date; count: number; label: string }[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dayStart = d.getTime();
      const dayEnd = dayStart + 24 * 60 * 60 * 1000;
      const count = sessions.filter(
        (s) => s.createdAt >= dayStart && s.createdAt < dayEnd
      ).length;
      days.push({
        date: d,
        count,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
      });
    }
    return days;
  }, [sessions]);

  const maxCount = Math.max(...heatmapData.map((d) => d.count), 1);

  const getCellColor = (count: number) => {
    if (count === 0)
      return 'bg-gray-100 dark:bg-gray-700';
    const intensity = count / maxCount;
    if (intensity <= 0.33)
      return 'bg-emerald-200 dark:bg-emerald-900';
    if (intensity <= 0.66)
      return 'bg-emerald-400 dark:bg-emerald-700';
    return 'bg-emerald-600 dark:bg-emerald-500';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
        近 7 天活动热力图
      </h3>
      <div className="flex items-end gap-2">
        {heatmapData.map((day, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.35 + i * 0.06 }}
            className="flex flex-1 flex-col items-center gap-1.5"
          >
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
              {day.count > 0 ? day.count : ''}
            </span>
            <div
              className={`h-10 w-full rounded-md transition-colors ${getCellColor(day.count)}`}
            />
            <span className="text-xs text-gray-400 dark:text-gray-500">
              周{WEEKDAYS[day.date.getDay()]}
            </span>
          </motion.div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-xs text-gray-400 dark:text-gray-500">
        <span>少</span>
        <div className="h-3 w-3 rounded-sm bg-gray-100 dark:bg-gray-700" />
        <div className="h-3 w-3 rounded-sm bg-emerald-200 dark:bg-emerald-900" />
        <div className="h-3 w-3 rounded-sm bg-emerald-400 dark:bg-emerald-700" />
        <div className="h-3 w-3 rounded-sm bg-emerald-600 dark:bg-emerald-500" />
        <span>多</span>
      </div>
    </motion.div>
  );
}

/** 常用工具排行 */
function ToolRanking({ recentTools }: { recentTools: string[] }) {
  const toolCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const tool of recentTools) {
      map.set(tool, (map.get(tool) || 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [recentTools]);

  const maxCount = toolCounts.length > 0 ? toolCounts[0][1] : 1;

  if (toolCounts.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
      >
        <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
          常用工具排行
        </h3>
        <p className="py-6 text-center text-sm text-gray-400 dark:text-gray-500">
          暂无使用记录
        </p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800"
    >
      <h3 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">
        常用工具排行
      </h3>
      <div className="space-y-3">
        {toolCounts.map(([toolId, count], index) => {
          const widthPercent = (count / maxCount) * 100;
          return (
            <motion.div
              key={toolId}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.25 + index * 0.07 }}
              className="flex items-center gap-3"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="mb-1 flex items-center justify-between">
                  <span className="truncate text-sm font-medium text-gray-700 dark:text-gray-300">
                    {TOOL_LABELS[toolId] || toolId}
                  </span>
                  <span className="ml-2 shrink-0 text-xs text-gray-400 dark:text-gray-500">
                    {count} 次
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-700">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPercent}%` }}
                    transition={{ duration: 0.6, delay: 0.3 + index * 0.07 }}
                    className={`h-full rounded-full bg-gradient-to-r ${TOOL_COLORS[index % TOOL_COLORS.length]}`}
                  />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}

export default function UsageStats({ open, onClose }: UsageStatsProps) {
  const totalWordsGenerated = useAppStore((s) => s.totalWordsGenerated);
  const totalActions = useAppStore((s) => s.totalActions);
  const recentTools = useAppStore((s) => s.recentTools);
  const sessions = useChatStore((s) => s.sessions);

  const totalMessages = useMemo(
    () => sessions.reduce((sum, s) => sum + s.messages.length, 0),
    [sessions]
  );

  // ESC 关闭
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 遮罩层 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* 面板 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 24 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-x-4 top-[5%] z-50 mx-auto max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-gray-200 bg-white shadow-2xl dark:border-gray-700 dark:bg-gray-900 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
          >
            {/* 头部 */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-100 bg-white/80 px-6 py-4 backdrop-blur-md dark:border-gray-800 dark:bg-gray-900/80">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-500 text-lg text-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-5 w-5"
                  >
                    <path d="M3 3v18h18" />
                    <path d="M7 16l4-8 4 4 4-6" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  使用统计
                </h2>
              </div>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-5 w-5"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            {/* 内容区 */}
            <div className="space-y-4 p-6">
              {/* 概览统计卡片 */}
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
                <StatCard
                  label="总生成字数"
                  value={totalWordsGenerated}
                  icon="✍️"
                  gradient="from-violet-500 to-indigo-500"
                  suffix="字"
                />
                <StatCard
                  label="AI 操作次数"
                  value={totalActions}
                  icon="⚡"
                  gradient="from-amber-500 to-orange-500"
                  suffix="次"
                />
                <StatCard
                  label="对话会话数"
                  value={sessions.length}
                  icon="💬"
                  gradient="from-blue-500 to-cyan-500"
                  suffix="个"
                />
                <StatCard
                  label="消息总数"
                  value={totalMessages}
                  icon="📨"
                  gradient="from-emerald-500 to-teal-500"
                  suffix="条"
                />
              </div>

              {/* 常用工具排行 */}
              <ToolRanking recentTools={recentTools} />

              {/* 活动热力图 */}
              <ActivityHeatmap sessions={sessions} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
