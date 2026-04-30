import { useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSeo } from '../components/SeoHead';
import { useTranslation } from '../i18n';
import { useWorkflowStore, type Workflow, type WorkflowRun } from '../store/useWorkflowStore';

// ============================================================
// Helpers
// ============================================================

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function getMonthRange(): { start: number; end: number } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const end = now.getTime();
  return { start, end };
}

// ============================================================
// Status Badge
// ============================================================

function StatusBadge({ status }: { status: Workflow['status'] }) {
  const styles: Record<Workflow['status'], string> = {
    idle: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    running: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  };
  const labels: Record<Workflow['status'], string> = {
    idle: '空闲',
    running: '运行中',
    completed: '已完成',
    error: '错误',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
      )}
      {labels[status]}
    </span>
  );
}

function RunStatusBadge({ status }: { status: WorkflowRun['status'] }) {
  const styles: Record<WorkflowRun['status'], string> = {
    running: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
    completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    error: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
  };
  const labels: Record<WorkflowRun['status'], string> = {
    running: '运行中',
    completed: '已完成',
    error: '失败',
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
      )}
      {labels[status]}
    </span>
  );
}

// ============================================================
// Stat Card Component
// ============================================================

function StatCard({
  icon,
  label,
  value,
  subtext,
  gradient,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  subtext?: string;
  gradient: string;
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {subtext && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{subtext}</p>
          )}
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${gradient}`}>
          {icon}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Main Component
// ============================================================

export default function WorkflowDashboard() {
  const { t } = useTranslation();
  useSeo({
    title: '工作流数据面板 - AI效率助手',
    description: '查看自动化工作流的运行统计、成功率分析和最近运行记录。',
    keywords: 'AI工作流,自动化统计,工作流面板,AI效率助手',
    canonicalUrl: '/workflow-dashboard',
  });

  const { workflows, runs, runWorkflow, getEnabledWorkflows } = useWorkflowStore();

  const myWorkflows = useMemo(
    () => workflows.filter((w) => !w.isTemplate),
    [workflows],
  );

  const enabledCount = useMemo(
    () => myWorkflows.filter((w) => w.enabled).length,
    [myWorkflows],
  );

  const { start: monthStart, end: monthEnd } = getMonthRange();
  const monthRuns = useMemo(
    () => runs.filter((r) => r.startTime >= monthStart && r.startTime <= monthEnd),
    [runs, monthStart, monthEnd],
  );

  const monthRunCount = monthRuns.length;

  const successRate = useMemo(() => {
    if (monthRuns.length === 0) return 100;
    const completed = monthRuns.filter((r) => r.status === 'completed').length;
    return Math.round((completed / monthRuns.length) * 100);
  }, [monthRuns]);

  const recentRuns = useMemo(() => runs.slice(0, 15), [runs]);

  const activeWorkflows = useMemo(
    () => myWorkflows.filter((w) => w.enabled),
    [myWorkflows],
  );

  const handleRunAll = useCallback(() => {
    const enabled = getEnabledWorkflows();
    enabled.forEach((wf) => runWorkflow(wf.id));
  }, [getEnabledWorkflows, runWorkflow]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="w-8 h-8 bg-gradient-to-br from-rose-500 to-red-600 rounded-lg flex items-center justify-center text-white text-sm">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              </span>
              {t('workflow.dashboard.title')}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {t('workflow.dashboard.subtitle')}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRunAll}
              disabled={enabledCount === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {t('workflow.dashboard.runAll')}
            </button>
            <Link
              to="/workflows"
              className="px-4 py-2 text-sm font-medium text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-900/20 hover:bg-rose-100 dark:hover:bg-rose-900/30 rounded-lg transition-colors"
            >
              {t('workflow.dashboard.openBuilder')}
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            icon={
              <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            }
            label={t('workflow.dashboard.totalWorkflows')}
            value={myWorkflows.length}
            gradient="bg-rose-100 dark:bg-rose-900/20"
          />
          <StatCard
            icon={
              <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            label={t('workflow.dashboard.enabled')}
            value={enabledCount}
            subtext={myWorkflows.length > 0 ? `${Math.round((enabledCount / myWorkflows.length) * 100)}%` : undefined}
            gradient="bg-green-100 dark:bg-green-900/20"
          />
          <StatCard
            icon={
              <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
              </svg>
            }
            label={t('workflow.dashboard.monthlyRuns')}
            value={monthRunCount}
            gradient="bg-blue-100 dark:bg-blue-900/20"
          />
          <StatCard
            icon={
              <svg className="w-5 h-5 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
            }
            label={t('workflow.dashboard.successRate')}
            value={`${successRate}%`}
            subtext={`${monthRuns.filter((r) => r.status === 'completed').length} / ${monthRuns.length}`}
            gradient="bg-amber-100 dark:bg-amber-900/20"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Active Workflows */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 14.25h13.5m-13.5 0a3 3 0 01-3-3m3 3a3 3 0 100 6h13.5a3 3 0 100-6m-16.5-3a3 3 0 013-3h13.5a3 3 0 013 3m-19.5 0a4.5 4.5 0 01.9-2.7L5.737 5.1a3.375 3.375 0 012.7-1.35h7.126c1.062 0 2.062.5 2.7 1.35l2.587 3.45a4.5 4.5 0 01.9 2.7m0 0a3 3 0 01-3 3m0 3h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008zm-3 6h.008v.008h-.008v-.008zm0-6h.008v.008h-.008v-.008z" />
                </svg>
                {t('workflow.dashboard.activeWorkflows')}
              </h3>
              <Link
                to="/workflows"
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline"
              >
                {t('common.viewAll')}
              </Link>
            </div>
            {activeWorkflows.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('workflow.dashboard.noActive')}
                </p>
                <Link
                  to="/workflows"
                  className="inline-block mt-2 text-xs text-rose-600 dark:text-rose-400 hover:underline"
                >
                  {t('workflow.dashboard.createFirst')}
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {activeWorkflows.map((wf) => (
                  <div
                    key={wf.id}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <span className="text-lg">{wf.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {wf.name}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-gray-400">{wf.steps.length} 步骤</span>
                        <span className="text-xs text-gray-400">{wf.runCount} 次运行</span>
                      </div>
                    </div>
                    <StatusBadge status={wf.status} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent Runs Timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {t('workflow.dashboard.recentRuns')}
              </h3>
              <span className="text-xs text-gray-400">{recentRuns.length} 条记录</span>
            </div>
            {recentRuns.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 mx-auto mb-3 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('workflow.dashboard.noRuns')}
                </p>
              </div>
            ) : (
              <div className="space-y-0">
                {recentRuns.map((run, index) => {
                  const wf = workflows.find((w) => w.id === run.workflowId);
                  const duration = run.endTime ? run.endTime - run.startTime : null;
                  return (
                    <div key={run.id} className="flex gap-3">
                      {/* Timeline line */}
                      <div className="flex flex-col items-center">
                        <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          run.status === 'completed'
                            ? 'bg-emerald-500'
                            : run.status === 'running'
                              ? 'bg-green-500 animate-pulse'
                              : 'bg-red-500'
                        }`} />
                        {index < recentRuns.length - 1 && (
                          <div className="w-0.5 flex-1 bg-gray-200 dark:bg-gray-700 my-1" />
                        )}
                      </div>
                      {/* Content */}
                      <div className={`pb-4 flex-1 min-w-0 ${index === recentRuns.length - 1 ? 'pb-0' : ''}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {wf?.icon} {wf?.name || '未知工作流'}
                          </span>
                          <RunStatusBadge status={run.status} />
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-gray-400">{formatTime(run.startTime)}</span>
                          {duration !== null && (
                            <span className="text-xs text-gray-400">{formatDuration(duration)}</span>
                          )}
                          {run.error && (
                            <span className="text-xs text-red-500 truncate">{run.error}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
            </svg>
            {t('workflow.dashboard.quickActions')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Link
              to="/workflows"
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-rose-300 dark:hover:border-rose-700 hover:bg-rose-50 dark:hover:bg-rose-900/10 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-rose-100 dark:bg-rose-900/20 flex items-center justify-center group-hover:bg-rose-200 dark:group-hover:bg-rose-900/30 transition-colors">
                <svg className="w-5 h-5 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{t('workflow.dashboard.createNew')}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('workflow.dashboard.createNewDesc')}</div>
              </div>
            </Link>
            <button
              onClick={handleRunAll}
              disabled={enabledCount === 0}
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-green-300 dark:hover:border-green-700 hover:bg-green-50 dark:hover:bg-green-900/10 transition-all group disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/30 transition-colors">
                <svg className="w-5 h-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{t('workflow.dashboard.runAllEnabled')}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('workflow.dashboard.runAllEnabledDesc')}</div>
              </div>
            </button>
            <Link
              to="/workflows"
              className="flex items-center gap-3 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/30 transition-colors">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
              </div>
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-white">{t('workflow.dashboard.viewTemplates')}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{t('workflow.dashboard.viewTemplatesDesc')}</div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
