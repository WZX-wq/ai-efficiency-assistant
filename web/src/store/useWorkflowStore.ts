import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// ============================================================
// Types
// ============================================================

export interface WorkflowStep {
  id: string;
  type: 'ai-generate' | 'ai-rewrite' | 'ai-translate' | 'ai-summarize' | 'delay' | 'condition' | 'export' | 'notify';
  config: Record<string, any>;
  label: string;
}

export interface WorkflowTrigger {
  type: 'manual' | 'schedule' | 'on-create' | 'webhook';
  config: Record<string, any>;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  icon: string;
  steps: WorkflowStep[];
  trigger: WorkflowTrigger;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
  runCount: number;
  lastRunAt?: number;
  status: 'idle' | 'running' | 'completed' | 'error';
  isTemplate?: boolean;
}

export interface WorkflowRun {
  id: string;
  workflowId: string;
  startTime: number;
  endTime?: number;
  status: 'running' | 'completed' | 'error';
  currentStep: number;
  results: Record<string, any>;
  error?: string;
}

export interface WorkflowStore {
  workflows: Workflow[];
  runs: WorkflowRun[];

  // CRUD
  addWorkflow: (workflow: Omit<Workflow, 'id' | 'createdAt' | 'updatedAt' | 'runCount' | 'status'>) => void;
  updateWorkflow: (id: string, updates: Partial<Workflow>) => void;
  deleteWorkflow: (id: string) => void;
  duplicateWorkflow: (id: string) => void;

  // Execution
  runWorkflow: (id: string) => Promise<void>;
  stopWorkflow: (id: string) => void;

  // State
  toggleEnabled: (id: string) => void;

  // Getters
  getEnabledWorkflows: () => Workflow[];
  getRecentRuns: (limit?: number) => WorkflowRun[];
}

// ============================================================
// Helpers
// ============================================================

function generateId(): string {
  return `wf_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

function generateRunId(): string {
  return `run_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/** Simulate step execution (client-side demo) */
async function simulateStep(
  step: WorkflowStep,
  _stepIndex: number,
  _prevResults: Record<string, any>,
): Promise<Record<string, any>> {
  // Simulate AI processing delay
  await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 800));

  switch (step.type) {
    case 'ai-generate':
      return {
        output: `[AI 生成结果] 基于 prompt: "${step.config.prompt || ''}" 的内容已生成`,
        tokens: Math.floor(Math.random() * 500) + 200,
      };
    case 'ai-rewrite':
      return {
        output: `[AI 改写结果] 风格: ${step.config.style || 'professional'} 的改写已完成`,
        tokens: Math.floor(Math.random() * 300) + 150,
      };
    case 'ai-translate':
      return {
        output: `[AI 翻译结果] 目标语言: ${step.config.language || 'english'} 的翻译已完成`,
        tokens: Math.floor(Math.random() * 400) + 200,
      };
    case 'ai-summarize':
      return {
        output: `[AI 摘要结果] 摘要长度: ${step.config.length || 'brief'}`,
        tokens: Math.floor(Math.random() * 200) + 100,
      };
    case 'delay':
      await new Promise((resolve) => setTimeout(resolve, (step.config.duration || 5) * 1000));
      return { output: `等待 ${(step.config.duration || 5)} 秒完成` };
    case 'condition':
      return {
        output: `[条件判断] 规则已评估`,
        passed: Math.random() > 0.3,
      };
    case 'export':
      return {
        output: `[导出完成] 格式: ${step.config.format || 'txt'}`,
        fileSize: Math.floor(Math.random() * 100) + 10,
      };
    case 'notify':
      return {
        output: `[通知已发送] 消息: "${step.config.message || ''}"`,
      };
    default:
      return { output: '未知步骤类型' };
  }
}

// ============================================================
// Store
// ============================================================

