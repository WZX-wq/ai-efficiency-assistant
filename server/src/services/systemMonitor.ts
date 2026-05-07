import si from 'systeminformation';
import os from 'os';
import { EventEmitter } from 'events';

// ==================== 类型定义 ====================

/** 性能指标 */
export interface PerformanceMetrics {
  timestamp: number;
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  disk: DiskMetrics;
  network: NetworkMetrics;
  load: LoadMetrics;
}

/** CPU 指标 */
export interface CPUMetrics {
  usage: number;
  cores: number;
  model: string;
  speed: number;
  temperature?: number;
  loadUser: number;
  loadSystem: number;
  loadIdle: number;
}

/** 内存指标 */
export interface MemoryMetrics {
  total: number;
  used: number;
  free: number;
  active: number;
  available: number;
  usage: number;
  swapTotal: number;
  swapUsed: number;
  swapFree: number;
}

/** 磁盘指标 */
export interface DiskMetrics {
  total: number;
  used: number;
  free: number;
  usage: number;
  fsType: string;
  mount: string;
  readSpeed?: number;
  writeSpeed?: number;
}

/** 网络指标 */
export interface NetworkMetrics {
  interfaces: NetworkInterface[];
  totalReceived: number;
  totalTransmitted: number;
  receivedSpeed: number;
  transmittedSpeed: number;
}

/** 网络接口 */
export interface NetworkInterface {
  name: string;
  ip4?: string;
  ip6?: string;
  mac?: string;
  speed?: number;
  received: number;
  transmitted: number;
  receivedSpeed: number;
  transmittedSpeed: number;
}

/** 负载指标 */
export interface LoadMetrics {
  avg1: number;
  avg5: number;
  avg15: number;
}

/** 进程信息 */
export interface ProcessInfo {
  pid: number;
  name: string;
  command: string;
  cpu: number;
  memory: number;
  memoryPercent: number;
  ppid?: number;
  uid?: number;
  gid?: number;
  started: string;
  state: string;
}

/** 服务状态 */
export interface ServiceStatus {
  name: string;
  status: 'running' | 'stopped' | 'error' | 'unknown';
  pid?: number;
  cpu?: number;
  memory?: number;
  uptime?: number;
  port?: number;
  version?: string;
  lastChecked: number;
}

/** 告警级别 */
export type AlertLevel = 'info' | 'warning' | 'critical';

/** 告警信息 */
export interface AlertInfo {
  id: string;
  level: AlertLevel;
  title: string;
  message: string;
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
  acknowledged: boolean;
}

/** 告警规则 */
export interface AlertRule {
  id: string;
  name: string;
  metric: 'cpu' | 'memory' | 'disk' | 'load' | 'network';
  condition: 'gt' | 'lt' | 'eq';
  threshold: number;
  level: AlertLevel;
  enabled: boolean;
  cooldown: number; // 冷却时间（秒）
  lastTriggered?: number;
}

// ==================== 系统监控服务 ====================

export class SystemMonitorService extends EventEmitter {
  private static instance: SystemMonitorService;
  private metricsHistory: PerformanceMetrics[] = [];
  private maxHistorySize: number = 1000;
  private isMonitoring: boolean = false;
  private monitoringInterval: NodeJS.Timeout | null = null;
  private alertRules: AlertRule[] = [];
  private alerts: AlertInfo[] = [];
  private lastNetworkStats: Map<string, { rx: number; tx: number; timestamp: number }> = new Map();

  private constructor() {
    super();
    this.initializeDefaultAlertRules();
  }

  public static getInstance(): SystemMonitorService {
    if (!SystemMonitorService.instance) {
      SystemMonitorService.instance = new SystemMonitorService();
    }
    return SystemMonitorService.instance;
  }

  // ==================== 初始化 ====================

