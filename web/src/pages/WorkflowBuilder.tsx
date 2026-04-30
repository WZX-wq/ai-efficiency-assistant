import { useState, useMemo, useCallback } from 'react';
import { useSeo } from '../components/SeoHead';
import { useTranslation } from '../i18n';
import { useWorkflowStore, type Workflow, type WorkflowStep, type WorkflowTrigger } from '../store/useWorkflowStore';

// ============================================================
// Template Workflows
// ============================================================

const TEMPLATE_WORKFLOWS = [
  {
    name: '每日文章摘要',
    icon: '📰',
    description: '自动生成今日文章摘要并保存',
    trigger: { type: 'schedule' as const, config: { time: '09:00', days: ['mon', 'tue', 'wed', 'thu', 'fri'] } },
    steps: [
      { type: 'ai-generate' as const, config: { prompt: '生成一篇关于AI技术的短文' }, label: '生成文章' },
      { type: 'ai-summarize' as const, config: { length: 'brief' }, label: '生成摘要' },
      { type: 'export' as const, config: { format: 'md' }, label: '导出Markdown' },
    ],
    isTemplate: true,
  },
  {
    name: '多语言翻译流水线',
    icon: '🌐',
    description: '将内容自动翻译为多语言版本',
    trigger: { type: 'manual' as const, config: {} },
    steps: [
      { type: 'ai-translate' as const, config: { language: 'english' }, label: '翻译为英文' },
      { type: 'ai-translate' as const, config: { language: 'japanese' }, label: '翻译为日文' },
      { type: 'ai-translate' as const, config: { language: 'korean' }, label: '翻译为韩文' },
      { type: 'export' as const, config: { format: 'txt' }, label: '导出全部' },
    ],
    isTemplate: true,
  },
  {
    name: '内容优化流水线',
    icon: '✨',
    description: '自动优化内容：改写→检查→润色',
    trigger: { type: 'manual' as const, config: {} },
    steps: [
      { type: 'ai-rewrite' as const, config: { style: 'professional' }, label: '专业改写' },
      { type: 'ai-summarize' as const, config: { length: 'detailed' }, label: '内容摘要' },
      { type: 'ai-generate' as const, config: { prompt: '为以下内容生成吸引人的标题' }, label: '生成标题' },
    ],
    isTemplate: true,
  },
];

// ============================================================
// Step type metadata
// ============================================================

