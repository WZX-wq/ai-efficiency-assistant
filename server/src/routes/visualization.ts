import { Router, Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, requireAdmin } from '../middleware/auth';
import { IAuthRequest } from '../types';
import Dashboard, {
  ChartConfig,
  ChartType,
  DataSourceType,
  TimeRange,
  RefreshInterval,
  SystemMetricConfig
} from '../models/Dashboard';
import systemMonitor from '../services/systemMonitor';

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

/**
 * 解析时间范围为毫秒时间戳
 */
const parseTimeRange = (timeRange: TimeRange, customRange?: { start: Date; end: Date }): { start: number; end: number } => {
  const now = Date.now();
  const end = now;
  let start = now;

  switch (timeRange) {
    case 'last5m':
      start = now - 5 * 60 * 1000;
      break;
    case 'last15m':
      start = now - 15 * 60 * 1000;
      break;
    case 'last30m':
      start = now - 30 * 60 * 1000;
      break;
    case 'last1h':
      start = now - 60 * 60 * 1000;
      break;
    case 'last3h':
      start = now - 3 * 60 * 60 * 1000;
      break;
    case 'last6h':
      start = now - 6 * 60 * 60 * 1000;
      break;
    case 'last12h':
      start = now - 12 * 60 * 60 * 1000;
      break;
    case 'last24h':
      start = now - 24 * 60 * 60 * 1000;
      break;
    case 'last7d':
      start = now - 7 * 24 * 60 * 60 * 1000;
      break;
    case 'last30d':
      start = now - 30 * 24 * 60 * 60 * 1000;
      break;
    case 'custom':
      if (customRange) {
        return {
          start: new Date(customRange.start).getTime(),
          end: new Date(customRange.end).getTime()
        };
      }
      start = now - 60 * 60 * 1000;
      break;
  }

  return { start, end };
};

/**
 * 获取系统监控数据
 */
const getSystemMetricData = async (config: SystemMetricConfig, timeRange: { start: number; end: number }) => {
  const { category, metric, aggregation = 'latest' } = config;

  // 获取历史数据
  const history = systemMonitor.getMetricsByTimeRange(timeRange.start, timeRange.end);

  if (history.length === 0) {
    return [];
  }

  // 根据类别和指标提取数据
  const extractValue = (m: any): number => {
    switch (category) {
      case 'cpu':
        return metric === 'temperature' ? (m.cpu.temperature || 0) : m.cpu[metric as keyof typeof m.cpu] as number || 0;
      case 'memory':
        return m.memory[metric as keyof typeof m.memory] as number || 0;
      case 'disk':
        return m.disk[metric as keyof typeof m.disk] as number || 0;
      case 'network':
        if (metric === 'receivedSpeed') return m.network.receivedSpeed;
        if (metric === 'transmittedSpeed') return m.network.transmittedSpeed;
        return m.network[metric as keyof typeof m.network] as number || 0;
      case 'load':
        return m.load[metric as keyof typeof m.load] as number || 0;
      default:
        return 0;
    }
  };

  // 根据聚合方式处理数据
  switch (aggregation) {
    case 'avg':
      const avg = history.reduce((sum, m) => sum + extractValue(m), 0) / history.length;
      return [{ timestamp: timeRange.end, value: avg }];
    case 'sum':
      const sum = history.reduce((acc, m) => acc + extractValue(m), 0);
      return [{ timestamp: timeRange.end, value: sum }];
    case 'min':
      const min = Math.min(...history.map(m => extractValue(m)));
      return [{ timestamp: timeRange.end, value: min }];
    case 'max':
      const max = Math.max(...history.map(m => extractValue(m)));
      return [{ timestamp: timeRange.end, value: max }];
    case 'count':
      return [{ timestamp: timeRange.end, value: history.length }];
    case 'latest':
    default:
      return history.map(m => ({
        timestamp: m.timestamp,
        value: extractValue(m)
      }));
  }
};

// ==================== 仪表盘 CRUD 路由 ====================

