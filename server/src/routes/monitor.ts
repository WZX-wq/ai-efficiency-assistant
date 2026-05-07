import { Router, Response } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth';
import { IAuthRequest } from '../types';
import systemMonitor, {
  PerformanceMetrics,
  AlertInfo,
  AlertRule,
  AlertLevel,
  ProcessInfo,
  ServiceStatus
} from '../services/systemMonitor';

const router = Router();

// ==================== 工具函数 ====================

/**
 * 发送成功响应
 */
const sendSuccess = <T>(res: Response, data: T, message?: string) => {
  res.json({
    success: true,
    data,
    message
  });
};

/**
 * 发送错误响应
 */
const sendError = (res: Response, message: string, statusCode: number = 400) => {
  res.status(statusCode).json({
    success: false,
    error: message
  });
};

// ==================== 性能指标路由 ====================

/**
 * @swagger
 * /api/monitor/metrics:
 *   get:
 *     summary: 获取实时性能指标
 *     tags: [监控]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 系统性能指标数据
 */
router.get('/metrics', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const metrics = systemMonitor.getLatestMetrics();

    if (!metrics) {
      // 如果没有缓存的指标，立即收集一次
      const systemInfo = await systemMonitor.getSystemInfo();
      sendSuccess(res, {
        ...systemInfo,
        message: '监控服务正在初始化，请稍后刷新'
      });
      return;
    }

    sendSuccess(res, metrics);
  } catch (error) {
    console.error('获取性能指标失败:', error);
    sendError(res, '获取性能指标失败', 500);
  }
});

/**
 * @swagger
 * /api/monitor/metrics/history:
 *   get:
 *     summary: 获取指标历史
 *     tags: [监控]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 100
 *     responses:
 *       200:
 *         description: 指标历史数据
 */
router.get('/metrics/history', authenticate, (req: IAuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const history = systemMonitor.getMetricsHistory(limit);

    sendSuccess(res, {
      data: history,
      count: history.length
    });
  } catch (error) {
    console.error('获取指标历史失败:', error);
    sendError(res, '获取指标历史失败', 500);
  }
});

/**
 * @swagger
 * /api/monitor/metrics/range:
 *   get:
 *     summary: 获取指定时间范围的指标
 *     tags: [监控]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: start
 *         required: true
 *         schema:
 *           type: integer
 *       - in: query
 *         name: end
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 指标范围数据
 */
router.get('/metrics/range', authenticate, (req: IAuthRequest, res: Response) => {
  try {
    const startTime = parseInt(req.query.start as string);
    const endTime = parseInt(req.query.end as string);

    if (isNaN(startTime) || isNaN(endTime)) {
      sendError(res, '请提供有效的开始和结束时间戳');
      return;
    }

    const metrics = systemMonitor.getMetricsByTimeRange(startTime, endTime);

    sendSuccess(res, {
      data: metrics,
      count: metrics.length,
      startTime,
      endTime
    });
  } catch (error) {
    console.error('获取指标范围失败:', error);
    sendError(res, '获取指标范围失败', 500);
  }
});

/**
 * @swagger
 * /api/monitor/system:
 *   get:
 *     summary: 获取系统信息
 *     tags: [监控]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 系统信息
 */
router.get('/system', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const systemInfo = await systemMonitor.getSystemInfo();
    sendSuccess(res, systemInfo);
  } catch (error) {
    console.error('获取系统信息失败:', error);
    sendError(res, '获取系统信息失败', 500);
  }
});

// ==================== 进程管理路由 ====================

/**
 * @swagger
 * /api/monitor/processes:
 *   get:
 *     summary: 获取进程列表
 *     tags: [监控]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *     responses:
 *       200:
 *         description: 进程列表
 */
router.get('/processes', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const processes = await systemMonitor.getProcessList(limit);

    sendSuccess(res, {
      data: processes,
      count: processes.length
    });
  } catch (error) {
    console.error('获取进程列表失败:', error);
    sendError(res, '获取进程列表失败', 500);
  }
});

/**
 * @swagger
 * /api/monitor/processes/{pid}:
 *   get:
 *     summary: 获取进程详情
 *     tags: [监控]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pid
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: 进程详情
 *       404:
 *         description: 进程不存在
 */
