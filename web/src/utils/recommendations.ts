// ============================================================
// 智能推荐引擎 — 基于使用模式分析，提供个性化推荐
// ============================================================

import { analytics } from './analytics';
import { useAppStore } from '../store/appStore';

// ---------- 类型定义 ----------

export interface Recommendation {
  id: string;
  type: 'tool' | 'template' | 'feature' | 'tip';
  title: string;
  description: string;
  action: string; // 路由或操作标识
  actionLabel: string;
  icon: string;
  reason: string; // 推荐理由
  priority: number; // 0-100，越高越重要
}

// ---------- 工具关系图谱 ----------

export const TOOL_RELATIONSHIPS: Record<string, string[]> = {
  writing: ['rewrite', 'summarize', 'continue', 'templateMarket'],
  rewrite: ['writing', 'translate'],
  translate: ['writing', 'summarize'],
  summarize: ['writing', 'documentAnalysis'],
  codeAssistant: ['dataAnalysis', 'mindMap'],
  dataAnalysis: ['codeAssistant', 'pptGenerator'],
  pptGenerator: ['dataAnalysis', 'marketing'],
  marketing: ['pptGenerator', 'templateMarket'],
  learning: ['mindMap', 'summarize'],
  lifeAssistant: ['writing', 'translate'],
  fiction: ['writing', 'templateMarket'],
};

// ---------- 工具名称映射 ----------

const TOOL_NAMES: Record<string, { zh: string; en: string; route: string; icon: string }> = {
  writing: { zh: 'AI 写作', en: 'AI Writing', route: '/workspace', icon: '✍️' },
  rewrite: { zh: '智能改写', en: 'Smart Rewrite', route: '/workspace/rewrite', icon: '🔄' },
  summarize: { zh: '内容总结', en: 'Summarizer', route: '/workspace/summarizer', icon: '📝' },
  continue: { zh: '续写扩写', en: 'Continue Writing', route: '/workspace/continue', icon: '➡️' },
  templateMarket: { zh: '模板市场', en: 'Template Market', route: '/templates', icon: '📋' },
  translate: { zh: '智能翻译', en: 'Translation', route: '/workspace/translation', icon: '🌐' },
  documentAnalysis: { zh: '文档分析', en: 'Doc Analysis', route: '/workspace/doc-analysis', icon: '📄' },
  codeAssistant: { zh: '代码助手', en: 'Code Assistant', route: '/workspace/code-assistant', icon: '💻' },
  dataAnalysis: { zh: '数据分析', en: 'Data Analysis', route: '/workspace/data-analysis', icon: '📊' },
  pptGenerator: { zh: 'PPT 生成器', en: 'PPT Generator', route: '/workspace/ppt-generator', icon: '📽️' },
  marketing: { zh: '营销文案', en: 'Marketing Copy', route: '/workspace/marketing', icon: '📣' },
  mindMap: { zh: '思维导图', en: 'Mind Map', route: '/workspace/mindmap', icon: '🧠' },
  learning: { zh: '学习助手', en: 'Learning Assistant', route: '/workspace/learning', icon: '📚' },
  lifeAssistant: { zh: '生活助手', en: 'Life Assistant', route: '/workspace/life-assistant', icon: '🌟' },
  fiction: { zh: '互动小说', en: 'Interactive Fiction', route: '/workspace/fiction', icon: '📖' },
  creative: { zh: '创意灵感', en: 'Creative Ideas', route: '/workspace/creative', icon: '🎨' },
  copywriting: { zh: '文案生成', en: 'Copywriting', route: '/workspace/copywriting', icon: '✨' },
  seo: { zh: 'SEO 优化', en: 'SEO Optimization', route: '/workspace/seo', icon: '🔍' },
  humanize: { zh: '人性化改写', en: 'Humanize', route: '/workspace/humanize', icon: '🧑' },
  polish: { zh: '文章润色', en: 'Article Polish', route: '/workspace/polish', icon: '💎' },
  longform: { zh: '长文写作', en: 'Long-Form Writing', route: '/workspace/longform', icon: '📑' },
  brand: { zh: '品牌声音', en: 'Brand Voice', route: '/workspace/brand', icon: '🎭' },
  calendar: { zh: '营销日历', en: 'Marketing Calendar', route: '/workspace/calendar', icon: '📅' },
  scripts: { zh: '话术库', en: 'Script Library', route: '/workspace/scripts', icon: '💬' },
  dashboard: { zh: '数据面板', en: 'Dashboard', route: '/dashboard', icon: '📈' },
  templates: { zh: '模板库', en: 'Templates', route: '/workspace/templates', icon: '🗂️' },
  history: { zh: '历史记录', en: 'History', route: '/workspace/history', icon: '🕐' },
};