/**
 * @swagger
 * /api/visualization/dashboards:
 *   get:
 *     summary: 获取仪表盘列表
 *     tags: [数据可视化]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 仪表盘列表
 */
router.get('/dashboards', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const userId = req.user!._id.toString();
    const dashboards = await Dashboard.findByUser(userId);

    sendSuccess(res, {
      data: dashboards,
      count: dashboards.length
    });
  } catch (error) {
    console.error('获取仪表盘列表失败:', error);
    sendError(res, '获取仪表盘列表失败', 500);
  }
});

/**
 * @swagger
 * /api/visualization/dashboards/public:
 *   get:
 *     summary: 获取公开仪表盘
 *     tags: [数据可视化]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 公开仪表盘列表
 */
router.get('/dashboards/public', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const dashboards = await Dashboard.findPublic();

    sendSuccess(res, {
      data: dashboards,
      count: dashboards.length
    });
  } catch (error) {
    console.error('获取公开仪表盘失败:', error);
    sendError(res, '获取公开仪表盘失败', 500);
  }
});

/**
 * @swagger
 * /api/visualization/dashboards/{id}:
 *   get:
 *     summary: 获取单个仪表盘
 *     tags: [数据可视化]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 仪表盘详情
 */
router.get('/dashboards/:id', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      sendError(res, '无效的仪表盘 ID');
      return;
    }

    const dashboard = await Dashboard.findById(id as string);

    if (!dashboard) {
      sendError(res, '仪表盘不存在', 404);
      return;
    }

    // 检查权限（非公开且非创建者）
    const userId = req.user!._id.toString();
    if (!dashboard.isPublic && dashboard.createdBy.toString() !== userId) {
      sendError(res, '无权访问此仪表盘', 403);
      return;
    }

    sendSuccess(res, dashboard);
  } catch (error) {
    console.error('获取仪表盘失败:', error);
    sendError(res, '获取仪表盘失败', 500);
  }
});

/**
 * @swagger
 * /api/visualization/dashboards:
 *   post:
 *     summary: 创建仪表盘
 *     tags: [数据可视化]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               layout:
 *                 type: string
 *               theme:
 *                 type: string
 *               isPublic:
 *                 type: boolean
 *     responses:
 *       201:
 *         description: 仪表盘创建成功
 */
router.post('/dashboards', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const {
      name,
      description,
      layout = 'grid',
      theme = 'auto',
      refreshInterval = 'off',
      isPublic = false,
      isDefault = false,
      tags = [],
      charts = []
    } = req.body;

    // 验证必填字段
    if (!name) {
      sendError(res, '仪表盘名称是必填项');
      return;
    }

    // 如果设为默认，取消其他默认仪表盘
    if (isDefault) {
      await Dashboard.updateMany(
        { createdBy: req.user!._id, isDefault: true },
        { isDefault: false }
      );
    }

    const dashboard = new Dashboard({
      name,
      description,
      layout,
      theme,
      refreshInterval,
      isPublic,
      isDefault,
      tags,
      charts,
      createdBy: req.user!._id
    });

    await dashboard.save();

    sendSuccess(res, dashboard, '仪表盘创建成功');
  } catch (error) {
    console.error('创建仪表盘失败:', error);
    sendError(res, '创建仪表盘失败', 500);
  }
});

/**
 * @swagger
 * /api/visualization/dashboards/{id}:
 *   put:
 *     summary: 更新仪表盘
 *     tags: [数据可视化]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 更新成功
 */
router.put('/dashboards/:id', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      sendError(res, '无效的仪表盘 ID');
      return;
    }

    const dashboard = await Dashboard.findById(id as string);

    if (!dashboard) {
      sendError(res, '仪表盘不存在', 404);
      return;
    }

    // 检查权限
    const userId = req.user!._id.toString();
    if (dashboard.createdBy.toString() !== userId && req.user!.role !== 'admin') {
      sendError(res, '无权修改此仪表盘', 403);
      return;
    }

    const updates = req.body;

    // 如果设为默认，取消其他默认仪表盘
    if (updates.isDefault && !dashboard.isDefault) {
      await Dashboard.updateMany(
        { createdBy: req.user!._id, isDefault: true },
        { isDefault: false }
      );
    }

    // 更新允许修改的字段
    const allowedFields = ['name', 'description', 'layout', 'theme', 'refreshInterval', 'isPublic', 'isDefault', 'tags'];
    allowedFields.forEach(field => {
      if (updates[field] !== undefined) {
        (dashboard as any)[field] = updates[field];
      }
    });

    await dashboard.save();

    sendSuccess(res, dashboard, '仪表盘更新成功');
  } catch (error) {
    console.error('更新仪表盘失败:', error);
    sendError(res, '更新仪表盘失败', 500);
  }
});