router.get('/processes/:pid', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const pid = parseInt(req.params.pid as string);

    if (isNaN(pid)) {
      sendError(res, '无效的进程 ID');
      return;
    }

    const process = await systemMonitor.getProcessByPid(pid);

    if (!process) {
      sendError(res, '进程不存在', 404);
      return;
    }

    sendSuccess(res, process);
  } catch (error) {
    console.error('获取进程详情失败:', error);
    sendError(res, '获取进程详情失败', 500);
  }
});

/**
 * @swagger
 * /api/monitor/processes/{pid}/kill:
 *   post:
 *     summary: 终止进程（仅管理员）
 *     tags: [监控]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: pid
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               signal:
 *                 type: string
 *                 default: SIGTERM
 *     responses:
 *       200:
 *         description: 进程已终止
 */
router.post('/processes/:pid/kill', authenticate, requireAdmin, async (req: IAuthRequest, res: Response) => {
  try {
    const pid = parseInt(req.params.pid as string);
    const { signal = 'SIGTERM' } = req.body;

    if (isNaN(pid)) {
      sendError(res, '无效的进程 ID');
      return;
    }

    // 防止终止自己和关键系统进程
    if (pid === process.pid) {
      sendError(res, '不能终止当前服务进程');
      return;
    }

    if (pid <= 1) {
      sendError(res, '不能终止系统关键进程');
      return;
    }

    const success = await systemMonitor.killProcess(pid, signal);

    if (success) {
      sendSuccess(res, { pid, signal }, '进程已终止');
    } else {
      sendError(res, '终止进程失败', 500);
    }
  } catch (error) {
    console.error('终止进程失败:', error);
    sendError(res, '终止进程失败', 500);
  }
});

// ==================== 服务状态路由 ====================

/**
 * @swagger
 * /api/monitor/services:
 *   get:
 *     summary: 获取服务状态
 *     tags: [监控]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 服务状态列表
 */
router.get('/services', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const services = await systemMonitor.getServiceStatus();

    sendSuccess(res, {
      data: services,
      count: services.length,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取服务状态失败:', error);
    sendError(res, '获取服务状态失败', 500);
  }
});

// ==================== 告警管理路由 ====================

/**
 * @swagger
 * /api/monitor/alerts:
 *   get:
 *     summary: 获取告警列表
 *     tags: [监控]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: level
 *         schema:
 *           type: string
 *           enum: [info, warning, critical]
 *       - in: query
 *         name: acknowledged
 *         schema:
 *           type: boolean
 *     responses:
 *       200:
 *         description: 告警列表
 */
router.get('/alerts', authenticate, (req: IAuthRequest, res: Response) => {
  try {
    const options: { level?: AlertLevel; acknowledged?: boolean; limit?: number } = {};

    if (req.query.level) {
      options.level = req.query.level as AlertLevel;
    }

    if (req.query.acknowledged !== undefined) {
      options.acknowledged = req.query.acknowledged === 'true';
    }

    if (req.query.limit) {
      options.limit = parseInt(req.query.limit as string);
    }

    const alerts = systemMonitor.getAlerts(options);

    sendSuccess(res, {
      data: alerts,
      count: alerts.length,
      unacknowledged: alerts.filter(a => !a.acknowledged).length
    });
  } catch (error) {
    console.error('获取告警列表失败:', error);
    sendError(res, '获取告警列表失败', 500);
  }
});

/**
 * @swagger
 * /api/monitor/alerts/{alertId}/acknowledge:
 *   post:
 *     summary: 确认告警
 *     tags: [监控]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 告警已确认
 */
router.post('/alerts/:alertId/acknowledge', authenticate, (req: IAuthRequest, res: Response) => {
  try {
    const { alertId } = req.params;
    const success = systemMonitor.acknowledgeAlert(alertId as string);

    if (success) {
      sendSuccess(res, { alertId }, '告警已确认');
    } else {
      sendError(res, '告警不存在', 404);
    }
  } catch (error) {
    console.error('确认告警失败:', error);
    sendError(res, '确认告警失败', 500);
  }
});

/**
 * @swagger
 * /api/monitor/alerts/acknowledge-all:
 *   post:
 *     summary: 确认所有告警
 *     tags: [监控]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 所有告警已确认
 */
router.post('/alerts/acknowledge-all', authenticate, (req: IAuthRequest, res: Response) => {
  try {
    systemMonitor.acknowledgeAllAlerts();
    sendSuccess(res, null, '所有告警已确认');
  } catch (error) {
    console.error('确认所有告警失败:', error);
    sendError(res, '确认所有告警失败', 500);
  }
});

