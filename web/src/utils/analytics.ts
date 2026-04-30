// ============================================================
// 轻量级本地分析系统 — 无外部服务，所有数据存储在 localStorage
// ============================================================

export interface AnalyticsEvent {
  type: 'page_view' | 'tool_use' | 'button_click' | 'error' | 'feature_use';
  name: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface AnalyticsSummary {
  totalPageViews: number;
  totalToolUses: number;
  topTools: { name: string; count: number }[];
  totalErrors: number;
  errorRate: number;
  dailyActiveUsage: { date: string; count: number }[];
  toolUsageDistribution: { tool: string; count: number }[];
}

class Analytics {
  private events: AnalyticsEvent[] = [];
  private maxEvents = 1000;
  private storageKey = 'ai-assistant-analytics';
  private initialized = false;

  constructor() {
    this.loadFromStorage();
  }

  /** 从 localStorage 加载历史事件 */
  private loadFromStorage(): void {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          this.events = parsed.slice(-this.maxEvents);
        }
      }
    } catch {
      // localStorage 不可用或数据损坏，忽略
    }
    this.initialized = true;
  }

  /** 持久化到 localStorage */
  private saveToStorage(): void {
    if (!this.initialized) return;
    try {
      // 只保留最近的 maxEvents 条
      const toSave = this.events.slice(-this.maxEvents);
      localStorage.setItem(this.storageKey, JSON.stringify(toSave));
    } catch {
      // 存储空间不足，尝试清理旧数据
      try {
        const trimmed = this.events.slice(-Math.floor(this.maxEvents / 2));
        localStorage.setItem(this.storageKey, JSON.stringify(trimmed));
        this.events = trimmed;
      } catch {
        // 仍然失败，放弃存储
      }
    }
  }

  /** 添加事件 */
  private addEvent(event: Omit<AnalyticsEvent, 'timestamp'>): void {
    this.events.push({
      ...event,
      timestamp: Date.now(),
    });
    this.saveToStorage();
  }

  /** 追踪页面浏览 */
  trackPageView(path: string): void {
    this.addEvent({
      type: 'page_view',
      name: path,
    });
  }

  /** 追踪工具使用 */
  trackToolUse(toolName: string, metadata?: Record<string, unknown>): void {
    this.addEvent({
      type: 'tool_use',
      name: toolName,
      metadata,
    });
  }

  /** 追踪按钮点击 */
  trackClick(element: string, metadata?: Record<string, unknown>): void {
    this.addEvent({
      type: 'button_click',
      name: element,
      metadata,
    });
  }

  /** 追踪错误 */
  trackError(error: Error, context?: string): void {
    this.addEvent({
      type: 'error',
      name: error.message,
      metadata: {
        stack: error.stack,
        context,
      },
    });
  }

  /** 追踪功能使用 */
  trackFeatureUse(featureName: string, metadata?: Record<string, unknown>): void {
    this.addEvent({
      type: 'feature_use',
      name: featureName,
      metadata,
    });
  }

  /** 获取所有事件 */
  getEvents(): AnalyticsEvent[] {
    return [...this.events];
  }

  /** 获取分析摘要 */
  getSummary(): AnalyticsSummary {
    const pageViews = this.events.filter((e) => e.type === 'page_view');
    const toolUses = this.events.filter((e) => e.type === 'tool_use');
    const errors = this.events.filter((e) => e.type === 'error');
    const totalEvents = this.events.length;

    // 工具使用统计
    const toolCountMap = new Map<string, number>();
    toolUses.forEach((e) => {
      toolCountMap.set(e.name, (toolCountMap.get(e.name) || 0) + 1);
    });
    const topTools = Array.from(toolCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    const toolUsageDistribution = Array.from(toolCountMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([tool, count]) => ({ tool, count }));

    // 每日活跃统计（最近 7 天）
    const now = Date.now();
    const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
    const dailyMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now - i * 24 * 60 * 60 * 1000);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      dailyMap.set(key, 0);
    }
    this.events
      .filter((e) => e.timestamp >= sevenDaysAgo)
      .forEach((e) => {
        const d = new Date(e.timestamp);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (dailyMap.has(key)) {
          dailyMap.set(key, (dailyMap.get(key) || 0) + 1);
        }
      });
    const dailyActiveUsage = Array.from(dailyMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    // 活跃天数
    const uniqueDays = new Set<string>();
    this.events.forEach((e) => {
      const d = new Date(e.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      uniqueDays.add(key);
    });

    return {
      totalPageViews: pageViews.length,
      totalToolUses: toolUses.length,
      topTools,
      totalErrors: errors.length,
      errorRate: totalEvents > 0 ? Math.round((errors.length / totalEvents) * 10000) / 100 : 0,
      dailyActiveUsage,
      toolUsageDistribution,
    };
  }

  /** 获取活跃天数 */
  getActiveDays(): number {
    const uniqueDays = new Set<string>();
    this.events.forEach((e) => {
      const d = new Date(e.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      uniqueDays.add(key);
    });
    return uniqueDays.size;
  }

  /** 获取最近的事件 */
  getRecentEvents(count = 20): AnalyticsEvent[] {
    return this.events.slice(-count).reverse();
  }

  /** 获取最近的错误 */
  getRecentErrors(count = 10): AnalyticsEvent[] {
    return this.events
      .filter((e) => e.type === 'error')
      .slice(-count)
      .reverse();
  }

  /** 导出数据为 JSON 字符串 */
  exportData(): string {
    return JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        totalEvents: this.events.length,
        events: this.events,
        summary: this.getSummary(),
      },
      null,
      2
    );
  }

  /** 清除所有数据 */
  clearData(): void {
    this.events = [];
    try {
      localStorage.removeItem(this.storageKey);
    } catch {
      // 忽略
    }
  }
}

export const analytics = new Analytics();
export default analytics;