/**
 * @swagger
 * /api/visualization/dashboards/{id}:
 *   delete:
 *     summary: 删除仪表盘
 *     tags: [数据可视化]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 删除成功
 */
router.delete('/dashboards/:id', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      sendError(res, '无效的仪表盘 ID');
      return;
    }

    const dashboard = await Dashboard.findById(id as string);

    if (!dashboard) {
      sendError(res, '仪表盘不存在', 404);
      return;
    }

    // 检查权限
    const userId = req.user!._id.toString();
    if (dashboard.createdBy.toString() !== userId && req.user!.role !== 'admin') {
      sendError(res, '无权删除此仪表盘', 403);
      return;
    }

    await Dashboard.findByIdAndDelete(id as string);

    sendSuccess(res, { id }, '仪表盘已删除');
  } catch (error) {
    console.error('删除仪表盘失败:', error);
    sendError(res, '删除仪表盘失败', 500);
  }
});

/**
 * @swagger
 * /api/visualization/dashboards/{id}/clone:
 *   post:
 *     summary: 复制仪表盘
 *     tags: [数据可视化]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 复制成功
 */
router.post('/dashboards/:id/clone', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name: newName } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      sendError(res, '无效的仪表盘 ID');
      return;
    }

    const dashboard = await Dashboard.findById(id as string);

    if (!dashboard) {
      sendError(res, '仪表盘不存在', 404);
      return;
    }

    // 检查权限
    const userId = req.user!._id.toString();
    if (!dashboard.isPublic && dashboard.createdBy.toString() !== userId) {
      sendError(res, '无权复制此仪表盘', 403);
      return;
    }

    const clonedDashboard = new Dashboard({
      name: newName || `${dashboard.name} (复制)`,
      description: dashboard.description,
      layout: dashboard.layout,
      theme: dashboard.theme,
      refreshInterval: dashboard.refreshInterval,
      isPublic: false,
      isDefault: false,
      tags: dashboard.tags,
      charts: dashboard.charts,
      createdBy: req.user!._id
    });

    await clonedDashboard.save();

    sendSuccess(res, clonedDashboard, '仪表盘复制成功');
  } catch (error) {
    console.error('复制仪表盘失败:', error);
    sendError(res, '复制仪表盘失败', 500);
  }
});

// ==================== 图表管理路由 ====================

/**
 * @swagger
 * /api/visualization/dashboards/{id}/charts:
 *   post:
 *     summary: 添加图表
 *     tags: [数据可视化]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 图表添加成功
 */
router.post('/dashboards/:id/charts', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      sendError(res, '无效的仪表盘 ID');
      return;
    }

    const dashboard = await Dashboard.findById(id as string);

    if (!dashboard) {
      sendError(res, '仪表盘不存在', 404);
      return;
    }

    // 检查权限
    const userId = req.user!._id.toString();
    if (dashboard.createdBy.toString() !== userId && req.user!.role !== 'admin') {
      sendError(res, '无权修改此仪表盘', 403);
      return;
    }

    const chartConfig: ChartConfig = req.body;

    // 验证图表配置
    if (!chartConfig.title || !chartConfig.type || !chartConfig.dataSource) {
      sendError(res, '图表标题、类型和数据源是必填项');
      return;
    }

    const newChart = (dashboard as any).addChart(chartConfig);
    await dashboard.save();

    sendSuccess(res, newChart, '图表添加成功');
  } catch (error) {
    console.error('添加图表失败:', error);
    sendError(res, '添加图表失败', 500);
  }
});