/**
 * @swagger
 * /api/monitor/alerts/{alertId}:
 *   delete:
 *     summary: 删除告警（仅管理员）
 *     tags: [监控]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: alertId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 告警已删除
 */
router.delete('/alerts/:alertId', authenticate, requireAdmin, (req: IAuthRequest, res: Response) => {
  try {
    const { alertId } = req.params;
    const success = systemMonitor.deleteAlert(alertId as string);

    if (success) {
      sendSuccess(res, { alertId }, '告警已删除');
    } else {
      sendError(res, '告警不存在', 404);
    }
  } catch (error) {
    console.error('删除告警失败:', error);
    sendError(res, '删除告警失败', 500);
  }
});

/**
 * @swagger
 * /api/monitor/alerts:
 *   delete:
 *     summary: 清除所有告警（仅管理员）
 *     tags: [监控]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 所有告警已清除
 */
router.delete('/alerts', authenticate, requireAdmin, (req: IAuthRequest, res: Response) => {
  try {
    systemMonitor.clearAlerts();
    sendSuccess(res, null, '所有告警已清除');
  } catch (error) {
    console.error('清除告警失败:', error);
    sendError(res, '清除告警失败', 500);
  }
});

// ==================== 告警规则路由 ====================

/**
 * @swagger
 * /api/monitor/alert-rules:
 *   get:
 *     summary: 获取告警规则
 *     tags: [监控]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 告警规则列表
 *   post:
 *     summary: 添加告警规则（仅管理员）
 *     tags: [监控]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, metric, condition, threshold, level]
 *             properties:
 *               name:
 *                 type: string
 *               metric:
 *                 type: string
 *                 enum: [cpu, memory, disk, network, load]
 *               condition:
 *                 type: string
 *                 enum: [gt, lt, eq]
 *               threshold:
 *                 type: number
 *               level:
 *                 type: string
 *                 enum: [info, warning, critical]
 *     responses:
 *       200:
 *         description: 告警规则已添加
 */
router.get('/alert-rules', authenticate, (req: IAuthRequest, res: Response) => {
  try {
    const rules = systemMonitor.getAlertRules();
    sendSuccess(res, {
      data: rules,
      count: rules.length
    });
  } catch (error) {
    console.error('获取告警规则失败:', error);
    sendError(res, '获取告警规则失败', 500);
  }
});

/**
 * @swagger
 * /api/monitor/alert-rules:
 *   post:
 *     summary: 添加告警规则（仅管理员）
 *     tags: [监控]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, metric, condition, threshold, level]
 *             properties:
 *               name:
 *                 type: string
 *               metric:
 *                 type: string
 *               condition:
 *                 type: string
 *               threshold:
 *                 type: number
 *               level:
 *                 type: string
 *     responses:
 *       200:
 *         description: 告警规则已添加
 */
router.post('/alert-rules', authenticate, requireAdmin, (req: IAuthRequest, res: Response) => {
  try {
    const { name, metric, condition, threshold, level, enabled, cooldown } = req.body;

    // 验证必填字段
    if (!name || !metric || !condition || threshold === undefined || !level) {
      sendError(res, '请提供完整的告警规则信息');
      return;
    }

    // 验证条件
    if (!['gt', 'lt', 'eq'].includes(condition)) {
      sendError(res, '无效的条件类型');
      return;
    }

    // 验证级别
    if (!['info', 'warning', 'critical'].includes(level)) {
      sendError(res, '无效的告警级别');
      return;
    }

    // 验证指标
    if (!['cpu', 'memory', 'disk', 'network', 'load'].includes(metric)) {
      sendError(res, '无效的监控指标');
      return;
    }

    const rule = systemMonitor.addAlertRule({
      name,
      metric,
      condition,
      threshold: parseFloat(threshold),
      level,
      enabled: enabled !== false,
      cooldown: parseInt(cooldown) || 300
    });

    sendSuccess(res, rule, '告警规则已添加');
  } catch (error) {
    console.error('添加告警规则失败:', error);
    sendError(res, '添加告警规则失败', 500);
  }
});

/**
 * 更新告警规则（仅管理员）
 * PUT /api/monitor/alert-rules/:ruleId
 */