export const useWorkflowStore = create<WorkflowStore>()(
  persist(
    (set, get) => ({
      workflows: [],
      runs: [],

      // ---- CRUD ----

      addWorkflow: (workflow) => {
        const now = Date.now();
        const newWorkflow: Workflow = {
          ...workflow,
          id: generateId(),
          createdAt: now,
          updatedAt: now,
          runCount: 0,
          status: 'idle',
        };
        set((s) => ({ workflows: [...s.workflows, newWorkflow] }));
      },

      updateWorkflow: (id, updates) => {
        set((s) => ({
          workflows: s.workflows.map((w) =>
            w.id === id ? { ...w, ...updates, updatedAt: Date.now() } : w,
          ),
        }));
      },

      deleteWorkflow: (id) => {
        set((s) => ({
          workflows: s.workflows.filter((w) => w.id !== id),
          runs: s.runs.filter((r) => r.workflowId !== id),
        }));
      },

      duplicateWorkflow: (id) => {
        const source = get().workflows.find((w) => w.id === id);
        if (!source) return;
        const now = Date.now();
        const newWorkflow: Workflow = {
          ...source,
          id: generateId(),
          name: `${source.name} (副本)`,
          createdAt: now,
          updatedAt: now,
          runCount: 0,
          status: 'idle',
          lastRunAt: undefined,
          isTemplate: false,
          steps: source.steps.map((s) => ({ ...s, id: generateId() })),
        };
        set((s) => ({ workflows: [...s.workflows, newWorkflow] }));
      },

      // ---- Execution ----

      runWorkflow: async (id) => {
        const workflow = get().workflows.find((w) => w.id === id);
        if (!workflow || !workflow.enabled) return;

        // Set workflow to running
        set((s) => ({
          workflows: s.workflows.map((w) =>
            w.id === id ? { ...w, status: 'running' as const } : w,
          ),
        }));

        const runId = generateRunId();
        const run: WorkflowRun = {
          id: runId,
          workflowId: id,
          startTime: Date.now(),
          status: 'running',
          currentStep: 0,
          results: {},
        };

        set((s) => ({ runs: [run, ...s.runs] }));

        try {
          const stepResults: Record<string, any> = {};

          for (let i = 0; i < workflow.steps.length; i++) {
            // Check if workflow was stopped
            const current = get().workflows.find((w) => w.id === id);
            if (!current || current.status !== 'running') {
              throw new Error('工作流已停止');
            }

            // Update current step
            set((s) => ({
              runs: s.runs.map((r) =>
                r.id === runId ? { ...r, currentStep: i } : r,
              ),
            }));

            const step = workflow.steps[i];
            const result = await simulateStep(step, i, stepResults);
            stepResults[`step_${i}`] = result;
          }

          const now = Date.now();
          set((s) => ({
            workflows: s.workflows.map((w) =>
              w.id === id
                ? {
                    ...w,
                    status: 'completed' as const,
                    runCount: w.runCount + 1,
                    lastRunAt: now,
                    updatedAt: now,
                  }
                : w,
            ),
            runs: s.runs.map((r) =>
              r.id === runId
                ? { ...r, status: 'completed' as const, endTime: Date.now(), results: stepResults }
                : r,
            ),
          }));

          // Reset workflow to idle after a short delay
          setTimeout(() => {
            set((s) => ({
              workflows: s.workflows.map((w) =>
                w.id === id ? { ...w, status: 'idle' as const } : w,
              ),
            }));
          }, 2000);
        } catch (error: any) {
          set((s) => ({
            workflows: s.workflows.map((w) =>
              w.id === id
                ? { ...w, status: 'error' as const, updatedAt: Date.now() }
                : w,
            ),
            runs: s.runs.map((r) =>
              r.id === runId
                ? {
                    ...r,
                    status: 'error' as const,
                    endTime: Date.now(),
                    error: error.message || '未知错误',
                  }
                : r,
            ),
          }));

          // Reset workflow to idle after a short delay
          setTimeout(() => {
            set((s) => ({
              workflows: s.workflows.map((w) =>
                w.id === id ? { ...w, status: 'idle' as const } : w,
              ),
            }));
          }, 3000);
        }
      },

      stopWorkflow: (id) => {
        set((s) => ({
          workflows: s.workflows.map((w) =>
            w.id === id ? { ...w, status: 'idle' as const } : w,
          ),
        }));
      },

      // ---- State ----

      toggleEnabled: (id) => {
        set((s) => ({
          workflows: s.workflows.map((w) =>
            w.id === id ? { ...w, enabled: !w.enabled, updatedAt: Date.now() } : w,
          ),
        }));
      },

      // ---- Getters ----

      getEnabledWorkflows: () => {
        return get().workflows.filter((w) => w.enabled && !w.isTemplate);
      },

      getRecentRuns: (limit = 10) => {
        return get().runs.slice(0, limit);
      },
    }),
    {
      name: 'ai-assistant-workflow-store',
      partialize: (state) => ({
        workflows: state.workflows,
        runs: state.runs,
      }),
    }
  )
);