/**
 * @swagger
 * /api/visualization/dashboards/{id}/charts/{chartIndex}:
 *   put:
 *     summary: 更新图表
 *     tags: [数据可视化]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 图表更新成功
 */
router.put('/dashboards/:id/charts/:chartIndex', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const { id, chartIndex } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      sendError(res, '无效的仪表盘 ID');
      return;
    }

    const index = parseInt(chartIndex as string);
    if (isNaN(index)) {
      sendError(res, '无效的图表索引');
      return;
    }

    const dashboard = await Dashboard.findById(id as string);

    if (!dashboard) {
      sendError(res, '仪表盘不存在', 404);
      return;
    }

    // 检查权限
    const userId = req.user!._id.toString();
    if (dashboard.createdBy.toString() !== userId && req.user!.role !== 'admin') {
      sendError(res, '无权修改此仪表盘', 403);
      return;
    }

    const updatedChart = (dashboard as any).updateChart(index, req.body);

    if (!updatedChart) {
      sendError(res, '图表不存在', 404);
      return;
    }

    await dashboard.save();

    sendSuccess(res, updatedChart, '图表更新成功');
  } catch (error) {
    console.error('更新图表失败:', error);
    sendError(res, '更新图表失败', 500);
  }
});

/**
 * @swagger
 * /api/visualization/dashboards/{id}/charts/{chartIndex}:
 *   delete:
 *     summary: 删除图表
 *     tags: [数据可视化]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 图表已删除
 */
router.delete('/dashboards/:id/charts/:chartIndex', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const { id, chartIndex } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      sendError(res, '无效的仪表盘 ID');
      return;
    }

    const index = parseInt(chartIndex as string);
    if (isNaN(index)) {
      sendError(res, '无效的图表索引');
      return;
    }

    const dashboard = await Dashboard.findById(id as string);

    if (!dashboard) {
      sendError(res, '仪表盘不存在', 404);
      return;
    }

    // 检查权限
    const userId = req.user!._id.toString();
    if (dashboard.createdBy.toString() !== userId && req.user!.role !== 'admin') {
      sendError(res, '无权修改此仪表盘', 403);
      return;
    }

    const success = (dashboard as any).removeChart(index);

    if (!success) {
      sendError(res, '图表不存在', 404);
      return;
    }

    await dashboard.save();

    sendSuccess(res, null, '图表已删除');
  } catch (error) {
    console.error('删除图表失败:', error);
    sendError(res, '删除图表失败', 500);
  }
});

/**
 * @swagger
 * /api/visualization/dashboards/{id}/charts/reorder:
 *   put:
 *     summary: 重新排序图表
 *     tags: [数据可视化]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 排序更新成功
 */
router.put('/dashboards/:id/charts/reorder', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { order } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      sendError(res, '无效的仪表盘 ID');
      return;
    }

    if (!Array.isArray(order)) {
      sendError(res, '请提供新的排序数组');
      return;
    }

    const dashboard = await Dashboard.findById(id as string);

    if (!dashboard) {
      sendError(res, '仪表盘不存在', 404);
      return;
    }

    // 检查权限
    const userId = req.user!._id.toString();
    if (dashboard.createdBy.toString() !== userId && req.user!.role !== 'admin') {
      sendError(res, '无权修改此仪表盘', 403);
      return;
    }

    (dashboard as any).reorderCharts(order);
    await dashboard.save();

    sendSuccess(res, dashboard.charts, '图表顺序已更新');
  } catch (error) {
    console.error('重新排序图表失败:', error);
    sendError(res, error instanceof Error ? error.message : '重新排序图表失败', 500);
  }
});

// ==================== 图表数据查询路由 ====================

/**
 * @swagger
 * /api/visualization/dashboards/{id}/charts/{chartIndex}/data:
 *   get:
 *     summary: 获取图表数据
 *     tags: [数据可视化]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 图表数据
 */