const STEP_TYPES: Record<WorkflowStep['type'], { icon: string; label: string; color: string }> = {
  'ai-generate': { icon: '🤖', label: 'AI 生成', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' },
  'ai-rewrite': { icon: '✍️', label: 'AI 改写', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' },
  'ai-translate': { icon: '🌐', label: 'AI 翻译', color: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' },
  'ai-summarize': { icon: '📝', label: 'AI 摘要', color: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' },
  'delay': { icon: '⏱️', label: '延时等待', color: 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300' },
  'condition': { icon: '🔀', label: '条件判断', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400' },
  'export': { icon: '📤', label: '导出', color: 'bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-400' },
  'notify': { icon: '🔔', label: '通知', color: 'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400' },
};

const TRIGGER_TYPES: Record<WorkflowTrigger['type'], { icon: string; label: string }> = {
  manual: { icon: '👆', label: '手动触发' },
  schedule: { icon: '📅', label: '定时触发' },
  'on-create': { icon: '➕', label: '创建时触发' },
  webhook: { icon: '🔗', label: 'Webhook 触发' },
};

const WEEKDAYS = [
  { key: 'mon', label: '一' },
  { key: 'tue', label: '二' },
  { key: 'wed', label: '三' },
  { key: 'thu', label: '四' },
  { key: 'fri', label: '五' },
  { key: 'sat', label: '六' },
  { key: 'sun', label: '日' },
];

const LANGUAGES = [
  { value: 'english', label: 'English' },
  { value: 'japanese', label: '日本語' },
  { value: 'korean', label: '한국어' },
  { value: 'french', label: 'Français' },
  { value: 'german', label: 'Deutsch' },
  { value: 'spanish', label: 'Español' },
  { value: 'russian', label: 'Русский' },
  { value: 'portuguese', label: 'Português' },
  { value: 'arabic', label: 'العربية' },
];

const REWRITE_STYLES = [
  { value: 'professional', label: '专业正式' },
  { value: 'casual', label: '轻松随意' },
  { value: 'creative', label: '创意活泼' },
  { value: 'academic', label: '学术严谨' },
];

const EXPORT_FORMATS = [
  { value: 'txt', label: 'TXT' },
  { value: 'md', label: 'Markdown' },
  { value: 'html', label: 'HTML' },
];

// ============================================================
// Helpers
// ============================================================

function generateStepId(): string {
  return `step_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// ============================================================
// Step Config Editor Component
// ============================================================

function StepConfigEditor({
  step,
  onChange,
}: {
  step: WorkflowStep;
  onChange: (config: Record<string, any>) => void;
}) {
  switch (step.type) {
    case 'ai-generate':
      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Prompt 模板
          </label>
          <textarea
            value={step.config.prompt || ''}
            onChange={(e) => onChange({ ...step.config, prompt: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none resize-none"
            rows={3}
            placeholder="输入生成提示词..."
          />
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            模型
          </label>
          <select
            value={step.config.model || 'deepseek'}
            onChange={(e) => onChange({ ...step.config, model: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
          >
            <option value="deepseek">DeepSeek</option>
            <option value="gpt-4o">GPT-4o</option>
            <option value="claude">Claude</option>
            <option value="glm-4">GLM-4</option>
          </select>
        </div>
      );

    case 'ai-rewrite':
      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            改写风格
          </label>
          <div className="grid grid-cols-2 gap-2">
            {REWRITE_STYLES.map((style) => (
              <button
                key={style.value}
                onClick={() => onChange({ ...step.config, style: style.value })}
                className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                  step.config.style === style.value
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 font-medium'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                {style.label}
              </button>
            ))}
          </div>
        </div>
      );

    case 'ai-translate':
      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            目标语言
          </label>
          <select
            value={step.config.language || 'english'}
            onChange={(e) => onChange({ ...step.config, language: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>
      );

    case 'ai-summarize':
      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            摘要长度
          </label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { value: 'brief', label: '简短摘要' },
              { value: 'detailed', label: '详细摘要' },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => onChange({ ...step.config, length: opt.value })}
                className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                  step.config.length === opt.value
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 font-medium'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      );

    case 'delay':
      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            等待时长
          </label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              max={3600}
              value={step.config.duration || 5}
              onChange={(e) => onChange({ ...step.config, duration: parseInt(e.target.value) || 5 })}
              className="w-24 px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
            />
            <select
              value={step.config.unit || 'seconds'}
              onChange={(e) => onChange({ ...step.config, unit: e.target.value })}
              className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
            >
              <option value="seconds">秒</option>
              <option value="minutes">分钟</option>
            </select>
          </div>
        </div>
      );

    case 'condition':
      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            条件规则
          </label>
          <textarea
            value={step.config.rule || ''}
            onChange={(e) => onChange({ ...step.config, rule: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none resize-none"
            rows={2}
            placeholder="例如: 字数 > 100"
          />
        </div>
      );

    case 'export':
      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            导出格式
          </label>
          <div className="grid grid-cols-3 gap-2">
            {EXPORT_FORMATS.map((fmt) => (
              <button
                key={fmt.value}
                onClick={() => onChange({ ...step.config, format: fmt.value })}
                className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                  step.config.format === fmt.value
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 font-medium'
                    : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                {fmt.label}
              </button>
            ))}
          </div>
        </div>
      );

    case 'notify':
      return (
        <div className="space-y-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            通知消息模板
          </label>
          <textarea
            value={step.config.message || ''}
            onChange={(e) => onChange({ ...step.config, message: e.target.value })}
            className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none resize-none"
            rows={3}
            placeholder="输入通知消息模板..."
          />
        </div>
      );

    default:
      return null;
  }
}

// ============================================================
// Status Badge Component
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

// ============================================================
// Main Component
// ============================================================

export default function WorkflowBuilder() {
  const { t } = useTranslation();
  useSeo({
    title: '自动化工作流 - AI效率助手',
    description: '创建和管理自动化工作流，连接多个AI处理步骤，实现内容创作的自动化流水线。',
    keywords: 'AI工作流,自动化,流水线,AI自动化,内容创作自动化,AI效率助手',
    canonicalUrl: '/workflows',
  });

  const {
    workflows,
    runs,
    addWorkflow,
    updateWorkflow,
    deleteWorkflow,
    duplicateWorkflow,
    runWorkflow,
    stopWorkflow,
    toggleEnabled,
  } = useWorkflowStore();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingStepId, setEditingStepId] = useState<string | null>(null);
  const [showAddStepMenu, setShowAddStepMenu] = useState<number | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);

  const myWorkflows = useMemo(
    () => workflows.filter((w) => !w.isTemplate),
    [workflows],
  );
  const templateWorkflows = useMemo(
    () => workflows.filter((w) => w.isTemplate),
    [workflows],
  );

  const selectedWorkflow = useMemo(
    () => workflows.find((w) => w.id === selectedId),
    [workflows, selectedId],
  );

  const selectedRuns = useMemo(
    () => (selectedId ? runs.filter((r) => r.workflowId === selectedId).slice(0, 10) : []),
    [runs, selectedId],
  );

  // ---- Handlers ----

  const handleCreateWorkflow = useCallback(() => {
    const id = `new_${Date.now()}`;
    addWorkflow({
      name: '新建工作流',
      description: '',
      icon: '⚡',
      steps: [],
      trigger: { type: 'manual', config: {} },
      enabled: false,
    });
    setSelectedId(id);
  }, [addWorkflow]);

  const handleUseTemplate = useCallback(
    (template: (typeof TEMPLATE_WORKFLOWS)[0]) => {
      addWorkflow({
        name: template.name,
        description: template.description,
        icon: template.icon,
        steps: template.steps.map((s) => ({ ...s, id: generateStepId() })),
        trigger: template.trigger,
        enabled: false,
        isTemplate: true,
      });
    },
    [addWorkflow],
  );

  const handleAddStep = useCallback(
    (insertIndex: number, type: WorkflowStep['type']) => {
      if (!selectedId) return;
      const wf = workflows.find((w) => w.id === selectedId);
      if (!wf) return;

      const defaultConfig: Record<string, any> = {};
      const defaultLabel = STEP_TYPES[type].label;

      switch (type) {
        case 'ai-generate': defaultConfig.prompt = ''; break;
        case 'ai-rewrite': defaultConfig.style = 'professional'; break;
        case 'ai-translate': defaultConfig.language = 'english'; break;
        case 'ai-summarize': defaultConfig.length = 'brief'; break;
        case 'delay': defaultConfig.duration = 5; defaultConfig.unit = 'seconds'; break;
        case 'condition': defaultConfig.rule = ''; break;
        case 'export': defaultConfig.format = 'txt'; break;
        case 'notify': defaultConfig.message = ''; break;
      }

      const newStep: WorkflowStep = {
        id: generateStepId(),
        type,
        config: defaultConfig,
        label: defaultLabel,
      };

      const newSteps = [...wf.steps];
      newSteps.splice(insertIndex, 0, newStep);
      updateWorkflow(selectedId, { steps: newSteps });
      setShowAddStepMenu(null);
      setEditingStepId(newStep.id);
    },
    [selectedId, workflows, updateWorkflow],
  );

  const handleDeleteStep = useCallback(
    (stepId: string) => {
      if (!selectedId) return;
      const wf = workflows.find((w) => w.id === selectedId);
      if (!wf) return;
      const newSteps = wf.steps.filter((s) => s.id !== stepId);
      updateWorkflow(selectedId, { steps: newSteps });
      if (editingStepId === stepId) setEditingStepId(null);
    },
    [selectedId, workflows, updateWorkflow, editingStepId],
  );

  const handleMoveStep = useCallback(
    (stepId: string, direction: 'up' | 'down') => {
      if (!selectedId) return;
      const wf = workflows.find((w) => w.id === selectedId);
      if (!wf) return;
      const idx = wf.steps.findIndex((s) => s.id === stepId);
      if (idx < 0) return;
      const newIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= wf.steps.length) return;
      const newSteps = [...wf.steps];
      [newSteps[idx], newSteps[newIdx]] = [newSteps[newIdx], newSteps[idx]];
      updateWorkflow(selectedId, { steps: newSteps });
    },
    [selectedId, workflows, updateWorkflow],
  );

  const handleUpdateStepConfig = useCallback(
    (stepId: string, config: Record<string, any>) => {
      if (!selectedId) return;
      const wf = workflows.find((w) => w.id === selectedId);
      if (!wf) return;
      const newSteps = wf.steps.map((s) =>
        s.id === stepId ? { ...s, config } : s,
      );
      updateWorkflow(selectedId, { steps: newSteps });
    },
    [selectedId, workflows, updateWorkflow],
  );

  const handleUpdateStepLabel = useCallback(
    (stepId: string, label: string) => {
      if (!selectedId) return;
      const wf = workflows.find((w) => w.id === selectedId);
      if (!wf) return;
      const newSteps = wf.steps.map((s) =>
        s.id === stepId ? { ...s, label } : s,
      );
      updateWorkflow(selectedId, { steps: newSteps });
    },
    [selectedId, workflows, updateWorkflow],
  );

  const handleRun = useCallback(() => {
    if (selectedId) runWorkflow(selectedId);
  }, [selectedId, runWorkflow]);

  const handleStop = useCallback(() => {
    if (selectedId) stopWorkflow(selectedId);
  }, [selectedId, stopWorkflow]);

  const handleDelete = useCallback(() => {
    if (selectedId) {
      deleteWorkflow(selectedId);
      setSelectedId(null);
      setEditingStepId(null);
    }
  }, [selectedId, deleteWorkflow]);

  const handleDuplicate = useCallback(() => {
    if (selectedId) {
      duplicateWorkflow(selectedId);
    }
  }, [selectedId, duplicateWorkflow]);

  // ---- Render ----

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pt-16">
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="w-8 h-8 bg-gradient-to-br from-rose-500 to-red-600 rounded-lg flex items-center justify-center text-white text-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
              </svg>
            </span>
            {t('workflow.builder.title')}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t('workflow.builder.subtitle')}
          </p>
        </div>

        <div className="flex gap-6">
          {/* ===== Left Panel: Workflow List ===== */}
          <div className="w-[300px] flex-shrink-0 space-y-4">
            {/* New Workflow Button */}
            <button
              onClick={handleCreateWorkflow}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-rose-500 to-red-600 text-white text-sm font-medium rounded-xl hover:from-rose-600 hover:to-red-700 transition-all shadow-sm hover:shadow-md"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t('workflow.builder.newWorkflow')}
            </button>

            {/* Template Workflows */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mb-2">
                {t('workflow.builder.templates')}
              </h3>
              <div className="space-y-1">
                {TEMPLATE_WORKFLOWS.map((tpl) => {
                  const exists = templateWorkflows.some((w) => w.name === tpl.name);
                  return (
                    <button
                      key={tpl.name}
                      onClick={() => !exists && handleUseTemplate(tpl)}
                      disabled={exists}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        exists
                          ? 'opacity-50 cursor-not-allowed bg-gray-50 dark:bg-gray-800'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-700 dark:hover:text-rose-400'
                      }`}
                    >
                      <span className="text-lg">{tpl.icon}</span>
                      <div className="text-left flex-1 min-w-0">
                        <div className="font-medium truncate">{tpl.name}</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500 truncate">{tpl.description}</div>
                      </div>
                      {exists ? (
                        <span className="text-xs text-green-500">已添加</span>
                      ) : (
                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* My Workflows */}
            <div>
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider px-1 mb-2">
                {t('workflow.builder.myWorkflows')}
              </h3>
              <div className="space-y-1">
                {myWorkflows.length === 0 && (
                  <p className="px-3 py-4 text-sm text-gray-400 dark:text-gray-500 text-center">
                    {t('workflow.builder.noWorkflows')}
                  </p>
                )}
                {myWorkflows.map((wf) => (
                  <button
                    key={wf.id}
                    onClick={() => {
                      setSelectedId(wf.id);
                      setEditingStepId(null);
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                      selectedId === wf.id
                        ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 font-medium'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <span className="text-lg">{wf.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{wf.name}</div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <StatusBadge status={wf.status} />
                        <span className="text-xs text-gray-400">{wf.runCount} 次</span>
                      </div>
                    </div>
                    {/* Toggle switch */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleEnabled(wf.id);
                      }}
                      className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                        wf.enabled
                          ? 'bg-rose-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                      aria-label={wf.enabled ? '禁用' : '启用'}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                          wf.enabled ? 'translate-x-4' : 'translate-x-0.5'
                        }`}
                      />
                    </button>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ===== Main Area: Workflow Editor ===== */}
          <div className="flex-1 min-w-0">
            {selectedWorkflow ? (
              <div className="space-y-6">
                {/* Top Bar */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <span className="text-2xl">{selectedWorkflow.icon}</span>
                      <div className="flex-1 min-w-0">
                        {editingName ? (
                          <input
                            autoFocus
                            value={selectedWorkflow.name}
                            onChange={(e) => updateWorkflow(selectedId!, { name: e.target.value })}
                            onBlur={() => setEditingName(false)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
                            className="w-full text-lg font-bold bg-transparent border-b-2 border-rose-500 text-gray-900 dark:text-white outline-none py-0.5"
                          />
                        ) : (
                          <h2
                            onClick={() => setEditingName(true)}
                            className="text-lg font-bold text-gray-900 dark:text-white cursor-pointer hover:text-rose-600 dark:hover:text-rose-400 transition-colors truncate"
                          >
                            {selectedWorkflow.name}
                          </h2>
                        )}
                        {editingDesc ? (
                          <input
                            autoFocus
                            value={selectedWorkflow.description}
                            onChange={(e) => updateWorkflow(selectedId!, { description: e.target.value })}
                            onBlur={() => setEditingDesc(false)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingDesc(false)}
                            className="w-full text-sm bg-transparent border-b border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 outline-none py-0.5 mt-1"
                            placeholder="添加描述..."
                          />
                        ) : (
                          <p
                            onClick={() => setEditingDesc(true)}
                            className="text-sm text-gray-500 dark:text-gray-400 cursor-pointer hover:text-gray-700 dark:hover:text-gray-300 truncate"
                          >
                            {selectedWorkflow.description || t('workflow.builder.addDescription')}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                      <StatusBadge status={selectedWorkflow.status} />
                      <button
                        onClick={handleDuplicate}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="复制"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />
                        </svg>
                      </button>
                      {selectedWorkflow.status === 'running' ? (
                        <button
                          onClick={handleStop}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-gray-500 hover:bg-gray-600 rounded-lg transition-colors"
                        >
                          {t('workflow.builder.stop')}
                        </button>
                      ) : (
                        <button
                          onClick={handleRun}
                          disabled={!selectedWorkflow.enabled || selectedWorkflow.steps.length === 0}
                          className="px-3 py-1.5 text-sm font-medium text-white bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                        >
                          {t('workflow.builder.run')}
                        </button>
                      )}
                      <button
                        onClick={handleDelete}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title={t('common.delete')}
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Trigger Section */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                    </svg>
                    {t('workflow.builder.trigger')}
                  </h3>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {(Object.entries(TRIGGER_TYPES) as [WorkflowTrigger['type'], typeof TRIGGER_TYPES[WorkflowTrigger['type']]][]).map(
                      ([type, meta]) => (
                        <button
                          key={type}
                          onClick={() =>
                            updateWorkflow(selectedId!, {
                              trigger: { type, config: type === 'schedule' ? { time: '09:00', days: ['mon', 'tue', 'wed', 'thu', 'fri'] } : {} },
                            })
                          }
                          className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-all ${
                            selectedWorkflow.trigger.type === type
                              ? 'border-rose-500 bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 font-medium'
                              : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                          }`}
                        >
                          <span>{meta.icon}</span>
                          {meta.label}
                        </button>
                      ),
                    )}
                  </div>
                  {selectedWorkflow.trigger.type === 'schedule' && (
                    <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500 dark:text-gray-400">时间</label>
                        <input
                          type="time"
                          value={selectedWorkflow.trigger.config.time || '09:00'}
                          onChange={(e) =>
                            updateWorkflow(selectedId!, {
                              trigger: {
                                ...selectedWorkflow.trigger,
                                config: { ...selectedWorkflow.trigger.config, time: e.target.value },
                              },
                            })
                          }
                          className="px-2 py-1 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none"
                        />
                      </div>
                      <div className="flex items-center gap-1">
                        <label className="text-xs text-gray-500 dark:text-gray-400 mr-1">重复</label>
                        {WEEKDAYS.map((day) => {
                          const days: string[] = selectedWorkflow.trigger.config.days || [];
                          const active = days.includes(day.key);
                          return (
                            <button
                              key={day.key}
                              onClick={() => {
                                const newDays = active
                                  ? days.filter((d) => d !== day.key)
                                  : [...days, day.key];
                                updateWorkflow(selectedId!, {
                                  trigger: {
                                    ...selectedWorkflow.trigger,
                                    config: { ...selectedWorkflow.trigger.config, days: newDays },
                                  },
                                });
                              }}
                              className={`w-7 h-7 flex items-center justify-center text-xs rounded-full transition-all ${
                                active
                                  ? 'bg-rose-500 text-white font-medium'
                                  : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-400'
                              }`}
                            >
                              {day.label}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {selectedWorkflow.trigger.type === 'webhook' && (
                    <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                      <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Webhook URL</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-400 font-mono">
                          {window.location.origin}/api/webhook/{selectedId}
                        </code>
                        <button
                          onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/webhook/${selectedId}`)}
                          className="px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                        >
                          {t('common.copy')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Steps Canvas */}
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                    {t('workflow.builder.steps')} ({selectedWorkflow.steps.length})
                  </h3>

                  {selectedWorkflow.steps.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                      </div>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                        {t('workflow.builder.noSteps')}
                      </p>
                      <div className="relative inline-block">
                        <button
                          onClick={() => setShowAddStepMenu(0)}
                          className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-rose-500 to-red-600 rounded-lg hover:from-rose-600 hover:to-red-700 transition-all shadow-sm"
                        >
                          {t('workflow.builder.addStep')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-0">
                      {selectedWorkflow.steps.map((step, index) => {
                        const meta = STEP_TYPES[step.type];
                        const isEditing = editingStepId === step.id;
                        const isRunning = selectedWorkflow.status === 'running';

                        return (
                          <div key={step.id}>
                            {/* Connector line */}
                            {index > 0 && (
                              <div className="flex justify-center py-1">
                                <div className="w-0.5 h-4 bg-gray-200 dark:bg-gray-600" />
                              </div>
                            )}

                            {/* Step Card */}
                            <div
                              className={`relative rounded-xl border-2 transition-all ${
                                isEditing
                                  ? 'border-rose-500 shadow-lg shadow-rose-500/10'
                                  : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                              }`}
                            >
                              <div
                                className="flex items-center gap-3 p-3 cursor-pointer"
                                onClick={() => setEditingStepId(isEditing ? null : step.id)}
                              >
                                {/* Step number */}
                                <div className="w-7 h-7 flex items-center justify-center rounded-full bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 text-xs font-bold flex-shrink-0">
                                  {index + 1}
                                </div>

                                {/* Step icon & type */}
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                                  <span>{meta.icon}</span>
                                  {meta.label}
                                </span>

                                {/* Step label */}
                                <input
                                  value={step.label}
                                  onChange={(e) => handleUpdateStepLabel(step.id, e.target.value)}
                                  onClick={(e) => e.stopPropagation()}
                                  className="flex-1 text-sm font-medium bg-transparent text-gray-900 dark:text-white outline-none min-w-0"
                                  placeholder="步骤名称..."
                                />

                                {/* Running indicator */}
                                {isRunning && selectedWorkflow.status === 'running' && (
                                  <span className="flex items-center gap-1 text-xs text-green-500">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                    运行中
                                  </span>
                                )}

                                {/* Actions */}
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveStep(step.id, 'up');
                                    }}
                                    disabled={index === 0}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 rounded transition-colors"
                                    title="上移"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMoveStep(step.id, 'down');
                                    }}
                                    disabled={index === selectedWorkflow.steps.length - 1}
                                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 rounded transition-colors"
                                    title="下移"
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteStep(step.id);
                                    }}
                                    className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors"
                                    title={t('common.delete')}
                                  >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                  </button>
                                </div>
                              </div>

                              {/* Step Config Panel */}
                              {isEditing && (
                                <div className="px-4 pb-4 pt-1 border-t border-gray-100 dark:border-gray-700">
                                  <StepConfigEditor
                                    step={step}
                                    onChange={(config) => handleUpdateStepConfig(step.id, config)}
                                  />
                                </div>
                              )}
                            </div>

                            {/* Add step button between steps */}
                            <div className="flex justify-center py-1 relative">
                              <div className="w-0.5 h-3 bg-gray-200 dark:bg-gray-600" />
                              <button
                                onClick={() =>
                                  setShowAddStepMenu(showAddStepMenu === index + 1 ? null : index + 1)
                                }
                                className="absolute z-10 w-6 h-6 flex items-center justify-center rounded-full bg-white dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-500 text-gray-400 hover:border-rose-400 hover:text-rose-500 transition-colors"
                                title={t('workflow.builder.addStep')}
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                              </button>
                            </div>

                            {/* Add Step Dropdown */}
                            {showAddStepMenu === index + 1 && (
                              <div className="relative z-20 mb-2">
                                <div className="absolute left-1/2 -translate-x-1/2 top-0 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                                  <div className="px-3 py-1.5">
                                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                      {t('workflow.builder.selectStepType')}
                                    </p>
                                  </div>
                                  {(Object.entries(STEP_TYPES) as [WorkflowStep['type'], typeof STEP_TYPES[WorkflowStep['type']]][]).map(
                                    ([type, meta]) => (
                                      <button
                                        key={type}
                                        onClick={() => handleAddStep(index + 1, type)}
                                        className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-700 dark:hover:text-rose-400 transition-colors"
                                      >
                                        <span className="text-base">{meta.icon}</span>
                                        {meta.label}
                                      </button>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Add step at end */}
                      {selectedWorkflow.steps.length > 0 && (
                        <div className="flex justify-center pt-2">
                          <button
                            onClick={() => setShowAddStepMenu(selectedWorkflow.steps.length)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-500 hover:text-rose-600 dark:text-gray-400 dark:hover:text-rose-400 border border-dashed border-gray-300 dark:border-gray-600 hover:border-rose-400 rounded-lg transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            {t('workflow.builder.addStep')}
                          </button>
                        </div>
                      )}

                      {/* End add step dropdown */}
                      {showAddStepMenu === selectedWorkflow.steps.length && selectedWorkflow.steps.length > 0 && (
                        <div className="relative z-20 mt-2">
                          <div className="absolute left-1/2 -translate-x-1/2 top-0 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-2">
                            <div className="px-3 py-1.5">
                              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                                {t('workflow.builder.selectStepType')}
                              </p>
                            </div>
                            {(Object.entries(STEP_TYPES) as [WorkflowStep['type'], typeof STEP_TYPES[WorkflowStep['type']]][]).map(
                              ([type, meta]) => (
                                <button
                                  key={type}
                                  onClick={() => handleAddStep(selectedWorkflow.steps.length, type)}
                                  className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-700 dark:hover:text-rose-400 transition-colors"
                                >
                                  <span className="text-base">{meta.icon}</span>
                                  {meta.label}
                                </button>
                              ),
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Run History */}
                {selectedRuns.length > 0 && (
                  <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <svg className="w-4 h-4 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {t('workflow.builder.runHistory')}
                    </h3>
                    <div className="space-y-2">
                      {selectedRuns.map((run) => (
                        <RunHistoryItem key={run.id} run={run} steps={selectedWorkflow.steps} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Empty State */
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-rose-100 to-red-100 dark:from-rose-900/20 dark:to-red-900/20 rounded-2xl flex items-center justify-center">
                  <svg className="w-10 h-10 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {t('workflow.builder.selectOrCreate')}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  {t('workflow.builder.emptyHint')}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Run History Item Component
// ============================================================

function RunHistoryItem({
  run,
  steps,
}: {
  run: import('../store/useWorkflowStore').WorkflowRun;
  steps: WorkflowStep[];
}) {
  const [expanded, setExpanded] = useState(false);

  const duration = run.endTime ? run.endTime - run.startTime : null;
  const statusStyles: Record<string, string> = {
    running: 'text-green-600 dark:text-green-400',
    completed: 'text-emerald-600 dark:text-emerald-400',
    error: 'text-red-600 dark:text-red-400',
  };
  const statusLabels: Record<string, string> = {
    running: '运行中',
    completed: '已完成',
    error: '失败',
  };

  return (
    <div className="border border-gray-100 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      >
        <span className={`font-medium ${statusStyles[run.status]}`}>
          {run.status === 'running' && (
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500 mr-1 animate-pulse" />
          )}
          {statusLabels[run.status]}
        </span>
        <span className="text-gray-400 dark:text-gray-500">
          {formatTime(run.startTime)}
        </span>
        {duration !== null && (
          <span className="text-gray-400 dark:text-gray-500">
            {formatDuration(duration)}
          </span>
        )}
        {run.error && (
          <span className="text-red-500 text-xs truncate">{run.error}</span>
        )}
        <svg
          className={`w-4 h-4 ml-auto text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {expanded && (
        <div className="px-3 pb-3 border-t border-gray-100 dark:border-gray-700">
          <div className="space-y-2 mt-2">
            {steps.map((step, i) => {
              const result = run.results[`step_${i}`];
              const isCurrentStep = run.status === 'running' && i === run.currentStep;
              return (
                <div key={step.id} className="flex items-start gap-2 text-xs">
                  <span className={`w-5 h-5 flex items-center justify-center rounded-full flex-shrink-0 ${
                    isCurrentStep
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                      : result
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-500'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-400'
                  }`}>
                    {isCurrentStep ? (
                      <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-gray-700 dark:text-gray-300">{step.label}</span>
                    {result && (
                      <p className="text-gray-500 dark:text-gray-400 mt-0.5 truncate">{result.output}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
