import { v4 as uuidv4 } from 'uuid';

/**
 * 告警级别
 */
type AlertLevel = 'info' | 'warning' | 'error' | 'critical';

/**
 * 告警条目
 */
interface Alert {
  /** 唯一标识 */
  id: string;
  /** 告警级别 */
  level: AlertLevel;
  /** 告警标题 */
  title: string;
  /** 告警详细信息 */
  message: string;
  /** 告警来源 */
  source: string;
  /** 是否已解决 */
  resolved: boolean;
  /** 创建时间（毫秒时间戳） */
  createdAt: number;
  /** 解决时间（毫秒时间戳） */
  resolvedAt?: number;
}

/**
 * 告警查询选项
 */
interface AlertQueryOptions {
  /** 按级别过滤 */
  level?: string;
  /** 按解决状态过滤 */
  resolved?: boolean;
  /** 返回数量限制 */
  limit?: number;
  /** 偏移量 */
  offset?: number;
}

/**
 * 告警统计信息
 */
interface AlertStats {
  /** 总数 */
  total: number;
  /** 按级别统计 */
  byLevel: Record<string, number>;
  /** 未解决数量 */
  unresolved: number;
}

/**
 * 告警服务
 * 内存存储，支持创建、解决、查询告警
 */
class AlertService {
  private alerts: Alert[];
  private maxAlerts: number;

  constructor(maxAlerts: number = 1000) {
    this.alerts = [];
    this.maxAlerts = maxAlerts;
  }

  /**
   * 创建新告警
   * @param level 告警级别
   * @param title 告警标题
   * @param message 告警详细信息
   * @param source 告警来源
   * @returns 创建的告警对象
   */
  createAlert(level: Alert['level'], title: string, message: string, source: string): Alert {
    const alert: Alert = {
      id: uuidv4(),
      level,
      title,
      message,
      source,
      resolved: false,
      createdAt: Date.now(),
    };

    this.alerts.unshift(alert);

    // 如果超过最大数量，移除最旧的已解决告警
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.filter(a => !a.resolved).concat(
        this.alerts.filter(a => a.resolved).slice(0, this.maxAlerts - this.alerts.filter(a => !a.resolved).length)
      );
    }

    // 如果仍然超过限制，移除最旧的条目
    if (this.alerts.length > this.maxAlerts) {
      this.alerts = this.alerts.slice(0, this.maxAlerts);
    }

    return alert;
  }

  /**
   * 解决告警
   * @param alertId 告警ID
   * @returns 已解决的告警，如果未找到则返回null
   */
  resolveAlert(alertId: string): Alert | null {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) {
      return null;
    }

    if (alert.resolved) {
      return alert;
    }

    alert.resolved = true;
    alert.resolvedAt = Date.now();

    return alert;
  }

  /**
   * 查询告警列表
   * @param options 查询选项
   * @returns 告警列表和总数
   */
  getAlerts(options?: AlertQueryOptions): { alerts: Alert[]; total: number } {
    let filtered = [...this.alerts];

    // 按级别过滤
    if (options?.level) {
      filtered = filtered.filter(a => a.level === options.level);
    }

    // 按解决状态过滤
    if (options?.resolved !== undefined) {
      filtered = filtered.filter(a => a.resolved === options.resolved);
    }

    const total = filtered.length;

    // 分页
    const offset = options?.offset || 0;
    const limit = options?.limit || 50;
    const alerts = filtered.slice(offset, offset + limit);

    return { alerts, total };
  }

  /**
   * 获取单个告警
   * @param alertId 告警ID
   * @returns 告警对象，如果未找到则返回null
   */
  getAlert(alertId: string): Alert | null {
    const alert = this.alerts.find(a => a.id === alertId);
    return alert || null;
  }

  /**
   * 清除所有已解决的告警
   * @returns 清除的告警数量
   */
  clearResolved(): number {
    const before = this.alerts.length;
    this.alerts = this.alerts.filter(a => !a.resolved);
    return before - this.alerts.length;
  }

  /**
   * 获取告警统计信息
   * @returns 统计信息
   */
  getStats(): AlertStats {
    const total = this.alerts.length;
    const byLevel: Record<string, number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0,
    };

    let unresolved = 0;

    for (const alert of this.alerts) {
      byLevel[alert.level] = (byLevel[alert.level] || 0) + 1;
      if (!alert.resolved) {
        unresolved++;
      }
    }

    return { total, byLevel, unresolved };
  }
}

// 导出全局告警服务实例
export const alertService = new AlertService();

export { AlertService, Alert, AlertLevel, AlertQueryOptions, AlertStats };
export default alertService;