router.get('/dashboards/:id/charts/:chartIndex/data', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const { id, chartIndex } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      sendError(res, '无效的仪表盘 ID');
      return;
    }

    const index = parseInt(chartIndex as string);
    if (isNaN(index)) {
      sendError(res, '无效的图表索引');
      return;
    }

    const dashboard = await Dashboard.findById(id as string);

    if (!dashboard) {
      sendError(res, '仪表盘不存在', 404);
      return;
    }

    // 检查权限
    const userId = req.user!._id.toString();
    if (!dashboard.isPublic && dashboard.createdBy.toString() !== userId) {
      sendError(res, '无权访问此仪表盘', 403);
      return;
    }

    const chart = dashboard.charts[index];

    if (!chart) {
      sendError(res, '图表不存在', 404);
      return;
    }

    // 解析时间范围
    const timeRange = parseTimeRange(
      (req.query.timeRange as TimeRange) || chart.timeRange || 'last1h',
      chart.customTimeRange
    );

    // 根据数据源类型获取数据
    let data: any;

    switch (chart.dataSource.type) {
      case 'system':
        if (chart.dataSource.systemMetric) {
          data = await getSystemMetricData(chart.dataSource.systemMetric, timeRange);
        } else {
          data = [];
        }
        break;

      case 'api':
        // API 数据源需要前端直接调用
        data = {
          type: 'api',
          config: chart.dataSource.apiConfig,
          message: '请使用配置中的 API 地址获取数据'
        };
        break;

      case 'database':
        // 数据库数据源需要后端执行查询
        data = {
          type: 'database',
          config: chart.dataSource.databaseConfig,
          message: '数据库查询需要在服务端实现'
        };
        break;

      case 'websocket':
        // WebSocket 数据源需要前端连接
        data = {
          type: 'websocket',
          config: chart.dataSource.websocketConfig,
          message: '请使用配置中的 WebSocket 地址获取实时数据'
        };
        break;

      case 'static':
        data = chart.dataSource.staticData || [];
        break;

      default:
        data = [];
    }

    sendSuccess(res, {
      chart: {
        title: chart.title,
        type: chart.type,
        options: chart.options
      },
      data,
      timeRange,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('获取图表数据失败:', error);
    sendError(res, '获取图表数据失败', 500);
  }
});

/**
 * @swagger
 * /api/visualization/dashboards/{id}/data:
 *   get:
 *     summary: 批量获取仪表盘所有图表数据
 *     tags: [数据可视化]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 所有图表数据
 */
router.get('/dashboards/:id/data', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id as string)) {
      sendError(res, '无效的仪表盘 ID');
      return;
    }

    const dashboard = await Dashboard.findById(id as string);

    if (!dashboard) {
      sendError(res, '仪表盘不存在', 404);
      return;
    }

    // 检查权限
    const userId = req.user!._id.toString();
    if (!dashboard.isPublic && dashboard.createdBy.toString() !== userId) {
      sendError(res, '无权访问此仪表盘', 403);
      return;
    }

    // 解析时间范围
    const timeRange = parseTimeRange(
      (req.query.timeRange as TimeRange) || (dashboard.refreshInterval as TimeRange) || 'last1h'
    );

    // 获取所有图表数据
    const chartDataPromises = dashboard.charts.map(async (chart, index) => {
      let data: any;

      switch (chart.dataSource.type) {
        case 'system':
          if (chart.dataSource.systemMetric) {
            data = await getSystemMetricData(chart.dataSource.systemMetric, timeRange);
          } else {
            data = [];
          }
          break;
        case 'static':
          data = chart.dataSource.staticData || [];
          break;
        default:
          data = { type: chart.dataSource.type, message: '此数据源类型需要特殊处理' };
      }

      return {
        index,
        title: chart.title,
        type: chart.type,
        data
      };
    });

    const chartsData = await Promise.all(chartDataPromises);

    sendSuccess(res, {
      dashboard: {
        id: dashboard._id,
        name: dashboard.name,
        theme: dashboard.theme,
        layout: dashboard.layout
      },
      charts: chartsData,
      timeRange,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('批量获取图表数据失败:', error);
    sendError(res, '批量获取图表数据失败', 500);
  }
});

