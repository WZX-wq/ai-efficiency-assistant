import { useState, useMemo, useCallback } from 'react';
import { useTranslation } from '../i18n';
import { useSeo } from '../components/SeoHead';
import analytics, { type AnalyticsEvent } from '../utils/analytics';

// ============================================================
// 辅助函数
// ============================================================

function formatTime(ts: number): string {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
}

function formatEventType(type: AnalyticsEvent['type']): string {
  const map: Record<AnalyticsEvent['type'], string> = {
    page_view: '页面浏览',
    tool_use: '工具使用',
    button_click: '按钮点击',
    error: '错误',
    feature_use: '功能使用',
  };
  return map[type] || type;
}

function eventTypeColor(type: AnalyticsEvent['type']): string {
  const map: Record<AnalyticsEvent['type'], string> = {
    page_view: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    tool_use: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    button_click: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
    error: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    feature_use: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  };
  return map[type] || 'bg-gray-100 text-gray-700';
}

// ============================================================
// 子组件
// ============================================================

/** 概览卡片 */
function OverviewCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  color: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

/** 工具使用柱状图 */
function ToolUsageChart({ data }: { data: { name: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const { t } = useTranslation();

  if (data.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.toolUsage')}</h3>
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">{t('common.noData')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.toolUsage')}</h3>
      <div className="space-y-3">
        {data.map((item) => {
          const pct = Math.round((item.count / maxCount) * 100);
          return (
            <div key={item.name} className="flex items-center gap-3">
              <span className="text-xs text-gray-600 dark:text-gray-300 w-28 truncate flex-shrink-0" title={item.name}>
                {item.name}
              </span>
              <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                  style={{ width: `${pct}%` }}
                >
                  {pct > 15 && (
                    <span className="text-[10px] font-medium text-white">{item.count}</span>
                  )}
                </div>
              </div>
              {pct <= 15 && (
                <span className="text-xs text-gray-500 dark:text-gray-400 w-8 text-right">{item.count}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 每日活动图 */
function DailyActivityChart({ data }: { data: { date: string; count: number }[] }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const { t } = useTranslation();

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.dailyActivity')}</h3>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">{t('common.noData')}</p>
      ) : (
        <div className="flex items-end gap-2 h-40">
          {data.map((item) => {
            const height = Math.max((item.count / maxCount) * 100, 4);
            const dayLabel = item.date.slice(5); // MM-DD
            return (
              <div key={item.date} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-gray-500 dark:text-gray-400">{item.count}</span>
                <div className="w-full flex-1 flex items-end">
                  <div
                    className="w-full bg-gradient-to-t from-indigo-500 to-blue-400 rounded-t-md transition-all duration-500 min-h-[4px]"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">{dayLabel}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** 最近活动表格 */
function RecentActivityTable({ events }: { events: AnalyticsEvent[] }) {
  const { t } = useTranslation();

  if (events.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.recentActivity')}</h3>
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">{t('common.noData')}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm overflow-hidden">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.recentActivity')}</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700">
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('dashboard.colTime')}</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('dashboard.colType')}</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('dashboard.colName')}</th>
              <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{t('dashboard.colDetails')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700/50">
            {events.map((event, i) => (
              <tr key={i} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="py-2 px-3 text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {formatTime(event.timestamp)}
                </td>
                <td className="py-2 px-3">
                  <span className={`inline-block px-2 py-0.5 text-[10px] font-medium rounded-full ${eventTypeColor(event.type)}`}>
                    {formatEventType(event.type)}
                  </span>
                </td>
                <td className="py-2 px-3 text-xs text-gray-700 dark:text-gray-300 max-w-[200px] truncate">
                  {event.name}
                </td>
                <td className="py-2 px-3 text-xs text-gray-400 dark:text-gray-500 max-w-[200px] truncate">
                  {event.metadata ? JSON.stringify(event.metadata).slice(0, 50) : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** 错误日志 */
function ErrorLog({ errors }: { errors: AnalyticsEvent[] }) {
  const { t } = useTranslation();

  if (errors.length === 0) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.errorLog')}</h3>
        <div className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.noErrors')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">{t('dashboard.errorLog')}</h3>
      <div className="space-y-2">
        {errors.map((err, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/20"
          >
            <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-red-700 dark:text-red-400 truncate">{err.name}</span>
                <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{formatTime(err.timestamp)}</span>
              </div>
              {err.metadata?.context != null && (
                <p className="text-xs text-gray-500 dark:text-gray-400">Context: {String(err.metadata.context)}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// Dashboard 主组件
// ============================================================

export default function Dashboard() {
  const { t } = useTranslation();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useSeo('dashboard');

  const summary = useMemo(() => analytics.getSummary(), [refreshKey]);
  const recentEvents = useMemo(() => analytics.getRecentEvents(20), [refreshKey]);
  const recentErrors = useMemo(() => analytics.getRecentErrors(10), [refreshKey]);
  const activeDays = useMemo(() => analytics.getActiveDays(), [refreshKey]);

  const handleExport = useCallback(() => {
    const data = analytics.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-assistant-analytics-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  const handleClear = useCallback(() => {
    analytics.clearData();
    setShowClearConfirm(false);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-20 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* 页面标题 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{t('dashboard.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t('dashboard.refresh')}
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              {t('dashboard.exportData')}
            </button>
            <div className="relative">
              <button
                onClick={() => setShowClearConfirm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                {t('dashboard.clearData')}
              </button>
              {/* 确认弹窗 */}
              {showClearConfirm && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-4 z-50">
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{t('dashboard.clearConfirm')}</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowClearConfirm(false)}
                      className="flex-1 px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
                    >
                      {t('common.cancel')}
                    </button>
                    <button
                      onClick={handleClear}
                      className="flex-1 px-3 py-1.5 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors cursor-pointer"
                    >
                      {t('common.confirm')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 概览卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <OverviewCard
            icon={
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            }
            label={t('dashboard.totalPageViews')}
            value={summary.totalPageViews}
            color="bg-blue-100 dark:bg-blue-900/30"
          />
          <OverviewCard
            icon={
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m0 0L11.42 4.97m-5.1 5.1H21M3 12a9 9 0 1118 0 9 9 0 01-18 0z" />
              </svg>
            }
            label={t('dashboard.totalToolUses')}
            value={summary.totalToolUses}
            color="bg-green-100 dark:bg-green-900/30"
          />
          <OverviewCard
            icon={
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            }
            label={t('dashboard.totalErrors')}
            value={summary.totalErrors}
            color="bg-red-100 dark:bg-red-900/30"
          />
          <OverviewCard
            icon={
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            label={t('dashboard.activeDays')}
            value={activeDays}
            color="bg-amber-100 dark:bg-amber-900/30"
          />
        </div>

        {/* 图表区域 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <ToolUsageChart data={summary.topTools} />
          <DailyActivityChart data={summary.dailyActiveUsage} />
        </div>

        {/* 错误率指示 */}
        {(summary.totalPageViews + summary.totalToolUses + summary.totalErrors) > 0 && (
          <div className="mb-8 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{t('dashboard.errorRate')}</p>
                <p className={`text-lg font-bold ${summary.errorRate > 5 ? 'text-red-500' : summary.errorRate > 1 ? 'text-amber-500' : 'text-green-500'}`}>
                  {summary.errorRate}%
                </p>
              </div>
              <div className="w-32 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${summary.errorRate > 5 ? 'bg-red-500' : summary.errorRate > 1 ? 'bg-amber-500' : 'bg-green-500'}`}
                  style={{ width: `${Math.min(summary.errorRate * 10, 100)}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* 活动日志和错误日志 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <RecentActivityTable events={recentEvents} />
          <ErrorLog errors={recentErrors} />
        </div>

        {/* 底部信息 */}
        <div className="text-center text-xs text-gray-400 dark:text-gray-500">
          <p>{t('dashboard.privacyNote')}</p>
        </div>
      </div>
    </div>
  );
}