// ---------- 版本更新日志（用于新功能推荐） ----------

const CHANGELOG: Array<{ version: string; feature: string; desc: { zh: string; en: string }; route: string; icon: string }> = [
  {
    version: '2.5',
    feature: 'templateMarket',
    desc: { zh: '全新模板市场，20+ 专业模板一键使用', en: 'New template market with 20+ professional templates' },
    route: '/templates',
    icon: '🆕',
  },
  {
    version: '2.5',
    feature: 'codeAssistant',
    desc: { zh: '代码助手上线，支持 12 种编程语言', en: 'Code Assistant now supports 12 programming languages' },
    route: '/workspace/code-assistant',
    icon: '🆕',
  },
  {
    version: '2.5',
    feature: 'dataAnalysis',
    desc: { zh: '数据分析工具，上传 CSV/Excel 自动生成报告', en: 'Upload CSV/Excel for auto-generated analysis reports' },
    route: '/workspace/data-analysis',
    icon: '🆕',
  },
];

// ---------- 辅助函数 ----------

function getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  if (hour >= 18 && hour < 22) return 'evening';
  return 'night';
}

function isWeekend(): boolean {
  const day = new Date().getDay();
  return day === 0 || day === 6;
}

function getDayOfWeek(): number {
  return new Date().getDay();
}