  private initializeDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'cpu-high',
        name: 'CPU 使用率过高',
        metric: 'cpu',
        condition: 'gt',
        threshold: 80,
        level: 'warning',
        enabled: true,
        cooldown: 300
      },
      {
        id: 'cpu-critical',
        name: 'CPU 使用率严重过高',
        metric: 'cpu',
        condition: 'gt',
        threshold: 95,
        level: 'critical',
        enabled: true,
        cooldown: 60
      },
      {
        id: 'memory-high',
        name: '内存使用率过高',
        metric: 'memory',
        condition: 'gt',
        threshold: 85,
        level: 'warning',
        enabled: true,
        cooldown: 300
      },
      {
        id: 'memory-critical',
        name: '内存使用率严重过高',
        metric: 'memory',
        condition: 'gt',
        threshold: 95,
        level: 'critical',
        enabled: true,
        cooldown: 60
      },
      {
        id: 'disk-high',
        name: '磁盘使用率过高',
        metric: 'disk',
        condition: 'gt',
        threshold: 85,
        level: 'warning',
        enabled: true,
        cooldown: 3600
      },
      {
        id: 'disk-critical',
        name: '磁盘使用率严重过高',
        metric: 'disk',
        condition: 'gt',
        threshold: 95,
        level: 'critical',
        enabled: true,
        cooldown: 600
      },
      {
        id: 'load-high',
        name: '系统负载过高',
        metric: 'load',
        condition: 'gt',
        threshold: os.cpus().length * 2,
        level: 'warning',
        enabled: true,
        cooldown: 300
      }
    ];
  }

  // ==================== 监控控制 ====================

  /**
   * 开始监控
   * @param interval 监控间隔（毫秒），默认 5000ms
   */
  public startMonitoring(interval: number = 5000): void {
    if (this.isMonitoring) {
      console.log('[SystemMonitor] 监控已在运行');
      return;
    }

    this.isMonitoring = true;
    console.log(`[SystemMonitor] 开始监控，间隔: ${interval}ms`);

    // 立即执行一次
    this.collectMetrics();

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
    }, interval);

    this.emit('monitoringStarted', { interval });
  }

  /**
   * 停止监控
   */
  public stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    console.log('[SystemMonitor] 监控已停止');
    this.emit('monitoringStopped');
  }

  /**
   * 获取监控状态
   */
  public getMonitoringStatus(): { isMonitoring: boolean; historySize: number } {
    return {
      isMonitoring: this.isMonitoring,
      historySize: this.metricsHistory.length
    };
  }

  // ==================== 指标收集 ====================

  /**
   * 收集系统指标
   */
  private async collectMetrics(): Promise<void> {
    try {
      const timestamp = Date.now();

      const [
        cpuData,
        memData,
        diskData,
        networkData,
        loadData
      ] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.networkStats(),
        si.currentLoad()
      ]);

      // CPU 指标
      const cpu: CPUMetrics = {
        usage: Math.round(cpuData.currentLoad),
        cores: os.cpus().length,
        model: os.cpus()[0]?.model || 'Unknown',
        speed: os.cpus()[0]?.speed || 0,
        loadUser: Math.round(cpuData.currentLoadUser),
        loadSystem: Math.round(cpuData.currentLoadSystem),
        loadIdle: Math.round(cpuData.currentLoadIdle)
      };

      // 尝试获取 CPU 温度
      try {
        const tempData = await si.cpuTemperature();
        cpu.temperature = tempData.main || tempData.cores?.[0];
      } catch {
        // 温度获取失败，忽略
      }

      // 内存指标
      const memory: MemoryMetrics = {
        total: memData.total,
        used: memData.used,
        free: memData.free,
        active: memData.active,
        available: memData.available,
        usage: Math.round((memData.used / memData.total) * 100),
        swapTotal: memData.swaptotal,
        swapUsed: memData.swapused,
        swapFree: memData.swapfree
      };

      // 磁盘指标（取根分区或第一个分区）
      const mainDisk = diskData.find(d => d.mount === '/') || diskData[0];
      const disk: DiskMetrics = mainDisk ? {
        total: mainDisk.size,
        used: mainDisk.used,
        free: mainDisk.size - mainDisk.used,
        usage: Math.round(mainDisk.use),
        fsType: mainDisk.fs,
        mount: mainDisk.mount
      } : {
        total: 0,
        used: 0,
        free: 0,
        usage: 0,
        fsType: 'unknown',
        mount: '/'
      };

      // 尝试获取磁盘 IO 速度
      try {
        const fsStats = await si.disksIO();
        if (fsStats) {
          disk.readSpeed = fsStats.rIO_sec ?? undefined;
          disk.writeSpeed = fsStats.wIO_sec ?? undefined;
        }
      } catch {
        // 忽略错误
      }

      // 网络指标
      const network = await this.calculateNetworkMetrics(networkData, timestamp);

      // 负载指标
      const load: LoadMetrics = {
        avg1: loadData.avgLoad,
        avg5: loadData.avgLoad,
        avg15: loadData.avgLoad
      };

      const metrics: PerformanceMetrics = {
        timestamp,
        cpu,
        memory,
        disk,
        network,
        load
      };

      // 添加到历史记录
      this.metricsHistory.push(metrics);
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory.shift();
      }

      // 检查告警
      this.checkAlerts(metrics);

      this.emit('metrics', metrics);
    } catch (error) {
      console.error('[SystemMonitor] 收集指标失败:', error);
      this.emit('error', error);
    }
  }

  /**
   * 计算网络指标
   */
  private async calculateNetworkMetrics(
    networkStats: si.Systeminformation.NetworkStatsData[],
    timestamp: number
  ): Promise<NetworkMetrics> {
    const interfaces: NetworkInterface[] = [];
    let totalReceived = 0;
    let totalTransmitted = 0;
    let receivedSpeed = 0;
    let transmittedSpeed = 0;

    for (const net of networkStats) {
      const iface = net.iface;
      const lastStats = this.lastNetworkStats.get(iface);

      let rxSpeed = 0;
      let txSpeed = 0;

      if (lastStats) {
        const timeDiff = (timestamp - lastStats.timestamp) / 1000; // 转换为秒
        if (timeDiff > 0) {
          rxSpeed = Math.max(0, (net.rx_bytes - lastStats.rx) / timeDiff);
          txSpeed = Math.max(0, (net.tx_bytes - lastStats.tx) / timeDiff);
        }
      }

      this.lastNetworkStats.set(iface, {
        rx: net.rx_bytes,
        tx: net.tx_bytes,
        timestamp
      });

      // 获取接口详细信息
      let ip4: string | undefined;
      let ip6: string | undefined;
      let mac: string | undefined;
      let speed: number | undefined;

      try {
        const ifaceData = await si.networkInterfaceDefault();
        if (iface === ifaceData) {
          const defaultIface = await si.networkInterfaces();
          const defaultInfo = defaultIface.find(i => i.iface === ifaceData);
          if (defaultInfo) {
            ip4 = defaultInfo.ip4;
            ip6 = defaultInfo.ip6;
            mac = defaultInfo.mac;
            speed = defaultInfo.speed ?? undefined;
          }
        }
      } catch {
        // 忽略错误
      }

      interfaces.push({
        name: iface,
        ip4,
        ip6,
        mac,
        speed,
        received: net.rx_bytes,
        transmitted: net.tx_bytes,
        receivedSpeed: rxSpeed,
        transmittedSpeed: txSpeed
      });

      totalReceived += net.rx_bytes;
      totalTransmitted += net.tx_bytes;
      receivedSpeed += rxSpeed;
      transmittedSpeed += txSpeed;
    }

    return {
      interfaces,
      totalReceived,
      totalTransmitted,
      receivedSpeed,
      transmittedSpeed
    };
  }

  // ==================== 指标查询 ====================

  /**
   * 获取最新指标
   */
  public getLatestMetrics(): PerformanceMetrics | null {
    return this.metricsHistory.length > 0
      ? this.metricsHistory[this.metricsHistory.length - 1]
      : null;
  }

  /**
   * 获取指标历史
   * @param limit 返回数量限制
   */
  public getMetricsHistory(limit?: number): PerformanceMetrics[] {
    if (limit && limit > 0) {
      return this.metricsHistory.slice(-limit);
    }
    return [...this.metricsHistory];
  }

  /**
   * 获取指定时间范围的指标
   */
  public getMetricsByTimeRange(startTime: number, endTime: number): PerformanceMetrics[] {
    return this.metricsHistory.filter(
      m => m.timestamp >= startTime && m.timestamp <= endTime
    );
  }

  /**
   * 获取系统信息
   */
  public async getSystemInfo(): Promise<{
    hostname: string;
    platform: string;
    distro: string;
    release: string;
    arch: string;
    uptime: number;
    cpuModel: string;
    cpuCores: number;
    totalMemory: number;
  }> {
    const [osInfo, time] = await Promise.all([
      si.osInfo(),
      si.time()
    ]);

    return {
      hostname: os.hostname(),
      platform: process.platform,
      distro: osInfo.distro,
      release: osInfo.release,
      arch: os.arch(),
      uptime: time.uptime,
      cpuModel: os.cpus()[0]?.model || 'Unknown',
      cpuCores: os.cpus().length,
      totalMemory: os.totalmem()
    };
  }

  // ==================== 进程管理 ====================

  /**
   * 获取进程列表
   * @param limit 返回数量限制
   */
  public async getProcessList(limit: number = 50): Promise<ProcessInfo[]> {
    try {
      const processes = await si.processes();

      return processes.list
        .sort((a: any, b: any) => b.cpu - a.cpu) // 按 CPU 使用率排序
        .slice(0, limit)
        .map((p: any) => ({
          pid: p.pid,
          name: p.name,
          command: p.command || p.name,
          cpu: Math.round(p.cpu * 100) / 100,
          memory: p.memRss,
          memoryPercent: Math.round(p.mem * 100) / 100,
          ppid: p.parentPid,
          uid: p.user,
          gid: p.user,
          started: p.started,
          state: p.state
        }));
    } catch (error) {
      console.error('[SystemMonitor] 获取进程列表失败:', error);
      throw error;
    }
  }

  /**
   * 根据 PID 获取进程详情
   */
  public async getProcessByPid(pid: number): Promise<ProcessInfo | null> {
    try {
      const processes = await si.processes();
      const process = processes.list.find(p => p.pid === pid);

      if (!process) {
        return null;
      }

      return {
        pid: process.pid,
        name: process.name,
        command: process.command || process.name,
        cpu: Math.round(process.cpu * 100) / 100,
        memory: process.memRss,
        memoryPercent: Math.round(process.mem * 100) / 100,
        ppid: (process as any).parentPid,
        uid: (process as any).user,
        gid: (process as any).user,
        started: process.started,
        state: process.state
      };
    } catch (error) {
      console.error('[SystemMonitor] 获取进程详情失败:', error);
      throw error;
    }
  }

  /**
   * 终止进程
   */
  public async killProcess(pid: number, signal: string = 'SIGTERM'): Promise<boolean> {
    try {
      process.kill(pid, signal as NodeJS.Signals);
      return true;
    } catch (error) {
      console.error(`[SystemMonitor] 终止进程 ${pid} 失败:`, error);
      return false;
    }
  }

  // ==================== 服务状态 ====================

  /**
   * 获取服务状态
   */
  public async getServiceStatus(): Promise<ServiceStatus[]> {
    const services: ServiceStatus[] = [];
    const timestamp = Date.now();

    // 检查常见服务
    const serviceChecks = [
      { name: 'MongoDB', port: 27017 },
      { name: 'Redis', port: 6379 },
      { name: 'Nginx', port: 80 },
      { name: 'SSH', port: 22 },
      { name: 'Node.js', port: parseInt(process.env.PORT || '3001') }
    ];

    for (const service of serviceChecks) {
      const status = await this.checkService(service.name, service.port);
      status.lastChecked = timestamp;
      services.push(status);
    }

    return services;
  }

  /**
   * 检查单个服务状态
   */
  private async checkService(name: string, port: number): Promise<ServiceStatus> {
    const net = await import('net');

    return new Promise((resolve) => {
      const socket = new net.Socket();
      let status: ServiceStatus = {
        name,
        status: 'unknown',
        port,
        lastChecked: Date.now()
      };

      socket.setTimeout(3000);

      socket.on('connect', () => {
        status.status = 'running';
        socket.destroy();
        resolve(status);
      });

      socket.on('timeout', () => {
        status.status = 'stopped';
        socket.destroy();
        resolve(status);
      });

      socket.on('error', () => {
        status.status = 'stopped';
        resolve(status);
      });

      socket.connect(port, 'localhost');
    });
  }

  // ==================== 告警管理 ====================

  /**
   * 检查告警
   */
  private checkAlerts(metrics: PerformanceMetrics): void {
    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      // 检查冷却时间
      if (rule.lastTriggered) {
        const cooldownMs = rule.cooldown * 1000;
        if (Date.now() - rule.lastTriggered < cooldownMs) {
          continue;
        }
      }

      let value: number;
      switch (rule.metric) {
        case 'cpu':
          value = metrics.cpu.usage;
          break;
        case 'memory':
          value = metrics.memory.usage;
          break;
        case 'disk':
          value = metrics.disk.usage;
          break;
        case 'load':
          value = metrics.load.avg1;
          break;
        case 'network':
          value = metrics.network.receivedSpeed;
          break;
        default:
          continue;
      }

      let triggered = false;
      switch (rule.condition) {
        case 'gt':
          triggered = value > rule.threshold;
          break;
        case 'lt':
          triggered = value < rule.threshold;
          break;
        case 'eq':
          triggered = value === rule.threshold;
          break;
      }

      if (triggered) {
        this.triggerAlert(rule, value);
      }
    }
  }

  /**
   * 触发告警
   */
  private triggerAlert(rule: AlertRule, value: number): void {
    rule.lastTriggered = Date.now();

    const alert: AlertInfo = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      level: rule.level,
      title: rule.name,
      message: `${rule.name}: 当前值 ${value.toFixed(2)}, 阈值 ${rule.threshold}`,
      metric: rule.metric,
      value,
      threshold: rule.threshold,
      timestamp: Date.now(),
      acknowledged: false
    };

    this.alerts.unshift(alert);

    // 限制告警数量
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100);
    }

    this.emit('alert', alert);
    console.warn(`[SystemMonitor] 告警触发: ${alert.title}`);
  }

  /**
   * 获取告警列表
   */
  public getAlerts(
    options: {
      level?: AlertLevel;
      acknowledged?: boolean;
      limit?: number;
    } = {}
  ): AlertInfo[] {
    let filtered = this.alerts;

    if (options.level) {
      filtered = filtered.filter(a => a.level === options.level);
    }

    if (options.acknowledged !== undefined) {
      filtered = filtered.filter(a => a.acknowledged === options.acknowledged);
    }

    if (options.limit && options.limit > 0) {
      filtered = filtered.slice(0, options.limit);
    }

    return filtered;
  }

  /**
   * 确认告警
   */
  public acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      this.emit('alertAcknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * 确认所有告警
   */
  public acknowledgeAllAlerts(): void {
    this.alerts.forEach(a => a.acknowledged = true);
    this.emit('allAlertsAcknowledged');
  }

  /**
   * 删除告警
   */
  public deleteAlert(alertId: string): boolean {
    const index = this.alerts.findIndex(a => a.id === alertId);
    if (index !== -1) {
      this.alerts.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 清除所有告警
   */
  public clearAlerts(): void {
    this.alerts = [];
    this.emit('alertsCleared');
  }

  /**
   * 获取告警规则
   */
  public getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * 添加告警规则
   */
  public addAlertRule(rule: Omit<AlertRule, 'id'>): AlertRule {
    const newRule: AlertRule = {
      ...rule,
      id: `rule-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };
    this.alertRules.push(newRule);
    return newRule;
  }

  /**
   * 更新告警规则
   */
  public updateAlertRule(id: string, updates: Partial<AlertRule>): AlertRule | null {
    const index = this.alertRules.findIndex(r => r.id === id);
    if (index === -1) {
      return null;
    }

    this.alertRules[index] = { ...this.alertRules[index], ...updates };
    return this.alertRules[index];
  }

  /**
   * 删除告警规则
   */
  public deleteAlertRule(id: string): boolean {
    const index = this.alertRules.findIndex(r => r.id === id);
    if (index !== -1) {
      this.alertRules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * 启用/禁用告警规则
   */
  public toggleAlertRule(id: string, enabled: boolean): boolean {
    const rule = this.alertRules.find(r => r.id === id);
    if (rule) {
      rule.enabled = enabled;
      return true;
    }
    return false;
  }
}

// 导出单例实例
export const systemMonitor = SystemMonitorService.getInstance();

export default systemMonitor;