// ==================== 数据源配置路由 ====================

/**
 * @swagger
 * /api/visualization/chart-types:
 *   get:
 *     summary: 获取支持的图表类型
 *     tags: [数据可视化]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 图表类型列表
 */
router.get('/chart-types', authenticate, (req: IAuthRequest, res: Response) => {
  const chartTypes = [
    { type: 'line', name: '折线图', description: '适合显示随时间变化的趋势' },
    { type: 'bar', name: '柱状图', description: '适合比较不同类别的数据' },
    { type: 'pie', name: '饼图', description: '适合显示各部分占整体的比例' },
    { type: 'doughnut', name: '环形图', description: '类似饼图，中心可显示总计' },
    { type: 'area', name: '面积图', description: '折线图下方填充颜色，强调数量' },
    { type: 'scatter', name: '散点图', description: '适合显示两个变量之间的关系' },
    { type: 'radar', name: '雷达图', description: '适合比较多维度的数据' },
    { type: 'gauge', name: '仪表盘', description: '适合显示单一指标的当前值' },
    { type: 'table', name: '表格', description: '以表格形式展示详细数据' },
    { type: 'metric', name: '单指标', description: '显示单个数值指标' }
  ];

  sendSuccess(res, chartTypes);
});

/**
 * @swagger
 * /api/visualization/data-source-types:
 *   get:
 *     summary: 获取支持的数据源类型
 *     tags: [数据可视化]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 数据源类型列表
 */
router.get('/data-source-types', authenticate, (req: IAuthRequest, res: Response) => {
  const dataSourceTypes = [
    {
      type: 'system',
      name: '系统监控',
      description: '从系统监控服务获取 CPU、内存、磁盘等指标',
      configFields: ['category', 'metric', 'aggregation', 'filters']
    },
    {
      type: 'api',
      name: 'API 接口',
      description: '从外部 API 接口获取数据',
      configFields: ['url', 'method', 'headers', 'body', 'dataPath']
    },
    {
      type: 'database',
      name: '数据库',
      description: '从数据库执行查询获取数据',
      configFields: ['connectionId', 'query', 'parameters']
    },
    {
      type: 'websocket',
      name: 'WebSocket',
      description: '通过 WebSocket 获取实时数据',
      configFields: ['url', 'eventName', 'message']
    },
    {
      type: 'static',
      name: '静态数据',
      description: '使用预定义的静态数据',
      configFields: ['data']
    }
  ];

  sendSuccess(res, dataSourceTypes);
});

/**
 * @swagger
 * /api/visualization/system-metrics:
 *   get:
 *     summary: 获取系统监控指标列表
 *     tags: [数据可视化]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 系统监控指标
 */
router.get('/system-metrics', authenticate, (req: IAuthRequest, res: Response) => {
  const metrics = [
    {
      category: 'cpu',
      name: 'CPU',
      metrics: [
        { key: 'usage', name: '使用率', unit: '%' },
        { key: 'loadUser', name: '用户态负载', unit: '%' },
        { key: 'loadSystem', name: '系统态负载', unit: '%' },
        { key: 'temperature', name: '温度', unit: '°C' }
      ]
    },
    {
      category: 'memory',
      name: '内存',
      metrics: [
        { key: 'usage', name: '使用率', unit: '%' },
        { key: 'used', name: '已使用', unit: 'bytes' },
        { key: 'free', name: '空闲', unit: 'bytes' },
        { key: 'available', name: '可用', unit: 'bytes' },
        { key: 'swapUsed', name: 'Swap 已使用', unit: 'bytes' }
      ]
    },
    {
      category: 'disk',
      name: '磁盘',
      metrics: [
        { key: 'usage', name: '使用率', unit: '%' },
        { key: 'used', name: '已使用', unit: 'bytes' },
        { key: 'free', name: '空闲', unit: 'bytes' },
        { key: 'readSpeed', name: '读取速度', unit: 'bytes/s' },
        { key: 'writeSpeed', name: '写入速度', unit: 'bytes/s' }
      ]
    },
    {
      category: 'network',
      name: '网络',
      metrics: [
        { key: 'receivedSpeed', name: '接收速度', unit: 'bytes/s' },
        { key: 'transmittedSpeed', name: '发送速度', unit: 'bytes/s' },
        { key: 'totalReceived', name: '总接收量', unit: 'bytes' },
        { key: 'totalTransmitted', name: '总发送量', unit: 'bytes' }
      ]
    },
    {
      category: 'load',
      name: '系统负载',
      metrics: [
        { key: 'avg1', name: '1分钟平均负载', unit: '' },
        { key: 'avg5', name: '5分钟平均负载', unit: '' },
        { key: 'avg15', name: '15分钟平均负载', unit: '' }
      ]
    }
  ];

  sendSuccess(res, metrics);
});

