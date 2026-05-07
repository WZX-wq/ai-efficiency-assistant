import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { createServer } from 'http';

// Load environment variables
dotenv.config();

// Import middleware
import { logger } from './middleware/logger';
import { rateLimit } from './middleware/rateLimit';
import { cacheMiddleware } from './middleware/cache';

// Import routes
import authRoutes from './routes/auth';
import userRoutes from './routes/user';
import fileRoutes from './routes/files';
import teamRoutes from './routes/team';
import aiRoutes from './routes/ai';
import imageRoutes from './routes/image';
import voiceRoutes from './routes/voice';
import monitorRoutes from './routes/monitor';
import visualizationRoutes from './routes/visualization';
import canvasRoutes from './routes/canvas';
import spreadsheetRoutes from './routes/spreadsheet';
import codeRoutes from './routes/code';
import databaseRoutes from './routes/database';
import customerServiceRoutes from './routes/customerService';
import dataAnalysisRoutes from './routes/dataAnalysis';
import paintingRoutes from './routes/painting';
import videoRoutes from './routes/video';
import pptRoutes from './routes/ppt';

// Import services
import { initializeWebSocket } from './services/websocket';
import systemMonitor from './services/systemMonitor';
import { alertService } from './services/alertService';

// Import Swagger documentation
import { setupSwagger } from './config/swagger';

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// HTTP 请求日志
app.use(logger.httpLogger());

// 全局速率限制: 100 请求/分钟
app.use('/api/', rateLimit({ windowMs: 60 * 1000, maxRequests: 100 }));

// 各模块独立速率限制
app.use('/api/ai', rateLimit({ windowMs: 60 * 1000, maxRequests: 30 }));
app.use('/api/painting', rateLimit({ windowMs: 60 * 1000, maxRequests: 20 }));
app.use('/api/image', rateLimit({ windowMs: 60 * 1000, maxRequests: 20 }));
app.use('/api/video', rateLimit({ windowMs: 60 * 1000, maxRequests: 20 }));
app.use('/api/ppt', rateLimit({ windowMs: 60 * 1000, maxRequests: 20 }));
app.use('/api/customer-service', rateLimit({ windowMs: 60 * 1000, maxRequests: 30 }));
app.use('/api/data-analysis', rateLimit({ windowMs: 60 * 1000, maxRequests: 20 }));

// GET 请求缓存
app.use('/api/monitor', cacheMiddleware(10 * 1000)); // 10秒缓存
app.use('/api/image/sizes', cacheMiddleware(60 * 1000)); // 60秒缓存
app.use('/api/image/styles', cacheMiddleware(60 * 1000)); // 60秒缓存
app.use('/api/image/qualities', cacheMiddleware(60 * 1000)); // 60秒缓存

// Static files
app.use('/uploads', express.static('uploads'));

// Connect to MongoDB
const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-assistant';
    if (!mongoUri || mongoUri.includes('localhost')) {
      logger.warn('MongoDB URI not configured, running without database');
      return false;
    }
    await mongoose.connect(mongoUri);
    logger.info('MongoDB connected successfully');
    return true;
  } catch (error) {
    logger.error('MongoDB connection error, continuing without database', { error: String(error) });
    // 不退出进程，让服务器继续运行（部分功能可能不可用）
    return false;
  }
};

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/image', imageRoutes);
app.use('/api/voice', voiceRoutes);
app.use('/api/monitor', monitorRoutes);
app.use('/api/visualization', visualizationRoutes);
app.use('/api/canvas', canvasRoutes);
app.use('/api/spreadsheet', spreadsheetRoutes);
app.use('/api/code', codeRoutes);
app.use('/api/database', databaseRoutes);
app.use('/api/customer-service', customerServiceRoutes);
app.use('/api/data-analysis', dataAnalysisRoutes);
app.use('/api/painting', paintingRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/ppt', pptRoutes);

// Alert endpoints
app.get('/api/alerts', (req, res) => {
  try {
    const level = req.query.level as string | undefined;
    const resolvedStr = req.query.resolved as string | undefined;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

    let resolved: boolean | undefined;
    if (resolvedStr === 'true') resolved = true;
    else if (resolvedStr === 'false') resolved = false;

    const result = alertService.getAlerts({ level, resolved, limit, offset });
    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error('获取告警列表失败', { error: String(error) });
    res.status(500).json({
      success: false,
      error: '获取告警列表失败',
    });
  }
});

app.get('/api/alerts/stats', (req, res) => {
  try {
    const stats = alertService.getStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error('获取告警统计失败', { error: String(error) });
    res.status(500).json({
      success: false,
      error: '获取告警统计失败',
    });
  }
});

app.get('/api/alerts/:id', (req, res) => {
  try {
    const alert = alertService.getAlert(req.params.id);
    if (!alert) {
      res.status(404).json({
        success: false,
        error: '告警不存在',
      });
      return;
    }
    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    logger.error('获取告警详情失败', { error: String(error) });
    res.status(500).json({
      success: false,
      error: '获取告警详情失败',
    });
  }
});

app.post('/api/alerts/:id/resolve', (req, res) => {
  try {
    const alert = alertService.resolveAlert(req.params.id);
    if (!alert) {
      res.status(404).json({
        success: false,
        error: '告警不存在',
      });
      return;
    }
    res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    logger.error('解决告警失败', { error: String(error) });
    res.status(500).json({
      success: false,
      error: '解决告警失败',
    });
  }
});

app.delete('/api/alerts', (req, res) => {
  try {
    const removed = alertService.clearResolved();
    res.json({
      success: true,
      data: { removed },
    });
  } catch (error) {
    logger.error('清除已解决告警失败', { error: String(error) });
    res.status(500).json({
      success: false,
      error: '清除已解决告警失败',
    });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0'
  });
});

// Swagger API documentation (non-production only)
if (process.env.NODE_ENV !== 'production') {
  setupSwagger(app);
}

// Setup WebSocket for real-time features
initializeWebSocket(httpServer);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
const startServer = async () => {
  await connectDB();

  httpServer.listen(PORT, () => {
    // 启动系统监控
    systemMonitor.startMonitoring(5000);

    logger.info(`AI 效率助手服务器已启动`, { port: PORT, env: process.env.NODE_ENV || 'development' });
    logger.info(`功能模块: 用户认证 | 文件管理 | AI对话 | 图片生成 | 语音助手 | 团队协作 | 系统监控 | 数据可视化 | 告警系统`);
  });
};

startServer();

export { httpServer };