function generateId(): string {
  return `rec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function getUsedToolKeys(): Set<string> {
  const summary = analytics.getSummary();
  const used = new Set<string>();
  summary.toolUsageDistribution.forEach((item) => {
    used.add(item.tool.toLowerCase());
  });
  return used;
}

function getTopTool(): string | null {
  const summary = analytics.getSummary();
  if (summary.topTools.length === 0) return null;
  return summary.topTools[0].name.toLowerCase();
}

function getRecentToolFromStore(): string | null {
  try {
    const state = useAppStore.getState();
    if (state.recentTools && state.recentTools.length > 0) {
      return state.recentTools[0];
    }
  } catch {
    // store 可能未初始化
  }
  return null;
}

function getDismissedStorageKey(): string {
  return 'ai-assistant-dismissed-recommendations';
}

function getDismissedFromStorage(): string[] {
  try {
    const raw = localStorage.getItem(getDismissedStorageKey());
    if (raw) return JSON.parse(raw);
  } catch {
    // 忽略
  }
  return [];
}

function saveDismissedToStorage(ids: string[]): void {
  try {
    localStorage.setItem(getDismissedStorageKey(), JSON.stringify(ids));
  } catch {
    // 忽略
  }
}

// ---------- 推荐引擎类 ----------

class RecommendationEngine {
  private dismissed: string[] = [];

  constructor() {
    this.dismissed = getDismissedFromStorage();
  }

  /** 获取个性化推荐 */
  getRecommendations(): Recommendation[] {
    const recs: Recommendation[] = [];
    const usedTools = getUsedToolKeys();
    const topTool = getTopTool();
    const timeOfDay = getTimeOfDay();
    const weekend = isWeekend();

    // 1. 基于最常用工具推荐关联工具
    if (topTool && TOOL_RELATIONSHIPS[topTool]) {
      const related = TOOL_RELATIONSHIPS[topTool];
      const unusedRelated = related.filter((r) => !usedTools.has(r));
      if (unusedRelated.length > 0) {
        const tool = TOOL_NAMES[unusedRelated[0]];
        if (tool) {
          const topToolName = TOOL_NAMES[topTool]?.zh ?? topTool;
          recs.push({
            id: generateId(),
            type: 'tool',
            title: tool.zh,
            description: tool.zh + ' — 与你常用的' + topToolName + '搭配使用效果更佳',
            action: tool.route,
            actionLabel: '立即体验',
            icon: tool.icon,
            reason: '你经常使用' + topToolName + '，推荐尝试相关工具',
            priority: 85,
          });
        }
      }
    }

    // 2. 如果频繁使用写作工具 → 推荐模板市场
    const writingTools = ['rewrite', 'summarize', 'continue', 'translate', 'humanize', 'polish'];
    const writingCount = writingTools.filter((t) => usedTools.has(t)).length;
    if (writingCount >= 2 && !usedTools.has('templatemarket') && !usedTools.has('templateMarket')) {
      recs.push({
        id: generateId(),
        type: 'template',
        title: '模板市场',
        description: '20+ 专业模板，覆盖营销、社交、电商场景',
        action: '/templates',
        actionLabel: '浏览模板',
        icon: '📋',
        reason: '你经常使用写作工具，模板市场可以帮你快速开始',
        priority: 80,
      });
    }

    // 3. 上午 → 推荐每日写作提示
    if (timeOfDay === 'morning') {
      recs.push({
        id: generateId(),
        type: 'tip',
        title: '晨间写作提示',
        description: '早晨是创作的黄金时间，试试用 AI 助手开始今天的写作',
        action: '/workspace',
        actionLabel: '开始写作',
        icon: '🌅',
        reason: '早晨灵感充沛，适合开始创作',
        priority: 60,
      });
    }

    // 4. 如果有错误 → 建议查看数据面板
    const summary = analytics.getSummary();
    if (summary.totalErrors > 0 && summary.errorRate > 5) {
      recs.push({
        id: generateId(),
        type: 'feature',
        title: '查看数据面板',
        description: `检测到 ${summary.totalErrors} 个错误，错误率 ${summary.errorRate}%`,
        action: '/dashboard',
        actionLabel: '查看详情',
        icon: '⚠️',
        reason: '近期使用中出现较多错误，建议检查',
        priority: 90,
      });
    }

    // 5. 基于星期几推荐
    if (weekend) {
      // 周末 → 创意工具
      if (!usedTools.has('fiction')) {
        const fictionTool = TOOL_NAMES['fiction'];
        if (fictionTool) {
          recs.push({
            id: generateId(),
            type: 'tool',
            title: fictionTool.zh,
            description: '周末放松一下，体验 AI 互动小说',
            action: fictionTool.route,
            actionLabel: '开始冒险',
            icon: fictionTool.icon,
            reason: '周末适合放松娱乐，试试互动小说',
            priority: 50,
          });
        }
      }
    } else {
      // 工作日 → 生产力工具
      if (!usedTools.has('pptgenerator') && !usedTools.has('pptGenerator')) {
        const pptTool = TOOL_NAMES['pptGenerator'];
        if (pptTool) {
          recs.push({
            id: generateId(),
            type: 'tool',
            title: pptTool.zh,
            description: 'AI 自动生成 PPT，提升工作效率',
            action: pptTool.route,
            actionLabel: '立即使用',
            icon: pptTool.icon,
            reason: '工作日推荐效率工具，快速生成演示文稿',
            priority: 55,
          });
        }
      }
    }

    // 6. 新功能推荐
    const lastVersion = localStorage.getItem('ai-assistant-last-version');
    for (const entry of CHANGELOG) {
      if (entry.version !== lastVersion && !usedTools.has(entry.feature.toLowerCase())) {
        recs.push({
          id: generateId(),
          type: 'feature',
          title: entry.icon + ' 新功能: ' + entry.desc.zh.split('，')[0],
          description: entry.desc.zh,
          action: entry.route,
          actionLabel: '立即体验',
          icon: entry.icon,
          reason: '全新功能上线',
          priority: 75,
        });
        break; // 只推荐一个新功能
      }
    }

    // 过滤已忽略的推荐，按优先级排序
    return recs
      .filter((r) => !this.dismissed.includes(r.id))
      .sort((a, b) => b.priority - a.priority);
  }

  /** 获取快速操作（基于时间和最近使用） */
  getQuickActions(): Recommendation[] {
    const actions: Recommendation[] = [];
    const recentTool = getRecentToolFromStore();
    const timeOfDay = getTimeOfDay();
    const usedTools = getUsedToolKeys();

    // 1. 最近使用的工具 — 快速继续
    if (recentTool) {
      const toolInfo = TOOL_NAMES[recentTool] || TOOL_NAMES[recentTool.toLowerCase()];
      if (toolInfo) {
        actions.push({
          id: generateId(),
          type: 'tool',
          title: '继续使用 ' + toolInfo.zh,
          description: '快速回到上次使用的工具',
          action: toolInfo.route,
          actionLabel: '继续',
          icon: '⚡',
          reason: '你上次使用了' + toolInfo.zh,
          priority: 95,
        });
      }
    }

    // 2. 基于时间的推荐
    if (timeOfDay === 'morning') {
      actions.push({
        id: generateId(),
        type: 'tip',
        title: '每日灵感',
        description: '让 AI 帮你开启高效的一天',
        action: '/workspace',
        actionLabel: '获取灵感',
        icon: '💡',
        reason: '早晨是获取灵感的好时间',
        priority: 70,
      });
    } else if (timeOfDay === 'afternoon') {
      actions.push({
        id: generateId(),
        type: 'tool',
        title: '午后效率提升',
        description: '用 AI 助手处理下午的工作任务',
        action: '/workspace',
        actionLabel: '开始工作',
        icon: '🚀',
        reason: '下午适合处理重要任务',
        priority: 65,
      });
    } else if (timeOfDay === 'evening') {
      actions.push({
        id: generateId(),
        type: 'tip',
        title: '晚间回顾',
        description: '回顾今天的工作，整理思路',
        action: '/dashboard',
        actionLabel: '查看统计',
        icon: '🌙',
        reason: '晚上适合回顾和总结',
        priority: 60,
      });
    }

    // 3. 周末特殊推荐
    if (isWeekend()) {
      actions.push({
        id: generateId(),
        type: 'tool',
        title: '创意时间',
        description: '周末放松，试试创意灵感工具',
        action: '/workspace/creative',
        actionLabel: '探索创意',
        icon: '🎨',
        reason: '周末适合发挥创意',
        priority: 55,
      });
    }

    // 4. 如果从未使用过某些核心工具，推荐一个
    const coreTools = ['rewrite', 'summarize', 'translate', 'mindMap'];
    const unusedCore = coreTools.filter((t) => !usedTools.has(t));
    if (unusedCore.length > 0) {
      const tool = TOOL_NAMES[unusedCore[0]];
      if (tool) {
        actions.push({
          id: generateId(),
          type: 'tool',
          title: '试试 ' + tool.zh,
          description: '发现更多 AI 工具的强大功能',
          action: tool.route,
          actionLabel: '试试看',
          icon: tool.icon,
          reason: '你还没有尝试过这个工具',
          priority: 45,
        });
      }
    }

    return actions
      .filter((a) => !this.dismissed.includes(a.id))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 4);
  }

  /** 获取"发现"建议（未使用的功能） */
  getDiscoveries(): Recommendation[] {
    const discoveries: Recommendation[] = [];
    const usedTools = getUsedToolKeys();

    // 所有可发现的工具
    const discoverableTools = [
      { key: 'dataAnalysis', title: '数据分析', desc: '上传 CSV/Excel，AI 自动生成分析报告', route: '/workspace/data-analysis', icon: '📊' },
      { key: 'pptGenerator', title: 'PPT 生成器', desc: 'AI 生成大纲与幻灯片，一键导出', route: '/workspace/ppt-generator', icon: '📽️' },
      { key: 'mindMap', title: '思维导图', desc: 'AI 生成可视化思维导图，多种模式', route: '/workspace/mindmap', icon: '🧠' },
      { key: 'fiction', title: '互动小说', desc: '6 大题材 AI 互动小说，沉浸式体验', route: '/workspace/fiction', icon: '📖' },
      { key: 'learning', title: '学习助手', desc: '知识问答、概念解释、学习计划', route: '/workspace/learning', icon: '📚' },
      { key: 'lifeAssistant', title: '生活助手', desc: '旅行规划、美食推荐、职业规划', route: '/workspace/life-assistant', icon: '🌟' },
      { key: 'codeAssistant', title: '代码助手', desc: 'AI 代码生成、解释、调试', route: '/workspace/code-assistant', icon: '💻' },
      { key: 'brand', title: '品牌声音', desc: '统一品牌调性，保持内容一致性', route: '/workspace/brand', icon: '🎭' },
      { key: 'calendar', title: '营销日历', desc: 'AI 自动生成内容排期计划', route: '/workspace/calendar', icon: '📅' },
      { key: 'longform', title: '长文写作', desc: '大纲规划 + 分段生成，轻松创作长文', route: '/workspace/longform', icon: '📑' },
    ];

    const unusedTools = discoverableTools.filter((t) => !usedTools.has(t.key.toLowerCase()));

    for (const tool of unusedTools) {
      discoveries.push({
        id: generateId(),
        type: 'tool',
        title: '发现: ' + tool.title,
        description: tool.desc,
        action: tool.route,
        actionLabel: '立即体验',
        icon: tool.icon,
        reason: '你还没有使用过这个功能',
        priority: 40 + Math.floor(Math.random() * 20),
      });
    }

    // 模板市场发现
    if (!usedTools.has('templatemarket') && !usedTools.has('templateMarket')) {
      discoveries.push({
        id: generateId(),
        type: 'template',
        title: '发现: 模板市场',
        description: '20+ 专业模板，覆盖营销、社交、电商场景',
        action: '/templates',
        actionLabel: '浏览模板',
        icon: '📋',
        reason: '模板市场可以帮助你快速开始创作',
        priority: 50,
      });
    }

    return discoveries
      .filter((d) => !this.dismissed.includes(d.id))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 6);
  }

  /** 获取生产力提示 */
  getTips(): Recommendation[] {
    const tips: Recommendation[] = [];
    const summary = analytics.getSummary();
    const timeOfDay = getTimeOfDay();
    const dayOfWeek = getDayOfWeek();

    // 通用提示池
    const generalTips: Array<{
      title: string;
      description: string;
      action: string;
      actionLabel: string;
      icon: string;
      reason: string;
      priority: number;
    }> = [
      {
        title: '善用快捷键',
        description: '按 Ctrl+K 打开命令面板，快速访问所有功能',
        action: 'command-palette',
        actionLabel: '了解更多',
        icon: '⌨️',
        reason: '提升操作效率',
        priority: 50,
      },
      {
        title: '批量处理内容',
        description: '使用文案生成器可以批量生成多个版本的内容',
        action: '/workspace/copywriting',
        actionLabel: '立即使用',
        icon: '📦',
        reason: '提高内容产出效率',
        priority: 55,
      },
      {
        title: 'SEO 优化技巧',
        description: '发布前用 SEO 工具检查，提升搜索排名',
        action: '/workspace/seo',
        actionLabel: '优化内容',
        icon: '🔍',
        reason: '让内容更容易被找到',
        priority: 45,
      },
      {
        title: '品牌一致性',
        description: '使用品牌声音功能保持所有内容的统一调性',
        action: '/workspace/brand',
        actionLabel: '设置品牌',
        icon: '🎭',
        reason: '建立专业品牌形象',
        priority: 48,
      },
      {
        title: '营销日历规划',
        description: '提前规划内容排期，保持稳定的发布节奏',
        action: '/workspace/calendar',
        actionLabel: '查看日历',
        icon: '📅',
        reason: '内容运营的最佳实践',
        priority: 52,
      },
      {
        title: '人性化改写',
        description: 'AI 生成的内容经过人性化改写后更自然',
        action: '/workspace/humanize',
        actionLabel: '去 AI 痕迹',
        icon: '🧑',
        reason: '提升内容质量',
        priority: 58,
      },
      {
        title: '思维导图整理思路',
        description: '用思维导图工具梳理和可视化你的想法',
        action: '/workspace/mindmap',
        actionLabel: '创建导图',
        icon: '🧠',
        reason: '更好的思考和规划',
        priority: 46,
      },
      {
        title: '历史记录回顾',
        description: '查看历史记录，复用之前的好内容',
        action: '/workspace/history',
        actionLabel: '查看历史',
        icon: '🕐',
        reason: '避免重复劳动',
        priority: 42,
      },
    ];

    // 基于使用量的提示
    if (summary.totalToolUses > 50) {
      tips.push({
        id: generateId(),
        type: 'tip',
        title: '使用达人',
        description: `你已经使用了 ${summary.totalToolUses} 次工具，试试更高级的功能吧`,
        action: '/workspace/data-analysis',
        actionLabel: '探索高级功能',
        icon: '🏆',
        reason: '你是活跃用户，可以尝试更多功能',
        priority: 60,
      });
    }

    if (summary.totalToolUses === 0) {
      tips.push({
        id: generateId(),
        type: 'tip',
        title: '新手引导',
        description: '从智能改写开始，体验 AI 写作的强大功能',
        action: '/workspace/rewrite',
        actionLabel: '开始体验',
        icon: '🎯',
        reason: '推荐新手入门工具',
        priority: 70,
      });
    }

    // 基于时间的提示
    if (timeOfDay === 'morning' && dayOfWeek === 1) {
      tips.push({
        id: generateId(),
        type: 'tip',
        title: '周一规划',
        description: '新的一周开始，用营销日历规划本周内容',
        action: '/workspace/calendar',
        actionLabel: '开始规划',
        icon: '📋',
        reason: '周一适合做周计划',
        priority: 65,
      });
    }

    if (timeOfDay === 'evening' && dayOfWeek === 5) {
      tips.push({
        id: generateId(),
        type: 'tip',
        title: '周五回顾',
        description: '一周结束，查看数据面板回顾本周成果',
        action: '/dashboard',
        actionLabel: '查看统计',
        icon: '📊',
        reason: '周五适合做周总结',
        priority: 62,
      });
    }

    // 从通用提示池中随机选取几个
    const shuffled = [...generalTips].sort(() => Math.random() - 0.5);
    for (const tip of shuffled.slice(0, 3)) {
      tips.push({
        id: generateId(),
        type: 'tip' as const,
        ...tip,
      });
    }

    return tips
      .filter((t) => !this.dismissed.includes(t.id))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 5);
  }

  /** 忽略推荐 */
  dismiss(recommendationId: string): void {
    if (!this.dismissed.includes(recommendationId)) {
      this.dismissed.push(recommendationId);
      saveDismissedToStorage(this.dismissed);
    }
  }

  /** 获取已忽略的推荐 ID */
  getDismissed(): string[] {
    return [...this.dismissed];
  }

  /** 清除所有已忽略的推荐 */
  clearDismissed(): void {
    this.dismissed = [];
    saveDismissedToStorage([]);
  }
}

// 导出单例
export const recommendationEngine = new RecommendationEngine();
export default recommendationEngine;