/**
 * @swagger
 * /api/visualization/aggregations:
 *   get:
 *     summary: 获取聚合方式列表
 *     tags: [数据可视化]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 聚合方式列表
 */
router.get('/aggregations', authenticate, (req: IAuthRequest, res: Response) => {
  const aggregations = [
    { key: 'avg', name: '平均值', description: '计算时间范围内的平均值' },
    { key: 'sum', name: '求和', description: '计算时间范围内的总和' },
    { key: 'min', name: '最小值', description: '获取时间范围内的最小值' },
    { key: 'max', name: '最大值', description: '获取时间范围内的最大值' },
    { key: 'count', name: '计数', description: '统计数据点数量' },
    { key: 'latest', name: '最新值', description: '获取最新的数据点（时间序列）' }
  ];

  sendSuccess(res, aggregations);
});

/**
 * @swagger
 * /api/visualization/time-ranges:
 *   get:
 *     summary: 获取时间范围选项
 *     tags: [数据可视化]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 时间范围选项
 */
router.get('/time-ranges', authenticate, (req: IAuthRequest, res: Response) => {
  const timeRanges = [
    { key: 'last5m', name: '最近5分钟' },
    { key: 'last15m', name: '最近15分钟' },
    { key: 'last30m', name: '最近30分钟' },
    { key: 'last1h', name: '最近1小时' },
    { key: 'last3h', name: '最近3小时' },
    { key: 'last6h', name: '最近6小时' },
    { key: 'last12h', name: '最近12小时' },
    { key: 'last24h', name: '最近24小时' },
    { key: 'last7d', name: '最近7天' },
    { key: 'last30d', name: '最近30天' },
    { key: 'custom', name: '自定义' }
  ];

  sendSuccess(res, timeRanges);
});

/**
 * @swagger
 * /api/visualization/refresh-intervals:
 *   get:
 *     summary: 获取刷新间隔选项
 *     tags: [数据可视化]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 刷新间隔选项
 */
router.get('/refresh-intervals', authenticate, (req: IAuthRequest, res: Response) => {
  const intervals = [
    { key: 'off', name: '不刷新', ms: 0 },
    { key: '5s', name: '5秒', ms: 5000 },
    { key: '10s', name: '10秒', ms: 10000 },
    { key: '30s', name: '30秒', ms: 30000 },
    { key: '1m', name: '1分钟', ms: 60000 },
    { key: '5m', name: '5分钟', ms: 300000 },
    { key: '15m', name: '15分钟', ms: 900000 },
    { key: '1h', name: '1小时', ms: 3600000 }
  ];

  sendSuccess(res, intervals);
});

// ==================== 预设仪表盘路由 ====================

/**
 * @swagger
 * /api/visualization/presets/system-monitor:
 *   post:
 *     summary: 创建系统监控预设仪表盘
 *     tags: [数据可视化]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: 预设仪表盘创建成功
 */
