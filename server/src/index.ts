import dotenv from 'dotenv';
import express from 'express';
import cors from 'cors';
import aiRoutes from './routes/ai';
import { rateLimit } from './middleware/rateLimit';
import { authMiddleware } from './middleware/auth';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '20', 10);
const BODY_LIMIT = process.env.BODY_LIMIT || '1mb';

// ========== 全局中间件 ==========

// CORS 跨域支持
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// 请求体解析，限制大小
app.use(express.json({ limit: BODY_LIMIT }));

// 信任代理（获取真实 IP 用于速率限制）
app.set('trust proxy', 1);

// ========== 健康检查（不需要认证和速率限制） ==========

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ========== 业务路由（需要认证和速率限制） ==========

// 速率限制：每分钟最多 RATE_LIMIT_MAX 次请求
app.use('/api/ai', rateLimit(RATE_LIMIT_MAX, 60 * 1000));

// API Key 验证
app.use('/api/ai', authMiddleware);

// AI 路由
app.use('/api/ai', aiRoutes);

// ========== 404 处理 ==========

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: '接口不存在',
  });
});

// ========== 全局错误处理 ==========

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction,
  ) => {
    console.error('[Unhandled Error]', err);
    res.status(500).json({
      success: false,
      error: '服务器内部错误',
    });
  },
);

// ========== 启动服务 ==========

app.listen(PORT, () => {
  console.log(`[AI Efficiency Assistant] 服务已启动`);
  console.log(`[AI Efficiency Assistant] 地址: http://localhost:${PORT}`);
  console.log(`[AI Efficiency Assistant] 健康检查: http://localhost:${PORT}/api/health`);
  console.log(`[AI Efficiency Assistant] 速率限制: 每分钟 ${RATE_LIMIT_MAX} 次请求`);

  if (!process.env.DEEPSEEK_API_KEY) {
    console.warn(
      '[AI Efficiency Assistant] 警告: 未配置 DEEPSEEK_API_KEY，AI 功能将无法使用',
    );
  }
  if (!process.env.API_KEY) {
    console.warn(
      '[AI Efficiency Assistant] 警告: 未配置 API_KEY，API 将不进行身份验证（仅限开发环境）',
    );
  }
});

export default app;