router.put('/alert-rules/:ruleId', authenticate, requireAdmin, (req: IAuthRequest, res: Response) => {
  try {
    const { ruleId } = req.params;
    const updates = req.body;

    const rule = systemMonitor.updateAlertRule(ruleId as string, updates);

    if (rule) {
      sendSuccess(res, rule, '告警规则已更新');
    } else {
      sendError(res, '告警规则不存在', 404);
    }
  } catch (error) {
    console.error('更新告警规则失败:', error);
    sendError(res, '更新告警规则失败', 500);
  }
});

/**
 * 删除告警规则（仅管理员）
 * DELETE /api/monitor/alert-rules/:ruleId
 */
router.delete('/alert-rules/:ruleId', authenticate, requireAdmin, (req: IAuthRequest, res: Response) => {
  try {
    const { ruleId } = req.params;
    const success = systemMonitor.deleteAlertRule(ruleId as string);

    if (success) {
      sendSuccess(res, { ruleId }, '告警规则已删除');
    } else {
      sendError(res, '告警规则不存在', 404);
    }
  } catch (error) {
    console.error('删除告警规则失败:', error);
    sendError(res, '删除告警规则失败', 500);
  }
});

/**
 * 启用/禁用告警规则（仅管理员）
 * PATCH /api/monitor/alert-rules/:ruleId/toggle
 */
router.patch('/alert-rules/:ruleId/toggle', authenticate, requireAdmin, (req: IAuthRequest, res: Response) => {
  try {
    const { ruleId } = req.params;
    const { enabled } = req.body;

    if (enabled === undefined) {
      sendError(res, '请提供 enabled 参数');
      return;
    }

    const success = systemMonitor.toggleAlertRule(ruleId as string, enabled);

    if (success) {
      sendSuccess(res, { ruleId, enabled }, `告警规则已${enabled ? '启用' : '禁用'}`);
    } else {
      sendError(res, '告警规则不存在', 404);
    }
  } catch (error) {
    console.error('切换告警规则状态失败:', error);
    sendError(res, '切换告警规则状态失败', 500);
  }
});

// ==================== 监控控制路由 ====================

/**
 * @swagger
 * /api/monitor/status:
 *   get:
 *     summary: 获取监控状态
 *     tags: [监控]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 监控服务状态
 */
router.get('/status', authenticate, (req: IAuthRequest, res: Response) => {
  try {
    const status = systemMonitor.getMonitoringStatus();
    sendSuccess(res, status);
  } catch (error) {
    console.error('获取监控状态失败:', error);
    sendError(res, '获取监控状态失败', 500);
  }
});

/**
 * 启动监控（仅管理员）
 * POST /api/monitor/start
 */
router.post('/start', authenticate, requireAdmin, (req: IAuthRequest, res: Response) => {
  try {
    const { interval = 5000 } = req.body;

    if (systemMonitor.getMonitoringStatus().isMonitoring) {
      sendError(res, '监控已在运行');
      return;
    }

    systemMonitor.startMonitoring(interval);
    sendSuccess(res, { interval }, '监控已启动');
  } catch (error) {
    console.error('启动监控失败:', error);
    sendError(res, '启动监控失败', 500);
  }
});

/**
 * 停止监控（仅管理员）
 * POST /api/monitor/stop
 */
router.post('/stop', authenticate, requireAdmin, (req: IAuthRequest, res: Response) => {
  try {
    if (!systemMonitor.getMonitoringStatus().isMonitoring) {
      sendError(res, '监控未运行');
      return;
    }

    systemMonitor.stopMonitoring();
    sendSuccess(res, null, '监控已停止');
  } catch (error) {
    console.error('停止监控失败:', error);
    sendError(res, '停止监控失败', 500);
  }
});

// ==================== 仪表盘数据路由 ====================

/**
 * @swagger
 * /api/monitor/dashboard:
 *   get:
 *     summary: 获取仪表盘数据
 *     description: 聚合多个监控指标返回仪表盘数据
 *     tags: [监控]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 仪表盘聚合数据
 */
router.get('/dashboard', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const [metrics, services, alerts, systemInfo] = await Promise.all([
      Promise.resolve(systemMonitor.getLatestMetrics()),
      systemMonitor.getServiceStatus(),
      Promise.resolve(systemMonitor.getAlerts({ acknowledged: false, limit: 10 })),
      systemMonitor.getSystemInfo()
    ]);

    sendSuccess(res, {
      metrics,
      services,
      alerts: {
        data: alerts,
        unacknowledged: alerts.length
      },
      system: systemInfo,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取仪表盘数据失败:', error);
    sendError(res, '获取仪表盘数据失败', 500);
  }
});

export default router;