router.post('/presets/system-monitor', authenticate, async (req: IAuthRequest, res: Response) => {
  try {
    const { name = '系统监控仪表盘' } = req.body;

    // 检查是否已存在默认仪表盘
    const existingDefault = await Dashboard.findDefault(req.user!._id.toString());

    const presetCharts: ChartConfig[] = [
      {
        title: 'CPU 使用率',
        type: 'gauge',
        position: { x: 0, y: 0, w: 4, h: 4 },
        dataSource: {
          type: 'system',
          systemMetric: {
            category: 'cpu',
            metric: 'usage',
            aggregation: 'latest'
          }
        },
        refreshInterval: '5s',
        timeRange: 'last5m',
        options: {
          showLegend: false,
          thresholds: [
            { value: 60, color: '#52c41a', label: '正常' },
            { value: 80, color: '#faad14', label: '警告' },
            { value: 100, color: '#f5222d', label: '危险' }
          ]
        }
      },
      {
        title: '内存使用率',
        type: 'gauge',
        position: { x: 4, y: 0, w: 4, h: 4 },
        dataSource: {
          type: 'system',
          systemMetric: {
            category: 'memory',
            metric: 'usage',
            aggregation: 'latest'
          }
        },
        refreshInterval: '5s',
        timeRange: 'last5m',
        options: {
          showLegend: false,
          thresholds: [
            { value: 70, color: '#52c41a', label: '正常' },
            { value: 85, color: '#faad14', label: '警告' },
            { value: 100, color: '#f5222d', label: '危险' }
          ]
        }
      },
      {
        title: '磁盘使用率',
        type: 'gauge',
        position: { x: 8, y: 0, w: 4, h: 4 },
        dataSource: {
          type: 'system',
          systemMetric: {
            category: 'disk',
            metric: 'usage',
            aggregation: 'latest'
          }
        },
        refreshInterval: '1m',
        timeRange: 'last5m',
        options: {
          showLegend: false,
          thresholds: [
            { value: 70, color: '#52c41a', label: '正常' },
            { value: 85, color: '#faad14', label: '警告' },
            { value: 100, color: '#f5222d', label: '危险' }
          ]
        }
      },
      {
        title: 'CPU 历史趋势',
        type: 'area',
        position: { x: 0, y: 4, w: 6, h: 6 },
        dataSource: {
          type: 'system',
          systemMetric: {
            category: 'cpu',
            metric: 'usage',
            aggregation: 'latest'
          }
        },
        refreshInterval: '10s',
        timeRange: 'last1h',
        options: {
          smooth: true,
          fill: true,
          showLegend: true,
          yAxis: { min: 0, max: 100, title: '使用率 (%)' }
        }
      },
      {
        title: '内存历史趋势',
        type: 'area',
        position: { x: 6, y: 4, w: 6, h: 6 },
        dataSource: {
          type: 'system',
          systemMetric: {
            category: 'memory',
            metric: 'usage',
            aggregation: 'latest'
          }
        },
        refreshInterval: '10s',
        timeRange: 'last1h',
        options: {
          smooth: true,
          fill: true,
          showLegend: true,
          yAxis: { min: 0, max: 100, title: '使用率 (%)' }
        }
      },
      {
        title: '网络流量',
        type: 'line',
        position: { x: 0, y: 10, w: 12, h: 5 },
        dataSource: {
          type: 'system',
          systemMetric: {
            category: 'network',
            metric: 'receivedSpeed',
            aggregation: 'latest'
          }
        },
        refreshInterval: '10s',
        timeRange: 'last1h',
        options: {
          smooth: true,
          showLegend: true,
          yAxis: { title: '速度 (bytes/s)' }
        }
      }
    ];

    const dashboard = new Dashboard({
      name,
      description: '系统性能监控预设仪表盘，包含 CPU、内存、磁盘和网络指标',
      layout: 'grid',
      theme: 'auto',
      refreshInterval: '10s',
      isPublic: false,
      isDefault: !existingDefault, // 如果没有默认仪表盘，设为默认
      tags: ['系统监控', '预设'],
      charts: presetCharts,
      createdBy: req.user!._id
    });

    await dashboard.save();

    sendSuccess(res, dashboard, '系统监控预设仪表盘创建成功');
  } catch (error) {
    console.error('创建预设仪表盘失败:', error);
    sendError(res, '创建预设仪表盘失败', 500);
  }
});

export default router;
